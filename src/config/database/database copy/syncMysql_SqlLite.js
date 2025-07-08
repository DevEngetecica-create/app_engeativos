import { db } from './database';
import api from '../api';

export async function downloadDados(updateStatusCallback) {
  const tabelas = [
    'usuarios',
    'niveis_usuarios',
    'usuario_vinculo',
    'obras',
    'veiculos'
  ];

  for (const tabela of tabelas) {
    try {
      updateStatusCallback(tabela, 'baixando', 'Iniciando download...', 0);
      await downloadTabela(tabela, updateStatusCallback);
      updateStatusCallback(tabela, 'concluido', 'Download concluído', 100);
    } catch (error) {
      updateStatusCallback(tabela, 'erro', `Erro: ${error.message}`, 0);
      console.error(`Erro na tabela ${tabela}:`, error);
    }
  }
}

async function downloadTabela(tabela, updateStatus) {
  try {
    // 1. Busca dados atualizados do MySQL
    updateStatus(tabela, 'baixando', 'Buscando no servidor...', 20);
    const response = await api.get(`download/${tabela}`);
    const registros = response.data;

    if (!registros || registros.length === 0) {
      updateStatus(tabela, 'concluido', 'Nenhum dado novo', 100);
      return;
    }

    // 2. Insere/atualiza no SQLite
    updateStatus(tabela, 'baixando', 'Salvando localmente...', 60);
    await salvarRegistrosLocalmente(tabela, registros, updateStatus);

    updateStatus(tabela, 'concluido', `${registros.length} registros atualizados`, 100);
  } catch (error) {
    throw new Error(`Falha ao baixar ${tabela}: ${error.message}`);
  }
}

async function salvarRegistrosLocalmente(tabela, registros, updateStatus) {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      // Primeiro deleta registros obsoletos (opcional)
      tx.executeSql(`DELETE FROM ${tabela}`, [], () => {
        let processed = 0;
        const total = registros.length;

        const insertNext = () => {
          if (processed >= total) {
            resolve();
            return;
          }

          const registro = registros[processed];
          const columns = Object.keys(registro).join(', ');
          const placeholders = Object.keys(registro).map(() => '?').join(', ');
          const values = Object.values(registro);

          tx.executeSql(
            `INSERT OR REPLACE INTO ${tabela} (${columns}) VALUES (${placeholders})`,
            values,
            () => {
              processed++;
              updateStatus(
                tabela, 
                'baixando', 
                `Salvando ${processed}/${total}`,
                60 + (processed / total * 30)
              );
              insertNext();
            },
            (_, error) => {
              console.error(`Erro ao salvar ${tabela}:`, error);
              processed++;
              insertNext();
            }
          );
        };

        insertNext();
      });
    });
  });
}