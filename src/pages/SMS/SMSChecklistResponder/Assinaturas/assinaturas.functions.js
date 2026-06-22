import { db } from "@/config/database/database";
import * as FileSystem from 'expo-file-system';
import uuid from 'react-native-uuid';


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
                            assinaturaUri: item.arquivo_local || item.arquivo_app || null,
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

// Normaliza entrada (array OU objeto) em uma lista de [chave, assinatura]
function normalizarAssinaturas(entrada) {
  if (!entrada) return [];

  // Array vindo do componente Assinatura: [{ nome, cpf, assinaturaUri, ... }, ...]
  if (Array.isArray(entrada)) {
    return entrada.map((assinatura, index) => [String(assinatura?.campo_id ?? assinatura?.index ?? index), assinatura]);
  }

  // Objeto/dict { campo_id: assinatura }
  if (typeof entrada === 'object') {
    return Object.entries(entrada).map(([chave, assinatura]) => [String(chave), assinatura]);
  }

  return [];
}

// PRE-SALVA todas as assinaturas no dispositivo e retorna um array com metadados.
// Aceita array (do componente Assinatura) OU objeto (legado).
export async function prepararAssinaturas(assinaturas) {
  const entries = normalizarAssinaturas(assinaturas);
  if (entries.length === 0) return [];

  // Filtra invalidas antes de tocar disco
  const validas = entries.filter(([_, assinatura]) =>
    assinatura &&
    typeof assinatura === 'object' &&
    assinatura.assinaturaUri &&
    assinatura.nome
  );
  if (validas.length === 0) return [];

  const saved = [];
  for (const [campo_id, assinatura] of validas) {
    try {
      const { caminho, nomeArquivo } = await salvarAssinaturaNoDispositivo(
        assinatura.assinaturaUri,
        assinatura.nome
      );

      saved.push({
        campo_id,
        caminho,
        nome: assinatura.nome || null,
        cpf: assinatura.cpf || null,
        trabalhador_externo: assinatura.trabalhador_externo ?? null,
        nomeArquivo,
      });
    } catch (err) {
      // Falha ao gravar arquivo de UMA assinatura nao deve abortar todo o checklist.
      // O usuario pode reabrir o checklist e re-assinar antes do upload.
      console.error(`Falha ao salvar assinatura (campo_id=${campo_id}):`, err?.message);
    }
  }

  return saved;
}


// Inserção síncrona de assinaturas dentro da transaction (sem await!)
export function inserirAssinaturasTx(tx, realizado_id, assinaturasPreparadas = [], dataAtual) {
  assinaturasPreparadas.forEach((a) => {
    const idLocalTemp = uuid.v4();
    tx.executeSql(
      `INSERT INTO sms_checklist_preenchido_assinaturas
        (id_local, realizado_id, arquivo_local, arquivo_app, cpf, nome, trabalhador_externo, user_create, created_at, sync_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        idLocalTemp,
        realizado_id,
        a.caminho,
        a.caminho,
        a.cpf,
        a.nome,
        a.trabalhador_externo ?? null,
        "user_local",
        dataAtual,
      ]
    );
  });
}

async function salvarAssinaturaNoDispositivo(base64, nome) {
  const diretorio = 'SMS/assinaturas/';
  const dirPath = FileSystem.documentDirectory + diretorio;

  await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });

  if (
    typeof base64 === 'string' &&
    (base64.startsWith('file://') || base64.startsWith(FileSystem.documentDirectory))
  ) {
    const info = await FileSystem.getInfoAsync(base64);
    if (!info?.exists) {
      throw new Error('Arquivo local da assinatura não encontrado.');
    }

    const nomeArquivoExistente = base64.split('/').pop();
    return { caminho: base64, nomeArquivo: nomeArquivoExistente };
  }

  const nomeSeguro = String(nome || 'assinatura').replace(/[^\w.-]+/g, '_');
  const nomeArquivo = `assinatura_${nomeSeguro}_${Date.now()}.png`;
  const caminho = dirPath + nomeArquivo;
  base64 = String(base64 || '').replace(/^data:image\/\w+;base64,/, '');
  if (!base64) {
    throw new Error('Assinatura vazia ou inválida.');
  }

  await FileSystem.writeAsStringAsync(caminho, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return { caminho, nomeArquivo };
}
