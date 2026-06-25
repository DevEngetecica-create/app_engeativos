import { db } from './database';
import api from '../api';
import uuid from 'react-native-uuid';
import * as FileSystem from 'expo-file-system';
import { getGlobalNetworkStatus } from '../../contexts/network';
import { getConnectionSnapshot, isGoodSignal } from '../net/connectionSnapshot';
import { MAX_SYNC_ATTEMPTS } from './syncConstants';

// Helper para executar SQL
const executeSql = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        sql,
        params,
        (_, { rows }) => resolve(rows._array),
        (_, err) => reject(err)
      );
    });
  });

function ensureCanSyncOrThrow() {
  const { isOffline } = getGlobalNetworkStatus();
  if (isOffline) {
    const e = new Error('APP_OFFLINE');
    e.code = 'APP_OFFLINE';
    throw e;
  }

  const snap = getConnectionSnapshot();
  const quality = snap?.qualityPct ?? 0;
  const reachable = snap?.isInternetReachable !== false;
  if (!reachable || !isGoodSignal(quality)) {
    const e = new Error('SINAL_FRACO_OU_INDISPONIVEL');
    e.code = 'WEAK_OR_NO_SIGNAL';
    throw e;
  }
}

const TABELA_EVIDENCIAS_VEICULO = 'veiculo_checklist_evidencias';
const CAMPOS_FOTO_VEICULO = {
  veiculo_checklist_itens_servicos: ['foto_extra_1', 'foto_extra_2', 'foto_extra_3', 'foto_extra_4'],
  veiculo_checklist_itens_realizados: ['arquivo_app'],
};

function isArquivoLocal(uri) {
  return typeof uri === 'string' && (uri.startsWith('file://') || uri.startsWith('data:'));
}

function nomeArquivo(uri) {
  if (!uri || typeof uri !== 'string') return null;
  return uri.split('/').pop() || uri;
}

function idLocalEvidencia(parentTabela, parentIdLocal, campoFoto) {
  return `${parentTabela}:${parentIdLocal}:${campoFoto}`;
}

// ==================== CICLO DE VIDA DO STATUS ====================
//
// Mantemos o mesmo contrato do syncService:
//   0 = pendente, 1 = synced, 2 = sincronizando (em voo),
//   3 = erro (retry automatico), 99 = abandonado (intervencao manual).
//
async function marcarSincronizando(tabela, idLocal) {
  await executeSql(
    `UPDATE ${tabela}
        SET sync_status = 2,
            sync_attempts = COALESCE(sync_attempts, 0) + 1
      WHERE id_local = ? AND sync_status IN (0, 3);`,
    [idLocal]
  );
}

async function marcarSincronizado(tabela, idLocal, serverId = null) {
  if (serverId !== null && serverId !== undefined) {
    await executeSql(
      `UPDATE ${tabela}
          SET sync_status = 1,
              sync_error = NULL,
              synced_at = datetime('now'),
              data_sincronizacao = datetime('now'),
              id = COALESCE(?, id)
        WHERE id_local = ?;`,
      [serverId, idLocal]
    );
  } else {
    await executeSql(
      `UPDATE ${tabela}
          SET sync_status = 1,
              sync_error = NULL,
              synced_at = datetime('now'),
              data_sincronizacao = datetime('now')
        WHERE id_local = ?;`,
      [idLocal]
    );
  }
}

async function marcarErro(tabela, idLocal, mensagem) {
  const msgLimpa = String(mensagem || 'erro desconhecido').slice(0, 500);
  // Promove a 99 (abandonado) quando excede MAX_SYNC_ATTEMPTS
  await executeSql(
    `UPDATE ${tabela}
        SET sync_status = CASE
              WHEN COALESCE(sync_attempts, 0) >= ? THEN 99
              ELSE 3
            END,
            sync_error = ?
      WHERE id_local = ?;`,
    [MAX_SYNC_ATTEMPTS, msgLimpa, idLocal]
  );

  // Loga abandonados explicitamente
  const rows = await executeSql(
    `SELECT sync_status, sync_attempts FROM ${tabela} WHERE id_local = ?;`,
    [idLocal]
  );
  if (rows[0]?.sync_status === 99) {
    console.error(
      `[ABANDONADO] ${tabela} id_local=${idLocal} excedeu ${MAX_SYNC_ATTEMPTS} tentativas. ultimo_erro="${msgLimpa}"`
    );
  }
}

export async function registrarErroSync(tabela, etapa, idLocal, mensagem, payload, error) {
  try {
    const logUuid = uuid.v4();
    const payloadStr = typeof payload === 'object' ? JSON.stringify(payload) : String(payload);
    const stackTrace = error?.stack || null;
    const msg = error?.message || mensagem;

    await executeSql(
      `INSERT INTO sync_logs (uuid, tabela, etapa, id_local, mensagem, payload_resumido, stack_trace, status_envio_log, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Pendente', datetime('now'))`,
      [logUuid, tabela, etapa, idLocal, msg, payloadStr, stackTrace]
    );

    // Marca o registro pai com sync_status=3/99 + sync_error para retry consciente
    if (idLocal) {
      try { await marcarErro(tabela, idLocal, msg); } catch (e) { /* tabela sem id_local */ }
    }

    // Tenta enviar erro imediatamente se possível, mas em background silencioso
    enviarLogsErroPendentes().catch(() => {});
  } catch (e) {
    console.error('Erro ao salvar sync log no SQLite', e);
  }
}

async function enviarLogsErroPendentes() {
  try {
    const pendentes = await executeSql(`SELECT * FROM sync_logs WHERE status_envio_log = 'Pendente'`);
    if (!pendentes.length) return;

    const response = await api.post('sincronizacoes/log-error', { logs: pendentes });

    if (response.data?.status === 'success') {
      const placeholders = pendentes.map(() => '?').join(',');
      await executeSql(
        `UPDATE sync_logs SET status_envio_log = 'Enviado' WHERE uuid IN (${placeholders})`,
        pendentes.map(l => l.uuid)
      );
    }
  } catch (e) {
    console.log('Não foi possível enviar os logs de erro ao servidor neste momento.');
  }
}

async function gravarServerId(tabela, idLocal, serverId = null) {
  if (serverId === null || serverId === undefined) return;
  await executeSql(
    `UPDATE ${tabela} SET id = COALESCE(?, id), updated_at = COALESCE(updated_at, datetime('now')) WHERE id_local = ?;`,
    [serverId, idLocal]
  );
}

async function upsertEvidenciaLocal({ parentTabela, parentIdLocal, campoFoto, arquivoLocal, userCreate, createdAt }) {
  if (!parentTabela || !parentIdLocal || !campoFoto || !isArquivoLocal(arquivoLocal)) return;

  const idLocal = idLocalEvidencia(parentTabela, parentIdLocal, campoFoto);
  const arquivoApp = nomeArquivo(arquivoLocal);
  const agora = createdAt || new Date().toISOString();
  const existente = await executeSql(
    `SELECT arquivo_local, sync_status FROM ${TABELA_EVIDENCIAS_VEICULO} WHERE id_local = ? LIMIT 1;`,
    [idLocal]
  );

  if (existente.length) {
    const mesmoArquivo = existente[0]?.arquivo_local === arquivoLocal;
    await executeSql(
      `UPDATE ${TABELA_EVIDENCIAS_VEICULO}
          SET parent_tabela = ?,
              parent_id_local = ?,
              campo_foto = ?,
              arquivo_local = ?,
              arquivo_app = ?,
              arquivo_servidor = CASE WHEN ? THEN arquivo_servidor ELSE NULL END,
              sync_status = CASE WHEN ? AND sync_status = 1 THEN 1 ELSE 0 END,
              sync_error = CASE WHEN ? AND sync_status = 1 THEN sync_error ELSE NULL END,
              user_create = COALESCE(user_create, ?),
              updated_at = ?
        WHERE id_local = ?;`,
      [
        parentTabela,
        parentIdLocal,
        campoFoto,
        arquivoLocal,
        arquivoApp,
        mesmoArquivo ? 1 : 0,
        mesmoArquivo ? 1 : 0,
        mesmoArquivo ? 1 : 0,
        userCreate || null,
        agora,
        idLocal,
      ]
    );
    return;
  }

  await executeSql(
    `INSERT INTO ${TABELA_EVIDENCIAS_VEICULO}
      (id_local, parent_tabela, parent_id_local, campo_foto, arquivo_local, arquivo_app, user_create, created_at, updated_at, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0);`,
    [idLocal, parentTabela, parentIdLocal, campoFoto, arquivoLocal, arquivoApp, userCreate || null, agora, agora]
  );
}

async function materializarEvidenciasDoRegistro(registro, parentTabela) {
  const campos = CAMPOS_FOTO_VEICULO[parentTabela] || [];
  for (const campoFoto of campos) {
    const arquivoLocal = registro?.[campoFoto];
    await upsertEvidenciaLocal({
      parentTabela,
      parentIdLocal: registro?.id_local,
      campoFoto,
      arquivoLocal,
      userCreate: registro?.user_create,
      createdAt: registro?.created_at || registro?.data_cadastro,
    });
  }
}

async function materializarEvidenciasLegadas() {
  const servicos = await executeSql(
    `SELECT * FROM veiculo_checklist_itens_servicos
      WHERE foto_extra_1 LIKE 'file://%' OR foto_extra_2 LIKE 'file://%'
         OR foto_extra_3 LIKE 'file://%' OR foto_extra_4 LIKE 'file://%';`
  );
  for (const servico of servicos) {
    await materializarEvidenciasDoRegistro(servico, 'veiculo_checklist_itens_servicos');
  }

  const itens = await executeSql(
    `SELECT * FROM veiculo_checklist_itens_realizados
      WHERE arquivo_app LIKE 'file://%' OR arquivo_app LIKE 'data:%';`
  );
  for (const item of itens) {
    await materializarEvidenciasDoRegistro(item, 'veiculo_checklist_itens_realizados');
  }
}

// ==================== ORQUESTRACAO ====================
//
// IMPORTANTE: este modulo e chamado de dentro de uploadDados (syncService.js),
// que ja detem o sync lock. NAO adquirir lock aqui (causaria deadlock/SYNC_BUSY).
//
export async function uploadChecklists(updateStatus, usuario) {
  try {
    ensureCanSyncOrThrow();

    updateStatus?.('checklists_frota', 'enviando', 'Iniciando upload de checklists...', 0);
    await materializarEvidenciasLegadas();

    // ETAPA 1: ABERTURAS
    await processarAberturas(updateStatus);

    // ETAPA 4 e 7: FECHAMENTOS E ATUALIZACAO DA ABERTURA
    await processarFechamentos(updateStatus);

    // Itens editados depois que o pai ja foi enviado continuam tendo vida
    // propria, como ocorre no SMS.
    await processarItensPendentesComPaiSincronizado(updateStatus);

    // Evidencias antigas de checklists que ja estavam com o pai sincronizado
    // continuam sendo retentadas pelo proprio status local da evidencia.
    await processarEvidenciasPendentes(updateStatus);

    updateStatus?.('checklists_frota', 'concluido', 'Checklists sincronizados com sucesso', 100);

  } catch (error) {
    console.error('Erro na orquestracao do checklist:', error);
    updateStatus?.('checklists_frota', 'erro', error.message || 'Erro na sincronizacao', 0);
    throw error;
  }
}

async function processarAberturas(updateStatus) {
  // Pendentes (0) ou em erro (3) — aceitam retry; 99 abandonado fica de fora
  const aberturas = await executeSql(
    `SELECT * FROM veiculo_checklist_itens_servicos
      WHERE sync_status IN (0, 3) AND tipo_checklist = 'ABERTURA';`
  );
  if (!aberturas.length) return;

  for (let i = 0; i < aberturas.length; i++) {
    const abertura = aberturas[i];
    try {
      updateStatus?.('checklists_frota', 'enviando', `Sincronizando abertura ${i + 1} de ${aberturas.length}`, 10);

      await marcarSincronizando('veiculo_checklist_itens_servicos', abertura.id_local);

      const response = await api.post('sync/checklists/aberturas', { registros: [abertura] });

      // CORREÇÃO: aceitar 'success' E 'partial' como respostas válidas,
      // mas validar o status individual do registro antes de marcar synced.
      const statusGlobal = response.data?.status;
      if (statusGlobal === 'success' || statusGlobal === 'partial') {
        const item0 = response.data?.data?.[0];

        // CORREÇÃO: se o backend marcou este item como 'erro', joga pra catch
        if (!item0 || item0.status === 'erro') {
          throw new Error(item0?.message || 'Abertura rejeitada pelo servidor (status: erro)');
        }

        // CORREÇÃO: server_id obrigatório pra prosseguir com itens/fotos
        if (!item0.server_id) {
          throw new Error('Servidor nao retornou server_id valido para a abertura');
        }

        const server_id = item0.server_id;
        await gravarServerId('veiculo_checklist_itens_servicos', abertura.id_local, server_id);

        // ETAPA 2: itens da abertura
        await processarItens(abertura.id_local, server_id, updateStatus, 'aberturas');

        // ETAPA 3: fotos da abertura
        await materializarEvidenciasDoRegistro(abertura, 'veiculo_checklist_itens_servicos');
        await processarEvidenciasDoPai('veiculo_checklist_itens_servicos', abertura.id_local, updateStatus);

        await marcarSincronizado('veiculo_checklist_itens_servicos', abertura.id_local, server_id);
      } else {
        throw new Error(`Servidor retornou status invalido (${response.status})`);
      }
    } catch (error) {
      const msg = error?.message || 'erro desconhecido';
      await registrarErroSync(
        'veiculo_checklist_itens_servicos',
        'sync_abertura',
        abertura.id_local,
        'Erro no envio da abertura',
        abertura,
        error
      );
      // registrarErroSync ja chama marcarErro, mas reforcamos aqui para garantia
      try { await marcarErro('veiculo_checklist_itens_servicos', abertura.id_local, msg); } catch {}
    }
  }
}

async function processarFechamentos(updateStatus) {
  const fechamentos = await executeSql(
    `SELECT * FROM veiculo_checklist_itens_servicos
      WHERE sync_status IN (0, 3) AND tipo_checklist = 'FECHAMENTO';`
  );
  if (!fechamentos.length) return;

  for (let i = 0; i < fechamentos.length; i++) {
    const fechamento = fechamentos[i];
    try {
      updateStatus?.('checklists_frota', 'enviando', `Sincronizando fechamento ${i + 1} de ${fechamentos.length}`, 60);

      await marcarSincronizando('veiculo_checklist_itens_servicos', fechamento.id_local);

      const response = await api.post('sync/checklists/fechamentos', { registros: [fechamento] });

      const statusGlobalF = response.data?.status;
      if (statusGlobalF === 'success' || statusGlobalF === 'partial') {
        const item0F = response.data?.data?.[0];

        // CORREÇÃO: validar status individual do fechamento
        if (!item0F || item0F.status === 'erro') {
          throw new Error(item0F?.message || 'Fechamento rejeitado pelo servidor (status: erro)');
        }
        if (!item0F.server_id) {
          throw new Error('Servidor nao retornou server_id valido para o fechamento');
        }

        const server_id = item0F.server_id;
        await gravarServerId('veiculo_checklist_itens_servicos', fechamento.id_local, server_id);

        // ETAPA 5: itens do fechamento
        await processarItens(fechamento.id_local, server_id, updateStatus, 'fechamentos');

        // ETAPA 6: fotos do fechamento
        await materializarEvidenciasDoRegistro(fechamento, 'veiculo_checklist_itens_servicos');
        await processarEvidenciasDoPai('veiculo_checklist_itens_servicos', fechamento.id_local, updateStatus);

        // ETAPA 7: atualizar abertura para CONCLUIDO no servidor
        if (fechamento.id_abertura_vinculada) {
          const resAbertura = await executeSql(
            `SELECT status_ciclo FROM veiculo_checklist_itens_servicos WHERE id_local = ?;`,
            [fechamento.id_abertura_vinculada]
          );
          if (resAbertura.length && resAbertura[0].status_ciclo === 'CONCLUIDO') {
            await api.post('sync/checklists/aberturas/concluir', {
              id_local: fechamento.id_abertura_vinculada,
              data_fechamento: fechamento.data_fechamento,
            });
          }
        }

        await marcarSincronizado('veiculo_checklist_itens_servicos', fechamento.id_local, server_id);
      } else {
        throw new Error(`Servidor retornou status invalido (${response.status})`);
      }
    } catch (error) {
      const msg = error?.message || 'erro desconhecido';
      await registrarErroSync(
        'veiculo_checklist_itens_servicos',
        'sync_fechamento',
        fechamento.id_local,
        'Erro no envio do fechamento',
        fechamento,
        error
      );
      try { await marcarErro('veiculo_checklist_itens_servicos', fechamento.id_local, msg); } catch {}
    }
  }
}

async function processarItens(idLocalPai, serverIdPai, updateStatus, etapaPath) {
  const itens = await executeSql(
    `SELECT * FROM veiculo_checklist_itens_realizados
      WHERE sync_status IN (0, 3) AND id_checklist_realizado = ?;`,
    [idLocalPai]
  );
  if (!itens.length) return;

  for (let item of itens) {
    try {
      await marcarSincronizando('veiculo_checklist_itens_realizados', item.id_local);

      const itemFormatado = { ...item };
      itemFormatado.id_checklist_realizado = serverIdPai || idLocalPai;

      const response = await api.post(`sync/checklists/${etapaPath}/itens`, { registros: [itemFormatado] });

      const statusGlobalI = response.data?.status;
      if (statusGlobalI === 'success' || statusGlobalI === 'partial') {
        const item0I = response.data?.data?.[0];

        // CORREÇÃO CRÍTICA: validar que ESTE item foi de fato inserido no servidor.
        // Antes, o backend retornava 'success' mesmo quando o item falhava no MySQL,
        // e o frontend marcava como synced — depois a foto chegava no servidor e
        // dava "Registro pai não encontrado" porque o item nao estava la.
        if (!item0I || item0I.status === 'erro') {
          throw new Error(item0I?.message || 'Item rejeitado pelo servidor (status: erro)');
        }
        if (!item0I.server_id) {
          throw new Error('Servidor nao retornou server_id valido para o item');
        }

        const server_id = item0I.server_id;
        await gravarServerId('veiculo_checklist_itens_realizados', item.id_local, server_id);

        // FOTOS DOS ITENS
        await materializarEvidenciasDoRegistro(item, 'veiculo_checklist_itens_realizados');
        await processarEvidenciasDoPai('veiculo_checklist_itens_realizados', item.id_local, updateStatus);

        await marcarSincronizado('veiculo_checklist_itens_realizados', item.id_local, server_id);
      } else {
        throw new Error(`Servidor retornou status invalido (${response.status})`);
      }
    } catch (error) {
      const msg = error?.message || 'erro desconhecido';
      await registrarErroSync(
        'veiculo_checklist_itens_realizados',
        `sync_itens_${etapaPath}`,
        item.id_local,
        'Erro no envio do item',
        item,
        error
      );
      try { await marcarErro('veiculo_checklist_itens_realizados', item.id_local, msg); } catch {}
    }
  }
}

async function processarItensPendentesComPaiSincronizado(updateStatus) {
  const pais = await executeSql(
    `SELECT DISTINCT s.id_local, s.id, s.tipo_checklist
       FROM veiculo_checklist_itens_servicos s
      WHERE s.sync_status = 1
        AND s.id IS NOT NULL
        AND EXISTS (
          SELECT 1
            FROM veiculo_checklist_itens_realizados r
           WHERE r.id_checklist_realizado = s.id_local
             AND r.sync_status IN (0, 3)
        );`
  );

  for (const pai of pais) {
    const etapaPath = pai.tipo_checklist === 'FECHAMENTO' ? 'fechamentos' : 'aberturas';
    await processarItens(pai.id_local, pai.id, updateStatus, etapaPath);
  }
}

async function processarFotos(registro, tabela, updateStatus) {
  const camposFotos = tabela === 'veiculo_checklist_itens_servicos'
    ? ['foto_extra_1', 'foto_extra_2', 'foto_extra_3', 'foto_extra_4']
    : ['arquivo_app'];

  // Retry seguro: se a tabela tem coluna arquivo_servidor preenchida, a foto ja foi
  // enviada num retry anterior — nao reenviar.
  let urlServidorAtual = null;
  if (tabela === 'veiculo_checklist_itens_realizados' && registro.arquivo_servidor) {
    urlServidorAtual = String(registro.arquivo_servidor);
  }

  for (let campo of camposFotos) {
    const uriLocal = registro[campo];
    if (!uriLocal || !uriLocal.startsWith('file://')) continue;

    // Skip se arquivo_servidor ja existe e essa eh a unica foto (caso itens_realizados)
    if (urlServidorAtual && campo === 'arquivo_app' && urlServidorAtual.startsWith('http')) {
      continue;
    }

    try {
      // Verifica se o arquivo local ainda existe (usuario pode ter limpado cache)
      const info = await FileSystem.getInfoAsync(uriLocal);
      if (!info?.exists) {
        console.warn(`Foto local nao existe mais, pulando: ${uriLocal}`);
        continue;
      }

      const formData = new FormData();
      formData.append('id_local', registro.id_local);
      formData.append('tabela', tabela);
      formData.append('campo_foto', campo);

      const filename = uriLocal.split('/').pop();
      const type = filename.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg';

      formData.append('foto', { uri: uriLocal, name: filename, type });

      const res = await api.post('sync/checklists/fotos', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      });

      const ok = res.data?.status === 'success' || res.data?.message === 'Foto ja existente, ignorada.';
      if (ok) {
        // Persiste arquivo_servidor para retry seguro futuro
        if (tabela === 'veiculo_checklist_itens_realizados' && campo === 'arquivo_app' && res.data?.url) {
          await executeSql(
            `UPDATE veiculo_checklist_itens_realizados SET arquivo_servidor = ? WHERE id_local = ?;`,
            [res.data.url, registro.id_local]
          );
        }
      }
    } catch (error) {
      // Foto que falha NAO derruba o registro pai (ja foi marcado como sync_status=1).
      // Apenas registra o erro para futura tentativa manual ou job dedicado.
      await registrarErroSync(tabela, 'sync_fotos', registro.id_local, `Erro upload foto ${campo}`, null, error);
    }
  }
}

async function buscarEvidenciasPendentes(whereSql = '1=1', params = []) {
  return executeSql(
    `SELECT * FROM ${TABELA_EVIDENCIAS_VEICULO}
      WHERE sync_status IN (0, 3) AND (${whereSql})
      ORDER BY id ASC;`,
    params
  );
}

async function marcarEvidenciaSincronizando(idLocal) {
  await executeSql(
    `UPDATE ${TABELA_EVIDENCIAS_VEICULO}
        SET sync_status = 2,
            sync_attempts = COALESCE(sync_attempts, 0) + 1,
            updated_at = datetime('now')
      WHERE id_local = ? AND sync_status IN (0, 3);`,
    [idLocal]
  );
}

async function marcarEvidenciaSincronizada(evidencia, urlServidor) {
  await executeSql(
    `UPDATE ${TABELA_EVIDENCIAS_VEICULO}
        SET sync_status = 1,
            sync_error = NULL,
            arquivo_servidor = COALESCE(?, arquivo_servidor),
            synced_at = datetime('now'),
            data_sincronizacao = datetime('now'),
            updated_at = datetime('now')
      WHERE id_local = ?;`,
    [urlServidor || null, evidencia.id_local]
  );

  if (evidencia.parent_tabela === 'veiculo_checklist_itens_realizados' && evidencia.campo_foto === 'arquivo_app' && urlServidor) {
    await executeSql(
      `UPDATE veiculo_checklist_itens_realizados SET arquivo_servidor = ? WHERE id_local = ?;`,
      [urlServidor, evidencia.parent_id_local]
    );
  }
}

async function marcarEvidenciaErro(evidencia, error) {
  const msg = error?.message || String(error || 'erro desconhecido');
  await registrarErroSync(
    TABELA_EVIDENCIAS_VEICULO,
    'sync_fotos',
    evidencia.id_local,
    `Erro upload foto ${evidencia.campo_foto}`,
    {
      parent_tabela: evidencia.parent_tabela,
      parent_id_local: evidencia.parent_id_local,
      campo_foto: evidencia.campo_foto,
    },
    error
  );
  await marcarErro(TABELA_EVIDENCIAS_VEICULO, evidencia.id_local, msg);
}

async function processarEvidencia(evidencia, updateStatus) {
  if (evidencia.arquivo_servidor && String(evidencia.arquivo_servidor).trim() !== '') {
    await marcarEvidenciaSincronizada(evidencia, evidencia.arquivo_servidor);
    return true;
  }

  const uriLocal = evidencia.arquivo_local || evidencia.arquivo_app;
  if (!isArquivoLocal(uriLocal)) {
    throw new Error('Evidencia local ausente. Recapture a foto antes de sincronizar.');
  }

  await marcarEvidenciaSincronizando(evidencia.id_local);
  updateStatus?.('checklists_frota', 'enviando', `Enviando foto ${evidencia.campo_foto}...`, 80);

  if (uriLocal.startsWith('file://')) {
    const info = await FileSystem.getInfoAsync(uriLocal);
    if (!info?.exists) {
      throw new Error(`Arquivo local nao encontrado: ${uriLocal}`);
    }
  }

  const filename = nomeArquivo(uriLocal) || `foto_${Date.now()}.jpg`;
  const type = filename.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg';
  const formData = new FormData();
  formData.append('id_local', evidencia.parent_id_local);
  formData.append('tabela', evidencia.parent_tabela);
  formData.append('campo_foto', evidencia.campo_foto);
  formData.append('foto', { uri: uriLocal, name: filename, type });

  const res = await api.post('sync/checklists/fotos', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  });

  const ok = res.data?.status === 'success' || res.data?.message === 'Foto ja existente, ignorada.';
  if (!ok) {
    throw new Error(res.data?.message || 'Servidor retornou status invalido no upload da foto');
  }

  await marcarEvidenciaSincronizada(evidencia, res.data?.url || res.data?.arquivo || null);
  return true;
}

async function processarListaEvidencias(evidencias, updateStatus) {
  let erros = 0;
  for (const evidencia of evidencias) {
    try {
      await processarEvidencia(evidencia, updateStatus);
    } catch (error) {
      erros += 1;
      await marcarEvidenciaErro(evidencia, error);
    }
  }

  if (erros > 0) {
    throw new Error(`${erros} evidencia(s) de checklist de veiculo ficaram pendentes.`);
  }
}

async function processarEvidenciasDoPai(parentTabela, parentIdLocal, updateStatus) {
  // CORREÇÃO (defesa em profundidade): só enviar fotos se o registro pai
  // foi de fato confirmado no servidor (sync_status=1 E id IS NOT NULL).
  // Antes, se um item falhasse no insert do servidor, as fotos ainda eram
  // enviadas e o backend respondia "Registro pai não encontrado".
  // Agora as evidências ficam como sync_status=0 (pendentes) e serão
  // retentadas no próximo ciclo de sincronização, depois que o pai entrar.
  const pai = await executeSql(
    `SELECT sync_status, id FROM ${parentTabela} WHERE id_local = ? LIMIT 1;`,
    [parentIdLocal]
  );

  if (!pai.length || Number(pai[0].sync_status) !== 1 || !pai[0].id) {
    console.warn(
      `[skip-evidencias] Pai ${parentTabela}/${parentIdLocal} nao confirmado no servidor — ` +
      `fotos ficam pendentes para o proximo ciclo.`
    );
    return;
  }

  const evidencias = await buscarEvidenciasPendentes(
    `parent_tabela = ? AND parent_id_local = ?`,
    [parentTabela, parentIdLocal]
  );
  await processarListaEvidencias(evidencias, updateStatus);
}

async function processarEvidenciasPendentes(updateStatus) {
  const evidencias = await buscarEvidenciasPendentes();
  await processarListaEvidencias(evidencias, updateStatus);
}
