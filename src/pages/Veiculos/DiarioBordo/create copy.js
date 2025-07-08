import React, { useState, useCallback, useEffect } from 'react';
import { Alert, ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, TextInput } from 'react-native';
import styled from 'styled-components/native';
import * as ImagePicker from 'expo-image-picker';
import api from '../../../config/api';
import { useRoute, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import formatCurrency  from '../../../utils/CurrencyFormatter';
import CurrencyFormatter from '../../../utils/CurrencyFormatter';

const Container = styled.ScrollView`
  padding: 20px;
  background-color: #f5f5f5;
`;

const Card = styled.View`
  background-color: #fff;
  padding: 16px;
  margin-bottom: 12px;
  border-radius: 8px;
  elevation: 2;
`;

const SectionTitle = styled.Text`
  font-size: 18px;
  font-weight: bold;
  color: #3CB371;
  margin-vertical: 10px;
`;

const VehicleImage = styled.Image`
  width: 100%;
  height: 200px;
  border-radius: 8px;
  margin-bottom: 12px;
`;

const InputGroup = styled.View`
  margin-bottom: 16px;
`;

const Label = styled.Text`
  font-weight: bold;
  margin-bottom: 4px;
  color: #333;
`;

const Input = styled.TextInput`
  border: 1px solid #ccc;
  border-radius: 6px;
  padding: 12px;
  font-size: 16px;
`;

const ErrorText = styled.Text`
  color: #dc3545;
  margin-top: 4px;
  font-size: 14px;
`;

const Btn = styled.TouchableOpacity`
  background-color: ${props => props.disabled ? '#cccccc' : '#1f51fe'};
  padding: 16px;
  border-radius: 6px;
  align-items: center;
  margin-vertical: 8px;
`;

const BtnText = styled.Text`
  color: #fff;
  font-weight: bold;
  font-size: 16px;
`;

const baseImageUrl = 'https://sga-engeativos.com.br/imagens/veiculos';

export default function CreateAbastecimento() {
  const navigation = useNavigation();
  const { id_item: veiculoId } = useRoute().params;
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [veiculoData, setVeiculoData] = useState(null);
  const [userData, setUserData] = useState(null);

  const [form, setForm] = useState({
    veiculo_id: veiculoId,
    id_obra: '',
    id_funcionario: '',
    data_abastecimento: new Date().toISOString().split('T')[0],
    fornecedor: '',
    combustivel: 'Diesel',
    quantidade: '',
    valor_do_litro: '',
    valor_total: '0.00',
    arquivo: null
  });

  const fetchInitialData = async () => {
    try {
      const [user, veiculoResponse] = await Promise.all([
        AsyncStorage.getItem('@user'), api.get(`admin/ativo/veiculo/abastecimento/create/73`)
      ]);

      const userParsed = JSON.parse(user);
      const veiculo = veiculoResponse.data?.veiculo;

      console.log(veiculoResponse.data)

      setUserData(userParsed);
      setVeiculoData(veiculo);

      setForm(prev => ({
        ...prev,
        id_obra: veiculo?.obra_id?.toString() || '',
        id_funcionario: userParsed?.id?.toString() || ''
      }));

    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar os dados iniciais');
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const validateForm = () => {
    const newErrors = {};
    const requiredFields = [
      'data_abastecimento',
      'fornecedor',
      'combustivel',
      'quantidade',
      'valor_do_litro'
    ];

    requiredFields.forEach(field => {
      if (!form[field] || form[field].trim() === '') {
        newErrors[field] = 'Campo obrigatório';
      }
    });

    if (isNaN(form.quantidade) || parseFloat(form.quantidade) <= 0) {
      newErrors.quantidade = 'Quantidade inválida';
    }

    if (isNaN(form.valor_do_litro) || parseFloat(form.valor_do_litro) <= 0) {
      newErrors.valor_do_litro = 'Valor inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled) {
      setForm({ ...form, arquivo: result.assets[0] });
    }
  };

  const calculateTotal = (qty, price) => {
    const quantity = parseFloat(qty) || 0;
    const unitPrice = parseFloat(price) || 0;
    return (quantity * unitPrice).toFixed(2);
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      const formData = new FormData();

      // Append all form fields
      Object.entries(form).forEach(([key, value]) => {
        if (key === 'arquivo' && value) {
          formData.append('arquivo', {
            uri: value.uri,
            name: `abastecimento_${Date.now()}.jpg`,
            type: 'image/jpeg'
          });
        } else if (value !== null) {
          formData.append(key, value);
        }
      });

      await api.post('admin/ativo/veiculo/abastecimento/store', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Accept': 'application/json'
        }
      });

      Alert.alert('Sucesso', 'Abastecimento cadastrado!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);

    } catch (error) {
      const serverErrors = error.response?.data?.errors;
      if (serverErrors) {
        const formattedErrors = Object.entries(serverErrors).reduce((acc, [key, messages]) => {
          acc[key] = messages.join(', ');
          return acc;
        }, {});
        setErrors(formattedErrors);
      } else {
        Alert.alert('Erro', 'Falha ao cadastrar abastecimento');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (value) => {
    const numericValue = value.replace(/[^0-9.,]/g, '');
    setForm(prev => ({
      ...prev,
      quantidade: numericValue,
      valor_total: calculateTotal(numericValue, prev.valor_do_litro)
    }));
  };

  const handlePriceChange = (value) => {
    const numericValue = value.replace(/[^0-9.,]/g, '');
    setForm(prev => ({
      ...prev,
      valor_do_litro: numericValue,
      valor_total: calculateTotal(prev.quantidade, numericValue)
    }));
  };


  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <Container keyboardShouldPersistTaps="handled">
        <Card>
          {veiculoData?.imagem && (
            <VehicleImage
              source={{ uri: `${baseImageUrl}/${veiculoData.imagem}` }}
              resizeMode="contain"
            />
          )}

          <SectionTitle>Dados do Veículo</SectionTitle>
          <InputGroup>
            <Label>Prefixo:</Label>
            <Input
              value={veiculoData?.prefixo || ''}
              editable={false}
            />
          </InputGroup>

          <SectionTitle>Dados do Abastecimento</SectionTitle>

          <InputGroup>
            <Label>Data do Abastecimento *</Label>
            <Input
              value={form.data_abastecimento}
              onChangeText={v => setForm({ ...form, data_abastecimento: v })}
              placeholder="AAAA-MM-DD"
            />
            {errors.data_abastecimento && <ErrorText>{errors.data_abastecimento}</ErrorText>}
          </InputGroup>

          <InputGroup>
            <Label>Fornecedor *</Label>
            <Input
              value={form.fornecedor}
              onChangeText={v => setForm({ ...form, fornecedor: v })}
              placeholder="Nome do fornecedor"
            />
            {errors.fornecedor && <ErrorText>{errors.fornecedor}</ErrorText>}
          </InputGroup>

          <InputGroup>
            <Label>Combustível *</Label>
            <Input
              value={form.combustivel}
              onChangeText={v => setForm({ ...form, combustivel: v })}
              placeholder="Tipo de combustível"
            />
            {errors.combustivel && <ErrorText>{errors.combustivel}</ErrorText>}
          </InputGroup>

          <InputGroup>
            <Label>Quantidade (litros) *</Label>
            <TextInput
              style={styles.input}
              value={form.quantidade}
              onChangeText={handleQuantityChange}
              placeholder="Ex: 50,5"
              keyboardType="decimal-pad"
            />
            {errors.quantidade && <ErrorText>{errors.quantidade}</ErrorText>}
          </InputGroup>

          <InputGroup>
            <Label>Valor por Litro *</Label>
            <TextInput
              value={formatCurrency(form.valor_do_litro)}
              onChangeText={handlePriceChange}
              keyboardType="numeric"
            />
          </InputGroup>

          <InputGroup>
            <Label>Valor Total</Label>
            <TextInput
              style={styles.input}
              value={`R$ ${CurrencyFormatter.format(form.valor_total)}`}
              editable={false}
            />
          </InputGroup>

          <InputGroup>
            <Label>Quantidade (litros) *</Label>
            <CurrencyFormatter
              value={form.quantidade}
              onChange={value => {
                setForm(prev => ({
                  ...prev,
                  quantidade: value,
                  valor_total: calculateTotal(value, prev.valor_do_litro)
                }));
              }}
              keyboardType="decimal-pad"
            />
            {errors.quantidade && <ErrorText>{errors.quantidade}</ErrorText>}
          </InputGroup>

          <InputGroup>
            <Label>Valor por Litro *</Label>
            <CurrencyFormatter
              value={form.valor_do_litro}
              onChange={value => {
                setForm(prev => ({
                  ...prev,
                  valor_do_litro: value,
                  valor_total: calculateTotal(prev.quantidade, value)
                }));
              }}
              prefix="R$ "
              keyboardType="decimal-pad"
            />
            {errors.valor_do_litro && <ErrorText>{errors.valor_do_litro}</ErrorText>}
          </InputGroup>

          <InputGroup>
            <Label>Valor Total</Label>
            <Input
              value={`R$ ${form.valor_total}`}
              editable={false}
            />
          </InputGroup>

          <InputGroup>
            <Label>Comprovante</Label>
            <Btn onPress={handlePickImage} disabled={loading}>
              <BtnText>
                {form.arquivo ? 'Trocar Imagem' : 'Selecionar Imagem'}
              </BtnText>
            </Btn>
            {form.arquivo && (
              <Image
                source={{ uri: form.arquivo.uri }}
                style={{ width: 100, height: 100, marginTop: 8 }}
              />
            )}
          </InputGroup>

          <Btn
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <BtnText>Cadastrar Abastecimento</BtnText>
            )}
          </Btn>
        </Card>
      </Container>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    marginBottom: 8
  },

});