// database/sincronizacaoService.js
import { db } from './database';
import api from '../api';

export async function sincronizarDados(updateStatusCallback) {
  const tabelas = [
    'usuarios',
    'niveis_usuarios',
    'usuario_vinculo',
    'obras',
    'veiculos_diario_bordo'
  ];

  for (const tabela of tabelas) {
    try {
      updateStatusCallback(tabela, 'sincronizando', 'Preparando para sincronizar...', 0);
      await sincronizarTabela(tabela, updateStatusCallback);
      updateStatusCallback(tabela, 'concluido', 'Sincronização concluída', 100);
    } catch (error) {
      updateStatusCallback(tabela, 'erro', `Erro: ${error.message}`, 0);
      throw error; // Opcional: continuar com outras tabelas mesmo com erro
    }
  }
}

async function sincronizarTabela(tabela, updateStatus) {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        `SELECT * FROM ${tabela} WHERE sync_status = 0`,
        [],
        async (_, { rows }) => {
          const registros = [];
          for (let i = 0; i < rows.length; i++) {
            registros.push(rows.item(i));
            // Atualiza progresso a cada registro encontrado
            updateStatus(tabela, 'sincronizando', 
              `Preparando ${registros.length} registros...`, 
              (i / rows.length) * 50
            );
          }

          if (registros.length > 0) {
            try {
              updateStatus(tabela, 'sincronizando', 'Enviando para o servidor...', 50);
              
              const response = await api.post(`sincronizar/${tabela}`, { registros });

              // Atualiza status no banco local
              tx.executeSql(
                `UPDATE ${tabela} SET sync_status = 1 WHERE sync_status = 0`,
                [],
                () => {
                  updateStatus(tabela, 'sincronizando', 'Atualizando localmente...', 90);
                  resolve(true);
                },
                (_, error) => reject(error)
              );
            } catch (err) {
              reject(err);
            }
          } else {
            updateStatus(tabela, 'sincronizando', 'Nada para sincronizar', 100);
            resolve(true);
          }
        },
        (_, error) => reject(error)
      );
    });
  });
}