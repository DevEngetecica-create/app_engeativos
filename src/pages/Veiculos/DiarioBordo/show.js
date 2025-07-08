import React, { useState, useCallback } from 'react';
import { 
  ActivityIndicator,
  RefreshControl,
  Image,
  Linking 
} from 'react-native';
import { useRoute, useFocusEffect, useNavigation } from '@react-navigation/native';
import styled from 'styled-components/native';
import api from '../../../config/api';

const Container = styled.ScrollView`
  flex: 1;
  padding: 16px;
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
  color: #e67e22;
  margin-vertical: 10px;
`;

const DetailRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
  margin-bottom: 8px;
`;

const Label = styled.Text`
  font-weight: bold;
  color: #333;
  width: 40%;
`;

const Value = styled.Text`
  color: #555;
  width: 60%;
  text-align: right;
`;

const ErrorText = styled.Text`
  color: #dc3545;
  text-align: center;
  margin: 20px;
`;

const BackButton = styled.TouchableOpacity`
  margin-top: 20px;
  padding: 12px;
  background: #1f51fe;
  border-radius: 6px;
  align-items: center;
`;

const BackText = styled.Text`
  color: #fff;
  font-weight: bold;
`;

const Divider = styled.View`
  height: 1px;
  background-color: #e67e22;
  margin-vertical: 12px;
`;

const VehicleImage = styled.Image`
  width: 100%;
  height: 200px;
  border-radius: 8px;
  margin-vertical: 10px;
`;

export default function DiarioCadastro() {
  const { id_item } = useRoute().params;
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [registro, setRegistro] = useState(null);
  
  const baseImageUrl = 'https://sga-engeativos.com.br/imagens/veiculos';

  const fetchData = async () => {
    try {
      setError(null);
      const { data } = await api.get(`admin/ativo/veiculo/diario_bordo/show/${id_item}`);
      
      if (!data?.registro) {

        throw new Error('Registro não encontrado');
      }

      setRegistro(data.registro);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [id_item])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const renderContent = () => (
    <Card>
      <SectionTitle>Dados do Diário</SectionTitle>
      
      <DetailRow>
        <Label>Horário Inicial:</Label>
        <Value>{registro.horario_inicial} hrs</Value>
      </DetailRow>

      <DetailRow>
        <Label>Horário Final:</Label>
        <Value>{registro.horario_final} hrs</Value>
      </DetailRow>

      <Divider />

      {registro.veiculo?.tipo == 4 ? (
        <>
          <DetailRow>
            <Label>Horímetro Inicial:</Label>
            <Value>{registro.horimetro_inicial} hrs</Value>
          </DetailRow>
          <DetailRow>
            <Label>Horímetro Final:</Label>
            <Value>{registro.horimetro_final} hrs</Value>
          </DetailRow>
        </>
      ) : (
        <>
          <DetailRow>
            <Label>Hodômetro Inicial:</Label>
            <Value>{registro.hodometro_inicial} km</Value>
          </DetailRow>
          <DetailRow>
            <Label>Hodômetro Final:</Label>
            <Value>{registro.hodometro_final} km</Value>
          </DetailRow>
        </>
      )}

      <Divider />

      <DetailRow style={{ alignItems: 'flex-start' }}>
        <Label>Descrição:</Label>
        <Value style={{ textAlign: 'left' }}>{registro.descricao_atividade}</Value>
      </DetailRow>

      <SectionTitle>Veículo</SectionTitle>

      {registro.veiculo?.imagem && (
        <VehicleImage
          source={
                registro.veiculo?.imagem
                  ? { uri: `${baseImageUrl}/${registro.id_veiculo}/${registro.veiculo?.imagem}` }
                  : require('../../../../assets/no-photos.png')
              }
          resizeMode="contain"
        />
      )}
      <DetailRow>
        <Label>Prefixo:</Label>
        <Value>{registro.veiculo?.prefixo || 'N/A'}</Value>
      </DetailRow>

      <SectionTitle>Obra</SectionTitle>
      <DetailRow>
        <Label>Código:</Label>
        <Value>{registro.obra?.codigo_obra || 'N/A'}</Value>
      </DetailRow>
    </Card>
  );

  if (loading) {
    return (
      <Container contentContainerStyle={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#e67e22" />
      </Container>
    );
  }

  if (error) {
    return (
      <Container contentContainerStyle={{ flex: 1, justifyContent: 'center' }}>
        <ErrorText>Erro: {error}</ErrorText>
        <BackButton onPress={fetchData}>
          <BackText>Tentar novamente</BackText>
        </BackButton>
      </Container>
    );
  }

  return (
    <Container
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={['#e67e22']}
        />
      }
    >
      {registro && renderContent()}
      <BackButton onPress={() => navigation.goBack()}>
        <BackText>Voltar</BackText>
      </BackButton>
    </Container>
  );
}