import { db } from "@/config/database/database";
import uuid from 'react-native-uuid';




// ==============================================
// 🔹 Função para preencher campos do checklist
// ==============================================
export const loadInformacoesPreenchidos = async ({ realizado_id, setState }) => {
  setState((s) => ({ ...s, loading: true })); // Certifique-se de que o loading é ativado antes da transação

  db.transaction((tx) => {
    tx.executeSql(
      `SELECT * FROM sms_checklist_informacoes_preenchidos WHERE realizado_id = ?`,
      [realizado_id],
      (txObj, { rows: { _array: informacoesPreenchidos } }) => {
        const respostas_informacoes = {};
        // console.log(informacoesPreenchidos);
        if (informacoesPreenchidos.length > 0) {
          informacoesPreenchidos.forEach((info) => {
            respostas_informacoes[info.informacao_id] = {
              id_local: info.id_local,
              resposta: info.resposta,
            };
          });
        }

        // 3. Atualizar estado com DADOS e OBSERVAÇÕES (após a conclusão de AMBAS as consultas)
        setState((s) => ({
          ...s,
          respostas_informacoes,
          loading: false,
        }));
      },
      (txObj, error) => {
        // Em caso de erro na SEGUNDA consulta
        console.error("Erro ao buscar itens preenchidos:", error);
        setState((s) => ({ ...s, loading: false }));
      }
    );


  });
}


  export function inserirInformacoesPreenchidosTx(tx, realizado_id, respostas = {}, dataAtual) {
    Object.entries(respostas).forEach(([informacao_id, resposta]) => {
      const idLocalTemp = uuid.v4();
      tx.executeSql(
        `INSERT INTO sms_checklist_informacoes_preenchidos 
        (id_local, realizado_id, informacao_id, resposta, created_at,
         updated_at, user_create, sync_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
        [
          idLocalTemp,
          realizado_id,
          informacao_id,
          resposta.resposta,
          dataAtual,
          dataAtual,
          resposta.funcionario_inspecao,
        ]
      );
    });
  }



  export function atualizarInformacoesPreenchidosTx(tx, realizado_id, respostas = {}, dataAtual) {
    Object.values(respostas).forEach((r) => {
      tx.executeSql(
        `UPDATE sms_checklist_informacoes_preenchidos
       SET resposta = ?, updated_at = ?, sync_status = 0
       WHERE realizado_id = ? AND id_local = ?`,
        [
          r.resposta,
          dataAtual,
          realizado_id,
          r.id_local
        ]
      );
    });
  }

