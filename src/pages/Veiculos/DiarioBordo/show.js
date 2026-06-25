import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import styled from 'styled-components/native';
import { db, executeSql } from '../../../config/database/database';

// ============================
// 🔹 Styled Components
// ============================
const Container = styled.View`
  flex: 1;
  background: #f5f5f5;
  padding: 10px;
`;
const Card = styled.View`
  background-color: #fff;
  padding: 10px;
  border-radius: 8px;
  elevation: 2;
  margin-bottom: 12px;
  border-left-width: 6px;
  border-left-color: ${props => (props.tipo === 4 ? '#e67e22' : '#3498db')};
`;
const Label = styled.Text`
  font-weight: bold;
  color: #333;
  margin-bottom: 4px;
`;
const Value = styled.Text`
  color: #000;
  margin-bottom: 8px;
`;
const SyncText = styled.Text`
  color: green;
  font-weight: bold;
  margin-bottom: 12px;
  text-align: center;
`;

export default function DiarioDetalhes() {
  const { id } = useRoute().params;
  const [registro, setRegistro] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDetalhes = async () => {
    setLoading(true);
    try {
      const res = await executeSql(`SELECT * FROM veiculos_diario_bordo WHERE id = ?`, [id]);
      if (res.length > 0) setRegistro(res[0]);
    } catch (e) {
      console.error('Erro ao carregar detalhes do diário:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetalhes();
  }, [id]);

  if (loading) {
    return (
      <Container style={{ justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="green" />
      </Container>
    );
  }

  if (!registro) {
    return (
      <Container style={{ justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#999' }}>Diário não encontrado.</Text>
      </Container>
    );
  }

  const isMaquina = !!registro.horimetro_inicial;

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <Container>
        {registro.sync_status == 1 && (
          <SyncText>✅ Diário de bordo sincronizado</SyncText>
        )}

        <Card tipo={isMaquina ? 4 : 1}>
          <Text style={styles.titulo}>
            {isMaquina ? '⚙️ Horímetro' : '🚗 Quilometragem'}
          </Text>

          {isMaquina ? (
            <>
              <Label>Horímetro Inicial</Label>
              <Value>{registro.horimetro_inicial || '-'}</Value>

              <Label>Horímetro Final</Label>
              <Value>{registro.horimetro_final || '-'}</Value>
            </>
          ) : (
            <>
              <Label>Hodômetro Inicial</Label>
              <Value>{registro.hodometro_inicial || '-'}</Value>

              <Label>Hodômetro Final</Label>
              <Value>{registro.hodometro_final || '-'}</Value>
            </>
          )}
        </Card>

        <Card>
          <Text style={styles.titulo}>🕒 Data e Horários</Text>
          <Label>Data de Cadastro</Label>
          <Value>{registro.data_cadastro}</Value>

          <Label>Horário Inicial</Label>
          <Value>{registro.horario_inicial}</Value>

          <Label>Horário Final</Label>
          <Value>{registro.horario_final}</Value>
        </Card>

        <Card>
          <Text style={styles.titulo}>📝 Atividade</Text>
          <Label>Descrição</Label>
          <Value>{registro.descricao_atividade || 'Sem descrição'}</Value>
        </Card>

        {registro.arquivo ? (
          <Card>
            <Text style={styles.titulo}>📷 Imagem</Text>
            <Image
              source={{ uri: registro.arquivo }}
              style={{
                width: '100%',
                height: 250,
                borderRadius: 10,
                marginTop: 8,
              }}
              resizeMode="cover"
            />
          </Card>
        ) : null}
      </Container>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  titulo: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
});
