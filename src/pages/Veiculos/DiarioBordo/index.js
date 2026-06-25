import React, { useState, useCallback } from 'react';
import {
  ScrollView,
  View,
  Text,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import styled from 'styled-components/native';
import { db, executeSql } from '../../../config/database/database';

// =========================
// 🔹 Styled Components
// =========================
const Container = styled.View`
  flex: 1;
  background: #f5f5f5;
  padding: 8px;
`;
const Card = styled.View`
  background-color: #fff;
  border-radius: 8px;
  elevation: 2;
  padding: 10px;
  margin-bottom: 10px;
  border-left-width: 5px;
  border-left-color: ${props => (props.tipo === 4 ? '#e67e22' : '#3498db')};
`;
const Label = styled.Text`
  font-weight: bold;
  color: #333;
`;
const Value = styled.Text`
  color: #000;
  margin-bottom: 4px;
`;
const SyncText = styled.Text`
  color: green;
  font-weight: bold;
  margin-top: 6px;
`;
const BtnGroup = styled.View`
  flex-direction: row;
  justify-content: space-between;
  margin-top: 8px;
`;
const Btn = styled.TouchableOpacity`
  background-color: ${props => props.color || '#1f51fe'};
  padding: 8px 12px;
  border-radius: 6px;
`;
const BtnText = styled.Text`
  color: #fff;
  font-weight: bold;
`;

// =========================
// 🔹 Helper: início da semana
// =========================
function getWeekRange() {
  const now = new Date();
  const day = now.getDay(); // 0-dom, 1-seg...
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const format = d =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;

  return { start: format(monday), end: format(sunday) };
}

// =========================
// 🔹 Principal
// =========================
export default function DiarioList() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [registros, setRegistros] = useState([]);
  const route = useRoute();

  const { id_veiculo, prefixo, id_obra } = route.params || {}; // id do veículo

  const fetchRegistros = useCallback(async () => {
    setLoading(true);
    try {
      const { start, end } = getWeekRange();

      const sql = `
        SELECT *
        FROM veiculos_diario_bordo
        WHERE id_veiculo = ? 
          AND (DATE(data_cadastro) BETWEEN DATE(?) AND DATE(?) OR ciclo_status = 'ABERTO')
        ORDER BY datetime(data_cadastro) DESC
      `;
      const res = await executeSql(sql, [id_veiculo, start, end]);
      setRegistros(res);
    } catch (e) {
      console.error('Erro ao buscar registros locais:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleNovoDiario = async () => {
    try {
      const resUser = await executeSql(`SELECT email FROM users LIMIT 1`);
      const email = resUser.length ? resUser[0].email : null;

      const sql = `
        SELECT id FROM veiculos_diario_bordo
        WHERE id_veiculo = ?
          AND user_create = ?
          AND ciclo_status = 'ABERTO'
          AND deleted_at IS NULL
        LIMIT 1
      `;
      const abertos = await executeSql(sql, [id_veiculo, email]);

      if (abertos.length > 0) {
        Alert.alert(
          'Diário em aberto',
          'Você possui um Diário de Bordo em aberto para este veículo. Encerre a atividade anterior antes de abrir um novo diário.'
        );
        return;
      }

      navigation.navigate('VeiculosDiarioBordoCreate', { id_veiculo: id_veiculo, prefixo: prefixo, id_obra: id_obra });
    } catch (e) {
      console.error(e);
      Alert.alert('Erro', 'Não foi possível verificar diários abertos.');
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchRegistros();
    }, [fetchRegistros])
  );

  if (loading) {
    return (
      <Container style={{ justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="green" />
      </Container>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchRegistros} colors={['#1f51fe']} />
        }
      >
        <Container>
          <Text style={styles.titulo}>📅 Diários da Semana</Text>

          {registros.length === 0 ? (
            <Text style={{ textAlign: 'center', marginTop: 30, color: '#777' }}>
              Nenhum diário encontrado nesta semana.
            </Text>
          ) : (
            registros.map(item => (
              <Card key={item.id} tipo={item.tipo}>
                <View style={{ alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, backgroundColor: item.ciclo_status === 'ABERTO' ? '#f39c12' : '#2ecc71', marginBottom: 8 }}>
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>
                    Ciclo: {item.ciclo_status === 'ABERTO' ? 'Aberto' : 'Encerrado'}
                  </Text>
                </View>
                <Label>Data Cadastro:</Label>
                <Value>{item.data_cadastro}</Value>

                {item.horimetro_inicial ? (
                  <>
                    <Label>Horímetro:</Label>
                    <Value>
                      {item.horimetro_inicial} → {item.horimetro_final || '-'}
                    </Value>
                  </>
                ) : (
                  <>
                    <Label>Hodômetro:</Label>
                    <Value>
                      {item.hodometro_inicial} → {item.hodometro_final || '-'}
                    </Value>
                  </>
                )}

                <Label>Horário:</Label>
                <Value>
                  {item.horario_inicial} → {item.horario_final}
                </Value>

                <Label>Atividade:</Label>
                <Value>{item.descricao_atividade}</Value>

                {item.sync_status == 1 && (
                  <SyncText>✅ Diário de bordo sincronizado</SyncText>
                )}

                <BtnGroup>
                  {item.ciclo_status === 'ABERTO' && (
                    <Btn
                      color="#f39c12"
                      onPress={() => navigation.navigate('VeiculosDiarioBordoEdit', { id: item.id })}
                    >
                      <BtnText>Encerrar</BtnText>
                    </Btn>
                  )}
                  <Btn
                    color="#3498db"
                    onPress={() => navigation.navigate('VeiculosDiarioBordoShow', { id: item.id })}
                  >
                    <BtnText>Detalhes</BtnText>
                  </Btn>
                </BtnGroup>
              </Card>
            ))
          )}
        </Container>
      </ScrollView>

      {/* Botão flutuante */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleNovoDiario}
      >
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  titulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: 'green',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  fabText: {
    color: '#fff',
    fontSize: 30,
    lineHeight: 30,
  },
});
