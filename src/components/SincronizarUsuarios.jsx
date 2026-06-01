//src/components/SincronizarUsuarios.jsx
import React, { useState, useRef } from 'react';
import { View, Text, Button, Alert, ActivityIndicator } from 'react-native';
import api from '../config/api';
// 🔄 Lote 3: usa o handle compartilhado de database.js (sai do /legacy).
// Antes este componente abria seu PRÓPRIO handle do mesmo arquivo "app.db",
// o que podia conflitar com a transação principal do app. Agora usa o
// wrapper de compat — mesma API (db.transaction/tx.executeSql) sem
// duplicação.
import { db } from '../config/database/database';

const SincronizarUsuarios = () => {
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const cancelado = useRef(false);

  const criarTabela = () => {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password TEXT,
            createToken TEXT,
            bloqueado INTEGER DEFAULT 0,
            matricula TEXT,
            avatar TEXT,
            created_at TEXT,
            updated_at TEXT,
            deleted_at TEXT
          );`,
          [],
          () => resolve(),
          (_, error) => reject(error)
        );
      });
    });
  };

  const buscarUsuarios = async () => {
    try {
      const response = await api.get('users/index');

      // Retorna array vazio se não houver dados
      if (!response?.data?.users) {
        return [];
      }

      const users = Array.isArray(response.data.users)
        ? response.data.users
        : [];

      return users.map(user => ({
        id: user.id || 0,
        name: user.name || '',
        email: user.email || '',
        password: user.password || '',
        createToken: user.createToken || null,
        bloqueado: Boolean(user.bloqueado),
        matricula: user.matricula || '',
        avatar: user.avatar || '',
        created_at: user.created_at || new Date().toISOString(),
        updated_at: user.updated_at || new Date().toISOString(),
        deleted_at: user.deleted_at || null
      }));

    } catch (error) {
      console.error('Erro na requisição:', error.message);
      return []; // Retorna array vazio mesmo em caso de erro
    }
  };

  const inserirUsuarios = async (users) => {
    return new Promise((resolve, reject) => {
      let insertedCount = 0;
      let isCancelled = false;

      const transaction = db.transaction(tx => {
        const processUser = async (index) => {
          if (isCancelled || index >= users.length) {
            if (!isCancelled) {
              resolve(insertedCount);
            }
            return;
          }

          const user = users[index];

          try {
            // Verificação de email
            const selectResult = await new Promise((resolveSelect) => {
              tx.executeSql(
                `SELECT id FROM users WHERE email = ?;`,
                [user.email],
                (_, result) => resolveSelect(result),
                (_, error) => { console.error(error); resolveSelect({ rows: [] }); }
              );
            });

            if (selectResult.rows.length === 0) {
              await new Promise((resolveInsert) => {

                tx.executeSql(
                  `INSERT INTO users (id, name, email, password, createToken, bloqueado, 
                  matricula, avatar, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [
                    user.id,
                    user.name,
                    user.email,
                    user.password,
                    user.createToken,
                    user.bloqueado ? 1 : 0,
                    user.matricula,
                    user.avatar,
                    user.created_at,
                    user.updated_at,
                    user.deleted_at
                  ],
                  (_, result) => {
                    insertedCount++;
                    resolveInsert(result);
                  },
                  (_, error) => { console.error(error); resolveInsert(); }
                );
              });
            }

            setStatus(`Processando ${index + 1} de ${users.length}`);
            processUser(index + 1);

          } catch (error) {
            processUser(index + 1);
          }
        };

        processUser(0);
      },
        (error) => {
          reject(error);
        },
        () => {
          resolve(insertedCount);
        });

      // Listener para cancelamento
      const checkCancel = () => {
        if (cancelado.current && !isCancelled) {
          isCancelled = true;
          transaction._abortIfRequired();
          resolve(insertedCount);
        }
      };

      const interval = setInterval(checkCancel, 100);
    });
  };

  const sincronizar = async () => {
    try {
      cancelado.current = false;
      setLoading(true);
      setStatus('Iniciando sincronização...');

      await criarTabela();
      setStatus('Tabela verificada/criada');

      setStatus('Buscando dados da API...');
      const users = await buscarUsuarios();

      if (users.length === 0) {
        setStatus('Nenhum usuário encontrado');
        return Alert.alert('Aviso', 'Nenhum usuário para sincronizar');
      }

      setStatus(`Encontrados ${users.length} usuários...`);
      const insertedCount = await inserirUsuarios(users);

      if (!cancelado.current) {
        setStatus(`Sincronização concluída: ${insertedCount} novos usuários`);
        Alert.alert('Sucesso', `${insertedCount} novos usuários sincronizados!`);
      }

    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      setStatus(`Erro: ${errorMessage}`);
      Alert.alert('Erro', `Falha na sincronização: ${errorMessage}`);
      console.error('Erro na sincronização:', error);
    } finally {
      setLoading(false);
    }
  };

  const cancelarSincronizacao = () => {
    cancelado.current = true;
    setStatus('Cancelando sincronização...');
  };

  return (
    <View style={{ padding: 20 }}>
      {loading && (
        <ActivityIndicator size="large" color="#007bff" style={{ marginBottom: 10 }} />
      )}

      <Text style={{
        marginBottom: 10,
        fontWeight: 'bold',
        color: loading ? '#007bff' : status.startsWith('Erro') ? 'red' : 'green'
      }}>
        {status || 'Pronto para sincronizar'}
      </Text>

      <Button
        title="Sincronizar Usuários"
        onPress={sincronizar}
        disabled={loading}
      />

      {loading && (
        <View style={{ marginTop: 10 }}>
          <Button
            title="Cancelar Sincronização"
            color="red"
            onPress={cancelarSincronizacao}
          />
        </View>
      )}
    </View>
  );
};

export default SincronizarUsuarios;
