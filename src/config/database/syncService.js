// ./src/config/database/syncService.js
import { db } from './database';
import api from '../api';

// Configuração das tabelas
const TABELAS_DOWNLOAD = [
  { nome: 'funcionarios', label: 'Funcionários' },
  { nome: 'obras', label: 'Obras' },
  { nome: 'veiculos', label: 'Veículos' },
  { nome: 'veiculos_locacaos', label: 'Veículos Locados' },
  { nome: 'veiculo_checklist', label: 'Checklist dos Veículos' },
  { nome: 'veiculo_checklist_itens', label: 'Itens do Checklist' },
  { nome: 'veiculo_horimetro', label: 'Horimetro' },
  { nome: 'veiculo_quilometragems', label: 'Hodometro' },
];

const TABELAS_UPLOAD = [
  { nome: 'veiculo_checklist_itens_servicos', label: 'Checklist' },
  { nome: 'veiculo_checklist_itens_realizados', label: 'Itens do Checklist' },
  { nome: 'veiculo_abastecimentos', label: 'Abastecimento do Veículo' },
  { nome: 'veiculos_diario_bordo', label: 'Diário de Bordo' },
];

// ==================== DOWNLOAD (MySQL → SQLite) ====================
export async function downloadDados(updateStatus) {
  for (const tabela of TABELAS_DOWNLOAD) {
    try {
      updateStatus(tabela.nome, 'baixando', 'Iniciando...', 0);

      // 1. Busca dados do servidor
      updateStatus(tabela.nome, 'baixando', 'Buscando dados...', 30);
      const response = await api.get(`download/${tabela.nome}`);
      let registros = response.data?.data;

      // Normaliza se veio objeto único
      if (registros && !Array.isArray(registros)) {
        registros = [registros];
      }
      registros = registros || [];

      if (registros.length === 0) {
        updateStatus(tabela.nome, 'concluido', 'Nada para atualizar', 100);
        continue;
      }

      // 2. Salva localmente
      updateStatus(tabela.nome, 'baixando', 'Salvando local...', 60);
      await salvarLocalmente(tabela.nome, registros, updateStatus);

      updateStatus(tabela.nome, 'concluido', `${registros.length} registros`, 100);
    } catch (error) {
      updateStatus(tabela.nome, 'erro', error.message, 0);
      throw error;
    }
  }
}

// ==================== UPLOAD (SQLite → MySQL) ====================
export async function uploadDados(updateStatus) {
  for (const tabela of TABELAS_UPLOAD) {
    try {
      updateStatus(tabela.nome, 'enviando', 'Preparando...', 0);

      // 1. Busca dados não sincronizados
      const registros = await buscarNaoSincronizados(tabela.nome);
      if (registros.length === 0) {
        updateStatus(tabela.nome, 'concluido', 'Nada para enviar', 100);
        continue;
      }

      // 2. Envia para o servidor
      updateStatus(tabela.nome, 'enviando', 'Enviando...', 50);
      const payload = { registros };
      const response = await api.post(`upload/${tabela.nome}`, payload);

      // Normaliza retorno (lista ou único)
      let enviados = response.data?.data || response.data?.message || null;
      if (Array.isArray(enviados)) {
        enviados = enviados.length;
      } else if (typeof enviados === 'string') {
        // mensagem textual
        // conta registros enviados como fallback
        enviados = registros.length;
      } else {
        enviados = registros.length;
      }

      // 3. Marca como sincronizado
      updateStatus(tabela.nome, 'enviando', 'Atualizando status...', 80);
      await marcarComoSincronizado(tabela.nome);

      updateStatus(tabela.nome, 'concluido', `${enviados} enviados`, 100);
    } catch (error) {
      updateStatus(tabela.nome, 'erro', error.message, 0);
      throw error;
    }
  }
}

// ==================== Auxiliares ====================
async function salvarLocalmente(tabela, registros, updateStatus) {
  return new Promise(resolve => {
    db.transaction(tx => {
      // opcional: limpa tabela antes
      tx.executeSql(`DELETE FROM ${tabela}`, [], () => {
        let cont = 0;
        const total = registros.length;

        function inserir() {
          if (cont >= total) {
            resolve();
            return;
          }

          const reg = registros[cont];
          const cols = Object.keys(reg).join(', ');
          const vals = Object.values(reg);
          const ph = vals.map(() => '?').join(', ');

          tx.executeSql(
            `INSERT OR REPLACE INTO ${tabela} (${cols}) VALUES (${ph})`,
            vals,
            () => {
              cont++;
              updateStatus(
                tabela,
                'baixando',
                `Salvando ${cont}/${total}`,
                60 + (cont/total)*30
              );
              inserir();
            },
            () => { cont++; inserir(); return false; }
          );
        }
        inserir();
      });
    });
  });
}

async function buscarNaoSincronizados(tabela) {
  return new Promise(resolve => {
    db.transaction(tx => {
      tx.executeSql(
        `SELECT * FROM ${tabela} WHERE sync_status = 0;`,
        [],
        (_, { rows }) => resolve(rows._array),
        () => resolve([])
      );
    });
  });
}

async function marcarComoSincronizado(tabela) {
  return new Promise(resolve => {
    db.transaction(tx => {
      tx.executeSql(
        `UPDATE ${tabela} SET sync_status = 1 WHERE sync_status = 0;`,
        [],
        () => resolve(),
        () => resolve()
      );
    });
  });
}

/* export async function limparDados() {
  return new Promise(resolve => {
    db.transaction(tx => {
      TABELAS_DOWNLOAD.forEach(tabela => {
        tx.executeSql(`DELETE FROM ${tabela.nome};`);
      });
      resolve();
    });
  });
} */