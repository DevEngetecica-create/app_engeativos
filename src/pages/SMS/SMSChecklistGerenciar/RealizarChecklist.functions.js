import { db } from "@/config/database/database";
import Toast from "react-native-root-toast";
import { pendenciasPorRealizado, reativarRegistrosAbandonados } from "@/config/database/syncService";

/**
 * Busca checklists realizados no SQLite, ja com o status agregado de
 * sincronizacao (pendentes + abandonados + sincronizados — soma vinculo + filhos
 * + imagens + assinaturas).
 *
 * Retorna campos extras por item:
 *   - sync_pendentes  : numero de filhos/imagens/assinaturas em retry automatico
 *   - sync_abandonados: numero de filhos/imagens/assinaturas que excederam tentativas
 *   - sync_total_ok   : numero de filhos sincronizados
 *   - sync_label      : 'OK' | 'Pendente' | 'Falhou'
 */
export const fetchChecklistsFeitos = async (checklistId, id_obra) => {
  const base = await new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        `SELECT
          id,
          id_obra,
          checklist_id,
          id_local,
          created_at,
          sync_status
        FROM sms_checklist_realizado_vinculo
        WHERE checklist_id = ? AND id_obra = ?
        ORDER BY datetime(created_at) DESC;`,
        [checklistId, id_obra],
        (_, { rows }) => resolve(rows._array || []),
        (_, error) => {
          console.error("Erro ao carregar checklists feitos:", error);
          Toast.show("Erro ao carregar checklists salvos", { duration: 1500 });
          reject(error);
          return true;
        }
      );
    });
  });

  // Enriquecimento com status agregado (sequencial; lista costuma ser pequena)
  const enriquecidos = [];
  for (const item of base) {
    const p = await pendenciasPorRealizado(item.id_local);
    let label = 'OK';
    if (p.abandonados > 0) label = 'Falhou';
    else if (p.pendentes > 0) label = 'Pendente';

    enriquecidos.push({
      ...item,
      sync_pendentes: p.pendentes,
      sync_abandonados: p.abandonados,
      sync_total_ok: p.sincronizados,
      sync_label: label,
    });
  }
  return enriquecidos;
};

/**
 * Reativa todos os registros abandonados (sync_status=99) vinculados a um
 * checklist realizado especifico. Usar quando o usuario quer forcar nova
 * tentativa apos varias falhas.
 */
export const forcarRetryAbandonados = async (realizadoIdLocal) => {
  const tabelas = [
    'sms_checklist_realizado_vinculo',
    'sms_checklist_informacoes_preenchidos',
    'sms_checklist_itens_preenchidos',
    'sms_checklist_preenchido_assinaturas',
    'sms_checklist_preenchido_imagens',
  ];
  let total = 0;
  for (const tab of tabelas) {
    if (tab === 'sms_checklist_realizado_vinculo') {
      total += await reativarRegistrosAbandonados(tab, [realizadoIdLocal]);
    } else if (tab === 'sms_checklist_preenchido_imagens') {
      // Imagens via filtro indireto — busca antes os id_local elegiveis
      const idsItens = await new Promise((resolve) => {
        db.readTransaction((tx) => {
          tx.executeSql(
            `SELECT id_local FROM sms_checklist_itens_preenchidos WHERE realizado_id = ?;`,
            [realizadoIdLocal],
            (_, { rows: r }) => resolve((r._array || []).map(x => x.id_local).filter(Boolean)),
            () => resolve([])
          );
        });
      });
      if (idsItens.length === 0) continue;
      const idsImgs = await new Promise((resolve) => {
        db.readTransaction((tx) => {
          tx.executeSql(
            `SELECT id_local FROM sms_checklist_preenchido_imagens
              WHERE preenchido_id IN (${idsItens.map(() => '?').join(',')}) AND sync_status = 99;`,
            idsItens,
            (_, { rows: r }) => resolve((r._array || []).map(x => x.id_local).filter(Boolean)),
            () => resolve([])
          );
        });
      });
      if (idsImgs.length > 0) total += await reativarRegistrosAbandonados(tab, idsImgs);
    } else {
      // Filhos diretos por realizado_id
      const ids = await new Promise((resolve) => {
        db.readTransaction((tx) => {
          tx.executeSql(
            `SELECT id_local FROM ${tab} WHERE realizado_id = ? AND sync_status = 99;`,
            [realizadoIdLocal],
            (_, { rows: r }) => resolve((r._array || []).map(x => x.id_local).filter(Boolean)),
            () => resolve([])
          );
        });
      });
      if (ids.length > 0) total += await reativarRegistrosAbandonados(tab, ids);
    }
  }
  return total;
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
