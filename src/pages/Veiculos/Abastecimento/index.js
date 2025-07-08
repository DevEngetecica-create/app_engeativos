import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRoute, useFocusEffect, useNavigation } from '@react-navigation/native';
import styled from 'styled-components/native';
import api from '../../../config/api';

// Importar o componente para formatar moeda.
import CurrencyFormatter from '../../../utils/CurrencyFormatter';

// Importar a funçãp para formatar a data.
import formatDate from '../../../utils/formatDate';


const CreateButton = styled.TouchableOpacity`
  background-color: #3CB371;
  padding: 7px;
  border-radius: 6px;
  align-self: flex-start;
  margin-bottom: 14px;
`;

const CreateText = styled.Text`
  color: #fff;
  font-weight: bold;
  font-size: 16px;
  text-align: center;
  min-width: 150px;
`;

const CardDetalhe = styled.View`
  flex-direction: row;
  margin-bottom:7px;
`;

const CardDetalheLine = styled.View`
flex-direction: row;
  margin-bottom:7px;
`;



const Label = styled.Text`font-weight:bold; color:#333;`;
const Linha = styled.Text`width:100%; background-color:green;  height: 1px; margin-bottom: 25px`;
const Value = styled.Text` color: #555; `;

const Index = () => {
  const navigation = useNavigation();
  const { id, prefixo, id_obra } = useRoute().params;
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRegistros();
  }, []);

  const fetchRegistros = async () => {
    setLoading(true);
    try {
      const response = await api.get(`admin/ativo/veiculo/abastecimento/${id}`);
      setRegistros(response.data.abastecimentos || []);
    } catch (error) {
      console.error('Erro ao buscar registros:', error);
    } finally {
      setLoading(false);
    }
  };

  // dispara no primeiro foco e em todos os retornos a essa tela
  useFocusEffect(
    useCallback(() => {
      fetchRegistros();
    }, [id])
  );

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('Show', { id: item.id })}
    >
      <Linha />
      <CardDetalhe>
        <Label>Veiculo: </Label>
        <Value>{item.veiculo?.prefixo ?? "sem registro"}</Value>
      </CardDetalhe>

      <CardDetalhe>
        <Label>Obra: </Label>
        <Value>{item.obra?.codigo_obra ?? "sem registro"}</Value>
      </CardDetalhe>

      <CardDetalhe>
        <Label>Cadastrado por: </Label>
        <Value>{item.funcionario?.nome ?? "sem registro"}</Value>
      </CardDetalhe>

      <CardDetalhe>
        <Label>Data do Abastimento: </Label>
        <Value> {formatDate(item.data_abastecimento)}</Value>
      </CardDetalhe>

      <CardDetalheLine>
        <CardDetalhe>
          <Label>Quantidade: </Label>
          <Value >{item.quantidade} litros</Value>
        </CardDetalhe>

        <CardDetalhe>
          <Label style={styles.labelValores}>Valor total: </Label>
          <Value><CurrencyFormatter value={item.valor_total} /></Value>

        </CardDetalhe>
      </CardDetalheLine>

      <CardDetalhe>
        <Label>Local do Abastimento: </Label>
        <Value> {item.fornecedor}</Value>
      </CardDetalhe>

      <View style={styles.actionRow}>

        <TouchableOpacity
          style={styles.btnAction}
          onPress={() =>
            navigation.navigate('VeiculoAbastFrotaShow', { id_item: item.id })
          }
        >
          <Text style={styles.textoBotao}>Detalhes</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btnEdit}
          onPress={() =>
            navigation.navigate('VeiculoAbastFrotaEdit', { id_item: item.id })
          }
        >
          <Text style={styles.textoBotao}>Editar</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>


  );

  if (loading) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" />;
  }

  return (
    <View style={styles.container}>
      <CreateButton
        onPress={() =>
          navigation.navigate('VeiculoAbastFrotaCreate', { id_veiculo: id, prefixo: prefixo, id_obra: id_obra })
        }
      >
        <CreateText>Cadastrar</CreateText>
      </CreateButton>

      <FlatList
        data={registros}
        renderItem={renderItem}
        keyExtractor={item => String(item.id)}
        ListEmptyComponent={<Text>Nenhum registro encontrado.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8
  },

  card: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    elevation: 2,
  },
  prefixo: { fontWeight: 'bold', fontSize: 16 },
  botaoEditar: {
    marginTop: 8,
    backgroundColor: '#007bff',
    padding: 8,
    borderRadius: 4,
    alignSelf: 'flex-end',
  },
  textoBotao: { color: '#fff' },

  btnAction: {
    marginTop: 8,
    backgroundColor: 'green',
    padding: 8,
    borderRadius: 4,
    alignSelf: 'flex-end',
  },
  btnEdit: {
    marginTop: 8,
    marginLeft: 10,
    backgroundColor: 'orange',
    padding: 8,
    borderRadius: 4,
    alignSelf: 'flex-end',
  },
  btnDelete: {
    backgroundColor: '#e53935',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginLeft: 8
  },

  labelValores: {
    marginLeft: 10,
  }
});



export default Index;