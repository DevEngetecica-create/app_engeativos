// src/pages/Veiculos/DiarioBordo/create.js
import React, { useEffect, useState, useCallback } from 'react';
import {
  ScrollView,
  Text,
  Alert,
  ActivityIndicator,
  Image,
  RefreshControl,
  View,
  StyleSheet,
  Platform
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { TextInputMask } from 'react-native-masked-text';
import * as ImagePicker from 'expo-image-picker';
import NetInfo from '@react-native-community/netinfo';
import styled from 'styled-components/native';
import uuid from 'react-native-uuid';

import { db, executeSql } from '../../../config/database/database';
import { showToast } from '../../../utils/toast';
import {
  integerInputBlockingSeparators,
  integerInputValue,
  integerNumberValue,
  onlyDigits
} from '../../../utils/numberInput';
import { nowLocalTimestamp, nowLocalDMYHM } from '../../../utils/datetime';

// =============================
// 🔹 Styled Components
// =============================
const Container = styled.View`
  flex: 1;
  padding: 6px;
  background: #f5f5f5;
`;
const Card = styled.View`
  background-color: #fff;
  padding: 8px;
  margin-bottom: 10px;
  border-radius: 8px;
  elevation: 2;
`;
const Label = styled.Text`
  font-weight: bold;
  margin-bottom: 4px;
  color: #333;
`;
const Input = styled.TextInput`
  border: 1px solid ${props => (props.error ? '#d9534f' : '#ccc')};
  border-radius: 6px;
  padding: ${Platform.OS === 'ios' ? '8px' : '8px'};
  margin-bottom: 6px;
  color: #000;
`;
const TextArea = styled.TextInput`
  border: 1px solid #ccc;
  border-radius: 6px;
  padding: 8px;
  margin-bottom: 12px;
  height: 120px;
  text-align-vertical: top;
  color: #000;
`;
const Btn = styled.TouchableOpacity`
  background-color: ${props => (props.disabled ? '#999' : props.color || '#1f51fe')};
  padding: 12px;
  border-radius: 6px;
  align-items: center;
  margin-bottom: 12px;
`;
const BtnText = styled.Text`
  color: #fff;
  font-weight: bold;
`;
const InputGroup = styled.View`
  margin-bottom: 14px;
`;
const ErrorText = styled.Text`
  color: #d9534f;
  font-size: 12px;
  margin-top: 2px;
  margin-bottom: 8px;
`;
const Linha = styled.View`
  width: 100%;
  height: 1px;
  background-color: #1f51fe;
  margin-vertical: 10px;
`;


// =============================
// 🔹 Principal
// =============================
export default function DiarioCadastro() {
  const navigation = useNavigation();
  const { id_veiculo, prefixo, id_obra } = useRoute().params;

  const [loading, setLoading] = useState(false);
  const [valores, setValores] = useState({ tipo_km: 0, tipo_hr: 0, maiorHr: '', maiorHod: '' });
  const [form, setForm] = useState({
    horario_inicial: '',
    horimetro_inicial: '',
    hodometro_inicial: '',
    
    descricao_atividade: '',
    arquivo: null
  });
  const [refreshing, setRefreshing] = useState(false);
  const [inputError, setInputError] = useState('');

  // =============================
  // 🔹 Buscar dados do veículo
  // =============================

  const getUsuarioEmail = async () => {
    try {
      const res = await executeSql(`SELECT id, email FROM users LIMIT 1`);

      // Se existir resultado, retorna objeto com id e email
      if (res.length) {
        return {
          id: res[0].id,
          email: res[0].email,
        };
      } else {
        return null;
      }
    } catch (e) {
      console.error("Erro ao buscar usuário:", e);
      return null;
    }
  };


  const fetchDadosVeiculo = useCallback(async () => {
    setLoading(true);
    try {
      const veiculo = await executeSql(`SELECT tipo_km, tipo_hr, tipo FROM veiculos WHERE id = ?`, [id_veiculo]);
      let tipo_km = veiculo[0]?.tipo_km || 0;
      let tipo_hr = veiculo[0]?.tipo_hr || 0;

      if (!tipo_km && !tipo_hr) {
        const isMaquina = veiculo[0]?.tipo == 4;
        tipo_hr = isMaquina ? 1 : 0;
        tipo_km = !isMaquina ? 1 : 0;
      }

      const hr = await executeSql(
        `SELECT MAX(horimetro_novo) as maximo FROM veiculo_horimetro WHERE veiculo_id = ?`,
        [id_veiculo]
      );
      const hod = await executeSql(
        `SELECT MAX(quilometragem_nova) as maximo FROM veiculo_quilometragems WHERE veiculo_id = ?`,
        [id_veiculo]
      );

      setValores({
        tipo_km,
        tipo_hr,
        maiorHr: hr[0]?.maximo ? integerInputValue(hr[0].maximo) : '',
        maiorHod: hod[0]?.maximo ? integerInputValue(hod[0].maximo) : ''
      });
    } catch (e) {
      console.error('Erro ao buscar dados locais:', e);
      Alert.alert('Erro', 'Falha ao carregar dados do veículo.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id_veiculo]);

  useEffect(() => {
    fetchDadosVeiculo();
  }, [fetchDadosVeiculo]);

  // =============================
  // 🔹 Tirar foto (somente câmera)
  // =============================
  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão negada', 'Conceda acesso à câmera para tirar fotos.');
      return;
    }

    const res = await ImagePicker.launchCameraAsync({ quality: 0.6 });
    if (!res.canceled && res.assets?.length) {
      setForm({ ...form, arquivo: res.assets[0].uri });
    }
  };


  // =============================
  // 🔹 Salvar localmente
  // =============================

  const salvarLocalmente = async () => {
    try {

      const userEmail = await getUsuarioEmail();

      console.log('Usuário para diário:', userEmail);


      // Timestamp em America/Sao_Paulo (regra de negocio do app)
      const data_cadastro = nowLocalTimestamp();
      const hrAnterior = integerInputValue(form.horimetro_inicial || valores.maiorHr) || null;
      const kmAnterior = integerInputValue(form.hodometro_inicial || valores.maiorHod) || null;
      const idLocal = uuid.v4();

      await executeSql(
        `INSERT INTO veiculos_diario_bordo (
          id_local, ciclo_status, id_obra, id_veiculo, id_user, user_create, user_edit, data_cadastro, horario_inicial,
          hr_anterior, km_anterior, descricao_atividade, arquivo_app, sync_status, created_at
        ) VALUES (?, 'ABERTO', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?);`,
        [
          idLocal,
          id_obra,
          id_veiculo,
          userEmail.id,
          userEmail.email,
          null,
          data_cadastro,
          data_cadastro,
          hrAnterior,
          kmAnterior,
          form.descricao_atividade,
          form.arquivo || '',
          data_cadastro
        ]
      );

      showToast('✅ Diário de Bordo aberto localmente.', 'success');
      navigation.goBack();
    } catch (error) {
      console.error('Erro ao salvar localmente:', error);
      showToast('❌ Falha ao abrir o diário.', 'error');
    }
  };

  // =============================
  // 🔹 Submissão
  // =============================
  const handleSubmit = async () => {

    if (!form.descricao_atividade.trim()) {
      Alert.alert('Atenção', 'Informe a descrição da atividade.');
      return;
    }
    if (inputError) {
      Alert.alert('Atenção', 'Corrija os valores antes de salvar.');
      return;
    }

    setLoading(true);
    try {
      const net = await NetInfo.fetch();
      if (!net.isConnected) await salvarLocalmente();
      else await salvarLocalmente();
    } finally {
      setLoading(false);
    }
  };

  // =============================
  // 🔹 Interface
  // =============================
  if (loading) {
    return (
      <Container style={{ justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="green" />
      </Container>
    );
  }

  const isHr = valores.tipo_hr == 1;
  const isKm = valores.tipo_km == 1;

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchDadosVeiculo} />}
    >
      <Container>
        <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#333', textAlign: 'center', marginVertical: 8 }}>
          Abrir Diário de Bordo
        </Text>
        <Text style={{ fontWeight: 'bold', marginBottom: 10, color: '#333' }}>
          Veículo: {prefixo} | Obra: {id_obra}
        </Text>
        <Linha />

        {/* ================================
            🔹 Card de Horímetro ou Quilometragem
        ================================= */}
        {isHr && (
          <Card style={{ borderLeftWidth: 6, borderLeftColor: '#e67e22', backgroundColor: '#fff9f2' }}>
            <View style={styles.metricaHeader}>
              <Text style={[styles.metricaIcon, { color: '#e67e22' }]}>⚙️</Text>
              <Text style={[styles.metricaTitle, { color: '#e67e22' }]}>Horímetro</Text>
            </View>

            <InputGroup>
              <Label>Horímetro Inicial</Label>
              <Input
                value={form.horimetro_inicial !== '' ? form.horimetro_inicial : valores.maiorHr}
                onChangeText={t => setForm({
                  ...form,
                  horimetro_inicial: integerInputBlockingSeparators(t, form.horimetro_inicial || valores.maiorHr)
                })}
                keyboardType="numeric"
                placeholder="Digite o horímetro inicial"
              />
            </InputGroup>

            
          </Card>
        )}

        {isKm && (
          <Card style={{ borderLeftWidth: 6, borderLeftColor: '#3498db', backgroundColor: '#f4f9ff' }}>
            <View style={styles.metricaHeader}>
              <Text style={[styles.metricaIcon, { color: '#3498db' }]}>🚗</Text>
              <Text style={[styles.metricaTitle, { color: '#3498db' }]}>Quilometragem</Text>
            </View>

            <InputGroup>
              <Label>Quilometragem Inicial</Label>
              <Input
                value={form.hodometro_inicial !== '' ? form.hodometro_inicial : valores.maiorHod}
                onChangeText={t => setForm({
                  ...form,
                  hodometro_inicial: integerInputBlockingSeparators(t, form.hodometro_inicial || valores.maiorHod)
                })}
                keyboardType="numeric"
                placeholder="Digite a quilometragem inicial"
              />
            </InputGroup>

            <InputGroup>
              <Label>Quilometragem Final</Label>
              <Input
                editable={false}
                value={form.hodometro_final}
                style={{ backgroundColor: '#eee' }}
                placeholder="Bloqueado na abertura"
              />
            </InputGroup>
          </Card>
        )}

        {/* Horários */}
        <Card>
          <Label>Data e Horário Inicial</Label>
          <Input
            editable={false}
            value={form.horario_inicial || nowLocalDMYHM()}
            style={styles.maskInput}
          />

          </Card>


        {/* Descrição */}
        <Card>
          <Label>Descrição da Atividade</Label>
          <TextArea
            multiline
            numberOfLines={4}
            value={form.descricao_atividade}
            onChangeText={v => setForm({ ...form, descricao_atividade: v })}
          />
        </Card>

        {/* Foto */}
        {form.arquivo && (
          <Image
            source={{ uri: form.arquivo }}
            style={{ width: '100%', height: 200, borderRadius: 8, marginBottom: 12 }}
          />
        )}

        <Btn color="darkorange" onPress={handleTakePhoto}>
          <BtnText>{form.arquivo ? 'Tirar outra foto' : 'Tirar foto'}</BtnText>
        </Btn>

        <Btn color="green" onPress={handleSubmit} disabled={!!inputError || loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <BtnText>Salvar Abertura</BtnText>}
        </Btn>
      </Container>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  maskInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 8,
    marginBottom: 12
  },
  errorText: { color: '#d9534f', fontSize: 12, marginTop: 2, marginBottom: 8 },
  metricaHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  metricaIcon: { fontSize: 18, marginRight: 8 },
  metricaTitle: { fontWeight: 'bold', fontSize: 16 }
});
