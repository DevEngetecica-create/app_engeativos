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
import { db } from '../../../config/database/database';
import { useAuth } from '../../../contexts/auth';
import ErrorAlert from '../../../components/ErrorAlert';

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
  background-color: #1f51fe;
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
const TotalsBox = styled.View`
  background: #fff;
  border-radius: 8px;
  padding: 10px;
  margin-bottom: 12px;
  border-left-width: 6px;
  border-left-color: #1f51fe;
`;

// =============================
// 🔹 Helpers
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

const getWeekRange = () => {
  const hoje = new Date();
  const primeiroDia = new Date(hoje);
  const ultimoDia = new Date(hoje);
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
export default function AbastecimentoIndex() {
  const navigation = useNavigation();
  const route = useRoute();
  const { id_veiculo, id_obra, prefixo } = route.params || {};
  const { connectionMode } = useAuth();

  const [abastecimentos, setAbastecimentos] = useState([]);
  const [totais, setTotais] = useState({ totalGasto: 0, ultimaQtd: 0, ultimoValorLitro: 0 });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // =============================
  // 🔹 Buscar dados locais com JOIN
  // =============================
  const loadAbastecimentosOffline = async () => {
    const { start, end } = getWeekRange();

    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `
          SELECT 
            a.*,
            o.codigo_obra,
            v.prefixo,
            v.tipo
          FROM veiculo_abastecimentos a
          LEFT JOIN obras o ON o.id = a.id_obra
          LEFT JOIN veiculos v ON v.id = a.veiculo_id
          WHERE a.data_abastecimento BETWEEN ? AND ?
          ORDER BY a.id DESC
          `,
          [start, end],
          (_, { rows }) => resolve(rows._array),
          (_, err) => reject(err)
        );
      });
    });
  };

  // =============================
  // 🔹 Carregar lista + totais
  // =============================
  const fetchAbastecimentos = useCallback(async () => {
    setLoading(true);
    setErrors(null);
    try {
      const list = await loadAbastecimentosOffline();
      setAbastecimentos(list);

      if (list.length > 0) {
        const totalGasto = list.reduce((acc, i) => acc + (i.valor_total || 0), 0);
        const ultimaQtd = list[0].quantidade || 0;
        const ultimoValorLitro = list[0].valor_do_litro || 0;
        setTotais({ totalGasto, ultimaQtd, ultimoValorLitro });
      } else {
        setTotais({ totalGasto: 0, ultimaQtd: 0, ultimoValorLitro: 0 });
      }
    } catch (err) {
      setErrors([err.message]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchAbastecimentos(); }, [fetchAbastecimentos]));
  const onRefresh = useCallback(() => { setRefreshing(true); fetchAbastecimentos(); }, [fetchAbastecimentos]);

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

        <SectionTitle>⛽ Abastecimentos da Semana</SectionTitle>

        <CreateButton
          onPress={() =>
            navigation.navigate('VeiculoAbastFrotaCreate', {
              id_veiculo,
              id_obra,
              prefixo
            })
          }
        >
          <CreateText>Novo Abastecimento</CreateText>
        </CreateButton>

        {/* Totais */}
        <TotalsBox>
          <Label>Total Gasto:</Label>
          <Value>R$ {totais.totalGasto.toFixed(2)}</Value>

          <Label>Última Quantidade:</Label>
          <Value>{totais.ultimaQtd} L</Value>

          <Label>Último Valor/Litro:</Label>
          <Value>R$ {totais.ultimoValorLitro.toFixed(2)}</Value>
        </TotalsBox>

        {loading && <ActivityIndicator size="large" color="green" style={{ marginVertical: 20 }} />}

        {!loading && !abastecimentos.length && (
          <Text style={{ textAlign: 'center', color: '#555' }}>
            Nenhum abastecimento registrado nesta semana.
          </Text>
        )}

        {!loading &&
          abastecimentos.map(item => {
            const isMaquina = item.tipo == 4;

            return (
              <Card key={item.id} synced={item.sync_status === 1}>
                <Label>Registro #{item.id}</Label>
                <Value>Veículo: {item.prefixo || prefixo || '–'}</Value>
                <Value>Obra: {item.codigo_obra || item.nome_obra || '–'}</Value>
                <Value>Data: {formatarData(item.data_abastecimento)}</Value>

                {isMaquina ? (
                  <>
                    <Value>Horímetro Anterior: {item.hr_anterior || '–'}</Value>
                    <Value>Horímetro Atual: {item.hr_atual || '–'}</Value>
                  </>
                ) : (
                  <>
                    <Value>Hodômetro Anterior: {item.km_anterior || '–'}</Value>
                    <Value>Hodômetro Atual: {item.km_atual || '–'}</Value>
                  </>
                )}

                <Value>Combustível: {item.combustivel || '–'}</Value>
                <Value>Quantidade: {item.quantidade || 0} L</Value>
                <Value>Valor/Litro: R$ {Number(item.valor_do_litro || 0).toFixed(2)}</Value>
                <Value>Total: R$ {Number(item.valor_total || 0).toFixed(2)}</Value>

                <SyncText synced={item.sync_status === 1}>
                  {item.sync_status === 1
                    ? '✅ Abastecimento sincronizado'
                    : '⛔ Abastecimento salvo localmente'}
                </SyncText>

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.btnEdit}
                    onPress={() =>
                      navigation.navigate('VeiculoAbastFrotaEdit', {
                        id: item.id,
                        prefixo,
                        codigo_obra: item.codigo_obra
                      })
                    }
                  >
                    <Text style={styles.btnText}>Editar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.btnAction}
                    onPress={() =>
                      navigation.navigate('VeiculoAbastFrotaShow', {
                        id: item.id,
                        prefixo: item.prefixo,
                        codigoObra: item.codigo_obra
                      })
                    }
                  >
                    <Text style={styles.btnText}>Detalhes</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            );
          })}
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
