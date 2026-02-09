// ./src/config/database/syncUtils.js
import { db } from './database';

// ==================== GARANTE TABELA LOCAL ====================
export function ensureSyncTable() {
  return new Promise(resolve => {
    db.transaction(tx => {
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS sincronizacaos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tabela TEXT NOT NULL,
          tipo TEXT,
          ultima_sincronizacao TEXT,
          data_sincronizacao TEXT,
          user_id INTEGER,
          user_create TEXT,
          created_at TEXT,
          updated_at TEXT,
          deleted_at TEXT
        );`
      );
      tx.executeSql(
        `CREATE UNIQUE INDEX IF NOT EXISTS idx_sync_tabela_user
         ON sincronizacaos(tabela, user_id);`
      );
    }, () => resolve(), () => resolve());
  });
}

// ==================== USUÁRIO LOCAL ====================
export function getLocalUser() {
  return new Promise(resolve => {
    db.transaction(tx => {
      tx.executeSql(
        `SELECT id AS user_id, email AS user_create FROM users LIMIT 1;`,
        [],
        (_, { rows }) => {
          resolve(rows._array[0] || { user_id: null, user_create: null });
        },
        () => resolve({ user_id: null, user_create: null })
      );
    });
  });
}

// ==================== ATUALIZA A ÚLTIMA SYNC LOCAL ====================
export async function atualizarUltimaSync(tabela, userCtx, tipo = null) {
  await ensureSyncTable();
  const now = new Date().toISOString();
  let { user_id, user_create } = userCtx || {};

  if (!user_id || !user_create) {
    const u = await getLocalUser();
    user_id = u.user_id;
    user_create = u.user_create;
  }

  return new Promise(resolve => {
    db.transaction(tx => {
      tx.executeSql(
        `INSERT OR REPLACE INTO sincronizacaos (tabela, tipo, data_sincronizacao, user_id, user_create)
         VALUES (?, ?, ?, ?, ?);`,
        [tabela, tipo, now, user_id, user_create],
        () => resolve(),
        () => resolve()
      );
    });
  });
}

// ==================== BUSCA ÚLTIMA SYNC LOCAL ====================
export async function getUltimaSync(tabela, userCtx) {
  await ensureSyncTable();
  let { user_id } = userCtx || {};

  if (!user_id) {
    const u = await getLocalUser();
    user_id = u.user_id;
  }

  return new Promise(resolve => {
    db.transaction(tx => {
      tx.executeSql(
        `SELECT data_sincronizacao FROM sincronizacaos WHERE tabela = ? AND user_id = ? LIMIT 1;`,
        [tabela, user_id],
        (_, { rows }) => resolve(rows._array[0]?.data_sincronizacao || null),
        () => resolve(null)
      );
    });
  });
}
