import { db } from "@/config/database/database";
import Toast from "react-native-root-toast";
import uuid from 'react-native-uuid';
import { getDateTime } from "@/utils/getDateTime";
import { prepararAssinaturas, inserirAssinaturasTx } from "./Assinaturas/assinaturas.functions";
import { inserirItensPreenchidosTx, atualizarItensPreenchidosTx } from './Campos/campos.functions';
import { inserirInformacoesPreenchidosTx, atualizarInformacoesPreenchidosTx } from "./Informacoes/informacao.functions";


// 🔹 Busca o cabeçalho do checklist
export async function fetchChecklistCabecalho(checklist_id) {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        `SELECT * FROM sms_checklist WHERE id = ? `,
        [checklist_id],
        (_, { rows }) => {
          if (rows.length > 0) {
            resolve(rows.item(0)); //Retorna o objeto diretamente
          } else {
            resolve(null);
          }
        },
        (_, error) => reject(error)
      );
    });
  });
}

export async function fetchChecklistInformacoes(checklist_id) {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        `SELECT * FROM sms_checklist_informacoes WHERE checklist_id = ? AND ativo = 1`,
        [checklist_id],
        (_, { rows }) => {
          resolve(rows._array);
        },
        (_, error) => reject(error)
      );
    });
  });
}


// 🔹 Busca os campos do checklist
export async function fetchChecklistCampos(checklist_id) {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        `SELECT * FROM sms_checklist_itens WHERE checklist_id = ? AND ativo = 1`,
        [checklist_id],
        (_, { rows }) => {
          resolve(rows._array);
        },
        (_, error) => reject(error)
      );
    });
  });
}



export async function loadChecklist({ checklist, setState }) {
  setState((s) => ({ ...s, loading: true }));

  try {
    Toast.show("📋 Carregando campos do checklist...", { duration: 400 });

    const result_campos = await fetchChecklistCampos(checklist); // busca no SQLite ou API
    const result_info = await fetchChecklistInformacoes(checklist);
    const result_cabecalho = await fetchChecklistCabecalho(checklist);
    // console.log(result_cabecalho);
    setState((s) => ({
      ...s,
      cabecalho: result_cabecalho,
      campos: result_campos,
      informacoes: result_info,
      loading: false,
    }));
  } catch (error) {
    console.error("Erro ao carregar campos do checklist:", error);
    Toast.show("❌ Erro ao carregar checklist.", { duration: 1500 });
    setState((s) => ({ ...s, loading: false }));
  }
}



// Função principal reorganizada
export async function salvarRespostas({
  checklist_id,
  respostas_informacoes,
  respostas_campos,
  idObra,
  realizado_id,
  assinaturas,
  observacoes,
  userName
}) {

  const validacao = validarRespostasChecklist({ realizado_id, assinaturas, respostas_campos, respostas_informacoes });
  if (!validacao.ok) {
    return { ok: false, mensagem: validacao.mensagem };
  }

  const dataAtual = getDateTime();

  // Primeiro: salvar fisicamente todas as assinaturas (fora da transaction)
  let assinaturasPreparadas = [];
  try {
    assinaturasPreparadas = await prepararAssinaturas(assinaturas);
  } catch (err) {
    // Se salvamento de assinatura falhar, rejeitar imediatamente
    return Promise.reject(err);
  }

  return new Promise((resolve, reject) => {
    db.transaction(
      (tx) => {
        // Novo registro
        if (!realizado_id) {
          const novoRealizadoId = uuid.v4();

          // inserir registro principal (geramos id antes do executeSql para usá-lo)
          tx.executeSql(
            `INSERT INTO sms_checklist_realizado_vinculo 
              (id_local, checklist_id, id_obra, responsavel_inspecao, observacoes, created_at, sync_status)
             VALUES (?, ?, ?, ?, ?, ?, 0)`,
            [
              novoRealizadoId,
              checklist_id,
              idObra,
              userName,
              observacoes ?? null,
              dataAtual
            ]
          );

          // inserir informaçoes preenchidos vinculados
          inserirInformacoesPreenchidosTx(tx, novoRealizadoId, respostas_informacoes, dataAtual);

          // inserir itens preenchidos vinculados
          inserirItensPreenchidosTx(tx, novoRealizadoId, respostas_campos, dataAtual);

          // inserir assinaturas (usando caminhos já preparados)
          inserirAssinaturasTx(tx, novoRealizadoId, assinaturasPreparadas, dataAtual);

          return;
        }
        // Atualização de registro existente
        tx.executeSql(
          `UPDATE sms_checklist_realizado_vinculo
           SET observacoes = ?, updated_at = ?, sync_status = 0
           WHERE id_local = ?`,
          [
            observacoes,
            dataAtual,
            realizado_id
          ]
        );
        // atualizar informações existentes
        atualizarInformacoesPreenchidosTx(tx, realizado_id, respostas_informacoes, dataAtual);

        // atualizar itens existentes
        atualizarItensPreenchidosTx(tx, realizado_id, respostas_campos, dataAtual);

        // inserir novas assinaturas (podem ser adicionais)
        inserirAssinaturasTx(tx, realizado_id, assinaturasPreparadas, dataAtual);
      },
      (txError) => {
        // erro na transaction
        reject(txError);
      },
      () => {
        // sucesso
        resolve({ ok: true });
      }
    );
  });
}


function validarRespostasChecklist({ realizado_id, assinaturas, respostas_campos, respostas_informacoes }) {

  let i = 0;
  // console.log(respostas_informacoes);
  for (const [key, resp] of Object.entries(respostas_informacoes)) {
    const obrigatorio = Number(resp.obrigatorio ?? 0);
    i++;
    if (obrigatorio == 1 && !resp.resposta) {
      return { ok: false, mensagem: `A informação ${i} é obrigatória.` };
    }

  }

  i = 0;
  for (const [key, resp] of Object.entries(respostas_campos)) {
    const obrigatorio = Number(resp.obrigatorio ?? 0);
    const conforme = Number(resp.conforme ?? -1);
    i++;
    
    // Campo obrigatório só aceita 1 ou 2
    if (obrigatorio == 1 && ![1, 2, 0].includes(conforme)) {
      return { ok: false, mensagem: `O item ${i} é obrigatório.` };
    }

    // Se conforme = 0 → imagem + descrição obrigatórios
    if (conforme == 0) {
      
      if (!resp.descricao || resp.descricao.trim() === "") {
        return { ok: false, mensagem: `O item ${i} precisa de uma descrição.` };
      }

      if (!resp.imagens || resp.imagens.length === 0) {
        return { ok: false, mensagem: `O item ${i} precisa de ao menos uma imagem.` };
      }
    }

      
  }

  if (!realizado_id) {
    const temAssinaturaValida = Array.isArray(assinaturas)
      ? assinaturas.some((a) => a && a.assinaturaUri && a.nome)
      : Object.values(assinaturas || {}).some((a) => a && a.assinaturaUri && a.nome);

    if (!temAssinaturaValida) {
      return { ok: false, mensagem: "O checklist precisa ser assinado." };
    }
  }

  return { ok: true };
}


