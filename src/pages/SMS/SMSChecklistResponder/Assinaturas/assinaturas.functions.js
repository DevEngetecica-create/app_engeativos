import { db } from "@/config/database/database";
import * as FileSystem from 'expo-file-system';


export const loadAssinaturas = async ({ realizado_id, setState }) => {
    return new Promise((resolve, reject) => {
        db.transaction((tx) => {
            tx.executeSql(
                `SELECT * FROM sms_checklist_preenchido_assinaturas WHERE realizado_id = ?`,
                [realizado_id],
                (txObj, { rows: { _array } }) => {
                    if (_array.length > 0) {
                        const assinaturas = _array.map((item, i) => ({
                            nome: item.nome || "",
                            cpf: item.cpf || "",
                            assinaturaUri: item.arquivo_app || null,
                            trabalhador_externo: item.trabalhador_externo || 0,
                            showSignature: false,
                            index: i,
                        }));
                        resolve(assinaturas);
                        // Atualizar estado
                        setState((s) => ({
                            ...s,
                            assinaturas,
                            loading: false,
                        }));
                        // console.log(assinaturas);
                    } else {
                        setState((s) => ({
                            ...s,
                            loading: false,
                        }));
                    }
                },
                (txObj, error) => {
                    console.error("Erro ao buscar assinaturas:", error);
                    reject(error);
                }
            );
        });
    });
};

export const loadFuncionario = async ({ cpf }) => {
    return new Promise((resolve, reject) => {
        db.transaction((tx) => {
            tx.executeSql(
                `SELECT nome FROM sms_funcionarios WHERE cpf = ?`,
                [cpf],
                (txObj, { rows: { _array } }) => {
                    if (_array.length > 0) {
                        // Retorna o nome do funcionário
                        resolve(_array[0].nome);
                    } else {
                        // Nenhum funcionário encontrado
                        resolve(null);
                    }
                },
                (txObj, error) => {
                    console.error("Erro ao buscar funcionário:", error);
                    reject(error);
                }
            );
        });
    });
};

// Função para aplicar máscara automaticamente
export const formatCPF = (cpf) => {
  // Remove tudo que não for número
  const numbers = cpf.replace(/\D/g, "");
  // Aplica máscara
  const part1 = numbers.slice(0, 3);
  const part2 = numbers.slice(3, 6);
  const part3 = numbers.slice(6, 9);
  const part4 = numbers.slice(9, 11);

  let formatted = part1;
  if (part2) formatted += `.${part2}`;
  if (part3) formatted += `.${part3}`;
  if (part4) formatted += `-${part4}`;

  return formatted;
};

export const handleCPFChange = async (index, text, handleChangeAssinatura) => {

  // Atualiza o state com CPF formatado
  handleChangeAssinatura(index, "cpf", text);

  // Remove máscara para verificar se tem 11 números
  const cpfNumbers = text.replace(/\D/g, "");

  // Só busca quando tiver 11 dígitos
  if (cpfNumbers.length === 11) {
    try {
      // Ajusta o formato para o banco: XXX.XXX.XXX-XX
      handleChangeAssinatura(index, "nome", "Funcionario não encontrado");
      const cpfForDB = formatCPF(cpfNumbers);

      const nome = await loadFuncionario({ cpf: cpfForDB });

      if (nome) {
        handleChangeAssinatura(index, "nome", nome);
      }
    } catch (error) {
      console.error("Erro ao carregar funcionário:", error);
    }
  }
};

// PRE-SALVA todas as assinaturas no dispositivo e retorna um array com metadados
export async function prepararAssinaturas(assinaturas = {}) {
  const entries = Object.entries(assinaturas || {});

  if (entries.length === 0) return [];

  // filtra assinaturas inválidas ANTES de processar
  const validas = entries.filter(([_, assinatura]) =>
    assinatura &&
    typeof assinatura === "object" &&
    assinatura.assinaturaUri &&
    assinatura.nome
  );

  // se nenhuma assinatura válida existir, retorna vazio
  if (validas.length === 0) return [];

  // salva apenas as válidas
  const saved = await Promise.all(
    validas.map(async ([campo_id, assinatura]) => {
      const { caminho, nomeArquivo } = await salvarAssinaturaNoDispositivo(
        assinatura.assinaturaUri,
        assinatura.nome
      );

      return {
        campo_id,
        caminho,
        nome: assinatura.nome || null,
        cpf: assinatura.cpf || null,
        nomeArquivo
      };
    })
  );

  return saved;
}


// Inserção síncrona de assinaturas dentro da transaction (sem await!)
export function inserirAssinaturasTx(tx, realizado_id, assinaturasPreparadas = [], dataAtual) {
  assinaturasPreparadas.forEach((a) => {
    tx.executeSql(
      `INSERT INTO sms_checklist_preenchido_assinaturas
        (realizado_id, arquivo_app, cpf, nome, trabalhador_externo, user_create, created_at, sync_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        realizado_id,
        a.caminho,
        a.cpf,
        a.nome,
        null,
        "user_local",
        dataAtual
      ]
    );
  });
}

async function salvarAssinaturaNoDispositivo(base64, nome) {
  const nomeArquivo = `assinatura_${nome}_${Date.now()}.png`;
  const diretorio = 'SMS/assinaturas/';
  const caminho = FileSystem.documentDirectory + diretorio + nomeArquivo;
  base64 = base64.replace(/^data:image\/\w+;base64,/, '');
  await FileSystem.writeAsStringAsync(caminho, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return { caminho, nomeArquivo };
}
