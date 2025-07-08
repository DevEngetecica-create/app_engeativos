// src/pages/Veiculos/Show.js

import React, { useState, useCallback, useEffect } from 'react';
import {
  ScrollView,
  View,
  Text,
  Image,
  StyleSheet,
  RefreshControl
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import styled from 'styled-components/native';
import axios from 'axios';

import api from '../../config/api';
import Loading from '../../components/Loading';
import ErrorAlert from '../../components/ErrorAlert';
import { initDatabase, db } from '../../config/database/database';
import { useNetwork } from '../../contexts/network';

const Container = styled.View`
  flex: 1;
  padding: 16px;
  background-color: #f5f5f5;
`;
const Section = styled.View`
  margin-bottom: 24px;
  background: #fff;
  border-radius: 8px;
  padding: 12px;
`;
const SectionTitle = styled.Text`
  font-weight: bold;
  font-size: 16px;
  margin-bottom: 8px;
  color: #e67e22;
`;
const FieldRow = styled.View`
  flex-direction: row;
  margin-bottom: 6px;
`;
const Label = styled.Text`
  font-weight: bold;
  width: 140px;
  color: #333;
`;
const Value = styled.Text`
  flex: 1;
  color: #555;
`;
const CardImage = styled.Image`
  width: 100%;
  height: 200px;
  border-radius: 4px;
`;
const CardServicos = styled.TouchableOpacity`
  background: #fff;
  border-radius: 8px;
  padding: 7px;
  margin-bottom: 7px;
  align-items: center;
`;
const CardImageIcone = styled.Image`
  width: 64px;
  height: 64px;
  border-radius: 4px;
  margin: 15px;
`;

export default function VeiculoShow() {
  const route = useRoute();
  const navigation = useNavigation();
  const { id } = route.params;

  const { shouldConnectToInternet } = useNetwork();

  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Init DB once
  useEffect(() => {
    initDatabase();
  }, []);

  const fetchDetailsOffline = useCallback(() => {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT * FROM veiculos WHERE id = ?;`,
          [id],
          (_, { rows }) => {
            if (rows._array.length) {
              const row = rows._array[0];
              resolve({
                status: true,
                veiculo: row,
                quilometragens: [],
                manutencoes: [],
                abastecimentos: [],
                maiorValor: null,
                unidade: null,
                funcionarios: [],
                qtde_litros_combustivel: null,
                imagens: []
              });
            } else {
              reject(new Error('Nenhum registro local encontrado.'));
            }
          },
          (_, err) => reject(err)
        );
      });
    });
  }, [id]);

  const fetchDetails = useCallback(async () => {
    setLoading(true);
    setErrors(null);
    try {
      let result;
      if (shouldConnectToInternet) {
        try {
          const { data } = await api.get(`admin/ativo/veiculo/show/${id}`);
          if (data.status) result = data;
          else throw new Error(data.message);
        } catch {
          result = await fetchDetailsOffline();
        }
      } else {
        result = await fetchDetailsOffline();
      }
      setDetails(result);
    } catch (err) {
      setErrors([err.message]);
    } finally {
      setLoading(false);
    }
  }, [id, shouldConnectToInternet, fetchDetailsOffline]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDetails();
    setRefreshing(false);
  }, [fetchDetails]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  if (loading && !refreshing) return <Loading />;

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Container>
        <ErrorAlert errors={errors} />
        {!details ? (
          <Text>Nenhum detalhe disponível.</Text>
        ) : (
          <>
            <Section>
              <CardImage
                source={
                  details.veiculo.imagem
                    ? { uri: `https://sga-engeativos.com.br/imagens/veiculos/${id}/${details.veiculo.imagem}` }
                    : require('../../../assets/no-photos.png')
                }
                resizeMode="cover"
              />
              <SectionTitle>Dados do Veículo</SectionTitle>
              {['prefixo', 'placa', 'marca', 'modelo'].map(field => (
                <FieldRow key={field}>
                  <Label>{field.charAt(0).toUpperCase() + field.slice(1)}:</Label>
                  <Value>{details.veiculo[field]}</Value>
                </FieldRow>
              ))}
            </Section>

            <Section>
              <CardServicos
                onPress={() => navigation.navigate('ChecklistServicos', { id, prefixo: details.veiculo.prefixo })}
              >
                <CardImageIcone source={require('../../../assets/checklist (1).png')} />
                <SectionTitle>Checklist</SectionTitle>
              </CardServicos>
            </Section>

            {/* Abastecimento */}
            <Section>
              <CardServicos
                activeOpacity={0.8}
                onPress={() =>
                  navigation.navigate('VeiculoAbastFrota', {
                    id: veiculo.id,
                    prefixo: veiculo.prefixo,
                    id_obra: veiculo.obra_id
                  })
                }
              >
                <CardImageIcone
                  source={require('../../../assets/gas-station.png')}
                  resizeMode="cover"
                />
                <SectionTitle>Abastecimento</SectionTitle>
              </CardServicos>
            </Section>

            {/* Diário de Bordo */}
            <Section>
              <CardServicos
                activeOpacity={0.8}
                onPress={() =>
                  navigation.navigate('VeiculosDiarioBordo', { id: veiculo.id })
                }
              >
                <CardImageIcone
                  source={require('../../../assets/test.png')}
                  resizeMode="cover"
                />
                <SectionTitle>Diário de Bordo</SectionTitle>
              </CardServicos>
            </Section>
          </>
        )}
      </Container>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  imagesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 4,
    marginRight: 8,
    marginBottom: 8
  }
});
