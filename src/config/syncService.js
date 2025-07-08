// syncService.js
import { db } from './database';
import api from './api'; // Sua configuração axios

const syncData = async () => {
  try {
    // 1. Baixar dados do MySQL
    const response = await api.get('/sync/data');
    const { funcionarios, vinculos, obras } = response.data;

    // 2. Sincronizar dados no SQLite
    db.transaction(tx => {
      // Sincronizar usuários

      // Sincronizar níveis
      funcionarios.forEach(nivel => {
        tx.executeSql(
          `INSERT OR REPLACE INTO funcionarios 
          (id, id_obra, id_funcao, id_setor, nome, status, imagem_usuario) 
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            nivel.id, nivel.id_obra, nivel.id_funcao, nivel.id_setor,
            nivel.nome, nivel.status, nivel.imagem_usuario
          ]
        );
      });

      // Sincronizar obras
      obras.forEach(obra => {
        tx.executeSql(
          `INSERT OR REPLACE INTO obras 
          (id, id_empresa, nome_fantasia, razao_social, cnpj, codigo_obra, 
           cep, endereco, numero, bairro, cidade, estado, latitude, 
           longitude, email, celular, status_obra, deleted_at, 
           created_at, updated_at, sync_status) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
          [
            obra.id, obra.id_empresa, obra.nome_fantasia, obra.razao_social,
            obra.cnpj, obra.codigo_obra, obra.cep, obra.endereco, obra.numero,
            obra.bairro, obra.cidade, obra.estado, obra.latitude, obra.longitude,
            obra.email, obra.celular, obra.status_obra, obra.deleted_at,
            obra.created_at, obra.updated_at
          ]
        );
      });


    });

    // 3. Enviar dados modificados localmente para o MySQL
    await sendLocalChanges();

  } catch (error) {
    console.error('Sync error:', error);
  }
};

const sendLocalChanges = async () => {
  // Obter dados modificados localmente (sync_status = 0)
  const unsyncedData = await getUnsyncedData();

  if (unsyncedData.funcionarios.length > 0 ||
    unsyncedData.obras.length > 0) {

    try {
      await api.post('/sync/upload', unsyncedData);

      // Marcar como sincronizado
      markAsSynced(unsyncedData);
    } catch (error) {
      console.error('Upload error:', error);
    }
  }
};

const getUnsyncedData = () => {
  return new Promise((resolve, reject) => {
    const unsyncedData = {
      usuarios: [],
      niveis: [],
      vinculos: [],
      obras: []
    };

    db.transaction(tx => {
      // Obter usuários não sincronizados
      tx.executeSql(
        'SELECT * FROM funcionarios WHERE sync_status = 0',
        [],
        (_, { rows }) => {
          unsyncedData.usuarios = rows.raw();

          // Obter níveis não sincronizados
          tx.executeSql(
            'SELECT * FROM usuarios_niveis WHERE sync_status = 0',
            [],
            (_, { rows }) => {
              unsyncedData.niveis = rows.raw();

              // Obter obras não sincronizadas
              tx.executeSql(
                'SELECT * FROM obras WHERE sync_status = 0',
                [],
                (_, { rows }) => {
                  unsyncedData.obras = rows.raw();

                  // Obter vínculos não sincronizados
                  tx.executeSql(
                    'SELECT * FROM usuario_vinculo WHERE sync_status = 0',
                    [],
                    (_, { rows }) => {
                      unsyncedData.vinculos = rows.raw();
                      resolve(unsyncedData);
                    }
                  );
                }
              );
            }
          );
        }
      );
    });
  });
};

const markAsSynced = (data) => {
  db.transaction(tx => {
    // Marcar usuários como sincronizados
    data.usuarios.forEach(user => {
      tx.executeSql(
        'UPDATE usuarios SET sync_status = 1 WHERE id = ?',
        [user.id]
      );
    });

    // Marcar níveis como sincronizados
    data.niveis.forEach(nivel => {
      tx.executeSql(
        'UPDATE niveis_usuarios SET sync_status = 1 WHERE id = ?',
        [nivel.id]
      );
    });

    // Marcar obras como sincronizadas
    data.obras.forEach(obra => {
      tx.executeSql(
        'UPDATE obras SET sync_status = 1 WHERE id = ?',
        [obra.id]
      );
    });

    // Marcar vínculos como sincronizados
    data.vinculos.forEach(vinculo => {
      tx.executeSql(
        'UPDATE usuario_vinculo SET sync_status = 1 WHERE id = ?',
        [vinculo.id]
      );
    });
  });
};

export { syncData };