import React, { useEffect, useState } from 'react';
import { 
  View, 
  FlatList, 
  ActivityIndicator,
  RefreshControl,
  Image,
  Linking 
} from 'react-native';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import styled from 'styled-components/native';
import api from '../../../config/api';
import CurrencyFormatter from '../../../utils/CurrencyFormatter';
import formatDate from '../../../utils/formatDate';

const Container = styled.View`
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
  color: #3CB371;
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

const VehicleImage = styled.Image`
  width: 100%;
  height: 200px;
  border-radius: 8px;
  margin-vertical: 10px;
`;

const Show = () => {
  const { id_item } = useRoute().params;
  const [registro, setRegistro] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setError(null);
      const response = await api.get(`admin/ativo/veiculo/abastecimento/show/${id_item}`);
      
      if (!response.data?.abastecimentos) {
        throw new Error('Estrutura de dados inválida');
      }

      setRegistro(response.data.abastecimentos);
    } catch (error) {
      setError(error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchData();
    }, [id_item])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };
 const baseImageUrl = 'https://sga-engeativos.com.br/imagens/veiculos';

  const renderDetailItem = ({ item }) => (
    <Card>
      <SectionTitle>Dados do Abastecimento</SectionTitle>
      
      <DetailRow>
        <Label>Data:</Label>
        <Value>{formatDate(item.data_abastecimento)}</Value>
      </DetailRow>

      <DetailRow>
        <Label>Quantidade:</Label>
        <Value>{item.quantidade} litros</Value>
      </DetailRow>

      <DetailRow>
        <Label>Valor por Litro:</Label>
        <Value><CurrencyFormatter value={item.valor_do_litro} /></Value>
      </DetailRow>

      <DetailRow>
        <Label>Valor Total:</Label>
        <Value><CurrencyFormatter value={item.valor_total} /></Value>
      </DetailRow>

      <DetailRow>
        <Label>Fornecedor:</Label>
        <Value>{item.fornecedor || 'Não informado'}</Value>
      </DetailRow>

      <SectionTitle>Veículo</SectionTitle>
      {registro.veiculo?.imagem && (
        <VehicleImage
          source={
                registro.veiculo?.imagem
                  ? { uri: `${baseImageUrl}/${item.veiculo_id}/${registro.veiculo?.imagem}` }
                  : require('../../../../assets/no-photos.png')
              }
          resizeMode="contain"
        />
      )}
      
      <DetailRow>
        <Label>Prefixo:</Label>
        <Value>{registro.veiculo?.prefixo || 'Não informado'}</Value>
      </DetailRow>

      <DetailRow>
        <Label>Marca/Modelo:</Label>
        <Value>{[registro.veiculo?.marca, registro.veiculo?.modelo].filter(Boolean).join(' - ')}</Value>
      </DetailRow>

      <DetailRow>
        <Label>Chassi:</Label>
        <Value>{registro.veiculo?.nun_serie_chassi || 'Não informado'}</Value>
      </DetailRow>

      <SectionTitle>Responsável</SectionTitle>
      <DetailRow>
        <Label>Nome:</Label>
        <Value>{registro.funcionario?.nome || 'Não informado'}</Value>
      </DetailRow>

      <DetailRow>
        <Label>Matrícula:</Label>
        <Value>{registro.funcionario?.matricula || 'Não informada'}</Value>
      </DetailRow>

      <SectionTitle>Obra</SectionTitle>
      <DetailRow>
        <Label>Código:</Label>
        <Value>{registro.obra?.codigo_obra || 'Não informado'}</Value>
      </DetailRow>

      <DetailRow>
        <Label>Localização:</Label>
        <Value>
          {[registro.obra?.cidade, registro.obra?.estado].filter(Boolean).join('/')}
        </Value>
      </DetailRow>
    </Card>
  );

  if (loading) {
    return (
      <Container>
        <ActivityIndicator size="large" color="#3CB371" />
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Text style={{ color: 'red', textAlign: 'center', margin: 20 }}>
          Erro: {error}
        </Text>
        <Button
          title="Tentar novamente"
          onPress={fetchData}
          color="#3CB371"
        />
      </Container>
    );
  }

  return (
    <Container>
      <FlatList
        data={[registro]} // Convertendo objeto único em array
        renderItem={renderDetailItem}
        keyExtractor={() => 'unique-key'}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#3CB371']}
          />
        }
      />
    </Container>
  );
};

export default Show;