import React, { useEffect, useState, useCallback } from 'react';
import {
  ScrollView,
  Text,
  Alert,
  ActivityIndicator,
  StyleSheet,
  View,
  Image
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import styled from 'styled-components/native';
import * as ImagePicker from 'expo-image-picker';
import uuid from 'react-native-uuid';
import { db, executeSql } from '../../../config/database/database';
import { showToast } from '../../../utils/toast';
import {
  integerInputBlockingSeparators,
  integerInputValue,
  integerNumberValue,
  onlyDigits,
  currencyMask,
  currencyToNumber
} from '../../../utils/numberInput';
import { nowLocalTimestamp } from '../../../utils/datetime';

// =============================
// 🔹 Styled Components
// =============================
const Container = styled.View`
  flex: 1;
  padding: 10px;
  background: #f5f5f5;
`;
const Card = styled.View`
  background-color: #fff;
  padding: 12px;
  margin-bottom: 12px;
  border-radius: 8px;
  elevation: 2;
  border-left-width: 6px;
  border-left-color: #1f51fe;
`;
const Label = styled.Text`
  font-weight: bold;
  margin-bottom: 4px;
  color: #333;
`;
const Input = styled.TextInput`
  border: 1px solid ${props => (props.error ? '#d9534f' : '#ccc')};
  border-radius: 6px;
  padding: 8px;
  margin-bottom: 10px;
  color: #000;
`;
const Btn = styled.TouchableOpacity`
  background-color: ${props => (props.disabled ? '#999' : props.color || '#1f51fe')};
  padding: 12px;
  border-radius: 6px;
  align-items: center;
  margin-top: 10px;
`;
const BtnText = styled.Text`
  color: #fff;
  font-weight: bold;
`;
const Linha = styled.View`
  width: 100%;
  height: 1px;
  background-color: #1f51fe;
  margin-vertical: 10px;
`;
const ImagePreview = styled.Image`
  width: 100%;
  height: 180px;
  border-radius: 8px;
  margin-bottom: 12px;
  border-width: 1px;
  border-color: #ccc;
`;

// =============================
// 🔹 Funções auxiliares
// =============================
const formatarDataAtual = () => {
  const d = new Date();
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const ano = d.getFullYear();
  const hora = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dia}/${mes}/${ano} ${hora}:${min}`;
};

// =============================
// 🔹 Principal
// =============================
export default function AbastecimentoCreate() {
  const navigation = useNavigation();
  const { id_veiculo, id_obra, prefixo } = useRoute().params;
  const [loading, setLoading] = useState(false);
  const [tipoVeiculo, setTipoVeiculo] = useState(null);
  const [valores, setValores] = useState({ anterior: 0 });
  const [form, setForm] = useState({
    fornecedor: '',
    combustivel: '',
    quantidade: '',
    valor_do_litro: '',
    valor_total: '',
    km_anterior: '',
    km_atual: '',
    hr_anterior: '',
    hr_atual: '',
    arquivo_app: null
  });

  // =============================
  // 🔹 Buscar tipo e último registro
  // =============================
  const fetchDados = useCallback(async () => {
    setLoading(true);
    try {
      const veiculo = await executeSql(`SELECT tipo FROM veiculos WHERE id = ?`, [id_veiculo]);
      const tipo = veiculo[0]?.tipo || null;
      setTipoVeiculo(tipo);

      const ult = await executeSql(
        `SELECT km_atual, hr_atual FROM veiculo_abastecimentos WHERE veiculo_id = ? ORDER BY id DESC LIMIT 1`,
        [id_veiculo]
      );

      if (tipo == 4) {
        const anterior = integerInputValue(ult[0]?.hr_atual || 0);
        setValores({ anterior: integerNumberValue(anterior, 0) });
        setForm(prev => ({ ...prev, hr_anterior: anterior }));
      } else {
        const anterior = integerInputValue(ult[0]?.km_atual || 0);
        setValores({ anterior: integerNumberValue(anterior, 0) });
        setForm(prev => ({ ...prev, km_anterior: anterior }));
      }
    } catch (err) {
      console.error('Erro ao buscar dados:', err);
    } finally {
      setLoading(false);
    }
  }, [id_veiculo]);

  useEffect(() => {
    fetchDados();
  }, [fetchDados]);

  // =============================
  // 🔹 Usuário logado
  // =============================
  const getUsuario = async () => {
    const res = await executeSql(`SELECT id, email FROM users LIMIT 1`);
    return res.length ? res[0] : { id: null, email: 'desconhecido' };
  };

  // =============================
  // 🔹 Cálculo automático do total
  //   quantidade e valor_do_litro vem da currencyMask (ex: "7.19")
  // =============================
  useEffect(() => {
    const q = currencyToNumber(form.quantidade);
    const v = currencyToNumber(form.valor_do_litro);
    const total = (q * v).toFixed(2);
    setForm(prev => ({ ...prev, valor_total: total }));
  }, [form.quantidade, form.valor_do_litro]);

  // =============================
  // 🔹 Capturar imagem da câmera
  // =============================
  const abrirCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão negada', 'É necessário permitir acesso à câmera.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.7,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
      });

      if (!result.canceled) {
        const uri = result.assets[0].uri;
        setForm(prev => ({ ...prev, arquivo_app: uri }));
      }
    } catch (error) {
      console.error('Erro ao abrir câmera:', error);
      Alert.alert('Erro', 'Não foi possível acessar a câmera.');
    }
  };

  // =============================
  // 🔹 Validação e salvamento
  // =============================
  const handleSubmit = async () => {
    if (!form.quantidade || !form.valor_do_litro) {
      Alert.alert('Atenção', 'Preencha quantidade e valor do litro.');
      return;
    }

    if (tipoVeiculo == 4) {
      const hrAtual = integerNumberValue(form.hr_atual, 0);
      const hrAnterior = integerNumberValue(form.hr_anterior, 0);
      if (hrAtual < hrAnterior) {
        Alert.alert('Erro', 'Horímetro atual não pode ser menor que o anterior.');
        return;
      }
      if (hrAtual > hrAnterior + 10) {
        Alert.alert('Erro', `O salto não pode exceder 10h (Máx permitido: ${hrAnterior + 10}).`);
        return;
      }
    } else {
      if (integerNumberValue(form.km_atual, 0) < integerNumberValue(form.km_anterior, 0)) {
        Alert.alert('Erro', 'Hodômetro atual não pode ser menor que o anterior.');
        return;
      }
    }

    try {
      setLoading(true);
      const usuario = await getUsuario();
      const data_abastecimento = nowLocalTimestamp();
      const kmAnterior = integerInputValue(form.km_anterior);
      const kmAtual = onlyDigits(form.km_atual);
      const hrAnterior = integerInputValue(form.hr_anterior);
      const hrAtual = onlyDigits(form.hr_atual);

      const idLocalAbast = uuid.v4();

      await executeSql(
        `INSERT INTO veiculo_abastecimentos (
          id_local, veiculo_id, id_obra, id_funcionario, user_create,
          data_abastecimento, km_anterior, km_atual,
          hr_anterior, hr_atual, fornecedor, combustivel,
          quantidade, valor_do_litro, valor_total,
          tipo, arquivo_app, sync_status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?);`,
        [
          idLocalAbast,
          id_veiculo,
          id_obra,
          usuario.id,
          usuario.email,
          data_abastecimento,
          kmAnterior,
          kmAtual,
          hrAnterior,
          hrAtual,
          form.fornecedor,
          form.combustivel,
          form.quantidade,
          form.valor_do_litro,
          form.valor_total,
          tipoVeiculo,
          form.arquivo_app,
          data_abastecimento
        ]
      );

      showToast('✅ Abastecimento salvo com sucesso!', 'success');
      navigation.navigate('VeiculoAbastFrota', { id_veiculo, id_obra, prefixo });
    } catch (err) {
      console.error(err);
      Alert.alert('Erro', 'Falha ao salvar abastecimento.');
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
        <ActivityIndicator size="large" color="#1f51fe" />
      </Container>
    );
  }

  const isMaquina = tipoVeiculo == 4;

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <Container>
        <Text style={{ fontWeight: 'bold', marginBottom: 10, color: '#333' }}>
          Veículo: {prefixo} | Obra: {id_obra}
        </Text>
        <Linha />

        <Card>
          <Label>Data do Abastecimento</Label>
          <Input editable={false} value={formatarDataAtual()} />

          {isMaquina ? (
            <>
              <Label>Horímetro Anterior</Label>
              <Input editable={false} value={String(form.hr_anterior)} />

              <Label>Horímetro Atual</Label>
              <Input
                keyboardType="numeric"
                value={form.hr_atual}
                onChangeText={v => setForm({
                  ...form,
                  hr_atual: integerInputBlockingSeparators(v, form.hr_atual)
                })}
              />
            </>
          ) : (
            <>
              <Label>Hodômetro Anterior</Label>
              <Input editable={false} value={String(form.km_anterior)} />

              <Label>Hodômetro Atual</Label>
              <Input
                keyboardType="numeric"
                value={form.km_atual}
                onChangeText={v => setForm({
                  ...form,
                  km_atual: integerInputBlockingSeparators(v, form.km_atual)
                })}
              />
            </>
          )}

          <Label>Fornecedor</Label>
          <Input
            value={form.fornecedor}
            onChangeText={v => setForm({ ...form, fornecedor: v })}
            placeholder="Nome do fornecedor"
          />

          <Label>Combustível</Label>
          <Input
            value={form.combustivel}
            onChangeText={v => setForm({ ...form, combustivel: v })}
            placeholder="Ex: Diesel S10"
          />

          <Label>Quantidade (L)</Label>
          <Input
            keyboardType="numeric"
            value={form.quantidade}
            onChangeText={v => setForm({ ...form, quantidade: currencyMask(v) })}
            placeholder="0.00"
          />

          <Label>Valor por Litro (R$)</Label>
          <Input
            keyboardType="numeric"
            value={form.valor_do_litro}
            onChangeText={v => setForm({ ...form, valor_do_litro: currencyMask(v) })}
            placeholder="0.00"
          />

          <Label>Total (R$)</Label>
          <Input editable={false} value={String(form.valor_total)} />

          <Linha />
          <Label>Comprovante (foto)</Label>

          {form.arquivo_app && (
            <ImagePreview source={{ uri: form.arquivo_app }} resizeMode="cover" />
          )}

          <Btn color="#e67e22" onPress={abrirCamera}>
            <BtnText>Tirar Foto do Comprovante</BtnText>
          </Btn>
        </Card>

        <Btn color="green" onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <BtnText>Salvar Abastecimento</BtnText>}
        </Btn>
      </Container>
    </ScrollView>
  );
}
