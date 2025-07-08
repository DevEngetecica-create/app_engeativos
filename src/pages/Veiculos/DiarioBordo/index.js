// src/pages/Veiculos/DiarioBordo/Index.js

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import styled from 'styled-components/native';
import api from '../../../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../../../config/database/database';

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
  flex-direction: column;
  margin-bottom: 10px;
`;
const Label = styled.Text`
  font-weight: bold;
  color: #333;
`;
const Linha = styled.View`
  width: 100%;
  background-color: green;
  height: 1px;
  margin-bottom: 8px;
`;
const Value = styled.Text`
  color: #555;
  margin-left: 6px;
`;

export default function DiarioBordoIndex() {
  const navigation = useNavigation();
  const route = useRoute();
  const { id } = route.params; // id do veículo

  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRegistros();
  }, []);

  const loadRegistros = async () => {
    setLoading(true);

    // 1) Lê modeOnline
    let modo;
    try {
      modo = await AsyncStorage.getItem('@modoOnline');
    } catch (e) {
      console.warn('Erro lendo modoOnline, assumindo on-line:', e);
      modo = '1';
    }
    const isOnline = modo !== '0';

    if (isOnline) {
      // → Tenta API
      try {
        const response = await api.get(`admin/ativo/veiculo/diario_bordo/${id}`);
        // Supondo que o retorno seja um array de objetos:
        const dados = Array.isArray(response.data) ? response.data : response.data.registros || [];

        setRegistros(dados);

        // Guarda cada registro no SQLite, para uso offline futuro:
        db.transaction(tx => {
          dados.forEach(item => {
            // Ajuste as colunas conforme sua tabela local “veiculos_diario_bordo”
            tx.executeSql(
              `INSERT OR REPLACE INTO veiculos_diario_bordo
                (id, id_obra, id_veiculo, id_funcionario, data_cadastro, horario_inicial,
                 horimetro_inicial, hodometro_inicial, horario_final, horimetro_final,
                 hodometro_final, descricao_atividade, arquivo, sync_status)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1);`,
              [
                item.id,
                item.id_obra,
                item.id_veiculo,
                item.id_funcionario,
                item.data_cadastro,
                item.horario_inicial,
                item.horimetro_inicial,
                item.hodometro_inicial,
                item.horario_final,
                item.horimetro_final,
                item.hodometro_final,
                item.descricao_atividade,
                item.arquivo
              ],
              () => { /* OK */ },
              (_, err) => console.error('❌ SQLite: falha ao inserir Diário de Bordo', err)
            );
          });
        });
      } catch (error) {
        console.warn('🔴 Erro na API, carregando offline:', error.message);
        fetchRegistrosOffline();
      }
    } else {
      // → modo offline puro
      fetchRegistrosOffline();
    }

    setLoading(false);
  };

  // Carrega direto do SQLite
  const fetchRegistrosOffline = () => {
    db.transaction(tx => {
      tx.executeSql(
        `SELECT * FROM veiculos_diario_bordo WHERE id_veiculo = ? ORDER BY data_cadastro DESC;`,
        [id],
        (_, { rows }) => {
          const arr = rows._array || [];
          setRegistros(arr);
        },
        (_, err) => {
          console.error('❌ SQLite: erro ao buscar Diário de Bordo offline', err);
          Alert.alert('Erro', 'Não foi possível acessar registros offline.');
        }
      );
    });
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('VeiculosDiarioBordoShow', { id_item: item.id })}
    >
      <Linha />

      <CardDetalhe>
        <Label>Veículo:</Label>
        <Value>{item.id_veiculo?.toString()}</Value>
      </CardDetalhe>

      <CardDetalhe>
        <Label>Criado em:</Label>
        <Value>
          { item.data_cadastro
            ? new Date(item.data_cadastro).toLocaleString()
            : '— não informado —'
          }
        </Value>
      </CardDetalhe>

      <CardDetalhe>
        <Label>Horário inicial:</Label>
        <Value>{item.horario_inicial ?? '—'}</Value>
      </CardDetalhe>

      <CardDetalhe>
        <Label>Horário final:</Label>
        <Value>{item.horario_final ?? '—'}</Value>
      </CardDetalhe>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.btnAction}
          onPress={() =>
            navigation.navigate('VeiculosDiarioBordoShow', { id_item: item.id })
          }
        >
          <Text style={styles.textoBotao}>Detalhes</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btnEdit}
          onPress={() =>
            navigation.navigate('VeiculosDiarioBordoEdit', { id_item: item.id })
          }
        >
          <Text style={styles.textoBotao}>Editar</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#3CB371" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CreateButton
        onPress={() =>
          navigation.navigate('VeiculosDiarioBordoCreate', { id_veiculo: id })
        }
      >
        <CreateText>Cadastrar</CreateText>
      </CreateButton>

      <FlatList
        data={registros}
        renderItem={renderItem}
        keyExtractor={(item, idx) =>
          item.id != null ? item.id.toString() : idx.toString()
        }
        ListEmptyComponent={() => (
          <Text style={styles.emptyText}>Nenhum registro encontrado.</Text>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    elevation: 2
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8
  },
  btnAction: {
    marginTop: 8,
    backgroundColor: 'green',
    padding: 8,
    borderRadius: 4,
    marginRight: 8
  },
  btnEdit: {
    marginTop: 8,
    backgroundColor: 'orange',
    padding: 8,
    borderRadius: 4
  },
  textoBotao: {
    color: '#fff',
    fontWeight: 'bold'
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#666'
  }
});
