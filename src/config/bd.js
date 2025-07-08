// db.js

import * as SQLite from 'expo-sqlite/legacy';
import { tables } from './databaseSchema';

export const initDB = async () => {
  const db = SQLite.openDatabase({ name: 'sgacombr23_painel.db', location: 'default' });

  for (const table of tables) {
    const columns = table.columns.map(col => `${col.name} ${col.type}`).join(', ');
    const query = `CREATE TABLE IF NOT EXISTS ${table.name} (${columns});`;
    await db.executeSql(query);
  }

  return db;
};
