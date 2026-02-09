import { db } from "@/config/database/database";
import Toast from "react-native-root-toast";

/**
 * Busca checklists realizados no SQLite
 * @param {number} checklistId - ID do checklist base
 * @returns {Promise<Array>} - Lista de checklists realizados
 */
export const fetchChecklistsFeitos = async (checklistId, id_obra) => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        `SELECT 
          id,
          id_obra,
          checklist_id,
          id_local,
          created_at
        FROM sms_checklist_realizado_vinculo
        WHERE checklist_id = ? AND id_obra = ?
        ORDER BY datetime(created_at) DESC;`,
        [checklistId, id_obra],
        (_, { rows }) => {
          resolve(rows._array);
        },
        (_, error) => {
          console.error("Erro ao carregar checklists feitos:", error);
          Toast.show("Erro ao carregar checklists salvos", { duration: 1500 });
          reject(error);
          return true;
        }
      );
    });
  });
};

/**
 * Navega para criação de um novo checklist
 */
export const criarNovoChecklist = (navigation, checklist, checklist_nome, id_obra) => {
  navigation.navigate("SMSChecklistResponder", {
    checklist,
    checklist_nome,
    id_obra,
    novo: true,
  });
};

/**
 * Navega para edição de checklist existente
 */
export const editarChecklist = (navigation, checklist, checklist_nome, item) => {
  console.log(item);
  navigation.navigate("SMSChecklistResponder", {
    checklist,
    checklist_nome,
    realizado_id: item.id_local,
  });
};
