// ./src/config/database/database.js

import * as SQLite from 'expo-sqlite/legacy';

const db = SQLite.openDatabase(
  'app.db',
  '1.0',
  '',
  1,
  () => console.log('✅ SQLite: database opened'),
  err => console.error('❌ SQLite open error:', err)
);

export function initDatabase() {
  return new Promise((resolve, reject) => {
    db.transaction(
      tx => {
        const queries = [
          `CREATE TABLE IF NOT EXISTS funcionarios (
            id INTEGER PRIMARY KEY,
            id_obra INTEGER NOT NULL,
            id_funcao INTEGER NOT NULL UNIQUE,
            id_setor INTEGER,
            nome TEXT,
            status TEXT,
            imagem_usuario TEXT
          );`,
        
          `CREATE TABLE IF NOT EXISTS obras (
            id INTEGER PRIMARY KEY,
            id_empresa INTEGER,
            nome_fantasia TEXT,
            razao_social TEXT,
            cnpj TEXT,
            codigo_obra TEXT,
            sync_status INTEGER DEFAULT 0,
            ultima_sincronizacao TEXT
          );`,          

          `CREATE TABLE IF NOT EXISTS veiculos (
            id INTEGER PRIMARY KEY,
            obra_id INTEGER,
            prefixo TEXT,
            tipo TEXT,
            placa TEXT,
            modelo TEXT,
            marca TEXT,
            ano INTEGER,
            imagem TEXT,
            ultima_sincronizacao TEXT,
            sync_status INTEGER DEFAULT 0,
            deleted_at TEXT
          );`,

          `CREATE TABLE IF NOT EXISTS veiculos_diario_bordo (
            id INTEGER PRIMARY KEY,
            id_obra INTEGER,
            id_veiculo INTEGER,
            id_funcionario INTEGER,
            data_cadastro TEXT,
            horario_inicial TEXT,
            horimetro_inicial TEXT,
            hodometro_inicial TEXT,
            horario_final TEXT,
            horimetro_final TEXT,
            hodometro_final TEXT,
            descricao_atividade TEXT,
            arquivo TEXT,
            sync_status INTEGER DEFAULT 0,
            created_at TEXT,
            deleted_at TEXT,
            updated_at TEXT
          );`,

          `CREATE TABLE IF NOT EXISTS veiculo_checklist (
            id INTEGER PRIMARY KEY,
            id_veiculo INTEGER,
            nome_checklist TEXT,
            situacao TEXT,
            deleted_at TEXT,
            sync_status INTEGER DEFAULT 0
          );`,

          `CREATE TABLE IF NOT EXISTS veiculo_checklist_itens (
            id INTEGER PRIMARY KEY,
            id_checklist INTEGER,
            id_veiculo INTEGER,
            nome_servico TEXT,
            tipo_itens TEXT,
            situacao TEXT,
            deleted_at TEXT,
            sync_status INTEGER DEFAULT 0
          );`,

          `CREATE TABLE IF NOT EXISTS veiculo_checklist_itens_realizados (
            id INTEGER PRIMARY KEY,
            id_obra INTEGER,
            id_checklist INTEGER,
            id_checklist_realizado INTEGER,
            id_checklist_itens INTEGER,
            id_veiculo INTEGER,
            data_cadastro TEXT,
            status TEXT,
            arquivo TEXT,
            user_create TEXT,
            horimetro_atual INTEGER,
            horimetro_novo INTEGER,
            quilometragem_atual INTEGER,
            quilometragem_nova INTEGER,
            observacao TEXT,
            sync_status INTEGER DEFAULT 0,
            created_at TEXT,
            deleted_at TEXT,
            updated_at TEXT
          );`,

          `CREATE TABLE IF NOT EXISTS veiculo_checklist_itens_servicos (
            id INTEGER PRIMARY KEY,
            id_servico_local INTEGER,
            id_obra INTEGER,
            id_checklist_itens INTEGER,
            id_veiculo INTEGER,
            status TEXT,
            observacao TEXT,
            data_cadastro TEXT,
            sync_status INTEGER DEFAULT 0,
            created_at TEXT,
            deleted_at TEXT,
            updated_at TEXT
          );`,

          `CREATE TABLE IF NOT EXISTS veiculo_horimetro (
            id INTEGER PRIMARY KEY,
            id_obra INTEGER,
            veiculo_id INTEGER,
            id_funcionario INTEGER,
            id_abastecimento INTEGER,
            user_create TEXT,
            horimetro_novo TEXT,
            horimetro_atual TEXT,
            data_horimetro TEXT,            
            arquivo_uri TEXT,
            sync_status INTEGER DEFAULT 0,
            deleted_at TEXT
          );`,          
          
          
          `CREATE TABLE IF NOT EXISTS veiculo_quilometragems (
            id INTEGER PRIMARY KEY,
            veiculo_id INTEGER,
            id_abastecimento INTEGER,
            id_funcionario INTEGER,
            user_create TEXT,
            id_obra INTEGER,
            data_quilometragem TEXT,
            quilometragem_atual REAL,
            quilometragem_nova REAL,
            sync_status INTEGER DEFAULT 0,
            deleted_at TEXT
          );`,


          `CREATE TABLE IF NOT EXISTS veiculo_abastecimentos (
            id INTEGER PRIMARY KEY,
            veiculo_id INTEGER,
            id_obra TEXT,
            id_funcionario TEXT,
            user_create TEXT,
            data_abastecimento TEXT,
            fornecedor TEXT,
            combustivel TEXT,
            quantidade REAL,
            valor_do_litro REAL,
            valor_total REAL,
            arquivo_uri TEXT,
            sync_status INTEGER DEFAULT 0,
            created_at TEXT,
            deleted_at TEXT,
            updated_at TEXT
          );`,

          `CREATE TABLE IF NOT EXISTS veiculos_locacaos (
            id INTEGER PRIMARY KEY,
            id_obra INTEGER,
            veiculo_id INTEGER,
            id_obraDestino INTEGER,
            id_funcionario INTEGER,
            id_funcionario_destino INTEGER,
            tipo_veiculo TEXT,
            data_inicio TEXT,
            data_prevista TEXT,
            data_fim TEXT,
            ultima_sincronizacao TEXT,
            deleted_at TEXT,
            sync_status INTEGER DEFAULT 0
          );`
        ];

        queries.forEach(query => {
          tx.executeSql(query, [],
            () => {},
            (_, err) => console.error('❌ Erro ao executar query:', err)
          );
        });
      },

      err => {
        console.error('❌ Transaction error:', err);
        reject(err);
      },
      () => {
        console.log('✅ Todas as tabelas verificadas/criadas com sucesso');
        resolve();
      }
    );
  });
  
}

export { db };