import { db } from "@/config/database/database";
import uuid from 'react-native-uuid';
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from 'expo-file-system';
import { Alert } from 'react-native';



// ==============================================
// 🔹 Função para preencher campos do checklist
// ==============================================
export const loadCamposPreenchidos = async ({ realizado_id, setState }) => {
  setState((s) => ({ ...s, loading: true })); // Certifique-se de que o loading é ativado antes da transação

  db.transaction((tx) => {
    // 1. Consulta para buscar 'observacoes' da tabela 'sms_checklists_realizado'
    tx.executeSql(
      `SELECT observacoes FROM sms_checklist_realizado_vinculo WHERE id_local = ?`,
      [realizado_id],
      (txObj, { rows: { _array } }) => {
        let observacoes = "";
        if (_array.length > 0) {
          observacoes = _array[0].observacoes || "";
        }

        // 2. Consulta para buscar os itens preenchidos da tabela 'sms_checklist_itens_preenchidos'
        tx.executeSql(
          `SELECT * FROM sms_checklist_itens_preenchidos WHERE realizado_id = ?`,
          [realizado_id],
          (txObj, { rows: { _array: itensPreenchidos } }) => {
            const respostas_campos = {};
            if (itensPreenchidos.length > 0) {
              // Transformar os dados do banco no formato esperado pelo estado
              itensPreenchidos.forEach((item) => {
                respostas_campos[item.item_id] = {
                  id_local: item.id_local,
                  conforme: item.conforme ?? "",
                  descricao: item.descricao || "",
                  acao_sugestao: item.acao_sugestao || "",
                  responsavel_acao: item.responsavel_acao || "",
                  imagens: [],
                };
                loadImagensPreenchidas( item.id_local, setState )
                
              });
            }
            
            // 3. Atualizar estado com DADOS e OBSERVAÇÕES (após a conclusão de AMBAS as consultas)
            setState((s) => ({
              ...s,
              respostas_campos,
              observacoes, // Adicionado o novo campo aqui
              loading: false,
            }));
          },
          (txObj, error) => {
            // Em caso de erro na SEGUNDA consulta
            console.error("Erro ao buscar itens preenchidos:", error);
            setState((s) => ({ ...s, loading: false }));
          }
        );
      },
      (txObj, error) => {
        // Em caso de erro na PRIMEIRA consulta
        console.error("Erro ao buscar observações:", error);
        setState((s) => ({ ...s, loading: false }));
      }
    );
  });
};

function loadImagensPreenchidas(itemIdLocal, setState) {
  if (!itemIdLocal) return;
  db.transaction((tx) => {
    tx.executeSql(
      `SELECT arquivo_local, arquivo_app FROM sms_checklist_preenchido_imagens WHERE preenchido_id = ?`,
      [itemIdLocal],
      (txObj, { rows: { _array: imagens } }) => {
        setState((s) => {
          const respostasAtualizadas = { ...s.respostas_campos };
          const chave = Object.keys(respostasAtualizadas).find(
            (key) => respostasAtualizadas[key].id_local === itemIdLocal
          );
          // garante que o item exista
          if (!respostasAtualizadas) return s;
          
          if (!respostasAtualizadas[chave].imagens) {
            respostasAtualizadas[chave].imagens = [];
          }

          imagens.forEach((img) => {
            respostasAtualizadas[chave].imagens.push({ uri: img.arquivo_local || img.arquivo_app, saved: true });
          });
          

          return { ...s, respostas_campos: respostasAtualizadas };
          // return s;
        });
      },
      (txObj, error) => {
        console.error("Erro ao buscar imagens:", error);
      }
    );
  });
}


function normalizeResposta(resposta) {
  if (resposta && resposta.conforme === 1) {
    return {
      ...resposta,
      responsavel_acao: null,
      descricao: null,
      acao_sugestao: null
    };
  }
  return resposta;
}


// Inserções de itens (mantive sua lógica)
export function inserirItensPreenchidosTx(tx, realizado_id, respostas = {}, dataAtual) {
  Object.entries(respostas).forEach(([campo_id, resposta]) => {
    const r = normalizeResposta(resposta);
    const idLocalTemp = uuid.v4();

    tx.executeSql(
      `INSERT INTO sms_checklist_itens_preenchidos 
        (id_local, realizado_id, item_id, conforme, descricao, acao_sugestao, responsavel_acao, created_at,
         updated_at, user_create, sync_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        idLocalTemp,
        realizado_id,
        campo_id,
        r.conforme,
        r.descricao,
        r.acao_sugestao ?? null,
        r.responsavel_acao ?? null,
        dataAtual,
        dataAtual,
        r.funcionario_inspecao,
        0
      ]
    );
    // Inserir imagens associadas ao item, se houver
    if (Array.isArray(r.imagens) && r.imagens.length > 0) {
      inserirImagensChecklistTx(tx, idLocalTemp, r.imagens, r.funcionario_inspecao, dataAtual);
    }
  });
}



export function atualizarItensPreenchidosTx(tx, realizado_id, respostas = {}, dataAtual) {
  Object.values(respostas).forEach((resp) => {
    const r = normalizeResposta(resp);
    tx.executeSql(
      `UPDATE sms_checklist_itens_preenchidos
       SET conforme = ?, descricao = ?, acao_sugestao = ?, responsavel_acao = ?, updated_at = ?, sync_status = 0
       WHERE realizado_id = ? AND id_local = ?`,
      [
        r.conforme,
        r.descricao,
        r.acao_sugestao ?? null,
        r.responsavel_acao ?? null,
        dataAtual,
        realizado_id,
        r.id_local
      ]
    );
    if (Array.isArray(r.imagens) && r.imagens.length > 0) {
      inserirImagensChecklistTx(tx, r.id_local, r.imagens, r.funcionario_inspecao, dataAtual);
    }
  });
}

function inserirImagensChecklistTx(tx, preenchido_id, imagens = [], funcionario_inspecao, dataAtual) {
  imagens.forEach((img) => {
    if (img.saved == true || img.saved == undefined) return;
    const idLocalImg = uuid.v4(); // id_local para a tabela de imagens

    tx.executeSql(
      `INSERT INTO sms_checklist_preenchido_imagens
        (id_local, preenchido_id, arquivo_local, arquivo_app, user_create, created_at, sync_status)
       VALUES (?, ?, ?, ?, ?, ?, 0)`,
      [
        idLocalImg,
        preenchido_id,           // vincula a imagem ao checklist preenchido
        img.uri,
        img.uri,                 // caminho da imagem ou base64
        funcionario_inspecao,
        dataAtual
      ]
    );
  });
}


// função principal — chama com (campoId, valor, handleChange)
export const handlePickImage = async (campoId, valorAtual, handleChange) => {
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permissão negada", "Você precisa conceder permissão à câmera.");
      return;
    }

    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6
    });

    if (res.canceled || !res.assets?.length) return;

    const { uri } = res.assets[0];
    // console.log(uri);
    const nome = uri.split("/").pop();

    const pastaDestino = `${FileSystem.documentDirectory}SMS/imagens/`;

    const novoCaminho = pastaDestino + nome;

    await FileSystem.moveAsync({
      from: uri,
      to: novoCaminho,
    });
    // console.log(novoCaminho);
    // 🔥 Atualizar o estado usando seu handleChange
    handleChange(campoId, {
      ...valorAtual,
      imagens: [...(valorAtual.imagens || []), { uri: novoCaminho, arquivo_app: nome, saved:false }],
    });

    

  } catch (err) {
    console.log("ERRO AO USAR CAMERA:", err);
    Alert.alert("Erro", "Não foi possível abrir a câmera.");
  }
};

export async function excluirImagemDoDispositivo(path) {
  try {
    // apaga o arquivo
    await FileSystem.deleteAsync(path, { idempotent: true });
    // Alert.alert("Imagem excluída com sucesso!");
  } catch (error) {
    console.log("Erro ao excluir a imagem:", error);
  }
}
