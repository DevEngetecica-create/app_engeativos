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
  Platform, // Importado para checar o SO e ajustar o Picker
} from 'react-native';
import { useRoute, useFocusEffect, useNavigation } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker'; // Mantido o import correto
import * as ImagePicker from 'expo-image-picker';
import styled from 'styled-components/native';

// Importa componentes ou utilitários da sua estrutura
import ErrorAlert from '../../../../components/ErrorAlert';
import { db } from '../../../../config/database/database'; // Caminho para sua configuração do DB
import { useNetwork } from '../../../../contexts/network';

// Funções utilitárias para o banco de dados
const executeSql = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        sql,
        params,
        (_, { rows }) => resolve(rows._array),
        (_, err) => {
          console.error('SQL Error:', err, 'Query:', sql, 'Params:', params);
          reject(err);
          return false;
        }
      );
    });
  });
};

// Styled Components
const Container = styled.View`
  flex: 1;
  padding: 7px;
  background: #f5f5f5;
`;
const Card = styled.View`
  background-color: #fff;
  padding: 16px;
  margin-bottom: 12px;
  border-radius: 8px;
  elevation: 2;
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.1;
  shadow-radius: 3.84px;
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
  font-size: 14px;
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
`;
const Input = styled.TextInput`
  border: 1px solid #ccc;
  border-radius: 6px;
  padding: ${Platform.OS === 'ios' ? '12px' : '8px'}; /* Ajuste de padding para iOS */
  margin-bottom: 12px;
  color: #000;
`;
const Btn = styled.TouchableOpacity`
  background-color: ${props => (props.disabled ? '#cccccc' : 'green')}; /* Cor diferente para desabilitado */
  padding: 12px;
  border-radius: 6px;
  align-items: center;
  margin-bottom: 12px;
`;
const BtnText = styled.Text`
  color: #fff;
  font-weight: bold;
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

export default function CreateChecklistRealizadosAccordion() {
  const navigation = useNavigation();
  const { id: id_checklist, periodo, id_veiculo, id_obra, prefixo, codigoObra } = useRoute().params;
  const { networkStatus: isOffline } = useNetwork(); // Renomeado para clareza

  const [errors, setErrors] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [openIds, setOpenIds] = useState({});
  const [forms, setForms] = useState({});

  // Novo estado consolidado para informações do veículo
  const [vehicleInfo, setVehicleInfo] = useState({
    tipo: null, // Tipo do veículo (para horímetro/hodômetro)
    maiorHr: '', // Maior horímetro anterior
    maiorHod: '', // Maior hodômetro anterior
    valorAtual: '', // Valor atual (horímetro ou hodômetro)
    idObra: '', // id_obra do veículo
    idVeiculo: '', // id do veículo
  });

  // Carrega itens e dados iniciais
  const fetchItems = useCallback(async () => {
    setLoading(true);
    setErrors(null);
    try {
      // 1) Itens do checklist
      const lista = await executeSql(
        `SELECT * FROM veiculo_checklist_itens;`,
        []
      );
      setItems(lista);
      // console.log(`Checklist ID: ${id_checklist}`); // Para depuração

      // 2) Tipo do veículo (puxa campos adicionais)
      const veic = await executeSql(
        `SELECT tipo, obra_id, id, modelo, marca, ano FROM veiculos`,
      );
      const vehicleData = veic[0] || {};

      console.log(vehicleData);

      setVehicleInfo(prev => ({
        ...prev,
        tipo: vehicleData.tipo,
        idObra: vehicleData.obra_id,
        idVeiculo: vehicleData.id,
      }));
      // console.log('Dados do veículo:', vehicleData); // Para depuração

      // 3) Maior valor existente (horímetro ou hodômetro)
      let maxValor = '';
      if (vehicleData.tipo == 4) { // Tipo 4 geralmente indica horímetro
        const hrResult = await executeSql(
          `SELECT MAX(horimetro_novo) as maximo FROM veiculo_horimetro;`,
        );
        maxValor = String(hrResult[0]?.maximo || '');
        setVehicleInfo(prev => ({ ...prev, maiorHr: maxValor, valorAtual: maxValor }));
      } else {
        const hodResult = await executeSql(
          `SELECT MAX(quilometragem_nova) as maximo FROM veiculo_quilometragems ;`,
        );
        maxValor = String(hodResult[0]?.maximo || '');
        setVehicleInfo(prev => ({ ...prev, maiorHod: maxValor, valorAtual: maxValor }));
      }

      // 4) Inicializar formulário
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const initialForms = lista.reduce((acc, item) => ({
        ...acc,
        [item.id]: { status: 'sim', observacao: '', image: null, arquivo_uri: null, dataCadastro: now }
      }), {});
      setForms(initialForms);

    } catch (e) {
      console.error('Erro ao carregar dados:', e);
      setErrors([e.message || 'Erro ao carregar dados.']);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id_checklist, id_veiculo]); // Dependências do useCallback

  // Usa useFocusEffect para recarregar dados quando a tela estiver em foco
  useFocusEffect(
    useCallback(() => {
      fetchItems();
    }, [fetchItems])
  );

  // Tira foto e armazena URI + nome original
  const pickImage = async itemId => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão negada', 'Você precisa conceder permissão à câmera para tirar fotos.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      allowsEditing: false,
      aspect: [4, 3],
    });
    if (!res.canceled && res.assets?.length) {
      const { uri } = res.assets[0];
      const nome = uri.split('/').pop();
      setForms(prev => ({
        ...prev,
        [itemId]: { ...prev[itemId], image: uri, arquivo_uri: nome }
      }));
    }
  };

  // Salva pai e itens no SQLite
  const saveAll = async () => {
    setLoading(true);
    setErrors(null);
    try {
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

      // Validar valor atual
      const parsedValorAtual = parseInt(vehicleInfo.valorAtual, 10);
      if (isNaN(parsedValorAtual)) {
        throw new Error('O valor atual (Horímetro/Quilometragem) deve ser um número válido.');
      }
      if (vehicleInfo.tipo == 4 && parsedValorAtual < parseInt(vehicleInfo.maiorHr, 10)) {
        throw new Error('O Horímetro Atual não pode ser menor que o Horímetro Anterior.');
      }
      if (vehicleInfo.tipo != 4 && parsedValorAtual < parseInt(vehicleInfo.maiorHod, 10)) {
        throw new Error('A Quilometragem Atual não pode ser menor que a Quilometragem Anterior.');
      }

      // Dados do serviço pai
      const pai = {
        //id_servico_local: Date.now(), // Usar timestamp local para ID temporário
        id_obra: vehicleInfo.idObra,
        id_veiculo: vehicleInfo.idVeiculo,
        status: 'Realizado',
        data_cadastro: now, // Usar o formato de data string
        sync_status: 0,
        created_at: now,
        deleted_at: null,
        updated_at: now
      };

      // Dados dos itens realizados
      const itens = Object.entries(forms).map(([itemId, f]) => ({
        id_obra: vehicleInfo.idObra,
        id_checklist: id_checklist,
        id_checklist_realizado: null, // Será preenchido durante a transação
        id_checklist_itens: parseInt(itemId, 10),
        id_veiculo: vehicleInfo.idVeiculo,
        data_cadastro: f.dataCadastro,
        status: f.status,
        arquivo: f.image || null,
        //arquivo_uri: f.arquivo_uri || null,
        user_create: null, // Preencher com ID do usuário logado se disponível
        horimetro_atual: vehicleInfo.tipo == 4 ? parseInt(vehicleInfo.maiorHr, 10) : null,
        horimetro_novo: vehicleInfo.tipo == 4 ? parsedValorAtual : null,
        quilometragem_atual: vehicleInfo.tipo != 4 ? parseInt(vehicleInfo.maiorHod, 10) : null,
        quilometragem_nova: vehicleInfo.tipo != 4 ? parsedValorAtual : null,
        observacao: f.observacao,
        sync_status: 0,
        created_at: now,
        deleted_at: null,
        updated_at: now
      }));

      await new Promise((resolve, reject) => {
        db.transaction(tx => {
          // 1. Insere o registro pai
          const colsPai = Object.keys(pai).join(', ');
          const valsPai = Object.values(pai);
          const phPai = valsPai.map(() => '?').join(', ');

          tx.executeSql(
            `INSERT INTO veiculo_checklist_itens_servicos (${colsPai}) VALUES (${phPai});`,
            valsPai,
            (_, res) => {
              const servId = res.insertId; // ID do registro pai inserido

              // 2. Insere os registros filhos (itens do checklist)
              const insertItem = (index) => {
                if (index >= itens.length) {
                  return resolve(); // Todos os itens foram inseridos
                }
                const row = { ...itens[index], id_checklist_realizado: servId }; // Associa ao pai
                const colsItem = Object.keys(row).join(', ');
                const valsItem = Object.values(row);
                const phItem = valsItem.map(() => '?').join(', ');

                tx.executeSql(
                  `INSERT INTO veiculo_checklist_itens_realizados (${colsItem}) VALUES (${phItem});`,
                  valsItem,
                  () => insertItem(index + 1), // Chama recursivamente para o próximo item
                  (_, err) => {
                    console.error('Erro ao inserir item:', err);
                    // Não rejeitar a transação inteira para um único item falho,
                    // mas registrar o erro e continuar. Depende da sua regra de negócio.
                    // Para este exemplo, apenas loga e tenta o próximo.
                    insertItem(index + 1);
                    return false;
                  }
                );
              };
              insertItem(0); // Inicia a inserção dos itens
            },
            (_, err) => {
              console.error('Erro ao inserir serviço pai:', err);
              reject(err);
              return false;
            }
          );
        });
      });

      Alert.alert('Sucesso', 'Checklist salvo com sucesso.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (e) {
      console.error('Erro ao salvar checklist:', e);
      setErrors([e.message || 'Erro ao salvar o checklist.']);
    } finally {
      setLoading(false);
    }
  };

  // Renderiza um loader inicial se estiver carregando e não houver itens
  if (loading && !items.length) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="darkorange" />
        <Text style={{ marginTop: 10 }}>Carregando dados...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={fetchItems} colors={['darkorange']} />
      }
    >
      <Container>
        <Card>
          <ErrorAlert errors={errors} />
          <Text style={styles.infoText}>{`Veículo: ${prefixo}  Obra: ${codigoObra}`}</Text>
          <Text style={styles.infoText}>{`Total de itens: ${items.length}`}</Text>

          {/* Campos de Horímetro/Quilometragem */}
          {vehicleInfo.tipo == 4 ? (
            <>
              <InputGroup>
                <Label>Horímetro Anterior</Label>
                <Input value={vehicleInfo.maiorHr} editable={false} />
              </InputGroup>
              <InputGroup>
                <Label>Horímetro Atual</Label>
                <Input
                  value={vehicleInfo.valorAtual}
                  onChangeText={(text) => setVehicleInfo(prev => ({ ...prev, valorAtual: text.replace(/[^0-9]/g, '') }))} // Permite apenas números
                  keyboardType="numeric"
                />
              </InputGroup>
            </>
          ) : (
            <>
              <InputGroup>
                <Label>Quilometragem Anterior</Label>
                <Input value={vehicleInfo.maiorHod} editable={false} />
              </InputGroup>
              <InputGroup>
                <Label>Quilometragem Atual</Label>
                <Input
                  value={vehicleInfo.valorAtual}
                  onChangeText={(text) => setVehicleInfo(prev => ({ ...prev, valorAtual: text.replace(/[^0-9]/g, '') }))} // Permite apenas números
                  keyboardType="numeric"
                />
              </InputGroup>
            </>
          )}

          {/* Renderização dos itens do checklist como acordeões */}
          {items.map(item => {
            const open = !!openIds[item.id];
            const f = forms[item.id] || {};
            return (
              <View key={item.id}>
                <HeaderCard onPress={() => setOpenIds(p => ({ ...p, [item.id]: !p[item.id] }))}>
                  <HeaderText>{item.nome_servico}</HeaderText>
                  <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#e67e22' }}>
                    {open ? '−' : '+'}
                  </Text>
                </HeaderCard>
                {open && (
                  <FormView>
                    <Label>Data</Label>
                    <Text style={styles.valueText}>{f.dataCadastro}</Text>

                    <Label>Status</Label>
                    <View style={styles.pickerContainer}>
                      <Picker
                        selectedValue={f.status}
                        onValueChange={v =>
                          setForms(p => ({ ...p, [item.id]: { ...p[item.id], status: v } }))
                        }
                        style={styles.picker}
                        itemStyle={styles.pickerItem} // Estilo para iOS
                      >
                        <Picker.Item label="Sim" value="sim" />
                        <Picker.Item label="Não" value="nao" />
                      </Picker>
                    </View>

                    <Label>Observação</Label>
                    <Input
                      multiline
                      numberOfLines={4}
                      value={f.observacao}
                      onChangeText={t =>
                        setForms(p => ({ ...p, [item.id]: { ...p[item.id], observacao: t } }))
                      }
                      style={styles.multilineInput}
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
        </Card>
      </Container>
    </ScrollView>
  );
}

// Estilos gerais usando StyleSheet
const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  infoText: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  preview: {
    width: '100%',
    height: 200,
    marginVertical: 8,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  valueText: {
    marginBottom: 12,
    color: '#000',
    fontSize: 16,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    marginBottom: 12,
    overflow: 'hidden', // Garante que o raio da borda seja aplicado
  },
  picker: {
    height: Platform.OS === 'ios' ? 120 : 40, // Ajuste de altura para iOS
    width: '100%',
  },
  pickerItem: {
    height: Platform.OS === 'ios' ? 120 : undefined, // Altura do item para iOS
  },
  multilineInput: {
    height: 80, // Altura fixa para o input multiline
    textAlignVertical: 'top', // Alinha o texto ao topo em Android
  },
});