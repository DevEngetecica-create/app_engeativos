// src/utils/schemaMigrator.js
import { db } from '../config/database/database';

// Pequeno helper para usar Promises
const executeSql = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        sql,
        params,
        (_, { rows }) => resolve(rows._array),
        (_, err) => reject(err)
      );
    });
  });

/**
 * Garante que as colunas informadas existam na tabela.
 * - Se não existir, faz ALTER TABLE ADD COLUMN
 * - Opcionalmente cria índices para colunas
 * - Registra uma "migração" (opcional) na app_migrations
 *
 * @param {string} tableName
 * @param {Array<{
 *   name: string,
 *   type?: string,         // ex: "INTEGER", "TEXT", "REAL", "BLOB"
 *   notNull?: boolean,     // cuidado: NOT NULL exige DEFAULT não-nulo no SQLite ao adicionar
 *   defaultValue?: any,    // será injetado como DEFAULT ... (com aspas para strings)
 *   createIndex?: boolean, // cria índice idx_<table>_<col>
 * }>} columns
 * @param {object} [opts]
 * @param {string} [opts.migrationName]  // se quiser registrar em app_migrations
 */
export async function ensureTableColumns(tableName, columns, opts = {}) {
  if (!tableName || !Array.isArray(columns) || columns.length === 0) {
    throw new Error('Informe o nome da tabela e ao menos uma coluna.');
  }

  // Tabela de controle (opcional, ajuda a saber se já rodou uma "onda" de alterações)
  await executeSql(`
    CREATE TABLE IF NOT EXISTS app_migrations (
      name TEXT PRIMARY KEY
    );
  `);

  if (opts.migrationName) {
    const r = await executeSql(
      `SELECT name FROM app_migrations WHERE name = ?`,
      [opts.migrationName]
    );
    if (r.length) {
      // Já rodado — ainda assim conferimos colunas (idempotência máxima)
      // mas não retornamos cedo para garantir idempotência por PRAGMA também
    }
  }

  // Colunas atuais
  const pragma = await executeSql(`PRAGMA table_info('${tableName}')`);
  const existingCols = new Set(pragma.map(c => c.name));

  // Para cada coluna desejada, se não existir → ALTER TABLE ADD COLUMN
  for (const col of columns) {
    if (!col.name) continue;

    if (!existingCols.has(col.name)) {
      const type = col.type ? col.type.trim() : 'TEXT';
      const parts = [`ALTER TABLE ${tableName} ADD COLUMN ${col.name} ${type}`];

      // NOT NULL em ALTER TABLE no SQLite só é permitido se tiver DEFAULT não-nulo.
      if (col.notNull) {
        if (col.defaultValue === undefined || col.defaultValue === null) {
          console.warn(`⚠️ Coluna "${col.name}" pediu NOT NULL, mas sem DEFAULT. Removendo NOT NULL para evitar falha no SQLite.`);
        } else {
          parts.push('NOT NULL');
        }
      }

      if (col.defaultValue !== undefined) {
        const dv = typeof col.defaultValue === 'string'
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
    // marca como aplicada (idempotente)
    await executeSql(
      `INSERT OR IGNORE INTO app_migrations (name) VALUES (?);`,
      [opts.migrationName]
    );
  }

  return true;
}
