import * as FileSystem from 'expo-file-system';
import { db, TABELAS_UPLOAD_SMS, TABELAS_UPLOAD_VEICULOS } from './database';

const SQLITE_DIR = `${FileSystem.documentDirectory}SQLite/`;

// Unica fonte da verdade para "tabelas que enviam dados para o servidor".
// Catalogos baixados (veiculos, obras, funcionarios, etc.) NAO entram aqui —
// seu sync_status reflete o estado da copia local, nao pendencia de upload.
const TABELAS_SINCRONIZAVEIS_UPLOAD = [
  ...TABELAS_UPLOAD_SMS,
  ...TABELAS_UPLOAD_VEICULOS,
];

// Labels amigaveis para exibir ao usuario no Alert de pendencias
const LABEL_TABELA = {
  veiculo_horimetro: 'Horimetro',
  veiculo_quilometragems: 'Hodometro',
  veiculo_abastecimentos: 'Abastecimentos',
  veiculos_diario_bordo: 'Diario de Bordo',
  veiculo_checklist_itens_servicos: 'Checklist (servicos)',
  veiculo_checklist_itens_realizados: 'Checklist (itens realizados)',
  veiculo_checklist_evidencias: 'Fotos do checklist',
  sms_checklist_realizado_vinculo: 'Checklist SMS',
  sms_checklist_informacoes_preenchidos: 'Informacoes do checklist SMS',
  sms_checklist_itens_preenchidos: 'Itens do checklist SMS',
  sms_checklist_preenchido_imagens: 'Fotos do checklist SMS',
  sms_checklist_preenchido_assinaturas: 'Assinaturas do checklist SMS',
};

function labelDe(tabela) {
  return LABEL_TABELA[tabela] || tabela;
}

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

/**
 * Verifica registros nao sincronizados nas tabelas de UPLOAD + logs pendentes.
 * Percorre TODAS as tabelas (nao para no primeiro hit) para devolver o panorama
 * completo, util para mostrar Alert detalhado ao usuario.
 *
 * IMPORTANTE: catalogos baixados do servidor (veiculos, obras, etc.) NAO sao
 * checados — sao copia local do MySQL, nao representam pendencia de upload.
 *
 * Retorna:
 *   {
 *     temPendencia: boolean,
 *     totalRegistros: number,
 *     totalLogs: number,
 *     detalhes: [{ tabela, label, pendentes, abandonados, total }, ...]
 *   }
 */
export async function verificarPendencias() {
  const detalhes = [];
  let totalRegistros = 0;
  let totalLogs = 0;

  try {
    for (const nomeTabela of TABELAS_SINCRONIZAVEIS_UPLOAD) {
      const colunasInfo = await executeSql(`PRAGMA table_info(${nomeTabela})`).catch(() => []);
      if (!colunasInfo.length) continue;
      const hasSyncStatus = colunasInfo.some(c => c.name === 'sync_status');
      if (!hasSyncStatus) continue;

      // Conta separadamente:
      //   pendentes  (0,2,3) — retry automatico
      //   abandonados (99)   — precisa intervencao manual
      const result = await executeSql(
        `SELECT
            SUM(CASE WHEN sync_status IN (0,2,3) THEN 1 ELSE 0 END) AS pendentes,
            SUM(CASE WHEN sync_status = 99 THEN 1 ELSE 0 END) AS abandonados
           FROM ${nomeTabela}`
      ).catch(() => []);
      const pendentes = result[0]?.pendentes ?? 0;
      const abandonados = result[0]?.abandonados ?? 0;
      const total = pendentes + abandonados;
      if (total > 0) {
        detalhes.push({
          tabela: nomeTabela,
          label: labelDe(nomeTabela),
          pendentes,
          abandonados,
          total,
        });
        totalRegistros += total;
      }
    }

    const logsResult = await executeSql(
      `SELECT COUNT(*) as qtd FROM sync_logs WHERE status_envio_log = 'Pendente'`
    ).catch(() => []);
    totalLogs = logsResult[0]?.qtd ?? 0;

    return {
      temPendencia: totalRegistros > 0 || totalLogs > 0,
      totalRegistros,
      totalLogs,
      detalhes,
    };
  } catch (error) {
    console.error('Erro ao verificar pendências:', error);
    throw new Error('Falha ao verificar dados não sincronizados.');
  }
}

/**
 * Procura arquivos físicos vinculados no banco e os remove do aparelho.
 */
export async function excluirImagensFisicas() {
  const camposDeArquivo = [
    { tabela: 'veiculo_checklist_itens_servicos', colunas: ['foto_extra_1', 'foto_extra_2', 'foto_extra_3', 'foto_extra_4'] },
    { tabela: 'veiculo_checklist_itens_realizados', colunas: ['arquivo_app'] },
    { tabela: 'veiculo_checklist_evidencias', colunas: ['arquivo_local', 'arquivo_app'] },
    { tabela: 'veiculos_diario_bordo', colunas: ['arquivo_app'] },
    { tabela: 'veiculo_abastecimentos', colunas: ['arquivo_app'] },
    { tabela: 'sms_checklist_preenchido_imagens', colunas: ['arquivo_app'] },
    { tabela: 'sms_checklist_preenchido_assinaturas', colunas: ['assinatura_app'] },
  ];

  for (let config of camposDeArquivo) {
    try {
      const colsQuery = config.colunas.join(', ');
      // Tentar ler da tabela (ignora erro se a tabela não existir em alguma versão)
      const registros = await executeSql(`SELECT ${colsQuery} FROM ${config.tabela}`).catch(() => []);
      
      for (let reg of registros) {
        for (let coluna of config.colunas) {
          const uri = reg[coluna];
          if (uri && typeof uri === 'string' && uri.startsWith('file://')) {
            try {
              // Verifica se arquivo existe antes de deletar
              const info = await FileSystem.getInfoAsync(uri);
              if (info.exists) {
                await FileSystem.deleteAsync(uri, { idempotent: true });
              }
            } catch (errFoto) {
              console.warn(`Erro ao excluir imagem ${uri} da coluna ${coluna}:`, errFoto);
              // Não lança exceção para não abortar todo o loop
            }
          }
        }
      }
    } catch (error) {
      console.warn(`Erro ao buscar arquivos da tabela ${config.tabela}:`, error);
    }
  }

  // Tentar limpar pastas inteiras geradas pelo app que possam ter arquivos órfãos (se seguro)
  // Somente pastas conhecidas do app:
  const dirsParaLimpar = ['SMS/imagens/', 'ImagePicker/'];
  for (let dir of dirsParaLimpar) {
    const dirPath = `${FileSystem.documentDirectory}${dir}`;
    try {
      const info = await FileSystem.getInfoAsync(dirPath);
      if (info.exists && info.isDirectory) {
        const files = await FileSystem.readDirectoryAsync(dirPath);
        for (let file of files) {
          const filePath = `${dirPath}${file}`;
          try {
            await FileSystem.deleteAsync(filePath, { idempotent: true });
          } catch (e) {
            console.warn(`Erro ao deletar arquivo órfão ${filePath}`, e);
          }
        }
      }
    } catch (e) {
      console.warn(`Erro ao inspecionar pasta ${dirPath}`, e);
    }
  }
}

/**
 * Remove os arquivos do SQLite, reiniciando o estado local do app.
 */
export async function excluirBancosSQLite() {
  try {
    const info = await FileSystem.getInfoAsync(SQLITE_DIR);
    if (!info.exists) return;

    const arquivos = await FileSystem.readDirectoryAsync(SQLITE_DIR);
    const arquivosParaExcluir = arquivos.filter(nome => nome.endsWith('.db') || nome.endsWith('.db-journal'));

    for (const nomeArquivo of arquivosParaExcluir) {
      const caminho = SQLITE_DIR + nomeArquivo;
      try {
        await FileSystem.deleteAsync(caminho, { idempotent: true });
      } catch (erro) {
        console.error(`Erro ao excluir banco ${nomeArquivo}:`, erro);
        throw new Error(`Falha ao excluir o banco ${nomeArquivo}`);
      }
    }
  } catch (erro) {
    console.error('Erro ao acessar pasta SQLite:', erro);
    throw new Error('Erro ao acessar o diretório do SQLite.');
  }
}

/**
 * Orquestrador principal da limpeza.
 *
 * Comportamento padrao (seguro): se houver pendencias, lanca erro
 * PENDENCIAS_ENCONTRADAS com detalhes para a UI exibir Alert claro.
 *
 * @param {{ force?: boolean }} [opts]
 *  - force=true: pula verificacao de pendencias e apaga TUDO (perde dados nao enviados).
 *    Use somente com confirmacao explicita do usuario.
 */
export async function limparDadosLocaisSeguro(opts = {}) {
  const { force = false } = opts;

  if (!force) {
    const resumo = await verificarPendencias();
    if (resumo.temPendencia) {
      const error = new Error('PENDENCIAS_ENCONTRADAS');
      error.code = 'PENDENCIAS_ENCONTRADAS';
      error.detalhes = resumo.detalhes;
      error.totalRegistros = resumo.totalRegistros;
      error.totalLogs = resumo.totalLogs;
      throw error;
    }
  } else {
    console.warn('[Cleanup] FORCE=true — apagando dados locais sem verificar pendencias');
  }

  await excluirImagensFisicas();
  await excluirBancosSQLite();
}

/**
 * Apaga somente os registros marcados como ABANDONADOS (sync_status = 99),
 * em todas as tabelas de upload. Util quando o usuario nao consegue limpar
 * a base por causa de registros que ja falharam o suficiente (excederam
 * MAX_SYNC_ATTEMPTS) e nao vao sincronizar.
 *
 * Esta operacao NAO toca em registros pendentes (0), em voo (2) ou em erro (3) —
 * eles continuam disponiveis para retry automatico.
 *
 * Retorna { totalApagados: number, porTabela: {tabela: qtd} }.
 */
export async function excluirRegistrosAbandonados() {
  const porTabela = {};
  let totalApagados = 0;

  for (const nomeTabela of TABELAS_SINCRONIZAVEIS_UPLOAD) {
    try {
      const colunasInfo = await executeSql(`PRAGMA table_info(${nomeTabela})`).catch(() => []);
      if (!colunasInfo.length) continue;
      const hasSyncStatus = colunasInfo.some(c => c.name === 'sync_status');
      if (!hasSyncStatus) continue;

      // Conta antes de apagar (rowsAffected nem sempre vem na API legada)
      const cnt = await executeSql(
        `SELECT COUNT(*) as qtd FROM ${nomeTabela} WHERE sync_status = 99`
      ).catch(() => []);
      const qtd = cnt[0]?.qtd ?? 0;
      if (qtd === 0) continue;

      // Coleta arquivos locais (file://) antes de apagar para tambem remover do disco
      const colNames = colunasInfo.map(c => c.name);
      const camposArquivo = ['arquivo_app', 'arquivo_local', 'foto_extra_1', 'foto_extra_2', 'foto_extra_3', 'foto_extra_4']
        .filter(c => colNames.includes(c));

      if (camposArquivo.length > 0) {
        const regs = await executeSql(
          `SELECT ${camposArquivo.join(', ')} FROM ${nomeTabela} WHERE sync_status = 99`
        ).catch(() => []);
        for (const reg of regs) {
          for (const campo of camposArquivo) {
            const uri = reg[campo];
            if (uri && typeof uri === 'string' && uri.startsWith('file://')) {
              try {
                const info = await FileSystem.getInfoAsync(uri);
                if (info.exists) await FileSystem.deleteAsync(uri, { idempotent: true });
              } catch (e) { /* ignora — arquivo ja removido ou inacessivel */ }
            }
          }
        }
      }

      await executeSql(`DELETE FROM ${nomeTabela} WHERE sync_status = 99`);
      porTabela[nomeTabela] = qtd;
      totalApagados += qtd;
      console.warn(`[Cleanup] ${nomeTabela}: ${qtd} registro(s) abandonado(s) removido(s)`);
    } catch (e) {
      console.error(`[Cleanup] Falha ao apagar abandonados de ${nomeTabela}:`, e?.message);
    }
  }

  return { totalApagados, porTabela };
}

/**
 * Apaga registros especificos por id_local em uma tabela de upload.
 * Util para a UI permitir exclusao individual de pendencias travadas.
 *
 * Tambem remove arquivos locais (file://) associados, se a tabela tiver campos
 * de arquivo (arquivo_app/foto_extra_*).
 */
export async function excluirRegistrosPorIdLocal(tabela, idsLocais = []) {
  if (!TABELAS_SINCRONIZAVEIS_UPLOAD.includes(tabela)) {
    throw new Error(`Tabela '${tabela}' nao e de upload e nao pode ser apagada por aqui.`);
  }
  if (!Array.isArray(idsLocais) || idsLocais.length === 0) return 0;

  const placeholders = idsLocais.map(() => '?').join(',');

  // Limpa arquivos locais antes
  const colunasInfo = await executeSql(`PRAGMA table_info(${tabela})`).catch(() => []);
  const colNames = colunasInfo.map(c => c.name);
  const camposArquivo = ['arquivo_app', 'arquivo_local', 'foto_extra_1', 'foto_extra_2', 'foto_extra_3', 'foto_extra_4']
    .filter(c => colNames.includes(c));

  if (camposArquivo.length > 0) {
    const regs = await executeSql(
      `SELECT ${camposArquivo.join(', ')} FROM ${tabela} WHERE id_local IN (${placeholders})`,
      idsLocais
    ).catch(() => []);
    for (const reg of regs) {
      for (const campo of camposArquivo) {
        const uri = reg[campo];
        if (uri && typeof uri === 'string' && uri.startsWith('file://')) {
          try {
            const info = await FileSystem.getInfoAsync(uri);
            if (info.exists) await FileSystem.deleteAsync(uri, { idempotent: true });
          } catch (e) { /* ignora */ }
        }
      }
    }
  }

  await executeSql(`DELETE FROM ${tabela} WHERE id_local IN (${placeholders})`, idsLocais);
  return idsLocais.length;
}
