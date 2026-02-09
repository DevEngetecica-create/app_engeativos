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

      // 🔹 Clona e sanitiza dados (isola de funções no escopo!)
      const registrosClonados = JSON.parse(JSON.stringify(registros));

      // 🔹 Processa arquivos e remove valores inválidos
      const registrosComArquivo = (
        await Promise.all(
          registrosClonados.map(async (reg) => {
            try {
              // remove qualquer resquício de função
              Object.keys(reg).forEach((key) => {
                if (typeof reg[key] === 'function') reg[key] = null;
                if (typeof reg[key] === 'string') {
                  reg[key] = reg[key]
                    .replace(/async function[\s\S]*$/g, '')
                    .trim()
                    .substring(0, 250);
                }
              });

              if (
                reg.arquivo_app &&
                typeof reg.arquivo_app === 'string' &&
                reg.arquivo_app.startsWith('file://')
              ) {
                const base64 = await FileSystem.readAsStringAsync(reg.arquivo_app, {
                  encoding: FileSystem.EncodingType.Base64,
                });
                const mimeType = reg.arquivo_app.toLowerCase().endsWith('.pdf')
                  ? 'application/pdf'
                  : 'image/jpeg';
                return { ...reg, arquivo_uri: `data:${mimeType};base64,${base64}` };
              }

              return { ...reg, arquivo_uri: reg.arquivo_uri ?? null };
            } catch (err) {
              console.warn(`⚠️ Erro ao processar arquivo (${tab.nome}):`, err.message);
              return reg;
            }
          })
        )
      ).filter((r) => r && typeof r === 'object');

      if (registrosComArquivo.length === 0) {
        updateStatus?.(tab.nome, 'concluido', 'Nada válido para enviar', 100);
        continue;
      }

      updateStatus?.(tab.nome, 'enviando', 'Enviando...', 50);

      // 🔹 Envia ao backend
      const response = await api.post(`upload/${tab.nome}`, { registros: registrosComArquivo });

      // 🔹 Só depois do sucesso, marca sincronizado
      if (response.data?.status === 'success') {
        await marcarComoSincronizado(tab.nome); // agora fora do escopo dos objetos
        await atualizarUltimaSync(tab.nome, usuario, 'upload');
        await registrarSyncServidor(tab.nome, 'upload', usuario);

        updateStatus?.(tab.nome, 'concluido', `${registrosComArquivo.length} enviados`, 100);
        console.log(`✅ ${tab.nome} → ${registrosComArquivo.length} registro(s) enviados`);
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
  return new Promise((resolve, reject) => {
    db.transaction(
      (tx) => {
        tx.executeSql(`DELETE FROM ${tabela}`, []);
        registros.forEach((reg, index) => {
          const cols = Object.keys(reg).join(', ');
          const vals = Object.values(reg);
          const ph = vals.map(() => '?').join(', ');

          tx.executeSql(
            `INSERT OR REPLACE INTO ${tabela} (${cols}) VALUES (${ph})`,
            vals,
            () => {
              updateStatus?.(
                tabela,
                'baixando',
                `Salvando ${index + 1}/${registros.length}`,
                60 + ((index + 1) / registros.length) * 30
              );
            },
            (_t, err) => {
              console.warn(`Erro ao salvar ${tabela}:`, err?.message);
            }
          );
        });
      },
      (error) => {
        console.error(`⚠️ Falha ao salvar ${tabela}:`, error?.message);
        reject(error);
      },
      () => resolve()
    );
  });
}

async function buscarNaoSincronizados(tabela) {
  return new Promise((resolve) => {
    db.readTransaction((tx) => {
      tx.executeSql(
        // ⚠️ Enviar somente registros pendentes (sync_status = 0)
        `SELECT * FROM ${tabela} WHERE sync_status = 0;`,
        [],
        (_, { rows }) => resolve(rows._array || []),
        () => resolve([])
      );
    });
  });
}

// ==================== MARCAR COMO SINCRONIZADO ====================
async function marcarComoSincronizado(tabela) {
  return new Promise((resolve) => {
    try {
      // 🔒 executa de forma isolada e sem escopo global compartilhado
      db.transaction(
        (tx) => {
          tx.executeSql(
            `
              UPDATE ${tabela}
              SET sync_status = 1,
                  data_sincronizacao = datetime('now')
              WHERE sync_status = 0;
            `,
            [],
            () => {
              console.log(`🔁 [${tabela}] registros marcados como sincronizados.`);
            },
            (_tx, err) => {
              console.warn(`⚠️ Erro ao marcar sincronizado em ${tabela}: ${err.message}`);
            }
          );
        },
        (error) => {
          console.error(`⚠️ Erro na transação SQLite (${tabela}):`, error?.message);
          resolve(); // mesmo com erro, encerra o Promise
        },
        () => {
          // ✅ sucesso
          console.log(`✅ ${tabela} atualizado → sync_status = 1`);
          resolve();
        }
      );
    } catch (err) {
      console.error(`💥 Falha inesperada em marcarComoSincronizado(${tabela}):`, err.message);
      resolve();
    }
  });
}

