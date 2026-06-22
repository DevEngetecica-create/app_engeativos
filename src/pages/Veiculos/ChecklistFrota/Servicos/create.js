// .src/pages/Veiculos/ChecklistFrota/Servicos/CreateChecklistRealizadosAccordion.js

import React, { useCallback, useState } from 'react';
import {
  Alert,
  ScrollView,
  View,
  Text,
  Image,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Platform,
} from 'react-native';
import uuid from 'react-native-uuid';
import { useRoute, useFocusEffect, useNavigation } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import styled from 'styled-components/native';

import ErrorAlert from '../../../../components/ErrorAlert';
import { db } from '../../../../config/database/database';
import { showToast } from '../../../../utils/toast';
import { nowLocalTimestamp } from '../../../../utils/datetime';
import { nowLocalDMYHM } from '../../../../utils/datetime';
import {
  integerInputBlockingSeparators,
  integerNumberValue,
  onlyDigits
} from '../../../../utils/numberInput';

// =========================================
// 🔹 ESCALAS DE FONTE (defina ANTES dos styled-components)
// =========================================
const BASE_FS = 16;   // base
const INC = 1.3;      // +30% para UI geral
const INC_BIG = 1.4;  // +40% para Anterior/Atual

// =========================================
// 🔹 UTILITÁRIOS
// =========================================
const executeSql = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        sql,
        params,
        (_, { rows }) => resolve(rows._array),
        (_, err) => reject(err)
      );
    });
  });

const getUsuarioEmail = async () => {
  try {
    const res = await executeSql(`SELECT email FROM users LIMIT 1`);
    return res.length ? res[0].email : null;
  } catch (e) {
    console.error("Erro ao buscar usuário:", e);
    return null;
  }
};

const registrarEvidenciasItens = async (itens = [], userEmail = null, agora = nowLocalTimestamp()) => {
  for (const item of itens) {
    if (!item?.id_local || !item?.arquivo_app || !String(item.arquivo_app).startsWith('file://')) continue;

    const idLocalEvidencia = `veiculo_checklist_itens_realizados:${item.id_local}:arquivo_app`;
    const nomeArquivo = item.arquivo_app.split('/').pop() || item.arquivo_app;
    await executeSql(
      `INSERT OR REPLACE INTO veiculo_checklist_evidencias
        (id_local, parent_tabela, parent_id_local, campo_foto, arquivo_local, arquivo_app, user_create, created_at, updated_at, sync_status)
       VALUES (?, 'veiculo_checklist_itens_realizados', ?, 'arquivo_app', ?, ?, ?, ?, ?, 0);`,
      [idLocalEvidencia, item.id_local, item.arquivo_app, nomeArquivo, userEmail || null, agora, agora]
    );
  }
};

// =========================================
// 🔹 LAYOUT BASE
// =========================================
const Container = styled.View`
  flex: 1;
  padding: 3px;
  background: #f5f5f5;
`;
const Card = styled.View`
  background-color: #fff;
  padding: 7px;
  margin-bottom: 8px;
  border-radius: 8px;
  elevation: 2;
`;
const HeaderCard = styled.TouchableOpacity`
  background: #fff;
  border: 1px solid #e67e22;
  border-radius: 7px;
  padding: 7px;
  margin-bottom: 6px;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;
const HeaderText = styled.Text`
  font-weight: bold;
  font-size: ${14 * INC}px; /* +30% */
  color: #333;
`;
const FormView = styled.View`
  background: #fff;
  border: 1px solid #e67e22;
  border-top-width: 0;
  border-radius: 0 0 8px 8px;
  padding: 12px;
  margin-bottom: 12px;
`;
const Label = styled.Text`
  font-weight: bold;
  margin-bottom: 4px;
  color: #333;
  font-size: ${BASE_FS * INC}px; /* +30% */
`;
const Input = styled.TextInput`
  border: 1px solid ${props => (props.error ? '#d9534f' : '#ccc')};
  border-radius: 6px;
  padding: ${Platform.OS === 'ios' ? '10px' : '10px'};
  margin-bottom: 6px;
  color: #000;
  font-size: ${BASE_FS * INC}px; /* +30% */
`;
const Btn = styled.TouchableOpacity`
  background-color: ${props => (props.disabled ? '#cccccc' : props.bg || 'green')};
  padding: 12px;
  border-radius: 6px;
  align-items: center;
  margin-bottom: 12px;
`;
const BtnText = styled.Text`
  color: #fff;
  font-weight: bold;
  font-size: ${BASE_FS * INC}px; /* +30% */
`;
const BtnFoto = styled.TouchableOpacity`
  background-color: darkorange;
  padding: 16px;
  border-radius: 6px;
  align-items: center;
  margin-vertical: 8px;
`;
const InputGroup = styled.View`
  margin-bottom: 16px;
`;

// Linhas/colunas (sem 'gap' para compatibilidade ampla)
const Row = styled.View`
  flex-direction: row;
  margin-bottom: 16px;
`;
const Col = styled.View`
  flex: 1;
`;

const Border = styled.View`
  height: 1px;
  background-color: #ccc;
  margin-vertical: 12px;
`;

// =========================================
// 🔹 COMPONENTE PRINCIPAL
// =========================================
export default function CreateChecklistRealizadosAccordion() {
  const navigation = useNavigation();
  const { id: id_checklist, id_veiculo, id_obra, prefixo, isFechamento, id_aberto_ref } = useRoute().params || {};

  const [errors, setErrors] = useState(null);
  const [items, setItems] = useState([]);
  const [dataAtual, setDataAtual] = useState('');
  const [dataAtualString, setDataAtualString] = useState('');
  const [loading, setLoading] = useState(false);

  const [refreshing, setRefreshing] = useState(false);
  const [openIds, setOpenIds] = useState({});
  const [forms, setForms] = useState({});
  const [inputError, setInputError] = useState('');
  const [temChecklist, setTemChecklist] = useState(false);

  const [valorAtual, setValorAtual] = useState('');

  const [vehicleInfo, setVehicleInfo] = useState({
    tipo: null,
    tipo_hr: 0,
    tipo_km: 0,
    maiorHrNum: 0,
    maiorHodNum: 0,
    idObra: '',
    idVeiculo: '',
  });

  // =========================================
  // 🔹 BUSCAR DADOS
  // =========================================
  const fetchItems = useCallback(async () => {
    setLoading(true);
    setErrors(null);

    const dataAtualString = nowLocalDMYHM();
    setDataAtualString(dataAtualString);

    const dataTimezone = nowLocalTimestamp();
    setDataAtual(dataTimezone);

    try {

      const lista = await executeSql(
        `SELECT * FROM veiculo_checklist_itens WHERE id_veiculo = ?`,
        [id_veiculo]
      );
      setItems(lista);
      setTemChecklist(lista.length > 0);

      // Regra de negocio: veiculos.tipo_hr=1 -> grava em veiculo_horimetro;
      //                   veiculos.tipo_km=1 -> grava em veiculo_quilometragems.
      // Se nenhum dos dois esta ativo, o checklist nao tera medicao associada.
      const veic = await executeSql(
        `SELECT tipo, tipo_hr, tipo_km, obra_id, id, modelo, marca, ano FROM veiculos WHERE id = ?`,
        [id_veiculo]
      );
      const vehicleData = veic[0] || {};
      const tipoHr = Number(vehicleData.tipo_hr) === 1 ? 1 : 0;
      const tipoKm = Number(vehicleData.tipo_km) === 1 ? 1 : 0;

      setVehicleInfo(prev => ({
        ...prev,
        tipo: vehicleData.tipo,
        tipo_hr: tipoHr,
        tipo_km: tipoKm,
        idObra: vehicleData.obra_id,
        idVeiculo: vehicleData.id,
      }));

      let maxValorNum = 0;

      if (tipoHr === 1) {
        const hrResult = await executeSql(
          `SELECT MAX(horimetro_novo) as maximo FROM veiculo_horimetro WHERE veiculo_id = ?`,
          [id_veiculo]
        );
        maxValorNum = integerNumberValue(hrResult[0]?.maximo, 0);
        setVehicleInfo(prev => ({ ...prev, maiorHrNum: maxValorNum }));
      } else if (tipoKm === 1) {
        const hodResult = await executeSql(
          `SELECT MAX(quilometragem_nova) as maximo FROM veiculo_quilometragems WHERE veiculo_id = ?`,
          [id_veiculo]
        );
        maxValorNum = integerNumberValue(hodResult[0]?.maximo, 0);
        setVehicleInfo(prev => ({ ...prev, maiorHodNum: maxValorNum }));
      }

      setValorAtual(String(maxValorNum));

      const initialForms = lista.reduce((acc, item) => ({
        ...acc,
        [item.id]: { status: 'SIM', observacao: '', image: null, dataCadastro: dataAtual }
      }), {});
      setForms(initialForms);

    } catch (e) {
      console.error('Erro ao carregar dados:', e);
      setErrors([e.message]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id_checklist, id_veiculo]);

  useFocusEffect(useCallback(() => { fetchItems(); }, [fetchItems]));

  // Validacao em tempo real do hr/km atual:
  //  - bloqueia ponto/virgula/ponto-virgula (so inteiros)
  //  - quando tipo_hr=1: bloqueia salto > 10h (jornada maxima de trabalho)
  //  - bloqueia valor < anterior
  //  - bloqueia valor IGUAL ao anterior (deve haver progresso)
  const atualizarValorAtual = (texto, valorAnterior, mensagemMenor) => {
    const textoValor = String(texto ?? '');

    if (/[.,;]/.test(textoValor)) {
      setValorAtual(prev => onlyDigits(prev));
      setInputError('Digite somente numeros, sem ponto, virgula ou ponto e virgula.');
      return;
    }

    const atualStr = integerInputBlockingSeparators(textoValor, valorAtual);
    setValorAtual(atualStr);

    if (atualStr === '') {
      setInputError('');
      return;
    }

    const atual = Number(atualStr || 0);
    const anterior = Number(valorAnterior || 0);
    const usaHorimetro = Number(vehicleInfo.tipo_hr) === 1;

    if (atual < anterior) {
      setInputError(mensagemMenor);
      return;
    }

    if (atual === anterior && anterior > 0) {
      setInputError(
        usaHorimetro
          ? 'O horimetro atual deve ser maior que o anterior.'
          : 'A quilometragem atual deve ser maior que a anterior.'
      );
      return;
    }

    if (usaHorimetro && (atual - anterior) > 10) {
      setInputError(`Salto maximo permitido: 10h (anterior=${anterior}, max=${anterior + 10}).`);
      return;
    }

    setInputError('');
  };

  // =========================================
  // 🔹 CAPTURAR FOTO
  // =========================================
  const pickImage = async itemId => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão negada', 'Você precisa conceder permissão à câmera.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.6 });
    if (!res.canceled && res.assets?.length) {
      const { uri } = res.assets[0];
      const nome = uri.split('/').pop();
      setForms(prev => ({
        ...prev,
        [itemId]: { ...prev[itemId], image: uri, arquivo_app: nome }
      }));
    }
  };

  // =========================================
  // 🔹 SALVAR DADOS
  // =========================================
  // helper: insere N itens em sequência dentro da MESMA transação
  function insertItensSequencial(tx, itens, onDone, onError) {
    let i = 0;
    const run = () => {
      if (i >= itens.length) return onDone?.();
      const row = itens[i];
      const cols = Object.keys(row).join(', ');
      const vals = Object.values(row);
      const ph = vals.map(() => '?').join(', ');

      tx.executeSql(
        `INSERT INTO veiculo_checklist_itens_realizados (${cols}) VALUES (${ph});`,
        vals,
        () => { i += 1; run(); },
        (_, err) => { console.error('❌ Erro ao inserir item:', err); onError?.(err); return true; }
      );
    };
    run();
  }

  const saveAll = async () => {
    setLoading(true);
    setErrors(null);

    try {
      const userEmail = await getUsuarioEmail();

      const usaHorimetro = Number(vehicleInfo.tipo_hr) === 1;
      const usaQuilometragem = Number(vehicleInfo.tipo_km) === 1;

      if (!usaHorimetro && !usaQuilometragem) {
        Alert.alert(
          'Configuracao do veiculo',
          'Este veiculo nao esta configurado para horimetro nem para quilometragem. ' +
          'Ajuste o cadastro do veiculo (tipo_hr ou tipo_km) antes de realizar o checklist.'
        );
        setLoading(false);
        return;
      }

      const valorAtualLimpo = onlyDigits(valorAtual);
      setValorAtual(valorAtualLimpo);
      const parsedValorAtual = integerNumberValue(valorAtualLimpo, NaN);
      if (Number.isNaN(parsedValorAtual)) throw new Error('Valor atual invalido.');

      const valorAnterior = usaHorimetro
        ? (vehicleInfo.maiorHrNum || 0)
        : (vehicleInfo.maiorHodNum || 0);

      if (parsedValorAtual < valorAnterior) {
        Alert.alert(
          "Valor inválido",
          usaHorimetro
            ? `O horímetro atual (${parsedValorAtual}) não pode ser menor que o anterior (${valorAnterior}).`
            : `A quilometragem atual (${parsedValorAtual}) não pode ser menor que a anterior (${valorAnterior}).`
        );
        setLoading(false);
        return;
      }

      // Hr/km atual nao pode ser IGUAL ao anterior (precisa ter progresso).
      if (parsedValorAtual === valorAnterior && valorAnterior > 0) {
        Alert.alert(
          'Valor invalido',
          usaHorimetro
            ? `O horimetro atual deve ser maior que o anterior (${valorAnterior}).`
            : `A quilometragem atual deve ser maior que a anterior (${valorAnterior}).`
        );
        setLoading(false);
        return;
      }

      // Horimetro: bloqueia jornadas absurdas (> 10h de uso entre dois checklists).
      if (usaHorimetro && (parsedValorAtual - valorAnterior) > 10) {
        Alert.alert(
          'Salto invalido',
          `Diferenca maxima permitida entre horimetro atual e anterior: 10h.\n\n` +
          `Anterior: ${valorAnterior}\nAtual: ${parsedValorAtual}\nDiferenca: ${parsedValorAtual - valorAnterior}h`
        );
        setLoading(false);
        return;
      }

      const idLocalTemp = uuid.v4(); // token único que relaciona serviço ↔ itens
      const agora = dataAtual;       // já vem do nowLocalTimestamp()

      // monta os itens (sem gravar ainda)
      const itens = Object.entries(forms).map(([itemId, f]) => ({
        id_local: uuid.v4(),
        id_obra: vehicleInfo.idObra,
        id_checklist: id_checklist,
        id_checklist_realizado: idLocalTemp, // FK local (token)
        id_checklist_itens: parseInt(itemId, 10),
        id_veiculo: vehicleInfo.idVeiculo,
        data_cadastro: f.dataCadastro,
        status: f.status,
        arquivo_app: f.image || null,
        user_create: userEmail ?? 'desconhecido',
        horimetro_atual: usaHorimetro ? valorAnterior : null,
        horimetro_novo: usaHorimetro ? parsedValorAtual : null,
        quilometragem_atual: usaQuilometragem ? valorAnterior : null,
        quilometragem_nova: usaQuilometragem ? parsedValorAtual : null,
        observacao: f.observacao,
        sync_status: 0,
        created_at: agora,
        deleted_at: null,
        updated_at: agora,
      }));

      // id_local da medicao — UUID gerado no app, usado pelo backend para UPSERT idempotente
      const idLocalMedicao = uuid.v4();

      await new Promise((resolve, reject) => {
        db.transaction(tx => {
          // 1) Insere a medicao na tabela CERTA (horimetro OU quilometragem)
          // com id_local e captura o insertId — vinculado ao servico via id_horimetro/id_quilometragem.
          const medicaoSQL = usaHorimetro
            ? `INSERT INTO veiculo_horimetro
               (id_local, veiculo_id, id_obra, horimetro_atual, horimetro_novo, data_horimetro, sync_status, user_create, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`
            : `INSERT INTO veiculo_quilometragems
               (id_local, veiculo_id, id_obra, quilometragem_atual, quilometragem_nova, data_quilometragem, sync_status, user_create, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`;

          const medicaoParams = [
            idLocalMedicao,
            vehicleInfo.idVeiculo,
            vehicleInfo.idObra,
            valorAnterior,
            parsedValorAtual,
            agora,
            userEmail ?? 'desconhecido',
            agora,
            agora
          ];

          tx.executeSql(
            medicaoSQL,
            medicaoParams,
            (_, medRes) => {
              const medicaoId = medRes?.insertId; // <<<<<<<<<< 👈 capturamos o ID aqui
              if (!medicaoId && medicaoId !== 0) {
                return reject(new Error('Falha ao capturar ID da medição.'));
              }

              // 2) Inserir SERVIÇO já apontando para a medição correta
              const pai = {
                id_local: idLocalTemp,
                id_obra: vehicleInfo.idObra,
                id_veiculo: vehicleInfo.idVeiculo,
                id_checklist: id_checklist,
                status: isFechamento ? 'Fechamento' : 'Realizado',
                status_ciclo: isFechamento ? 'CONCLUIDO' : 'ABERTO',
                tipo_checklist: isFechamento ? 'FECHAMENTO' : 'ABERTURA',
                id_abertura_vinculada: isFechamento ? id_aberto_ref : null,
                data_fechamento: isFechamento ? agora : null,
                data_cadastro: agora,
                sync_status: 0,
                created_at: agora,
                deleted_at: null,
                updated_at: agora,
                user_create: userEmail ?? 'desconhecido',
                // Vinculo correto: tipo_hr -> id_horimetro, tipo_km -> id_quilometragem.
                id_horimetro: usaHorimetro ? medicaoId : null,
                id_quilometragem: usaQuilometragem ? medicaoId : null,
              };

              const colsPai = Object.keys(pai).join(', ');
              const valsPai = Object.values(pai);
              const phPai = valsPai.map(() => '?').join(', ');

              tx.executeSql(
                `INSERT INTO veiculo_checklist_itens_servicos (${colsPai}) VALUES (${phPai});`,
                valsPai,
                () => {
                  if (isFechamento && id_aberto_ref) {
                    tx.executeSql(
                      `UPDATE veiculo_checklist_itens_servicos SET status_ciclo = 'CONCLUIDO', data_fechamento = ?, sync_status = 0 WHERE id_local = ?;`,
                      [agora, id_aberto_ref],
                      () => {
                        insertItensSequencial(tx, itens, () => resolve(), (err) => reject(err));
                      },
                      (_, err) => { reject(err); return true; }
                    );
                  } else {
                    insertItensSequencial(tx, itens, () => resolve(), (err) => reject(err));
                  }
                },
                (_, err) => { reject(err); return true; }
              );
            },
            (_, err) => { reject(err); return true; }
          );
        },
          // onError da transação
          (txErr) => reject(txErr),
          // onSuccess da transação (não usamos, resolvemos no callback)
        );
      });

      showToast("✅ Checklist salvo com sucesso!", "success");
      try {
        await registrarEvidenciasItens(itens, userEmail, agora);
      } catch (evidenciaError) {
        console.warn('Evidencias serao materializadas na sincronizacao:', evidenciaError?.message);
      }
      navigation.goBack();

    } catch (e) {
      console.error('Erro ao salvar checklist:', e);
      showToast(`❌ Erro ao salvar checklist: ${e.message}`, "error");
      setErrors([e.message]);
    } finally {
      setLoading(false);
    }
  };

  // =========================================
  // 🔹 INTERFACE
  // =========================================
  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchItems} colors={['darkorange']} />}
    >
      <Container>
        <Card>
          <ErrorAlert errors={errors} />

          <View style={{ backgroundColor: isFechamento ? '#e74c3c' : '#2ecc71', padding: 8, borderRadius: 6, marginBottom: 10, alignItems: 'center' }}>
             <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
               {isFechamento ? 'MODO FECHAMENTO' : 'MODO ABERTURA'}
             </Text>
          </View>
          {vehicleInfo.tipo_hr == 1 ? (
            <Text style={styles.infoText}>🕒 {`Veículo: ${prefixo} |  🗓️ ${dataAtualString}`}</Text>
          ) : (
            <Text style={styles.infoText}>🛻 {`Veículo: ${prefixo} |  🗓️ ${dataAtualString}`}</Text>
          )}

          <Border />

          <Text style={styles.infoText}>{`Total de itens: ${items.length}`}</Text>

          {/* Sem checklist */}
          {!temChecklist && !loading && (
            <View style={styles.emptyContainer}>
              <Image
                source={require('../../../../../assets/icons/empty_checklist.png')}
                style={styles.emptyIcon}
                resizeMode="contain"
              />
              <Text style={styles.emptyTitle}>Nenhum checklist cadastrado</Text>
              <Text style={styles.emptyText}>
                Este veículo ainda não possui checklist configurado.{"\n"}
                Entre em contato com o setor responsável para cadastrar um modelo antes de continuar.
              </Text>

              <Btn bg="#888" onPress={() => navigation.goBack()}>
                <BtnText>Voltar</BtnText>
              </Btn>

              <Btn bg="#e67e22" onPress={fetchItems}>
                <BtnText>Tentar novamente</BtnText>
              </Btn>
            </View>
          )}

          {/* Com checklist */}
          {temChecklist && (
            <>
              {vehicleInfo.tipo_hr == 1 ? (
                <Card style={{ borderLeftWidth: 6, borderLeftColor: '#e67e22', backgroundColor: '#fff9f2' }}>
                  <View style={styles.metricaHeader}>
                    <Text style={[styles.metricaTitle, { color: '#e67e22' }]}>Horímetro</Text>
                  </View>

                  {/* --- HORÍMETRO EM DUAS COLUNAS --- */}
                  <Row>
                    <Col style={{ marginRight: 12 }}>
                      <Label style={{ fontSize: BASE_FS * INC_BIG }}>Hr Anterior</Label>
                      <Input
                        value={String(vehicleInfo.maiorHrNum)}
                        editable={false}
                        style={{ fontSize: BASE_FS * INC_BIG, paddingVertical: 12 }}
                      />
                    </Col>

                    <Col>
                      <Label style={{ fontSize: BASE_FS * INC_BIG }}>Hr Atual</Label>
                      <Input
                        value={valorAtual}
                        error={!!inputError}
                        onChangeText={(t) => atualizarValorAtual(
                          t,
                          vehicleInfo.maiorHrNum,
                          '⚠️ O horímetro atual não pode ser menor que o anterior.'
                        )}
                        onEndEditing={() => setValorAtual(prev => onlyDigits(prev))}
                        keyboardType="number-pad"
                        placeholder="Digite o horímetro atual"
                        style={{ fontSize: BASE_FS * INC_BIG, paddingVertical: 12 }}
                      />
                    </Col>
                  </Row>
                  {inputError ? <Text style={styles.errorText}>{inputError}</Text> : null}
                </Card>
              ) : (
                <Card style={{ borderLeftWidth: 6, borderLeftColor: '#3498db', backgroundColor: '#f4f9ff' }}>
                  <View style={styles.metricaHeader}>
                    <Text style={[styles.metricaTitle, { color: '#3498db' }]}>Hodômetro</Text>
                  </View>

                  {/* --- HODÔMETRO EM DUAS COLUNAS --- */}
                  <Row>
                    <Col style={{ marginRight: 12 }}>
                      <Label style={{ fontSize: BASE_FS * INC_BIG, textAlign: 'center' }}>km Anterior</Label>
                      <Input
                        value={String(vehicleInfo.maiorHodNum)}
                        editable={false}
                        style={{ fontSize: BASE_FS * INC_BIG, paddingVertical: 12, backgroundColor: '#f0dda8ff', textAlign: 'center' }}
                      />
                    </Col>

                    <Col>
                      <Label style={{ fontSize: BASE_FS * INC_BIG, textAlign: 'center' }}>km Atual</Label>
                      <Input
                        value={valorAtual}
                        error={!!inputError}
                        onChangeText={(t) => atualizarValorAtual(
                          t,
                          vehicleInfo.maiorHodNum,
                          '⚠️ A quilometragem atual não pode ser menor que a anterior.'
                        )}
                        onEndEditing={() => setValorAtual(prev => onlyDigits(prev))}
                        keyboardType="number-pad"
                        placeholder="Digite a quilometragem atual"
                        style={{ fontSize: BASE_FS * INC_BIG, paddingVertical: 12, backgroundColor: '#aaf0a8ff', textAlign: 'center' }}
                      />
                    </Col>
                  </Row>
                  {inputError ? <Text style={styles.errorText}>{inputError}</Text> : null}
                </Card>
              )}

              {items.map(item => {
                const open = !!openIds[item.id];
                const f = forms[item.id] || {};
                return (
                  <View key={item.id}>
                    <HeaderCard onPress={() => setOpenIds(p => ({ ...p, [item.id]: !p[item.id] }))}>
                      <HeaderText>{item.nome_servico}</HeaderText>
                      <Text style={{ fontWeight: 'bold', fontSize: Math.round(18 * INC), color: '#e67e22' }}>
                        {open ? '−' : '+'}
                      </Text>
                    </HeaderCard>
                    {open && (
                      <FormView>
                        <Label>Data</Label>
                        <Text style={styles.valueText}>{f.dataCadastro}</Text>
                        <Label>Conforme?</Label>
                        <Picker
                          selectedValue={f.status}
                          onValueChange={v =>
                            setForms(p => ({ ...p, [item.id]: { ...p[item.id], status: v } }))
                          }
                        >
                          <Picker.Item label="SIM" value="SIM" />
                          <Picker.Item label="NÃO" value="NÃO" />
                        </Picker>
                        <Label>Observação</Label>
                        <Input
                          multiline
                          numberOfLines={3}
                          value={f.observacao}
                          onChangeText={t =>
                            setForms(p => ({ ...p, [item.id]: { ...p[item.id], observacao: t } }))
                          }
                        />
                        {f.image && <Image source={{ uri: f.image }} style={styles.preview} />}
                        <BtnFoto onPress={() => pickImage(item.id)} disabled={loading}>
                          <BtnText>Tirar Foto</BtnText>
                        </BtnFoto>
                      </FormView>
                    )}
                  </View>
                );
              })}

              <Btn disabled={loading} onPress={saveAll}>
                {loading ? <ActivityIndicator color="#fff" /> : <BtnText>Salvar Tudo</BtnText>}
              </Btn>
            </>
          )}
        </Card>
      </Container>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  infoText: { textAlign: 'center', fontWeight: 'bold', marginBottom: 6, color: '#333', fontSize: Math.round(12 * INC) }, // ~21
  infoTextData: { textAlign: 'center', fontWeight: 'bold', color: '#333', fontSize: Math.round(12 * INC) }, // ~21
  valueText: { marginBottom: 6, color: '#000', fontSize: Math.round(14 * INC) },                    // ~21
  preview: { width: '100%', height: 200, marginVertical: 8, borderRadius: 8, resizeMode: 'cover' },
  errorText: { color: '#d9534f', fontSize: Math.round(12 * INC), marginTop: 2, marginBottom: 8 },   // ~16
  metricaHeader: { alignItems: 'center', marginBottom: 8 },
  metricaIcon: { fontSize: Math.round(1 * INC), marginRight: 8 },                                  // ~23
  metricaTitle: { fontWeight: 'bold', fontSize: Math.round(18 * INC) },                             // ~21

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    elevation: 3,
  },
  emptyIcon: { width: 120, height: 220, marginBottom: 10 },
  emptyTitle: { fontSize: Math.round(16 * INC), fontWeight: 'bold', color: '#d35400', marginBottom: 8 },
  emptyText: { fontSize: Math.round(1 * INC), textAlign: 'center', color: '#555', marginBottom: 10 },
});
