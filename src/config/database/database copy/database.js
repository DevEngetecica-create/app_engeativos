// // database/database.js
import * as SQLite from 'expo-sqlite/legacy';

// Abre ou cria o banco de dados
const db = SQLite.openDatabase(
  {
    name: 'sync_db',
    location: 'default',
  },
  () => console.log('Database opened'),
  error => console.error('Database error', error)
);

// Criação das tabelas
const createTables = () => {
  db.transaction(tx => {
    // Tabela usuarios
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        email_verified_at TEXT,
        password TEXT NOT NULL,
        createToken TEXT,
        remember_token TEXT,
        bloqueado INTEGER DEFAULT 1,
        matricula TEXT,
        avatar TEXT,
        created_at TEXT,
        updated_at TEXT,
        deleted_at TEXT,
        sync_status INTEGER DEFAULT 0
      )`
    );

    // Tabela niveis_usuarios
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS usuarios_niveis (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        titulo TEXT,
        permissions_text TEXT NOT NULL,
        created_at TEXT,
        updated_at TEXT,
        sync_status INTEGER DEFAULT 0
      )`
    );

    // Tabela usuario_vinculo
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS usuario_vinculo (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        id_usuario INTEGER NOT NULL,
        id_obra INTEGER NOT NULL,
        id_funcionario INTEGER,
        id_nivel INTEGER,
        acesso_atual INTEGER DEFAULT 0,
        ultimo_acesso TEXT,
        status TEXT NOT NULL,
        logado TEXT,
        created_at TEXT,
        deleted_at TEXT,
        updated_at TEXT,
        sync_status INTEGER DEFAULT 0,
        FOREIGN KEY (id_usuario) REFERENCES usuarios(id),
        FOREIGN KEY (id_obra) REFERENCES obras(id),
        FOREIGN KEY (id_nivel) REFERENCES niveis_usuarios(id)
      )`
    );

    // Tabela obras
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS obras (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        id_empresa INTEGER NOT NULL,
        nome_fantasia TEXT,
        razao_social TEXT,
        cnpj TEXT,
        codigo_obra TEXT,
        cep TEXT,
        endereco TEXT,
        numero TEXT,
        bairro TEXT,
        cidade TEXT,
        estado TEXT,
        latitude TEXT,
        longitude TEXT,
        email TEXT,
        celular TEXT,
        status_obra TEXT NOT NULL,
        deleted_at TEXT,
        created_at TEXT,
        updated_at TEXT,
        sync_status INTEGER DEFAULT 0
      )`
    );

    // Tabela diario_bordo (adicionei pois estava na sua lista)
    // Adicione isso na função createTables()
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS veiculos (
    id INTEGER PRIMARY KEY,
    obra_id INTEGER
    placa TEXT NULL,
    placa TEXT NULL,
    modelo TEXT,
    marca TEXT,
    ano INTEGER,
    status TEXT,
    imagem TEXT,
    created_at TEXT,
    updated_at TEXT
  )`
    );
  });
};

export { db, createTables };