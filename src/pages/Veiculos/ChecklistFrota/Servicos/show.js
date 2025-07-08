// src/pages/Veiculos/ChecklistFrota/Servicos/ShowFullChecklist.js

import React, { useState, useCallback } from 'react';
import {
  Alert,
  ScrollView,
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity
} from 'react-native';
import { useRoute, useFocusEffect, useNavigation } from '@react-navigation/native';
import styled from 'styled-components/native';
import api from '../../../../config/api';
import ErrorAlert from '../../../../components/ErrorAlert';

const Container = styled.View`
  flex: 1;
  padding: 16px;
  background-color: #f5f5f5;
`;
const SectionTitle = styled.Text`
  font-size: 18px;
  font-weight: bold;
  margin-top: 16px;
  margin-bottom: 8px;
`;
const Card = styled.View`
  background: #fff;
  border: 1px solid #e67e22;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
`;
const Row = styled.View`
  flex-direction: row;
  margin-bottom: 8px;
`;

// ajuste Label para ter largura fixa
const Label = styled.Text`
  font-weight: bold;
  color: #333;
  width: 120px;      /* ajuste conforme o espaço que você precisar */
`;

// ajuste Value para ocupar o restante
const Value = styled.Text`
  color: #555;
  flex: 1;
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

export default function ShowFullChecklist() {
  const navigation = useNavigation();
  const { id_checklist } = useRoute().params;

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState(null);
  const [masters, setMasters] = useState([]); // registros em 'checklists'
  const [items, setItems] = useState([]);     // registros em 'checklists_itens'

  const detalhes_veiculo = useCallback(async () => {
    setLoading(true);
    setErrors(null);

    try {
      const { data } = await api.get(
        `admin/ativo/veiculo/checklist/servicos/show/${id_checklist}`
      );

      // normaliza o array de pais
      const listChecklists = Array.isArray(data.checklists)
        ? data.checklists
        : data.checklists
          ? [data.checklists]
          : [];


      setMasters(listChecklists);

      // normaliza o array de itens
      const listItems = Array.isArray(data.checklists_itens)
        ? data.checklists_itens
        : data.checklists_itens
          ? [data.checklists_itens]
          : [];

      setItems(listItems);

    } catch (err) {
      const msg = err.response?.data?.message
        || err.message
        || 'Erro ao carregar dados.';
      setErrors([msg]);
    } finally {
      setLoading(false);
    }
  }, [id_checklist]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const runFetch = async () => {
        if (isActive) {
          await detalhes_veiculo();
        }
      };

      runFetch();

      return () => {
        isActive = false; // evita setState se o usuário saiu da tela
      };
    }, [detalhes_veiculo])

  );


  // enquanto carrega E não há dados, mostra loader
  if (loading && masters.length === 0 && items.length === 0) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <Container>
        <ErrorAlert errors={errors} />

        <BackButton onPress={() => navigation.goBack()}>
          <BackText>Voltar</BackText>
        </BackButton>

        <SectionTitle>Execuções (Checklists)</SectionTitle>
        {masters.length === 0 ? (
          <Text>Nenhuma execução encontrada.</Text>
        ) : masters.map(mc => (
          <Card key={mc.id}>
            

            <Row>
              <Label>Veículo:</Label>
              <Value>{mc.veiculo?.prefixo ?? '–'}</Value>
            </Row>

            <Row>
              <Label>Obra:</Label>
              <Value>{mc.veiculo?.obra?.codigo_obra ?? '–'}</Value>
            </Row>

            <Row>
              <Label>Data Cadastro:</Label>
              <Value>{mc.data_cadastro ?? '–'}</Value>
            </Row>
          </Card>
        ))}

        <SectionTitle>Itens Verificados</SectionTitle>
        {items.length === 0 ? (
          <Text>Nenhum item de checklist encontrado.</Text>
        ) : items.map(it => (
          <Card key={it.id}>
            <Row>
              <Label>Item Checklist:</Label>
              <Value>
                {it.servico_checklist?.nome_servico
                  ?? it.servico?.nome_servico
                  ?? it.id_checklist_itens
                  ?? it.id}
              </Value>
            </Row>

            <Row>
              <Label>Verificado:</Label>
              <Value>{it.status}</Value>
            </Row>

            <Row>
              <Label>Observação:</Label>
              <Value>{it.observacao ?? '–'}</Value>
            </Row>

            <Row>
              <Label>Data Cadastro:</Label>
              <Value>{it.data_cadastro ?? it.created_at ?? '–'}</Value>
            </Row>
          </Card>
        ))}

        <BackButton onPress={() => navigation.goBack()}>
          <BackText>Voltar</BackText>
        </BackButton>
      </Container>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});
