import React, { useCallback, useState } from 'react';
import {
  ScrollView,
  View,
  StyleSheet,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl
} from 'react-native';
import { useRoute, useFocusEffect, useNavigation } from '@react-navigation/native';
import styled from 'styled-components/native';
import { db } from '../../../../config/database/database';
import { useAuth } from '../../../../contexts/auth';
import ErrorAlert from '../../../../components/ErrorAlert';

// =============================
// 🔹 Styled Components
// =============================
const Container = styled.View`
  flex: 1;
  padding: 8px;
  background-color: #f5f5f5;
`;
const Card = styled.View`
  background: #fff;
  border-radius: 8px;
  padding: 10px;
  margin-bottom: 10px;
  border-left-width: 6px;
  border-left-color: ${props => (props.synced ? '#2ecc71' : '#e67e22')};
  background-color: ${props => (props.synced ? '#f2fff6' : '#fff9f2')};
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
  font-weight: bold;
  color: ${props => (props.synced ? 'green' : 'red')};
  margin-top: 6px;
`;
const CreateButton = styled.TouchableOpacity`
  background-color: #3cb371;
  padding: 10px;
  border-radius: 6px;
  align-items: center;
  margin-bottom: 12px;
`;
const CreateText = styled.Text`
  color: #fff;
  font-weight: bold;
  font-size: 16px;
`;
const SectionTitle = styled.Text`
  font-size: 18px;
  font-weight: bold;
  color: #1f51fe;
  margin-bottom: 8px;
`;

// =============================
// 🔹 Função para formatar data
// =============================
const formatarData = dataISO => {
  if (!dataISO) return '–';
  try {
    const data = new Date(dataISO);
    if (isNaN(data)) return dataISO;

    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const ano = data.getFullYear();
    const hora = String(data.getHours()).padStart(2, '0');
    const min = String(data.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${ano} ${hora}:${min}`;
  } catch {
    return dataISO;
  }
};

// =============================
// 🔹 Filtro da semana atual
// =============================
const getWeekRange = () => {
  const hoje = new Date();
  const primeiroDia = new Date(hoje);
  const ultimoDia = new Date(hoje);

  // Domingo → primeiro dia da semana (ajuste se preferir segunda)
  primeiroDia.setDate(hoje.getDate() - hoje.getDay());
  ultimoDia.setDate(primeiroDia.getDate() + 6);

  primeiroDia.setHours(0, 0, 0, 0);
  ultimoDia.setHours(23, 59, 59, 999);

  return {
    start: primeiroDia.toISOString().slice(0, 19).replace('T', ' '),
    end: ultimoDia.toISOString().slice(0, 19).replace('T', ' ')
  };
};

// =============================
// 🔹 Principal
// =============================
export default function ChecklistServicosIndex() {
  const navigation = useNavigation();
  const route = useRoute();
  const { id_veiculo, id_obra, prefixo } = route.params || {};
  const { connectionMode } = useAuth();

  const modoOnline = connectionMode === 'online';
  const [servicos, setServicos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // =============================
  // 🔹 Buscar dados do SQLite
  // =============================
  const loadServicosOffline = async () => {
    const { start, end } = getWeekRange();

    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `
          SELECT 
            s.id,
            s.id_veiculo,
            s.id_obra,
            s.status,
            s.id_local,
            s.data_cadastro,
            s.sync_status,
            o.codigo_obra,
            v.prefixo
          FROM veiculo_checklist_itens_servicos s
          LEFT JOIN obras o ON o.id = s.id_obra
          LEFT JOIN veiculos v ON v.id = s.id_veiculo
          WHERE s.data_cadastro BETWEEN ? AND ?
          ORDER BY s.id DESC
          `,
          [start, end],
          (_, { rows }) => resolve(rows._array),
          (_, err) => reject(err)
        );
      });
    });
  };

  // =============================
  // 🔹 Carregar lista
  // =============================
  const fetchServicos = useCallback(async () => {
    setLoading(true);
    setErrors(null);
    try {
      // Força modo offline (não consulta API)
      const list = await loadServicosOffline();
      setServicos(list);

    } catch (err) {
      setErrors([err.message]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchServicos();
    }, [fetchServicos])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchServicos();
  }, [fetchServicos]);

  // =============================
  // 🔹 Interface
  // =============================
  return (
    <ScrollView
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      contentContainerStyle={{ flexGrow: 1 }}
    >
      <Container>
        <ErrorAlert errors={errors} />

        <SectionTitle>🧰 Checklist de Serviços</SectionTitle>

        <CreateButton
          onPress={() =>
            navigation.navigate('CreateChecklistServicos', {
              id_veiculo,
              id_obra,
              prefixo
            })
          }
        >
          <CreateText>Fazer Checklist</CreateText>
        </CreateButton>

        {loading && <ActivityIndicator size="large" color="green" style={{ marginVertical: 20 }} />}

        {!loading && !servicos.length && (
          <Text style={{ textAlign: 'center', color: '#555' }}>
            Nenhum checklist encontrado nesta semana.
          </Text>
        )}

        {!loading &&
          servicos.map(s => (
            <Card key={s.id} synced={s.sync_status === 1}>
              <Label>Serviço #{s.id}</Label>
              <Value>Veículo: {s.prefixo || prefixo || '–'}</Value>
              <Value>Obra: {s.codigo_obra || s.nome_obra || '–'}</Value>
              <Value>Data Cadastro: {formatarData(s.data_cadastro)}</Value>
              <Value>Status: {s.status || '–'}</Value>
            

              <SyncText synced={s.sync_status === 1}>
                {s.sync_status === 1
                  ? '✅ Checklist sincronizado'
                  : '⛔ Checklist salvo localmente' }
              </SyncText>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.btnAction}
                  onPress={() =>
                    navigation.navigate('ShowChecklistServicos', {
                      id_checklist: s.id_local,
                      prefixo: s.prefixo || prefixo,
                      codigoObra: s.codigo_obra || s.nome_obra
                    })
                  }
                >
                  <Text style={styles.btnText}>Detalhes</Text>
                </TouchableOpacity>

                {/* <TouchableOpacity
                      style={styles.btnEdit}
                      onPress={() =>
                        navigation.navigate('EditChecklistServicos', {
                          id: s.id_local,
                          prefixo,
                          codigo_obra: s.codigo_obra
                        })
                      }
                    >
                  <Text style={styles.btnText}>Editar</Text>
                </TouchableOpacity> */}
              </View>
            </Card>
          ))}
      </Container>
    </ScrollView>
  );
}

// =============================
// 🔹 Estilos adicionais
// =============================
const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8
  },
  btnAction: {
    backgroundColor: '#007bff',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginLeft: 8
  },
  btnEdit: {
    backgroundColor: 'orange',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginLeft: 8
  },
  btnText: {
    color: '#fff',
    fontWeight: 'bold'
  }
});
