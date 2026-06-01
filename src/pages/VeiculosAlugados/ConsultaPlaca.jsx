import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import styled from 'styled-components/native';
import api from '../../config/api';
import { useNavigation } from '@react-navigation/native';
import emptyImg from '../../../assets/icons/empty_checklist.png';

const Container = styled.View`
  flex: 1;
  padding: 18px;
  background-color: #f8f9fa;
`;

const Input = styled.TextInput`
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
  background-color: #fff;
  text-transform: uppercase;
  font-size: 16px;
`;

const Button = styled.TouchableOpacity`
  background-color: #0057a3;
  padding: 12px;
  border-radius: 8px;
  align-items: center;
`;

const BtnText = styled.Text`
  color: #fff;
  font-weight: bold;
  font-size: 16px;
`;

const Card = styled.View`
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-top: 18px;
  elevation: 3;
  shadow-color: #000;
  shadow-opacity: 0.1;
  shadow-radius: 4px;
  shadow-offset: 0px 2px;
`;

const Status = styled.Text`
  font-weight: bold;
  font-size: 16px;
  color: ${({ status }) =>
    status === 'Aberto' ? '#f39c12' :
    status === 'Encerrado' ? '#2ecc71' : '#999'};
`;

export default function ConsultaPlaca() {
  const [placa, setPlaca] = useState('');
  const [dados, setDados] = useState(null);
  const navigation = useNavigation();

  const consultar = async () => {
    if (!placa) {
      Alert.alert('Atenção', 'Digite uma placa para consultar.');
      return;
    }

    try {
      const { data } = await api.get(`/veiculos/checklist/consultar?placa=${placa}`);
      if (data.success) {
        setDados(data);
      } else {
        Alert.alert('Erro', data.message);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Falha na consulta.';
      setDados(null);
      Alert.alert('Erro', msg);
    }
  };

  return (
    <Container>
      <Text style={styles.title}>Consulta de Veículo</Text>
      <Input
        placeholder="Digite a placa (ex: ABC1D23)"
        value={placa}
        onChangeText={setPlaca}
        autoCapitalize="characters"
      />
      <Button onPress={consultar}>
        <BtnText>🔍 Pesquisar</BtnText>
      </Button>

      {dados ? (
        dados.success ? (
          <Card>
            <Text style={styles.label}>Placa:</Text>
            <Text style={styles.value}>{dados.veiculo.placa}</Text>

            <Text style={styles.label}>Modelo:</Text>
            <Text style={styles.value}>{dados.veiculo.modelo ?? '-'}</Text>

            <Text style={styles.label}>Situação:</Text>
            <Status status={dados.situacao}>{dados.situacao}</Status>

            <TouchableOpacity
              style={styles.btnCheck}
              onPress={() => navigation.navigate('ChecklistRetirada', { veiculo: dados.veiculo })}
            >
              <Text style={styles.btnCheckText}>Iniciar Checklist</Text>
            </TouchableOpacity>
          </Card>
        ) : (
          <View style={styles.emptyBox}>
            <Image source={emptyImg} style={styles.image} resizeMode="contain" />
            <Text style={styles.emptyText}>Nenhum registro encontrado</Text>
          </View>
        )
      ) : (
        <View style={styles.emptyBox}>
          <Image source={emptyImg} style={styles.image} resizeMode="contain" />
          <Text style={styles.emptyText}>Digite a placa e clique em Pesquisar</Text>
        </View>
      )}
    </Container>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: 'bold', fontSize: 18, marginBottom: 16, color: '#333' },
  label: { fontWeight: 'bold', fontSize: 14, color: '#555', marginTop: 8 },
  value: { fontSize: 15, color: '#000' },
  btnCheck: {
    marginTop: 18,
    backgroundColor: '#27ae60',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnCheckText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  emptyBox: { flex: 1, alignItems: 'center', marginTop: 50 },
  image: { width: 180, height: 180, marginBottom: 12 },
  emptyText: { color: '#555', fontSize: 14 },
});
