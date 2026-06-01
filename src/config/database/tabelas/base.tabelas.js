export default function baseTabelas() {
  return[
          `CREATE TABLE IF NOT EXISTS sincronizacaos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tabela TEXT NOT NULL,
            tipo TEXT NOT NULL,
            ultima_sincronizacao TEXT,
            data_sincronizacao TEXT,
            user_id INTEGER,
            user_create TEXT,
            created_at TEXT,
            updated_at TEXT,
            deleted_at TEXT
          );`,

          // ⚠️ Colunas password_salt e password_algo (A4 — PBKDF2-like).
          // Instalações antigas recebem essas colunas via ALTER TABLE em
          // database.js → ensureUsersSchema(). Aqui declaramos no CREATE
          // para que instalações novas já saiam corretas (defesa em profundidade).
          `CREATE TABLE IF NOT EXISTS users (
              id INTEGER PRIMARY KEY,
              name TEXT NOT NULL,
              email TEXT NOT NULL UNIQUE,
              password_app TEXT,
              password_salt TEXT,
              password_algo TEXT,
              biometria INTEGER,
              geolocalizacao INTEGER,
              status TEXT,
              offline_token TEXT,
              sync_status INTEGER DEFAULT 0,
              data_sincronizacao TEXT
            );`,

          `CREATE TABLE IF NOT EXISTS funcionarios (
              id INTEGER PRIMARY KEY,
              id_obra INTEGER NOT NULL,
              id_funcao INTEGER NOT NULL,
              id_setor INTEGER,
              nome TEXT,
              matricula TEXT,
              cpf TEXT,
              status TEXT,
              imagem_usuario TEXT,
              sync_status INTEGER DEFAULT 0,
              data_sincronizacao TEXT
            );`,

          `CREATE TABLE IF NOT EXISTS funcao_funcionarios (
              id INTEGER PRIMARY KEY,
              funcao TEXT,
              sync_status INTEGER DEFAULT 0,
              data_sincronizacao TEXT
            );`,

          `CREATE TABLE IF NOT EXISTS obras (
              id INTEGER PRIMARY KEY,
              id_empresa INTEGER,
              nome_fantasia TEXT,
              razao_social TEXT,
              cnpj TEXT,
              codigo_obra TEXT,
              sync_status INTEGER DEFAULT 0,
              data_sincronizacao TEXT
            );`,

        ];
    }