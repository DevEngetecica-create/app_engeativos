import * as SQLite from 'expo-sqlite/legacy';

import { useState } from 'react';

import { syncChecklistToAPI } from './syncChecklistToAPI';

const db = SQLite.openDatabase('checklist.db');

export const createTable = () => {
  console.log('🛠️ Criando tabela checklist...');
  db.transaction(tx => {
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS checklist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        obra_id INTEGER,
        user_id INTEGER,
        veiculo_id INTEGER,
        data TEXT NOT NULL,
        modelo TEXT,
        placa TEXT,
        horario TEXT,
        km TEXT,
        nivel_oleo INTEGER,
        nivel_agua INTEGER,
        foto_hodometro TEXT,
        foto_carro_frente TEXT,
        foto_carro_esquerda TEXT,
        foto_carro_direita TEXT,
        foto_carro_traseira TEXT,
        foto_avaria_1 TEXT,
        foto_avaria_2 TEXT,
        observacoes TEXT,
        arquivo TEXT,
        user_create TEXT,
        user_edit TEXT,
        updated_at TEXT
      );`,
      [],
      () => console.log('✅ Tabela criada com sucesso'),
      (_, error) => {
        console.error('❌ Erro ao criar tabela:', error);
        return true; // para parar a transação se der erro
      }
    );
  });
};


const handlePickImage = async (field) => {
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.7
  });

  if (!res.canceled) {
    setForm({ ...form, [field]: res.assets[0] });
  }
};

const handleSubmit = async () => {
  setLoading(true);

  const data = new FormData();

  data.append('modelo', form.modelo);
  data.append('placa', form.placa);
  data.append('horario', form.horario);
  data.append('km', form.km);
  data.append('nivel_oleo', form.nivel_oleo ? 1 : 0);
  data.append('nivel_agua', form.nivel_agua ? 1 : 0);
  data.append('observacoes', String(form.observacoes ?? ''));
  data.append('data', form.data);

  // Campos de imagem (condicionalmente)
  const imageFields = [
    'foto_hodometro',
    'foto_carro_frente',
    'foto_carro_traseira',
    'foto_carro_esquerda',
    'foto_carro_direita',
    'foto_avaria_1',
    'foto_avaria_2'
  ];

  imageFields.forEach(field => {
    if (form[field]) {
      data.append(field, {
        uri: form[field].uri,
        name: field + '.jpg',
        type: 'image/jpeg'
      });
    }
  });

  try {
    const response = await api.post(
      'admin/ativo/veiculoAlugados/checklist/store',
      data,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );

    Alert.alert('Sucesso', 'Checklist cadastrado com sucesso!', [
      {
        text: 'OK',
        onPress: () => navigation.navigate('ChecklistScreen') // ajuste conforme sua navegação
      }
    ]);
  } catch (error) {
    console.error('❌ ERRO AO ENVIAR CHECKLIST:', error);
    Alert.alert('Erro', 'Falha ao cadastrar checklist.');
  } finally {
    setLoading(false);
  }
};

export const insertChecklist = (dados, callback) => {
  console.log('>>> INSERINDO DADOS NO BANCO:', dados);

  db.transaction(
    tx => {
      tx.executeSql(
        `INSERT INTO checklist (
           modelo, placa, horario, km,
           nivel_oleo, nivel_agua, observacoes,
           foto_hodometro, foto_carro_frente, foto_carro_traseira,
           foto_carro_esquerda, foto_carro_direita,
           foto_avaria_1, foto_avaria_2, data
         ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          dados.modelo,
          dados.placa,
          dados.horario,
          dados.km,
          dados.nivel_oleo ? 1 : 0,
          dados.nivel_agua ? 1 : 0,
          dados.observacoes,
          dados.foto_hodometro,
          dados.foto_carro_frente,
          dados.foto_carro_traseira,
          dados.foto_carro_esquerda,
          dados.foto_carro_direita,
          dados.foto_avaria_1,
          dados.foto_avaria_2,
          dados.data
        ],
        async (_, result) => {
          console.log('✅ CHECKLIST INSERIDO NO SQLITE', result);

          // tenta sincronizar com o backend antes de confirmar o sucesso
          const syncOk = await syncChecklistToAPI(dados);

          if (syncOk) {
            console.log('🌐 Sincronizado com API');
            callback(true);
          } else {
            console.warn('⚠️ Falha ao sincronizar com API; placa inválida ou erro de rede');
            callback(false);
          }
        },
        (_, error) => {
          console.error('❌ ERRO AO INSERIR CHECKLIST NO SQLITE:', error);
          callback(false);
        }
      );
    },
    err => {
      console.error('❌ ERRO NA TRANSAÇÃO SQLITE:', err);
      callback(false);
    },
    () => console.log('✅ TRANSAÇÃO SQLITE FINALIZADA')
  );
};

export const listarChecklists = (callback) => {
  db.transaction(tx => {
    tx.executeSql(
      'SELECT * FROM checklist',
      [],
      (_, { rows }) => {
        console.log("Dados recebidos no banco:", rows._array);
        callback(rows._array);
      },
      (_, error) => {
        console.log("Erro ao listar checklists:", error);
        callback([]);
      }
    );
  });
};
export const getChecklists = (callback) => {
  db.transaction(tx => {
    tx.executeSql(
      'SELECT * FROM checklist ORDER BY id DESC',
      [],
      (_, { rows }) => {
        callback(rows._array);
      },
      (_, error) => {
        console.error('Erro ao buscar checklists:', error);
        return false;
      }
    );
  });
};