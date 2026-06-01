// src/config/database/database.js
//
// 🔄 Lote 3 — Migração de `expo-sqlite/legacy` para a API moderna.
//
// Estratégia:
//   - Internamente, abrimos o DB com `openDatabaseAsync` (API moderna).
//   - Exportamos um objeto `db` que SIMULA a API legacy
//     (db.transaction(tx => tx.executeSql(...))) por baixo dos panos,
//     usando `withTransactionAsync` + `runAsync`/`getAllAsync`.
//   - As funções nomeadas (hasAnyUser, findUserByEmail, executeSql, etc.)
//     mantêm a MESMA assinatura externa.
//
// Por que wrapper em vez de migrar todas as telas:
//   - 30+ arquivos consumidores fazem `db.transaction` direto.
//   - Migrá-los exige reescrever queries em telas que não temos como
//     testar manualmente nesta sessão.
//   - O wrapper sai do namespace /legacy (objetivo do Lote 3) sem
//     introduzir risco em telas em produção.
//
// Suporte do wrapper:
//   - tx.executeSql(sql, params, onSuccess, onError) — sequencial.
//   - Queries aninhadas dentro de onSuccess são enfileiradas DENTRO da
//     mesma transação (igual ao comportamento legado).
//   - onError com retorno `true` ABORTA a transação; `false`/undefined
//     ABSORVE o erro e continua (compatibilidade exata com a API antiga).
//   - db.readTransaction → alias de transaction (a API moderna não
//     diferencia read/write para isso).

import * as SQLite from 'expo-sqlite';
import veiculosTabelas from './tabelas/veiculos.tabelas';
import SMSTabelas from './tabelas/SMS.tabelas';
import baseTabelas from './tabelas/base.tabelas';
import { ensureTableColumns } from '../../utils/schemaMigrator';

// ─── Singleton lazy do handle do DB ─────────────────────────────────────
// Cacheamos a PROMISE (não o resultado) para que chamadas concorrentes
// durante o boot do app não disparem múltiplos `openDatabaseAsync`.
let _dbPromise = null;
function _getDb() {
  if (!_dbPromise) {
    _dbPromise = SQLite.openDatabaseAsync('app.db');
  }
  return _dbPromise;
}

// Para código novo que queira awaitar o handle moderno diretamente.
export function getDbAsync() {
  return _getDb();
}

// ─── Wrapper de compat para a API legacy ────────────────────────────────
//
// Executa um callback estilo legacy dentro de uma transação async moderna.
// Mantém a semântica de fila: tx.executeSql é fire-and-forget do ponto de
// vista do caller; processamos um por um em ordem, e queries enfileiradas
// dentro de callbacks de sucesso entram na mesma fila.

async function _runTransaction(callback) {
  const dbi = await _getDb();
  await dbi.withTransactionAsync(async () => {
    const queue = [];
    const tx = {
      executeSql(sql, params = [], onSuccess, onError) {
        queue.push({ sql, params, onSuccess, onError });
      },
    };

    // 1ª rodada: o callback do caller popula a fila.
    callback(tx);

    // Processa a fila. Cada onSuccess pode adicionar novas queries.
    while (queue.length > 0) {
      const { sql, params, onSuccess, onError } = queue.shift();
      try {
        const isQuery = /^\s*(select|pragma|with)\b/i.test(sql);
        let resultSet;

        if (isQuery) {
          const rows = await dbi.getAllAsync(sql, params);
          resultSet = {
            rows: {
              _array: rows,
              length: rows.length,
              item: (i) => rows[i],
            },
            rowsAffected: 0,
          };
        } else {
          const res = await dbi.runAsync(sql, params);
          resultSet = {
            rows: { _array: [], length: 0, item: () => null },
            rowsAffected: res?.changes ?? 0,
            insertId: res?.lastInsertRowId,
          };
        }

        if (onSuccess) onSuccess(tx, resultSet);
      } catch (err) {
        // Legacy: retornar `true` do onError ABORTA a transação;
        // qualquer outra coisa (false/undefined/etc.) ABSORVE e continua.
        const aborted = onError ? onError(tx, err) === true : true;
        if (aborted) throw err;
      }
    }
  });
}

export const db = {
  transaction(callback, onError, onSuccess) {
    _runTransaction(callback)
      .then(() => onSuccess?.())
      .catch((err) => onError?.(err));
  },
  // A API moderna não distingue read/write transactions para fins de wrapper.
  readTransaction(callback, onError, onSuccess) {
    return this.transaction(callback, onError, onSuccess);
  },
};

// ─── Migrations idempotentes pós-CREATE TABLE ──────────────────────────
// A4 (PBKDF2-like): adiciona password_salt e password_algo se faltarem.
export async function ensureUsersSchema() {
  return ensureTableColumns(
    'users',
    [
      { name: 'password_salt', type: 'TEXT' },
      { name: 'password_algo', type: 'TEXT' },
    ],
    { migrationName: 'users_password_kdf_v1' }
  );
}

// ─── Init / boot ───────────────────────────────────────────────────────
// Cria tabelas (IF NOT EXISTS) e roda migrações idempotentes. Resiliente:
// uma falha numa CREATE individual não derruba o app.
export async function initDatabase() {
  const dbi = await _getDb();
  const queries = [
    ...baseTabelas(),
    ...veiculosTabelas(),
    ...SMSTabelas(),
  ];

  await dbi.withTransactionAsync(async () => {
    for (const q of queries) {
      try {
        await dbi.runAsync(q);
      } catch (e) {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.warn('[initDatabase] CREATE falhou:', e?.message);
        }
      }
    }
  });

  // Migrações pós-create — não derrubam o app se falharem.
  try {
    await ensureUsersSchema();
  } catch (e) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('[initDatabase] ensureUsersSchema falhou:', e?.message);
    }
  }
}

// ─── Helpers nomeados ──────────────────────────────────────────────────
// Assinaturas idênticas à versão legacy para preservar callers.

export async function hasAnyUser() {
  try {
    const dbi = await _getDb();
    const row = await dbi.getFirstAsync('SELECT COUNT(*) AS qtd FROM users;');
    return (row?.qtd ?? 0) > 0;
  } catch {
    return false;
  }
}

/**
 * Retorna o registro completo do usuário pelo e-mail, sem verificação de senha.
 * Caller verifica a senha via utils/crypto.verifyPassword.
 */
export async function findUserByEmail(email) {
  try {
    const dbi = await _getDb();
    const row = await dbi.getFirstAsync(
      'SELECT * FROM users WHERE email = ? LIMIT 1;',
      [email]
    );
    return row ?? null;
  } catch {
    return null;
  }
}

/**
 * ⚠️ DEPRECATED — mantido para compatibilidade.
 * Use `findUserByEmail(email)` + `utils/crypto.verifyPassword(...)`.
 */
export async function findUserByEmailAndPassHash(email, passHash) {
  try {
    const dbi = await _getDb();
    const row = await dbi.getFirstAsync(
      'SELECT * FROM users WHERE email = ? AND password_app = ? LIMIT 1;',
      [email, passHash]
    );
    return row ?? null;
  } catch {
    return null;
  }
}

/**
 * Atualiza (hash, salt, algo) de um usuário existente.
 * Usado pela migração transparente de hash SHA-256 → PBKDF2-like.
 */
export async function updateUserPasswordHash(userId, hash, salt, algo) {
  try {
    const dbi = await _getDb();
    await dbi.runAsync(
      `UPDATE users
          SET password_app  = ?,
              password_salt = ?,
              password_algo = ?
        WHERE id = ?;`,
      [hash, salt, algo, userId]
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * INSERT OR REPLACE do usuário vindo do backend após login online.
 */
export async function upsertUserFromOnline(user, hash, salt, algo) {
  try {
    const dbi = await _getDb();
    await dbi.runAsync(
      `INSERT OR REPLACE INTO users
        (id, name, email, password_app, password_salt, password_algo,
         biometria, geolocalizacao, sync_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1);`,
      [
        user.id,
        user.name ?? '',
        user.email ?? '',
        hash,
        salt,
        algo,
        user.biometria ? 1 : 0,
        user.geolocalizacao ? 1 : 0,
      ]
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Helper genérico — assinatura idêntica à versão legacy:
 *   - SELECT/PRAGMA/WITH → retorna array de rows (objetos JS).
 *   - INSERT/UPDATE/DELETE/CREATE/ALTER → executa e retorna array vazio.
 *
 * Mantemos esse retorno por compatibilidade com callers que esperam
 * iterar o array. Para writes que precisam de lastInsertRowId/changes,
 * use diretamente o handle moderno via getDbAsync().
 */
export async function executeSql(sql, params = []) {
  const dbi = await _getDb();
  const isQuery = /^\s*(select|pragma|with)\b/i.test(sql);
  if (isQuery) {
    return await dbi.getAllAsync(sql, params);
  }
  await dbi.runAsync(sql, params);
  return [];
}
