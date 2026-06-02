// ./src/config/database/syncService.js
import { Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { showToast } from '../../utils/toast';
// P1.5: resize/compressao de imagem antes do base64 (PDF passa intacto).
import { prepareImageForUpload } from '../../utils/fileUpload';

import { db } from './database';
import api from '../api';
import { atualizarUltimaSync, getUltimaSync } from './syncUtils';

// 🔌 estado global de rede (sem hooks)
import { getGlobalNetworkStatus } from '../../contexts/network';
import { uploadChecklists } from './syncChecklists';
import { MAX_SYNC_ATTEMPTS } from './syncConstants';
// 📶 snapshot de qualidade de conexão
import { getConnectionSnapshot, isGoodSignal } from '../net/connectionSnapshot';

export { MAX_SYNC_ATTEMPTS, SYNC_STATUS } from './syncConstants';

const COLUNAS_UPLOAD_PERMITIDAS = {
  veiculo_checklist_itens_servicos: ['id', 'id_obra', 'id_veiculo', 'id_checklist', 'id_local', 'status', 'status_ciclo', 'data_fechamento', 'anomalia_offline', 'foto_extra_1', 'desc_extra_1', 'foto_extra_2', 'desc_extra_2', 'foto_extra_3', 'desc_extra_3', 'foto_extra_4', 'desc_extra_4', 'data_cadastro', 'user_create', 'user_edit', 'sync_status', 'data_sincronizacao', 'created_at', 'deleted_at', 'updated_at'],
  veiculo_checklist_itens_realizados: ['id', 'id_obra', 'id_checklist', 'id_checklist_realizado', 'id_checklist_itens', 'id_veiculo', 'data_cadastro', 'status', 'arquivo_app', 'arquivo_servidor', 'user_create', 'horimetro_atual', 'horimetro_novo', 'quilometragem_atual', 'quilometragem_nova', 'observacao', 'sync_status', 'data_sincronizacao', 'created_at', 'deleted_at', 'updated_at'],
  veiculo_horimetro: ['id', 'id_local', 'veiculo_id', 'id_funcionario', 'id_obra', 'user_create', 'user_edit', 'horimetro_atual', 'horimetro_novo', 'data_horimetro', 'sync_status', 'data_sincronizacao', 'created_at', 'updated_at'],
  veiculo_quilometragems: ['id', 'id_local', 'id_obra', 'veiculo_id', 'id_funcionario', 'user_create', 'quilometragem_atual', 'quilometragem_nova', 'data_quilometragem', 'sync_status', 'data_sincronizacao', 'created_at', 'updated_at'],
  veiculo_abastecimentos: ['id', 'id_local', 'veiculo_id', 'id_obra', 'id_funcionario', 'user_create', 'user_edit', 'data_abastecimento', 'km_anterior', 'km_atual', 'hr_anterior', 'hr_atual', 'fornecedor', 'combustivel', 'tipo', 'quantidade', 'valor_do_litro', 'valor_total', 'arquivo_app', 'arquivo_servidor', 'sync_status', 'data_sincronizacao', 'created_at', 'updated_at'],
  veiculos_diario_bordo: ['id', 'id_local', 'ciclo_status', 'id_obra', 'id_veiculo', 'id_user', 'user_create', 'user_edit', 'data_cadastro', 'horario_inicial', 'hr_anterior', 'km_anterior', 'horario_final', 'hr_atual', 'km_atual', 'descricao_atividade', 'descricao_encerramento', 'horas_trabalhadas_minutos', 'arquivo_app', 'arquivo_servidor', 'sync_status', 'data_sincronizacao', 'created_at', 'deleted_at', 'updated_at'],
  sms_checklist_realizado_vinculo: ['id', 'id_local', 'id_obra', 'checklist_id', 'responsavel_inspecao', 'observacoes', 'user_create', 'user_edit', 'created_at', 'updated_at', 'deleted_at', 'sync_status', 'data_sincronizacao'],
  sms_checklist_informacoes_preenchidos: ['id', 'id_local', 'realizado_id', 'informacao_id', 'resposta', 'created_at', 'updated_at', 'user_create', 'user_edit', 'sync_status', 'data_sincronizacao'],
  sms_checklist_itens_preenchidos: ['id', 'id_local', 'realizado_id', 'item_id', 'conforme', 'descricao', 'acao_sugestao', 'responsavel_acao', 'created_at', 'updated_at', 'user_create', 'sync_status', 'data_sincronizacao'],
  sms_checklist_preenchido_imagens: ['id', 'id_local', 'preenchido_id', 'arquivo_app', 'arquivo_servidor', 'user_create', 'user_edit', 'created_at', 'updated_at', 'sync_status', 'data_sincronizacao'],
  sms_checklist_preenchido_assinaturas: ['id', 'id_local', 'realizado_id', 'arquivo_app', 'arquivo_servidor', 'cpf', 'nome', 'trabalhador_externo', 'user_create', 'user_edit', 'created_at', 'updated_at', 'sync_status', 'data_sincronizacao'],
};

const CAMPOS_AUXILIARES_UPLOAD = ['__rowid', 'arquivo_uri', 'foto_extra_uri_1', 'foto_extra_uri_2', 'foto_extra_uri_3', 'foto_extra_uri_4'];

// Tabelas que persistem URL do arquivo no servidor (para retry seguro de imagens)
const TABELAS_COM_ARQUIVO_SERVIDOR = new Set([
  'sms_checklist_preenchido_imagens',
  'sms_checklist_preenchido_assinaturas',
  'veiculo_abastecimentos',
  'veiculos_diario_bordo',
  'veiculo_checklist_itens_realizados',
]);

const TABELAS_EVIDENCIA_OBRIGATORIA = new Set([
  'sms_checklist_preenchido_imagens',
  'sms_checklist_preenchido_assinaturas',
]);

function filtrarRegistroPermitido(tabela, registro) {
  const colunas = COLUNAS_UPLOAD_PERMITIDAS[tabela];
  if (!colunas) return registro;

  return [...colunas, ...CAMPOS_AUXILIARES_UPLOAD].reduce((acc, coluna) => {
    if (registro[coluna] !== undefined) acc[coluna] = registro[coluna];
    return acc;
  }, {});
}

// ==================== CONFIGURAÇÃO DAS TABELAS ====================
export const TABELAS_DOWNLOAD = [
  { nome: 'veiculo_horimetro', label: 'Horímetro' },
  { nome: 'veiculo_quilometragems', label: 'Hodômetro' },
  { nome: 'users', label: 'Dados do Usuário' },
  { nome: 'funcionarios', label: 'Funcionários' },
  { nome: 'funcao_funcionarios', label: 'Função do Funcionário' },
  { nome: 'obras', label: 'Obras' },
  { nome: 'veiculos', label: 'Veículos' },
  { nome: 'veiculos_locacaos', label: 'Veículos Locados' },
  { nome: 'veiculo_checklist', label: 'Checklist dos Veículos' },
  { nome: 'veiculo_checklist_itens', label: 'Itens do Checklist' },
  { nome: 'sms_checklist', label:'Checklist SMS'},
  { nome: 'sms_obras_permitidas', label:'Obras SMS'},
  { nome:'sms_checklist_itens', label:'Itens do Checklist SMS'},
  { nome:'sms_checklist_informacoes', label:'Informações do Checklist SMS'},
  { nome: 'sms_funcionarios', label:'Funcionarios SMS'},
  { nome: 'veiculo_preventivas', label: 'Preventivas' },
  { nome: 'veiculo_preventivas_itens_realizadas', label: 'Preventivas Realizadas' }
];

const TABELAS_DOWNLOAD_COMPLETO = new Set([
  'veiculo_checklist',
  'veiculo_checklist_itens',
]);

export const TABELAS_UPLOAD = [
  { nome: 'checklists_frota', label: 'Checklist da Frota' },
  { nome: 'veiculo_horimetro', label: 'Horimetro' },
  { nome: 'veiculo_quilometragems', label: 'Hodometro' },
  { nome: 'veiculo_abastecimentos', label: 'Abastecimento do Veículo' },
  { nome: 'veiculos_diario_bordo', label: 'Diário de Bordo' },
  { nome: 'sms_checklist_realizado_vinculo', label:'Itens Realizados SMS'},
  { nome: 'sms_checklist_informacoes_preenchidos', label:'Informações Preenchidas do Checklist SMS'},
  { nome: 'sms_checklist_itens_preenchidos', label:'Itens Preenchidos SMS'},
  { nome: 'sms_checklist_preenchido_imagens', label:'Imagens do Checklist SMS'},
  { nome: 'sms_checklist_preenchido_assinaturas', label:'Assinaturas do Checklist SMS'}
];

// ==================== SYNC LOCK (bloqueio simultaneo + persistente) ====================
//
// O lock vive em DUAS camadas:
//  1) memoria (SYNC_BUSY): evita sync paralela na MESMA execucao do app
//  2) persistente (sync_state.chave='sync_lock'): detecta lock orfao apos crash/kill
//
// Heartbeat: quem detem o lock atualiza sync_state.updated_at periodicamente.
// Se outro caller ler um lock cujo updated_at e mais antigo que SYNC_LOCK_STALE_MS,
// considera abandonado e toma posse.
//
let SYNC_BUSY = false;
let SYNC_BUSY_SINCE = null;
let SYNC_HEARTBEAT_TIMER = null;
let SYNC_OWNER_TOKEN = null; // identifica esta instancia do app no lock persistente

const SYNC_LOCK_KEY = 'sync_lock';
const SYNC_LOCK_HEARTBEAT_MS = 15 * 1000;       // atualiza a cada 15s
const SYNC_LOCK_STALE_MS = 5 * 60 * 1000;       // considera morto apos 5min sem heartbeat

function gerarOwnerToken() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function execAsyncSync(sql, params = []) {
  return new Promise((resolve) => {
    db.transaction(tx => {
      tx.executeSql(sql, params,
        (_, res) => resolve(res?.rows?._array ?? []),
        (_, err) => { console.warn(`SQL falhou (sync_state): ${err?.message}`); resolve([]); return false; }
      );
    });
  });
}

async function lerLockPersistente() {
  const rows = await execAsyncSync(`SELECT valor, updated_at FROM sync_state WHERE chave = ?;`, [SYNC_LOCK_KEY]);
  if (!rows.length) return null;
  try {
    const valor = rows[0].valor ? JSON.parse(rows[0].valor) : null;
    return { valor, updated_at: rows[0].updated_at };
  } catch { return null; }
}

async function gravarLockPersistente(token, label) {
  const valor = JSON.stringify({ token, label, since: Date.now() });
  const now = new Date().toISOString();
  // INSERT OR REPLACE para idempotencia
  await execAsyncSync(
    `INSERT OR REPLACE INTO sync_state (chave, valor, updated_at) VALUES (?, ?, ?);`,
    [SYNC_LOCK_KEY, valor, now]
  );
}

async function atualizarHeartbeatLock() {
  const now = new Date().toISOString();
  await execAsyncSync(
    `UPDATE sync_state SET updated_at = ? WHERE chave = ?;`,
    [now, SYNC_LOCK_KEY]
  );
}

async function removerLockPersistente() {
  await execAsyncSync(`DELETE FROM sync_state WHERE chave = ?;`, [SYNC_LOCK_KEY]);
}

function isLockStale(updatedAtIso) {
  if (!updatedAtIso) return true;
  const t = Date.parse(updatedAtIso);
  if (!Number.isFinite(t)) return true;
  return (Date.now() - t) > SYNC_LOCK_STALE_MS;
}

export function isSyncBusy() {
  return SYNC_BUSY;
}

/**
 * Adquire lock em memoria + persistente. Falha se ja houver lock ATIVO
 * (com heartbeat recente). Lock orfao (sem heartbeat) e considerado morto
 * e a posse e tomada.
 */
async function acquireSyncLock(label) {
  if (SYNC_BUSY) {
    const e = new Error('Ja existe uma sincronizacao em andamento. Aguarde.');
    e.code = 'SYNC_BUSY';
    throw e;
  }

  // Checa lock persistente (de execucao anterior do app)
  const persistente = await lerLockPersistente();
  if (persistente && persistente.valor && !isLockStale(persistente.updated_at)) {
    const e = new Error('Sincronizacao ainda ativa em outra sessao. Aguarde alguns minutos ou reinicie o app.');
    e.code = 'SYNC_BUSY_PERSISTED';
    throw e;
  }
  if (persistente) {
    console.warn(`[SyncLock] Lock persistente orfao detectado (label="${persistente.valor?.label}", ultima atualizacao=${persistente.updated_at}). Tomando posse.`);
  }

  SYNC_OWNER_TOKEN = gerarOwnerToken();
  await gravarLockPersistente(SYNC_OWNER_TOKEN, label);

  SYNC_BUSY = true;
  SYNC_BUSY_SINCE = Date.now();

  // Heartbeat
  if (SYNC_HEARTBEAT_TIMER) clearInterval(SYNC_HEARTBEAT_TIMER);
  SYNC_HEARTBEAT_TIMER = setInterval(() => {
    atualizarHeartbeatLock().catch(() => {});
  }, SYNC_LOCK_HEARTBEAT_MS);

  console.log(`🔒 Sync lock ADQUIRIDO (${label}, token=${SYNC_OWNER_TOKEN})`);
}

async function releaseSyncLock(label) {
  if (SYNC_HEARTBEAT_TIMER) {
    clearInterval(SYNC_HEARTBEAT_TIMER);
    SYNC_HEARTBEAT_TIMER = null;
  }
  // Tenta remover apenas se ainda somos o dono — evita corrida com tomada de posse
  try {
    const atual = await lerLockPersistente();
    if (!atual || !atual.valor || atual.valor.token === SYNC_OWNER_TOKEN) {
      await removerLockPersistente();
    }
  } catch (e) { console.warn('Falha ao remover lock persistente:', e?.message); }

  SYNC_BUSY = false;
  SYNC_OWNER_TOKEN = null;
  const dur = SYNC_BUSY_SINCE ? Math.round((Date.now() - SYNC_BUSY_SINCE) / 1000) : 0;
  SYNC_BUSY_SINCE = null;
  console.log(`🔓 Sync lock LIBERADO (${label}, ${dur}s)`);
}

/**
 * Limpa lock persistente orfao no boot (caso o app tenha morrido sem release).
 * Chamado por aplicarHardeningSync().
 */
export async function limparLockOrfao() {
  const persistente = await lerLockPersistente();
  if (!persistente) return false;
  if (isLockStale(persistente.updated_at)) {
    console.warn(`[SyncLock] Removendo lock orfao do boot (label="${persistente.valor?.label}", ultima atualizacao=${persistente.updated_at})`);
    await removerLockPersistente();
    return true;
  }
  return false;
}

// ==================== REGISTRO DE SINCRONIZAÇÃO NO SERVIDOR ====================
async function registrarSyncServidor(tabela, tipo, usuario) {
  try {
    if (!usuario?.user_id) return;

    await api.post('sincronizacoes', {
      tabela,
      tipo,
      user_id: usuario.user_id,
      user_create: usuario.user_create,
    });

    console.log(`✅ Sync registrada no servidor: ${tabela} (${tipo})`);
  } catch (err) {
    console.warn(`⚠️ Erro ao registrar sync no servidor: ${err.message}`);
  }
}

// ==================== CHECAGENS DE CONECTIVIDADE (NÚCLEO) ====================
function ensureCanSyncOrThrow(actionLabel = 'sincronizar') {
  // 1) OFFLINE forçado ou sem internet → BLOQUEIA com ALERT
  const { isOffline } = getGlobalNetworkStatus();
  if (isOffline) {
    Alert.alert(
      'Modo OFFLINE',
      `Ative o modo ONLINE para ${actionLabel}.`
    );
    const e = new Error('APP_OFFLINE');
    e.code = 'APP_OFFLINE';
    throw e;
  }

  // 2) Sinal ruim / internet não alcançável → BLOQUEIA silenciosamente (sem alert)
  const snap = getConnectionSnapshot();
  const quality = snap?.qualityPct ?? 0;
  const reachable = snap?.isInternetReachable !== false; // se for false, bloqueia
  if (!reachable || !isGoodSignal(quality)) {
    const e = new Error('SINAL_FRACO_OU_INDISPONIVEL');
    e.code = 'WEAK_OR_NO_SIGNAL';
    throw e;
  }
}

// ==================== DOWNLOAD (MySQL → SQLite) ====================
const MENSAGEM_SYNC_EM_ANDAMENTO = 'A sincronizacao ja esta em andamento. Aguarde a conclusao.';
const MENSAGEM_SYNC_ERRO = 'Nao foi possivel concluir a sincronizacao.';

function isErroSyncEmAndamento(error) {
  return error?.code === 'SYNC_BUSY' || error?.code === 'SYNC_BUSY_PERSISTED';
}

function mensagemBloqueioConectividade(error, actionLabel) {
  if (error?.code === 'APP_OFFLINE') {
    return `Ative o modo ONLINE para ${actionLabel}.`;
  }
  if (error?.code === 'WEAK_OR_NO_SIGNAL') {
    return 'Conexao instavel ou indisponivel. Tente novamente com sinal estavel.';
  }
  return error?.message || MENSAGEM_SYNC_ERRO;
}

function resultadoSyncSucesso(message, totalProcessados = 0, totalErros = 0) {
  return {
    success: totalErros === 0,
    message,
    totalProcessados,
    totalErros,
  };
}

function resultadoSyncJaRodando(message = MENSAGEM_SYNC_EM_ANDAMENTO) {
  return {
    success: false,
    alreadyRunning: true,
    message,
  };
}

function resultadoSyncErro(message = MENSAGEM_SYNC_ERRO, error = null, totalProcessados = 0, totalErros = 1) {
  return {
    success: false,
    message,
    error: error?.message || String(error || message),
    totalProcessados,
    totalErros,
  };
}

export async function downloadDados(updateStatus, _unused_isOffline, tabela = null, usuario = null) {
  let totalProcessados = 0;
  let totalErros = 0;

  // 💥 checa antes de começar: não percorre tabelas se não puder sincronizar
  try {
    ensureCanSyncOrThrow('baixar dados');
  } catch (e) {
    const message = mensagemBloqueioConectividade(e, 'baixar dados');
    return resultadoSyncErro(message, e, totalProcessados, 1);
  }

  try {
    await acquireSyncLock('download');
  } catch (e) {
    if (isErroSyncEmAndamento(e)) {
      Alert.alert('Aguarde', e.message);
      return resultadoSyncJaRodando(e.message || MENSAGEM_SYNC_EM_ANDAMENTO);
    }
    return resultadoSyncErro('Nao foi possivel iniciar o download.', e, totalProcessados, 1);
  }

  try {
    const tabelas = tabela
      ? TABELAS_DOWNLOAD.filter((t) => t.nome === tabela)
      : TABELAS_DOWNLOAD;

    if (tabela && tabelas.length === 0) {
      return resultadoSyncErro(`Tabela ${tabela} nao encontrada para download.`, null, totalProcessados, 1);
    }

    for (const tab of tabelas) {
      // segurança: checagem por iteração (caso o usuário mude o modo durante o loop)
      try {
        ensureCanSyncOrThrow('baixar dados');
      } catch (e) {
        totalErros += 1;
        updateStatus?.(tab.nome, 'erro', 'Operação bloqueada (offline ou sinal ruim)', 0);
        break;
      }

      try {
        updateStatus?.(tab.nome, 'baixando', 'Buscando dados...', 20);

        const ultimaSync = TABELAS_DOWNLOAD_COMPLETO.has(tab.nome)
          ? null
          : await getUltimaSync(tab.nome, usuario, 'download');
        const response = await api.get(`download/${tab.nome}`, {
          params: ultimaSync ? { data_sincronizacao: ultimaSync } : undefined,
        });
        let registros = response.data?.data ?? [];
        if (!Array.isArray(registros)) registros = [registros];

        if (registros.length === 0) {
          updateStatus?.(tab.nome, 'concluido', 'Nada para atualizar', 100);
          continue;
        }

        await salvarLocalmente(tab.nome, registros, updateStatus);

        await atualizarUltimaSync(tab.nome, usuario, 'download');
        await registrarSyncServidor(tab.nome, 'download', usuario);

        totalProcessados += registros.length;
        updateStatus?.(tab.nome, 'concluido', `${registros.length} registros`, 100);
        console.log(`✅ Dados baixados: ${tab.nome} (${registros.length} registros)`);
      } catch (err) {
        totalErros += 1;
        updateStatus?.(tab.nome, 'erro', err.message, 0);
        const warnMsg = `Erro no download de ${tab.nome}: ${err.message}`;
        console.warn(`⚠️ ` + warnMsg);
        showToast(warnMsg, "warning");
      }
    }
  } catch (error) {
    totalErros += 1;
    return resultadoSyncErro('Nao foi possivel concluir o download.', error, totalProcessados, totalErros);
  } finally {
    await releaseSyncLock('download');
  }

  return resultadoSyncSucesso(
    totalErros === 0 ? 'Sincronizacao concluida com sucesso.' : 'Sincronizacao concluida com erros.',
    totalProcessados,
    totalErros
  );
}

// ==================== UPLOAD (SQLite → MySQL) ====================
export async function uploadDados(updateStatus, _unused_isOffline, tabela = null, usuario = null) {
  let totalProcessados = 0;
  let totalErros = 0;

  try {
    ensureCanSyncOrThrow('enviar dados');
  } catch (e) {
    const message = mensagemBloqueioConectividade(e, 'enviar dados');
    return resultadoSyncErro(message, e, totalProcessados, 1);
  }

  try {
    await acquireSyncLock('upload');
  } catch (e) {
    if (isErroSyncEmAndamento(e)) {
      Alert.alert('Aguarde', e.message);
      return resultadoSyncJaRodando(e.message || MENSAGEM_SYNC_EM_ANDAMENTO);
    }
    return resultadoSyncErro('Nao foi possivel iniciar o upload.', e, totalProcessados, 1);
  }

  try {
    const tabelas = tabela
      ? TABELAS_UPLOAD.filter((t) => t.nome === tabela)
      : TABELAS_UPLOAD.filter((t) => t.nome !== 'checklists_frota');

    if (tabela && tabela !== 'checklists_frota' && tabelas.length === 0) {
      return resultadoSyncErro(`Tabela ${tabela} nao encontrada para upload.`, null, totalProcessados, 1);
    }

    if (!tabela || tabela === 'checklists_frota') {
      await uploadChecklists(updateStatus, usuario);
      if (tabela === 'checklists_frota') {
        return resultadoSyncSucesso('Sincronizacao concluida com sucesso.', totalProcessados, totalErros);
      }
    }

    for (const tab of tabelas) {
      try {
        ensureCanSyncOrThrow('enviar dados');
      } catch (e) {
        totalErros += 1;
        updateStatus?.(tab.nome, 'erro', 'Operação bloqueada (offline ou sinal ruim)', 0);
        break;
      }

      try {
        updateStatus?.(tab.nome, 'enviando', 'Preparando...', 0);

        // Busca pendentes (status 0=pending OU 3=erro para retry)
        const registros = await buscarNaoSincronizados(tab.nome);
        if (!Array.isArray(registros) || registros.length === 0) {
          updateStatus?.(tab.nome, 'concluido', 'Nada para enviar', 100);
          continue;
        }

        // Marca como "sincronizando" (status 2) ANTES de enviar.
        // Se o app cair antes de finalizar, aplicarHardeningSync() volta para 0.
        await marcarRegistrosComoSincronizando(tab.nome, registros);

        // Clona e sanitiza dados (isola de funções no escopo!)
        const registrosClonados = JSON.parse(JSON.stringify(registros));

        // Processa arquivos com retry seguro:
        //   - se arquivo_servidor ja existe, NAO re-converte/reenvia (ja foi pra storage)
        //   - so converte para base64 quando necessario
        let registrosComArquivo = (
          await Promise.all(
            registrosClonados.map(async (reg) => {
              try {
                Object.keys(reg).forEach((key) => {
                  if (typeof reg[key] === 'function') delete reg[key];
                  if (typeof reg[key] === 'string') {
                    reg[key] = reg[key].replace(/async function[\s\S]*$/g, '').trim();
                  }
                });

                let novoReg = { ...reg };
                const jaTemArquivoServidor =
                  TABELAS_COM_ARQUIVO_SERVIDOR.has(tab.nome) &&
                  novoReg.arquivo_servidor &&
                  String(novoReg.arquivo_servidor).trim() !== '';

                // Trata arquivo_app principal — pula reprocessamento se ja temos URL servidor
                const arquivoLocalParaUpload =
                  typeof novoReg.arquivo_app === 'string' && novoReg.arquivo_app.startsWith('file://')
                    ? novoReg.arquivo_app
                    : (typeof novoReg.arquivo_local === 'string' && novoReg.arquivo_local.startsWith('file://')
                      ? novoReg.arquivo_local
                      : null);

                if (
                  !jaTemArquivoServidor &&
                  arquivoLocalParaUpload
                ) {
                  const info = await FileSystem.getInfoAsync(arquivoLocalParaUpload);
                  if (info?.exists) {
                    // P1.5: imagens sao reduzidas (JPEG ~2400px) antes do base64;
                    // PDFs e nao-imagens passam intactos (prepareImageForUpload
                    // retorna a uri original). Se o resize falhar, cai no original.
                    const arquivoPreparado = await prepareImageForUpload(arquivoLocalParaUpload);
                    const base64 = await FileSystem.readAsStringAsync(arquivoPreparado, {
                      encoding: FileSystem.EncodingType.Base64,
                    });
                    const mimeType = arquivoPreparado.toLowerCase().endsWith('.pdf')
                      ? 'application/pdf'
                      : 'image/jpeg';
                    novoReg.arquivo_uri = `data:${mimeType};base64,${base64}`;
                  } else {
                    throw new Error(`Arquivo local não encontrado: ${arquivoLocalParaUpload}`);
                  }
                } else {
                  novoReg.arquivo_uri = novoReg.arquivo_uri ?? null;
                }

                if (TABELAS_EVIDENCIA_OBRIGATORIA.has(tab.nome) && !jaTemArquivoServidor && !novoReg.arquivo_uri) {
                  throw new Error('Evidência local ausente. Reabra o checklist e recapture a imagem/assinatura.');
                }

                // Trata fotos extras (1 a 4) — usadas apenas em veiculo_checklist_itens_servicos
                for (let i = 1; i <= 4; i++) {
                  const fKey = `foto_extra_${i}`;
                  if (
                    novoReg[fKey] &&
                    typeof novoReg[fKey] === 'string' &&
                    novoReg[fKey].startsWith('file://')
                  ) {
                    const info = await FileSystem.getInfoAsync(novoReg[fKey]);
                    if (info?.exists) {
                      // P1.5: fotos extras sao sempre imagens — resize antes do base64.
                      const extraPreparada = await prepareImageForUpload(novoReg[fKey]);
                      const base64 = await FileSystem.readAsStringAsync(extraPreparada, {
                        encoding: FileSystem.EncodingType.Base64,
                      });
                      novoReg[`foto_extra_uri_${i}`] = `data:image/jpeg;base64,${base64}`;
                    }
                  }
                }

                return filtrarRegistroPermitido(tab.nome, novoReg);
              } catch (err) {
                console.warn(`⚠️ Erro ao processar arquivo (${tab.nome}):`, err.message);
                return { ...reg, __upload_error: err.message };
              }
            })
          )
        ).filter((r) => r && typeof r === 'object');

        const registrosComErroLocal = registrosComArquivo.filter((r) => r.__upload_error);
        if (registrosComErroLocal.length > 0) {
          totalErros += registrosComErroLocal.length;
          await marcarRegistrosComoErro(
            tab.nome,
            registrosComErroLocal,
            registrosComErroLocal[0].__upload_error
          );
        }

        registrosComArquivo = registrosComArquivo.filter((r) => !r.__upload_error);

        if (registrosComArquivo.length === 0) {
          // Se todos foram filtrados, devolve para pendente
          if (registrosComErroLocal.length === 0) {
            await marcarRegistrosComoPendente(tab.nome, registros);
          }
          updateStatus?.(tab.nome, 'concluido', 'Nada válido para enviar', 100);
          continue;
        }

        updateStatus?.(tab.nome, 'enviando', 'Enviando...', 50);

        // Envia ao backend
        const response = await api.post(`upload/${tab.nome}`, { registros: registrosComArquivo });

        if (response.data?.status === 'success') {
          await marcarComoSincronizado(tab.nome, registrosComArquivo, response.data);
          await atualizarUltimaSync(tab.nome, usuario, 'upload');
          await registrarSyncServidor(tab.nome, 'upload', usuario);

          totalProcessados += registrosComArquivo.length;
          updateStatus?.(tab.nome, 'concluido', `${registrosComArquivo.length} enviados`, 100);
          console.log(`✅ ${tab.nome} → ${registrosComArquivo.length} registro(s) enviados`);
        } else {
          throw new Error(`Servidor retornou status inválido (${response.status})`);
        }
      } catch (error) {
        totalErros += 1;
        const msg = error?.message || 'erro desconhecido';
        const httpStatus = error?.response?.status;
        const warnMsg = `Erro no upload de ${tab.nome}: ${msg}`;
        console.warn(`⚠️ ` + warnMsg);
        // Devolve para sync_status=3 (erro) e grava sync_error para retry futuro
        try {
          const pendentes = await buscarRegistrosEmProgresso(tab.nome);
          await marcarRegistrosComoErro(tab.nome, pendentes, httpStatus ? `${httpStatus}: ${msg}` : msg);
        } catch (e2) { console.warn('Falha ao registrar erro nos pendentes:', e2?.message); }
        updateStatus?.(tab.nome, 'erro', msg, 0);
        showToast(warnMsg, 'warning');
      }
    }
  } catch (error) {
    totalErros += 1;
    return resultadoSyncErro('Nao foi possivel concluir o upload.', error, totalProcessados, totalErros);
  } finally {
    await releaseSyncLock('upload');
  }

  return resultadoSyncSucesso(
    totalErros === 0 ? 'Sincronizacao concluida com sucesso.' : 'Sincronizacao concluida com erros.',
    totalProcessados,
    totalErros
  );
}


// ==================== AUXILIARES ====================
function isSafeIdentifier(name) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(String(name));
}

async function salvarLocalmenteSeguro(tabela, registros, updateStatus) {
  return new Promise((resolve, reject) => {
    if (!registros || registros.length === 0) {
      return resolve();
    }

    if (!isSafeIdentifier(tabela)) {
      return reject(new Error(`Tabela invalida para SQLite: ${tabela}`));
    }

    const incomingKeys = Array.from(
      new Set(registros.flatMap((reg) => Object.keys(reg || {})))
    ).filter(isSafeIdentifier);

    db.transaction(
      (tx) => {
        tx.executeSql(`PRAGMA table_info(${tabela})`, [], (_, { rows }) => {
          const validColumns = rows._array.map((col) => col.name).filter(isSafeIdentifier);
          const missingColumns = incomingKeys.filter((key) => !validColumns.includes(key));

          const runUpserts = () => {
            const finalColumns = [...new Set([...validColumns, ...missingColumns])];
            const now = new Date().toISOString();

            registros.forEach((reg, index) => {
              const filteredReg = {};
              Object.keys(reg || {}).forEach((key) => {
                if (finalColumns.includes(key)) {
                  filteredReg[key] = reg[key];
                }
              });

              if (finalColumns.includes('sync_status')) {
                filteredReg.sync_status = 1;
              }

              if (finalColumns.includes('data_sincronizacao') && !filteredReg.data_sincronizacao) {
                filteredReg.data_sincronizacao = now;
              }

              const cols = Object.keys(filteredReg).filter(isSafeIdentifier);
              if (cols.length === 0) return;

              const vals = cols.map((col) => filteredReg[col]);
              const ph = vals.map(() => '?').join(', ');
              // Nunca sobrescreve registros pendentes/erro/sincronizando do usuario
              const hasPendingGuard = cols.includes('id') && finalColumns.includes('sync_status') && filteredReg.id !== undefined && filteredReg.id !== null;
              const sql = hasPendingGuard
                ? `INSERT OR REPLACE INTO ${tabela} (${cols.join(', ')}) SELECT ${ph} WHERE NOT EXISTS (SELECT 1 FROM ${tabela} WHERE id = ? AND sync_status IN (0, 2, 3))`
                : `INSERT OR REPLACE INTO ${tabela} (${cols.join(', ')}) VALUES (${ph})`;
              const params = hasPendingGuard ? [...vals, filteredReg.id] : vals;

              tx.executeSql(
                sql,
                params,
                () => {
                  if (index === 0 || index === registros.length - 1 || index % 50 === 0) {
                    updateStatus?.(
                      tabela,
                      'baixando',
                      `Salvando ${index + 1}/${registros.length}`,
                      60 + ((index + 1) / registros.length) * 30
                    );
                  }
                },
                (_t, err) => {
                  console.warn(`Erro ao salvar ${tabela}:`, err?.message);
                  return false;
                }
              );
            });
          };

          const addNextColumn = (idx = 0) => {
            if (idx >= missingColumns.length) {
              runUpserts();
              return;
            }

            const newCol = missingColumns[idx];
            tx.executeSql(
              `ALTER TABLE ${tabela} ADD COLUMN ${newCol} TEXT;`,
              [],
              () => addNextColumn(idx + 1),
              (_t, err) => {
                const msg = err?.message || '';
                // "duplicate column" e idempotente — ignora silenciosamente
                if (!/duplicate column/i.test(msg)) {
                  console.warn(`Aviso ao criar coluna ${newCol}:`, msg);
                }
                addNextColumn(idx + 1);
                return false;
              }
            );
          };

          addNextColumn();
        });
      },
      (error) => {
        console.error(`Falha ao salvar ${tabela}:`, error?.message);
        reject(error);
      },
      () => resolve()
    );
  });
}

async function salvarLocalmente(tabela, registros, updateStatus) {
  return salvarLocalmenteSeguro(tabela, registros, updateStatus);
}

async function buscarNaoSincronizados(tabela) {
  return new Promise((resolve) => {
    db.readTransaction((tx) => {
      tx.executeSql(
        // Pendentes (0) ou em erro (3) = elegiveis para envio. Status 2 (em voo)
        // significa que outra execucao esta processando — nao retomar aqui.
        `SELECT rowid AS __rowid, * FROM ${tabela} WHERE sync_status IN (0, 3);`,
        [],
        (_, { rows }) => resolve(rows._array || []),
        () => resolve([])
      );
    });
  });
}

async function buscarRegistrosEmProgresso(tabela) {
  return new Promise((resolve) => {
    db.readTransaction((tx) => {
      tx.executeSql(
        `SELECT rowid AS __rowid, * FROM ${tabela} WHERE sync_status = 2;`,
        [],
        (_, { rows }) => resolve(rows._array || []),
        () => resolve([])
      );
    });
  });
}

function chunkPlaceholders(n) {
  return new Array(n).fill('?').join(', ');
}

function coletarChavesParaWhere(registros) {
  const rowids = [...new Set((registros || []).map((r) => r.__rowid).filter((v) => v !== undefined && v !== null))];
  const ids = [...new Set((registros || []).map((r) => r.id).filter((v) => v !== undefined && v !== null && v !== ''))];
  const idsLocais = [...new Set((registros || []).map((r) => r.id_local).filter((v) => v !== undefined && v !== null && v !== ''))];

  const clauses = [];
  const params = [];
  if (rowids.length) { clauses.push(`rowid IN (${chunkPlaceholders(rowids.length)})`); params.push(...rowids); }
  if (ids.length) { clauses.push(`id IN (${chunkPlaceholders(ids.length)})`); params.push(...ids); }
  if (idsLocais.length) { clauses.push(`id_local IN (${chunkPlaceholders(idsLocais.length)})`); params.push(...idsLocais); }
  return { clauses, params };
}

async function marcarRegistrosComoSincronizando(tabela, registros = []) {
  const { clauses, params } = coletarChavesParaWhere(registros);
  if (clauses.length === 0) return;

  return new Promise((resolve) => {
    db.transaction(
      (tx) => {
        tx.executeSql(
          `UPDATE ${tabela}
             SET sync_status = 2,
                 sync_attempts = COALESCE(sync_attempts, 0) + 1
           WHERE sync_status IN (0, 3) AND (${clauses.join(' OR ')});`,
          params,
          () => resolve(),
          (_tx, err) => { console.warn(`Erro ao marcar como sincronizando ${tabela}: ${err?.message}`); resolve(); return false; }
        );
      },
      () => resolve()
    );
  });
}

async function marcarRegistrosComoPendente(tabela, registros = []) {
  const { clauses, params } = coletarChavesParaWhere(registros);
  if (clauses.length === 0) return;

  return new Promise((resolve) => {
    db.transaction(
      (tx) => {
        tx.executeSql(
          `UPDATE ${tabela} SET sync_status = 0 WHERE sync_status = 2 AND (${clauses.join(' OR ')});`,
          params,
          () => resolve(),
          (_tx, err) => { console.warn(`Erro ao reverter para pendente ${tabela}: ${err?.message}`); resolve(); return false; }
        );
      },
      () => resolve()
    );
  });
}

async function marcarRegistrosComoErro(tabela, registros = [], mensagem = 'erro desconhecido') {
  const { clauses, params } = coletarChavesParaWhere(registros);
  if (clauses.length === 0) return;

  const msgLimpa = String(mensagem).slice(0, 500);

  return new Promise((resolve) => {
    db.transaction(
      (tx) => {
        // Promove a ABANDONED (99) quando sync_attempts >= MAX; senao marca como ERROR (3).
        // CASE evita 2 UPDATEs separados e mantem atomicidade.
        tx.executeSql(
          `UPDATE ${tabela}
             SET sync_status = CASE
                   WHEN COALESCE(sync_attempts, 0) >= ? THEN 99
                   ELSE 3
                 END,
                 sync_error = ?
           WHERE (${clauses.join(' OR ')});`,
          [MAX_SYNC_ATTEMPTS, msgLimpa, ...params],
          () => {
            // Log dedicado para abandonados (nao serao mais retentados sozinhos)
            tx.executeSql(
              `SELECT rowid, id_local, sync_attempts, sync_error FROM ${tabela}
                WHERE sync_status = 99 AND (${clauses.join(' OR ')});`,
              params,
              (_t, { rows }) => {
                const abandonados = rows._array || [];
                if (abandonados.length > 0) {
                  console.error(
                    `[ABANDONADO] ${tabela}: ${abandonados.length} registro(s) excederam ${MAX_SYNC_ATTEMPTS} tentativas. ` +
                    `IDs locais: ${abandonados.map(r => r.id_local || `rowid=${r.rowid}`).join(', ')}`
                  );
                }
                resolve();
              },
              () => resolve()
            );
          },
          (_tx, err) => { console.warn(`Erro ao marcar como erro ${tabela}: ${err?.message}`); resolve(); return false; }
        );
      },
      () => resolve()
    );
  });
}

/**
 * Reativa registros abandonados (sync_status=99) — zera sync_attempts e devolve para
 * pendente (sync_status=0). Usar quando o usuario corrige o problema (ex: edita o
 * registro com dados corretos) e quer forcar nova tentativa.
 *
 * Pode receber: lista de id_local ou nada (reativa todos os abandonados da tabela).
 */
export async function reativarRegistrosAbandonados(tabela, idsLocais = null) {
  let sql = `UPDATE ${tabela}
               SET sync_status = 0,
                   sync_attempts = 0,
                   sync_error = NULL
             WHERE sync_status = 99`;
  const params = [];
  if (Array.isArray(idsLocais) && idsLocais.length > 0) {
    sql += ` AND id_local IN (${idsLocais.map(() => '?').join(', ')})`;
    params.push(...idsLocais);
  }
  sql += `;`;

  return new Promise((resolve) => {
    db.transaction(
      (tx) => {
        tx.executeSql(sql, params,
          (_t, res) => { console.log(`[Reativacao] ${tabela}: ${res?.rowsAffected ?? 0} registro(s) abandonados foram reativados.`); resolve(res?.rowsAffected ?? 0); },
          (_tx, err) => { console.warn(`Erro ao reativar ${tabela}: ${err?.message}`); resolve(0); return false; }
        );
      },
      () => resolve(0)
    );
  });
}

/**
 * Conta quantos registros abandonados existem em uma tabela (ou em todas as
 * tabelas de upload se tabela=null). Util para a UI exibir "X cadastros que
 * falharam varias vezes — verificar".
 */
export async function contarAbandonados(tabela = null) {
  const tabelas = tabela
    ? [tabela]
    : TABELAS_UPLOAD.map(t => t.nome).filter(nome => nome !== 'checklists_frota');

  const resultado = {};
  let total = 0;
  for (const tab of tabelas) {
    const rows = await new Promise((resolve) => {
      db.readTransaction((tx) => {
        tx.executeSql(
          `SELECT COUNT(*) as qtd FROM ${tab} WHERE sync_status = 99;`,
          [],
          (_, { rows: r }) => resolve(r._array || []),
          () => resolve([])
        );
      });
    });
    const qtd = rows[0]?.qtd ?? 0;
    if (qtd > 0) resultado[tab] = qtd;
    total += qtd;
  }
  return { total, detalhes: resultado };
}

// ==================== MARCAR COMO SINCRONIZADO ====================
async function marcarComoSincronizadoSeguro(tabela, registros = [], responseData = null) {
  return new Promise((resolve) => {
    const { clauses, params } = coletarChavesParaWhere(registros);

    // Mapa id_local -> { id_servidor, arquivo_app, arquivo_servidor } retornado pelo backend
    const mapaIdServidor = [];
    if (responseData && Array.isArray(responseData.registros_sincronizados)) {
      for (const item of responseData.registros_sincronizados) {
        const idLocal = item?.uuid_local ?? null;
        const idServidor = item?.id_servidor ?? null;
        if (idLocal && idServidor) {
          mapaIdServidor.push({
            idLocal: String(idLocal),
            idServidor: Number(idServidor),
            arquivoApp: item?.arquivo_app ?? null,
            arquivoServidor: item?.arquivo_servidor ?? null,
          });
        }
      }
    }

    if (clauses.length === 0 && mapaIdServidor.length === 0) {
      console.warn(`Nenhum identificador local para marcar ${tabela} como sincronizado.`);
      return resolve();
    }

    db.transaction(
      (tx) => {
        // 1) Persiste id_servidor + arquivo_servidor por id_local (idempotencia para edicoes futuras)
        for (const { idLocal, idServidor, arquivoApp, arquivoServidor } of mapaIdServidor) {
          if (TABELAS_COM_ARQUIVO_SERVIDOR.has(tabela) && (arquivoApp || arquivoServidor)) {
            tx.executeSql(
              `UPDATE ${tabela}
                 SET id = ?,
                     arquivo_local = COALESCE(arquivo_local, arquivo_app),
                     arquivo_app = COALESCE(?, arquivo_app),
                     arquivo_servidor = COALESCE(?, arquivo_servidor)
               WHERE id_local = ?;`,
              [idServidor, arquivoApp, arquivoServidor, idLocal],
              null,
              (_tx, err) => { console.warn(`Erro ao gravar arquivo_servidor em ${tabela} (id_local=${idLocal}): ${err.message}`); return false; }
            );
          } else {
            tx.executeSql(
              `UPDATE ${tabela} SET id = ? WHERE id_local = ?;`,
              [idServidor, idLocal],
              null,
              (_tx, err) => { console.warn(`Erro ao gravar id_servidor em ${tabela} (id_local=${idLocal}): ${err.message}`); return false; }
            );
          }
        }

        // 2) Marca como sincronizado e limpa sync_error
        if (clauses.length > 0) {
          tx.executeSql(
            `UPDATE ${tabela}
               SET sync_status = 1,
                   sync_error = NULL,
                   synced_at = datetime('now'),
                   data_sincronizacao = datetime('now')
             WHERE sync_status IN (0, 2, 3)
               AND (${clauses.join(' OR ')});`,
            params,
            () => resolve(),
            (_tx, err) => { console.warn(`Erro ao marcar sincronizado em ${tabela}: ${err.message}`); resolve(); return false; }
          );
        } else {
          resolve();
        }
      },
      () => resolve()
    );
  });
}

async function marcarComoSincronizado(tabela, registros = [], responseData = null) {
  return marcarComoSincronizadoSeguro(tabela, registros, responseData);
}

// ==================== HELPER: pendencias por checklist SMS ====================
/**
 * Verifica o estado de sincronizacao de um checklist SMS (vinculo + filhos + imagens + assinaturas).
 * Retorna contagem por estado:
 *   - pendentes  : sync_status IN (0,2,3)  → ainda sera retentado automaticamente
 *   - abandonados: sync_status = 99        → exige intervencao manual
 *   - sincronizados: sync_status = 1
 * Usado pela UI para mostrar badge "OK / Pendente / Falhou".
 */
export async function pendenciasPorRealizado(realizadoIdLocal) {
  if (!realizadoIdLocal) return { pendentes: 0, abandonados: 0, sincronizados: 0, detalhes: {} };

  const tabelas = [
    'sms_checklist_realizado_vinculo',
    'sms_checklist_informacoes_preenchidos',
    'sms_checklist_itens_preenchidos',
    'sms_checklist_preenchido_assinaturas',
  ];

  const detalhes = {};
  let pendentes = 0;
  let abandonados = 0;
  let sincronizados = 0;

  const contar = async (tab, where, params) => {
    const rows = await new Promise((resolve) => {
      db.readTransaction((tx) => {
        tx.executeSql(
          `SELECT
              SUM(CASE WHEN sync_status IN (0,2,3) THEN 1 ELSE 0 END) AS pend,
              SUM(CASE WHEN sync_status = 99 THEN 1 ELSE 0 END) AS abd,
              SUM(CASE WHEN sync_status = 1 THEN 1 ELSE 0 END) AS ok
           FROM ${tab} WHERE ${where};`,
          params,
          (_, { rows: r }) => resolve(r._array || []),
          () => resolve([])
        );
      });
    });
    const row = rows[0] || {};
    const pend = row.pend ?? 0;
    const abd = row.abd ?? 0;
    const ok = row.ok ?? 0;
    if (pend || abd) detalhes[tab] = { pendentes: pend, abandonados: abd };
    pendentes += pend;
    abandonados += abd;
    sincronizados += ok;
  };

  for (const tab of tabelas) {
    const coluna = tab === 'sms_checklist_realizado_vinculo' ? 'id_local' : 'realizado_id';
    await contar(tab, `${coluna} = ?`, [realizadoIdLocal]);
  }

  // Imagens dependem de itens preenchidos → pega indireto
  await contar(
    'sms_checklist_preenchido_imagens',
    `preenchido_id IN (SELECT id_local FROM sms_checklist_itens_preenchidos WHERE realizado_id = ?)`,
    [realizadoIdLocal]
  );

  return { pendentes, abandonados, sincronizados, detalhes };
}
