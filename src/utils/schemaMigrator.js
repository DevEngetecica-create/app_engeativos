// src/utils/schemaMigrator.js
//
// Garante colunas em tabelas via ALTER TABLE ADD COLUMN idempotente.
// Reutiliza o `executeSql` exposto por config/database/database.js — que
// agora roda sobre a API moderna do expo-sqlite (Lote 3).

import { executeSql } from '../config/database/database';

/**
 * @param {string} tableName
 * @param {Array<{
 *   name: string,
 *   type?: string,
 *   notNull?: boolean,
 *   defaultValue?: any,
 *   createIndex?: boolean,
 * }>} columns
 * @param {object} [opts]
 * @param {string} [opts.migrationName]  // opcional: registra em app_migrations
 */
export async function ensureTableColumns(tableName, columns, opts = {}) {
  if (!tableName || !Array.isArray(columns) || columns.length === 0) {
    throw new Error('Informe o nome da tabela e ao menos uma coluna.');
  }

  // Tabela de controle (idempotente). Útil para rastrear "ondas" de
  // alterações sem precisar reler PRAGMA toda vez (mas ainda relemos
  // como dupla checagem).
  await executeSql(`
    CREATE TABLE IF NOT EXISTS app_migrations (
      name TEXT PRIMARY KEY
    );
  `);

  if (opts.migrationName) {
    // Apenas LÊ — não cortamos cedo, para mantermos idempotência via PRAGMA.
    await executeSql(
      `SELECT name FROM app_migrations WHERE name = ?;`,
      [opts.migrationName]
    );
  }

  // Colunas atuais.
  const pragma = await executeSql(`PRAGMA table_info('${tableName}');`);
  const existingCols = new Set(pragma.map((c) => c.name));

  for (const col of columns) {
    if (!col.name) continue;

    if (!existingCols.has(col.name)) {
      const type = col.type ? col.type.trim() : 'TEXT';
      const parts = [`ALTER TABLE ${tableName} ADD COLUMN ${col.name} ${type}`];

      // NOT NULL em ALTER TABLE no SQLite exige DEFAULT não-nulo.
      if (col.notNull) {
        if (col.defaultValue === undefined || col.defaultValue === null) {
          if (__DEV__) {
            // eslint-disable-next-line no-console
            console.warn(
              `⚠️ Coluna "${col.name}" pediu NOT NULL sem DEFAULT — removendo NOT NULL.`
            );
          }
        } else {
          parts.push('NOT NULL');
        }
      }

      if (col.defaultValue !== undefined) {
        const dv =
          typeof col.defaultValue === 'string'
            ? `'${col.defaultValue.replace(/'/g, "''")}'`
            : String(col.defaultValue);
        parts.push(`DEFAULT ${dv}`);
      }

      const sql = parts.join(' ') + ';';
      await executeSql(sql);
      existingCols.add(col.name);
    }

    if (col.createIndex) {
      const idxName = `idx_${tableName}_${col.name}`;
      await executeSql(
        `CREATE INDEX IF NOT EXISTS ${idxName} ON ${tableName}(${col.name});`
      );
    }
  }

  if (opts.migrationName) {
    await executeSql(
      `INSERT OR IGNORE INTO app_migrations (name) VALUES (?);`,
      [opts.migrationName]
    );
  }

  return true;
}
