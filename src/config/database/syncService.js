// ./src/config/database/syncService.js
import { Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';

import { db } from './database';
import api from '../api';
import { atualizarUltimaSync } from './syncUtils';

// 🔌 estado global de rede (sem hooks)
import { getGlobalNetworkStatus } from '../../contexts/network';
// 📶 snapshot de qualidade de conexão
import { getConnectionSnapshot, isGoodSignal } from '../net/connectionSnapshot';
// 📦 preparação de arquivo (A5): resize/compressão + montagem multipart
import {
  readImageAsBase64DataUri,
  buildUploadFormData,
  inferMimeType,
} from '../../utils/fileUpload';
// 🪵 logger condicional (silencioso em release)
import logger from '../../utils/logger';

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
  { nome: 'sms_funcionarios', label:'Funcionarios SMS'}
];

export const TABELAS_UPLOAD = [
  { nome: 'veiculo_checklist_itens_servicos', label: 'Checklist (Serviços)' },
  { nome: 'veiculo_checklist_itens_realizados', label: 'Itens Realizados' },
  { nome: 'veiculo_horimetro', label: 'Horimetro' },
  { nome: 'veiculo_quilometragems', label: 'Hodometro' },
  { nome: 'veiculo_abastecimentos', label: 'Abastecimento do Veículo' },
  { nome: 'veiculos_diario_bordo', label: 'Diário de Bordo' },
  { nome: 'sms_checklist_realizado_vinculo', label:'Itens Realizados SMS'},
  { nome: 'sms_checklist_informacoes_preenchidos', label:'Informações Preenchidas do Checklist SMS'},
  { nome: 'sms_checklist_itens_preenchidos ', label:'Itens Preenchidos SMS'},
  { nome: 'sms_checklist_preenchido_imagens', label:'Imagens do Checklist SMS'},
  { nome: 'sms_checklist_preenchido_assinaturas', label:'Assinaturas do Checklist SMS'}
];

// 🛡️ Whitelist consolidada para guarda de SQL dinâmico (M5).
// Toda função que interpola `${tabela}` em SQL precisa validar contra
// este Set primeiro. Hoje todos os usos vêm das listas acima, mas mantemos
// a guarda explícita para evitar SQL injection se algum dia a origem mudar.
const TABELAS_PERMITIDAS_SQL = new Set([
  ...TABELAS_DOWNLOAD.map((t) => t.nome.trim()),
  ...TABELAS_UPLOAD.map((t) => t.nome.trim()),
]);

function assertTabelaPermitida(tabela) {
  const nome = typeof tabela === 'string' ? tabela.trim() : '';
  if (!TABELAS_PERMITIDAS_SQL.has(nome)) {
    throw new Error(`Tabela não permitida para SQL local: ${tabela}`);
  }
  return nome;
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

    logger.log(`✅ Sync registrada no servidor: ${tabela} (${tipo})`);
  } catch (err) {
    logger.warn(`⚠️ Erro ao registrar sync no servidor: ${err.message}`);
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
export async function downloadDados(updateStatus, _unused_isOffline, tabela = null, usuario = null) {
  // 💥 checa antes de começar: não percorre tabelas se não puder sincronizar
  try {
    ensureCanSyncOrThrow('baixar dados');
  } catch (e) {
    // não percorre nada
    return;
  }

  const tabelas = tabela
    ? TABELAS_DOWNLOAD.filter((t) => t.nome === tabela)
    : TABELAS_DOWNLOAD;

  for (const tab of tabelas) {
    // segurança: checagem por iteração (caso o usuário mude o modo durante o loop)
    try {
      ensureCanSyncOrThrow('baixar dados');
    } catch (e) {
      // marca visualmente e encerra o loop geral
      updateStatus?.(tab.nome, 'erro', 'Operação bloqueada (offline ou sinal ruim)', 0);
      break;
    }

    try {
      updateStatus?.(tab.nome, 'baixando', 'Buscando dados...', 20);

      const response = await api.get(`download/${tab.nome}`);
      let registros = response.data?.data ?? [];
      if (!Array.isArray(registros)) registros = [registros];

      if (registros.length === 0) {
        updateStatus?.(tab.nome, 'concluido', 'Nada para atualizar', 100);
        continue;
      }

      await salvarLocalmente(tab.nome, registros, updateStatus);

      await atualizarUltimaSync(tab.nome, usuario, 'download');
      await registrarSyncServidor(tab.nome, 'download', usuario);

      updateStatus?.(tab.nome, 'concluido', `${registros.length} registros`, 100);
      console.log(`✅ Dados baixados: ${tab.nome} (${registros.length} registros)`);
    } catch (err) {
      updateStatus?.(tab.nome, 'erro', err.message, 0);
      console.warn(`⚠️ Erro no download de ${tab.nome}: ${err.message}`);
      // em caso de erro inesperado, prossegue para as próximas tabelas
    }
  }
}

// ==================== UPLOAD (SQLite → MySQL) ====================
export async function uploadDados(updateStatus, _unused_isOffline, tabela = null, usuario = null) {
  try {
    ensureCanSyncOrThrow('enviar dados');
  } catch (e) {
    return;
  }

  const tabelas = tabela
    ? TABELAS_UPLOAD.filter((t) => t.nome === tabela)
    : TABELAS_UPLOAD;

  for (const tab of tabelas) {
    try {
      ensureCanSyncOrThrow('enviar dados');
    } catch (e) {
      updateStatus?.(tab.nome, 'erro', 'Operação bloqueada (offline ou sinal ruim)', 0);
      break;
    }

    try {
      updateStatus?.(tab.nome, 'enviando', 'Preparando...', 0);

      // 🔹 Busca pendentes
      const registros = await buscarNaoSincronizados(tab.nome);
      if (!Array.isArray(registros) || registros.length === 0) {
        updateStatus?.(tab.nome, 'concluido', 'Nada para enviar', 100);
        continue;
      }

      // 🔹 Clona registros e sanitiza valores inválidos (apenas funções).
      // ⚠️ NÃO truncar strings nem aplicar regex destrutivo — corrompe dados.
      const registrosClonados = JSON.parse(JSON.stringify(registros));
      registrosClonados.forEach((reg) => {
        if (!reg || typeof reg !== 'object') return;
        Object.keys(reg).forEach((key) => {
          if (typeof reg[key] === 'function') reg[key] = null;
        });
      });

      // 🔍 Há arquivo binário local (file://) em pelo menos um registro?
      const temArquivoLocal = registrosClonados.some(
        (r) =>
          r &&
          typeof r.arquivo_app === 'string' &&
          r.arquivo_app.startsWith('file://')
      );

      let response;
      if (temArquivoLocal) {
        // ─── A5.2 — Caminho MULTIPART ─────────────────────────────────
        // buildUploadFormData faz resize/JPEG-85 em imagens, anexa cada
        // arquivo por id_local em files[<id_local>][arquivo] e serializa
        // o restante em "registros_json". O backend (uploadSeguro) detecta
        // Content-Type multipart e segue um branch aditivo que reutiliza
        // a mesma whitelist de colunas + idempotência por id_local.
        // PDFs passam intactos (sem resize).
        updateStatus?.(tab.nome, 'enviando', 'Preparando arquivos...', 30);
        const { formData, totalArquivos } = await buildUploadFormData(registrosClonados);

        updateStatus?.(tab.nome, 'enviando', `Enviando ${totalArquivos} arquivo(s)...`, 60);
        response = await api.post(`upload/${tab.nome}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          // Uploads de arquivo podem demorar; relaxa o timeout padrão de 30s.
          timeout: 120000,
        });
      } else {
        // ─── A5.1 — Caminho JSON tradicional ──────────────────────────
        // Nenhum file:// local. Mantemos o contrato JSON antigo para
        // máxima compatibilidade com versões do backend pré-A5.
        // Se algum registro já trouxer arquivo_uri pronto (data:...),
        // ele segue. PDFs no SQLite gravado como caminho seguem.
        const registrosPayload = await Promise.all(
          registrosClonados.map(async (reg) => {
            try {
              // (caso raro) — algum registro pode ter arquivo_app como
              // path absoluto sem file:// e ainda assim ser imagem; aqui
              // poderíamos passar pelo resize, mas não acontece no fluxo
              // normal. Mantemos comportamento antigo.
              return { ...reg, arquivo_uri: reg.arquivo_uri ?? null };
            } catch (err) {
              if (__DEV__) console.warn(`[sync] erro em ${tab.nome}:`, err?.message);
              return reg;
            }
          })
        );

        updateStatus?.(tab.nome, 'enviando', 'Enviando...', 50);
        response = await api.post(`upload/${tab.nome}`, { registros: registrosPayload });
      }

      // 🔹 Só depois do sucesso, marca sincronizado
      if (response.data?.status === 'success') {
        await marcarComoSincronizado(tab.nome); // agora fora do escopo dos objetos
        await atualizarUltimaSync(tab.nome, usuario, 'upload');
        await registrarSyncServidor(tab.nome, 'upload', usuario);

        const totalEnviado = registrosClonados.length;
        updateStatus?.(tab.nome, 'concluido', `${totalEnviado} enviados`, 100);
        if (__DEV__) console.log(`✅ ${tab.nome} → ${totalEnviado} registro(s) enviados`);
      } else {
        throw new Error(`Servidor retornou status inválido (${response.status})`);
      }
    } catch (error) {
      console.warn(`⚠️ Erro no upload de ${tab.nome}: ${error.message}`);
      updateStatus?.(tab.nome, 'erro', error.message, 0);
    }
  }
}


// ==================== AUXILIARES ====================
async function salvarLocalmente(tabela, registros, updateStatus) {
  const tabelaSafe = assertTabelaPermitida(tabela);
  return new Promise((resolve, reject) => {
    db.transaction(
      (tx) => {
        tx.executeSql(`DELETE FROM ${tabelaSafe}`, []);
        registros.forEach((reg, index) => {
          const cols = Object.keys(reg).join(', ');
          const vals = Object.values(reg);
          const ph = vals.map(() => '?').join(', ');

          tx.executeSql(
            `INSERT OR REPLACE INTO ${tabelaSafe} (${cols}) VALUES (${ph})`,
            vals,
            () => {
              updateStatus?.(
                tabelaSafe,
                'baixando',
                `Salvando ${index + 1}/${registros.length}`,
                60 + ((index + 1) / registros.length) * 30
              );
            },
            (_t, err) => {
              logger.warn(`Erro ao salvar ${tabelaSafe}:`, err?.message);
            }
          );
        });
      },
      (error) => {
        logger.error(`⚠️ Falha ao salvar ${tabelaSafe}:`, error?.message);
        reject(error);
      },
      () => resolve()
    );
  });
}

async function buscarNaoSincronizados(tabela) {
  const tabelaSafe = assertTabelaPermitida(tabela);
  return new Promise((resolve) => {
    db.readTransaction((tx) => {
      tx.executeSql(
        // ⚠️ Enviar somente registros pendentes (sync_status = 0)
        `SELECT * FROM ${tabelaSafe} WHERE sync_status = 0;`,
        [],
        (_, { rows }) => resolve(rows._array || []),
        () => resolve([])
      );
    });
  });
}

// ==================== MARCAR COMO SINCRONIZADO ====================
async function marcarComoSincronizado(tabela) {
  const tabelaSafe = assertTabelaPermitida(tabela);
  return new Promise((resolve) => {
    try {
      // 🔒 executa de forma isolada e sem escopo global compartilhado
      db.transaction(
        (tx) => {
          tx.executeSql(
            `
              UPDATE ${tabelaSafe}
              SET sync_status = 1,
                  data_sincronizacao = datetime('now')
              WHERE sync_status = 0;
            `,
            [],
            () => {
              logger.log(`🔁 [${tabelaSafe}] registros marcados como sincronizados.`);
            },
            (_tx, err) => {
              logger.warn(`⚠️ Erro ao marcar sincronizado em ${tabelaSafe}: ${err.message}`);
            }
          );
        },
        (error) => {
          logger.error(`⚠️ Erro na transação SQLite (${tabelaSafe}):`, error?.message);
          resolve(); // mesmo com erro, encerra o Promise
        },
        () => {
          logger.log(`✅ ${tabelaSafe} atualizado → sync_status = 1`);
          resolve();
        }
      );
    } catch (err) {
      logger.error(`💥 Falha inesperada em marcarComoSincronizado(${tabelaSafe}):`, err.message);
      resolve();
    }
  });
}

