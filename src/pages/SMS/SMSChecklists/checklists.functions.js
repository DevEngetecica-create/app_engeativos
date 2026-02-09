// src/pages/Checklists/checklists.functions.js
import api from "@/config/api";
import { db } from "@/config/database/database";

// ===============================
// 🔹 Buscar online
// ===============================
export const fetchOnline = async () => {
  const resp = await api.get("app/sms/checklists"); // ajustar rota API
  if (!resp?.data?.status) {
    console.log(resp.data);
    throw new Error(resp?.data?.message || "Falha ao obter checklists.");
  }

  const data = Array.isArray(resp.data?.sms_checklist)
    ? resp.data.sms_checklist
    : [];

  // 🔸 Atualiza cache local no SQLite
  db.transaction((tx) => {
    tx.executeSql("DELETE FROM sms_checklist;");
    data.forEach((c) => {
      tx.executeSql(
        `INSERT OR REPLACE INTO sms_checklist (id, nome_checklist) VALUES (?, ?) ;`,
        [c.id, c.nome_checklist]
      );
    });
  });

  return { checklists: data, count: data.length };
};

// ===============================
// 🔹 Buscar offline
// ===============================
export const fetchOffline = async (idObra) => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        `SELECT c.id, c.nome_checklist
          FROM sms_checklist c
          WHERE c.id_obra =?
        ORDER BY c.nome_checklist ASC;`,
        [idObra],
        (_, { rows }) =>
          resolve({
            checklists: rows._array.map((c) => ({
              id: c.id,
              nome_checklist: c.nome_checklist
            })),
            count: rows._array.length,
          }),
        (_, error) => {
          reject(error);
          return false;
        }
      );
    });
  });
};
