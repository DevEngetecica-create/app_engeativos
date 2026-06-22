import React, { useEffect, useState, useCallback } from 'react';
import {
  ScrollView,
  Text,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Image
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import styled from 'styled-components/native';
import * as ImagePicker from 'expo-image-picker';
import { db, executeSql } from '../../../config/database/database';
import { showToast } from '../../../utils/toast';
import {
  integerInputBlockingSeparators,
  integerInputValue,
  integerNumberValue,
  onlyDigits
} from '../../../utils/numberInput';
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
const formatarData = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
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
export default function AbastecimentoEdit() {
  const navigation = useNavigation();
  const { id, id_veiculo, id_obra, prefixo } = useRoute().params;

  const [loading, setLoading] = useState(false);
  const [tipoVeiculo, setTipoVeiculo] = useState(null);
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
    arquivo_app: null,
    data_abastecimento: ''
  });

  // =============================
  // 🔹 Buscar dados existentes
  // =============================
  const carregarAbastecimento = useCallback(async () => {
    setLoading(true);
    try {
      const dados = await executeSql(
        `SELECT * FROM veiculo_abastecimentos WHERE id = ? LIMIT 1`,
        [id]
      );

      if (dados.length) {
        const ab = dados[0];
        setForm({
          ...ab,
          km_anterior: integerInputValue(ab.km_anterior),
          km_atual: integerInputValue(ab.km_atual),
          hr_anterior: integerInputValue(ab.hr_anterior),
          hr_atual: integerInputValue(ab.hr_atual),
          quantidade: String(ab.quantidade || ''),
          valor_do_litro: String(ab.valor_do_litro || ''),
          valor_total: String(ab.valor_total || ''),
          arquivo_app: ab.arquivo_app || null,
          data_abastecimento: ab.data_abastecimento
        });

        // Carregar tipo de veículo
        const veiculo = await executeSql(`SELECT tipo FROM veiculos WHERE id = ?`, [ab.veiculo_id]);
        setTipoVeiculo(veiculo[0]?.tipo || null);
      }
    } catch (err) {
      console.error('Erro ao carregar abastecimento:', err);
      Alert.alert('Erro', 'Falha ao carregar dados locais.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    carregarAbastecimento();
  }, [carregarAbastecimento]);

  // =============================
  // 🔹 Cálculo automático
  // =============================
  useEffect(() => {
    const total =
      (parseFloat(form.quantidade || 0) * parseFloat(form.valor_do_litro || 0)).toFixed(2);
    setForm(prev => ({ ...prev, valor_total: total }));
  }, [form.quantidade, form.valor_do_litro]);

  // =============================
  // 🔹 Câmera
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
  // 🔹 Atualizar registro
  // =============================
  const handleUpdate = async () => {
    if (!form.quantidade || !form.valor_do_litro) {
      Alert.alert('Atenção', 'Preencha quantidade e valor do litro.');
      return;
    }

    if (tipoVeiculo == 4) {
      if (integerNumberValue(form.hr_atual, 0) < integerNumberValue(form.hr_anterior, 0)) {
        Alert.alert('Erro', 'Horímetro atual não pode ser menor que o anterior.');
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
      const dataUpdate = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const kmAnterior = integerInputValue(form.km_anterior);
      const kmAtual = onlyDigits(form.km_atual);
      const hrAnterior = integerInputValue(form.hr_anterior);
      const hrAtual = onlyDigits(form.hr_atual);

      await executeSql(
        `UPDATE veiculo_abastecimentos SET 
          km_anterior = ?, km_atual = ?, hr_anterior = ?, hr_atual = ?,
          fornecedor = ?, combustivel = ?, quantidade = ?, valor_do_litro = ?, valor_total = ?,
          arquivo_app = ?, user_edit = ?, updated_at = ?, sync_status = 0
        WHERE id = ?`,
        [
          kmAnterior,
          kmAtual,
          hrAnterior,
          hrAtual,
          form.fornecedor,
          form.combustivel,
          form.quantidade,
          form.valor_do_litro,
          form.valor_total,
          form.arquivo_app,
          'app_offline_user',
          dataUpdate,
          id
        ]
      );

      showToast('✅ Abastecimento atualizado com sucesso!', 'success');
      navigation.navigate('VeiculoAbastFrota', { id_veiculo, id_obra, prefixo });
    } catch (err) {
      console.error('Erro ao atualizar:', err);
      Alert.alert('Erro', 'Falha ao salvar alterações.');
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
          <Input editable={false} value={formatarData(form.data_abastecimento)} />

          {isMaquina ? (
            <>
              <Label>Horímetro Anterior</Label>
              <Input editable={false} value={form.hr_anterior} />
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
              <Input editable={false} value={form.km_anterior} />
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
          />

          <Label>Combustível</Label>
          <Input
            value={form.combustivel}
            onChangeText={v => setForm({ ...form, combustivel: v })}
          />

          <Label>Quantidade (L)</Label>
          <Input
            keyboardType="numeric"
            value={form.quantidade}
            onChangeText={v => setForm({ ...form, quantidade: v.replace(/[^0-9.]/g, '') })}
          />

          <Label>Valor por Litro (R$)</Label>
          <Input
            keyboardType="numeric"
            value={form.valor_do_litro}
            onChangeText={v => setForm({ ...form, valor_do_litro: v.replace(/[^0-9.]/g, '') })}
          />

          <Label>Total (R$)</Label>
          <Input editable={false} value={String(form.valor_total)} />

          <Linha />
          <Label>Comprovante (foto)</Label>

          {form.arquivo_app && (
            <ImagePreview source={{ uri: form.arquivo_app }} resizeMode="cover" />
          )}

          <Btn color="#e67e22" onPress={abrirCamera}>
            <BtnText>Tirar nova foto</BtnText>
          </Btn>
        </Card>

        <Btn color="green" onPress={handleUpdate}>
          {loading ? <ActivityIndicator color="#fff" /> : <BtnText>Salvar Alterações</BtnText>}
        </Btn>
      </Container>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  errorText: { color: '#d9534f', fontSize: 12, marginTop: 2, marginBottom: 8 }
});
