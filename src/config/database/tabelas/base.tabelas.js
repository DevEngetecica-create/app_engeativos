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

          // password_salt / password_algo (P1.2 security-port): suportam o hash
          // PBKDF2-like com salt. Instalacoes antigas recebem via ALTER em
          // initDatabase (PRAGMA users). Aqui no CREATE cobre instalacoes novas.
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

          `CREATE TABLE IF NOT EXISTS sync_logs (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              uuid TEXT,
              tabela TEXT,
              etapa TEXT,
              id_local TEXT,
              server_id INTEGER,
              mensagem TEXT,
              payload_resumido TEXT,
              stack_trace TEXT,
              status_envio_log TEXT DEFAULT 'Pendente',
              created_at TEXT
            );`,

          // sync_state: chave-valor para controle de execucao da sincronizacao
          // (lock persistente, ultima sync, recuperacao de interrupcoes)
          `CREATE TABLE IF NOT EXISTS sync_state (
              chave TEXT PRIMARY KEY,
              valor TEXT,
              updated_at TEXT
            );`,
        ];
    }