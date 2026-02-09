// src/config/database/database.js
import * as SQLite from 'expo-sqlite/legacy';
import veiculosTabelas from './tabelas/veiculos.tabelas';
import SMSTabelas from './tabelas/SMS.tabelas';
import baseTabelas from './tabelas/base.tabelas';

export const db = SQLite.openDatabase('app.db', '1.0');

export function initDatabase() {
  return new Promise((resolve, reject) => {
    if (!db) {
      console.error('❌ DB não inicializado!');
      return reject(new Error('DB not opened'));
    }

    db.transaction(
      tx => {

        var queries = [
          ...baseTabelas(),
          ...veiculosTabelas(),
          ...SMSTabelas(),
        ];

        queries.forEach(q => tx.executeSql(q));

      },
      err => reject(err),
      () => resolve()
    );
  });
}

export function hasAnyUser() {
  return new Promise(resolve => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT COUNT(*) AS qtd FROM users;',
        [],
        (_, { rows }) => resolve((rows.item(0)?.qtd || 0) > 0),
        () => resolve(false)
      );
    });
  });
}

export function findUserByEmailAndPassHash(email, passHash) {
  return new Promise(resolve => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM users WHERE email = ? AND password_app = ? LIMIT 1;',
        [email, passHash],
        (_, { rows }) => resolve(rows.length ? rows.item(0) : null),
        () => resolve(null)
      );
    });
  });
}

export function upsertUserFromOnline(user, passHash) {
  return new Promise(resolve => {
    db.transaction(tx => {
      tx.executeSql(
        `INSERT OR REPLACE INTO users
         (id, name, email, password_app, biometria, geolocalizacao, sync_status)
         VALUES (?, ?, ?, ?, ?, ?, 1);`,
        [
          user.id,
          user.name ?? '',
          user.email ?? '',
          passHash,
          user.biometria ? 1 : 0,
          user.geolocalizacao ? 1 : 0
        ],
        () => resolve(true),
        () => resolve(false)
      );
    });
  });
}


export function executeSql(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        sql,
        params,
        (_, { rows }) => resolve(rows._array),
        (_, err) => reject(err)
      );
    });
  });
}
