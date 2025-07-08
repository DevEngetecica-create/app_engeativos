// .src/config/database/dataBaseSave.js
import { db } from './database';

/**
 *
 * @param {Object} Data  — pode ter propriedades de checklist OU abastecimento
 * @param {Array} itens  — só para checklist: [{ id_checklist_itens,… }]
 */
export function salvarLocalmente(Data, itens = []) {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      // 1) Se for checklist: salva pai e itens
      if (Data.id_checklist) {
        tx.executeSql(
          `INSERT INTO veiculo_checklist_servicos
            (id_obra,id_checklist,periodo,id_veiculo,data_cadastro,status,
             horimetro_atual,horimetro_novo,quilometragem_atual,quilometragem_nova,
             sync_status)
           VALUES (?,?,?,?,?,?,?,?,?,?,0);`,
          [
            Data.id_obra,
            Data.id_checklist,
            Data.periodo,
            Data.id_veiculo,
            Data.data_cadastro,
            Data.status,
            Data.horimetro_atual ?? null,
            Data.horimetro_novo ?? null,
            Data.quilometragem_atual ?? null,
            Data.quilometragem_nova ?? null,
            
          ],
          (_, { insertId }) => {
            itens.forEach(item => {
              tx.executeSql(
                `INSERT INTO veiculo_checklist_realizados
                  (id_servico_local,id_obra,id_checklist_itens,id_veiculo,
                   status,observacao,arquivo_uri,data_cadastro,sync_status)
                 VALUES (?,?,?,?,?,?,?,?,0);`,
                [
                  insertId,
                  Data.id_obra,
                  item.id_checklist_itens,
                  Data.id_veiculo,
                  item.status,
                  item.observacao,
                  item.arquivo_uri,
                  item.data_cadastro
                ]
              );
            });
          },
          (_, err) => reject(err)
        );
      }

      // 2) Se for abastecimento: salva no local
      if (Data.data_abastecimento) {
        tx.executeSql(
          `INSERT INTO abastecimentos 
          (veiculo_id, id_obra, id_funcionario, data_abastecimento, fornecedor, combustivel,
            quantidade, valor_do_litro, valor_total, arquivo, sync_status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0);`,
          [
            Data.veiculo_id,
            Data.id_obra,
            Data.id_funcionario,
            Data.data_abastecimento,
            Data.fornecedor,
            Data.combustivel,
            Data.quantidade,
            Data.valor_do_litro,
            Data.valor_total,
            Data.arquivo?.uri || null,
          ],
          null,
          (_, err) => reject(err)
        );
      }

    },
      err => reject(err),
      () => resolve()
    );
  });
}
