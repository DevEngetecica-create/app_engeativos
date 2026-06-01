// src/pages/Veiculos/Show.js
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  RefreshControl,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import styled from 'styled-components/native';
import Toast from 'react-native-root-toast';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import api from '../../config/api';
import Loading from '../../components/Loading';
import ErrorAlert from '../../components/ErrorAlert';
import { initDatabase, db } from '../../config/database/database';
import { useAuth } from '../../contexts/auth';

// =============================
// 🔹 Styled Components
// =============================
const Container = styled.View`
  flex: 1;
  padding: 16px;
  background-color: #f8f9fa;
`;

const Section = styled.View`
  margin-bottom: 24px;
  background: #fff;
  border-radius: 12px;
  padding: 14px;
  elevation: 2;
  shadow-color: #000;
  shadow-opacity: 0.1;
  shadow-radius: 4px;
  shadow-offset: 0px 2px;
`;

const SectionTitle = styled.Text`
  font-weight: bold;
  font-size: 18px;
  margin-bottom: 12px;
  color: #0057a3;
  text-align: center;
`;

const FieldRow = styled.View`
  flex-direction: row;
  margin-bottom: 6px;
`;

const Label = styled.Text`
  font-weight: bold;
  width: 120px;
  color: #333;
`;

const Value = styled.Text`
  flex: 1;
  color: #555;
`;

const CardImage = styled.Image`
  width: 100%;
  height: 220px;
  border-radius: 8px;
  margin-bottom: 12px;
`;

// =============================
// 🔹 Animated Button
// =============================
const AnimatedButton = ({ children, onPress, style }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start(() => onPress && onPress());
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={style}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

// =============================
// 🔹 Principal
// =============================
export default function VeiculoShow() {
  const route = useRoute();
  const navigation = useNavigation();
  const { id } = route.params;
  const { id_veiculo } = id ? { id_veiculo: id } : {};
  const { connectionMode } = useAuth();
  const modoOnline = connectionMode === 'online';

  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [temAbastecimento, setTemAbastecimento] = useState(false); // 🔹 novo state

  useEffect(() => {
    initDatabase();
  }, []);

  const fetchDetailsOffline = useCallback(() => {
    return new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          `SELECT * FROM veiculos WHERE id = ?;`,
          [id],
          (_, { rows }) => {
            if (rows._array.length) {
              const row = rows._array[0];
              resolve({ status: true, veiculo: row });
            } else {
              reject(new Error('Nenhum registro local encontrado.'));
            }
          },
          (_, err) => reject(err)
        );
      });
    });
  }, [id]);

  // 🔹 Checa se existe algum abastecimento
  const verificarAbastecimentos = useCallback(async () => {
    if (modoOnline) {
      try {
        const { data } = await api.get(`app/veiculo/${id_veiculo}/abastecimentos/count`);
        setTemAbastecimento((data.count ?? 0) > 0);
      } catch (err) {
        console.warn('⚠️ Erro ao verificar abastecimentos online:', err.message);
        setTemAbastecimento(false);
      }
    } else {
      db.transaction((tx) => {
        tx.executeSql(
          `SELECT COUNT(*) as total FROM veiculo_abastecimentos WHERE veiculo_id = ?;`,
          [id_veiculo],
          (_, { rows }) => setTemAbastecimento(rows._array[0]?.total > 0),
          (_, err) => {
            console.warn('Erro ao contar abastecimentos offline:', err.message);
            return false;
          }
        );
      });
    }
  }, [modoOnline, id_veiculo]);

  const fetchDetails = useCallback(async () => {
    setLoading(true);
    setErrors(null);
    try {
      let result;
      if (modoOnline) {
        try {
          Toast.show('🟢 Carregando online...', { duration: 1000 });
          const { data } = await api.get(`admin/ativo/veiculo/show/${id_veiculo}`);
          if (data.status) result = data;
          else throw new Error(data.message);
        } catch {
          result = await fetchDetailsOffline();
        }
      } else {
        Toast.show('🔴 Carregando offline...', { duration: 1500 });
        result = await fetchDetailsOffline();
      }

      setDetails(result);
      await verificarAbastecimentos(); // 🔹 verifica após carregar o veículo
    } catch (err) {
      setErrors([err.message]);
    } finally {
      setLoading(false);
    }
  }, [id, modoOnline, fetchDetailsOffline, verificarAbastecimentos]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDetails();
    setRefreshing(false);
  }, [fetchDetails]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  if (loading && !refreshing) return <Loading />;

  if (!details) {
    return (
      <Container>
        <Text>Nenhum detalhe disponível.</Text>
      </Container>
    );
  }

  const veiculo = details.veiculo;
  const icon = veiculo?.tipo == 4 ? '🚜' : '🚛';

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Container>
        <ErrorAlert errors={errors} />

        {/* Foto + Dados */}
        <Section>
          <CardImage
            source={
              veiculo?.imagem
                ? { uri: `https://sga-engeativos.com.br/imagens/veiculos/${id_veiculo}/${veiculo.imagem}` }
                : require('../../../assets/no-photos.png')
            }
            resizeMode="cover"
          />
          <SectionTitle>{`${icon} Dados do Veículo`}</SectionTitle>
          <FieldRow><Label>Prefixo:</Label><Value>{veiculo.prefixo}</Value></FieldRow>
          <FieldRow><Label>Placa / Série:</Label><Value>{veiculo.placa ?? veiculo.nun_serie_chassi ?? '-'}</Value></FieldRow>
          <FieldRow><Label>Marca:</Label><Value>{veiculo.marca ?? '-'}</Value></FieldRow>
          <FieldRow><Label>Modelo:</Label><Value>{veiculo.modelo ?? '-'}</Value></FieldRow>
        </Section>

        {/* Serviços disponíveis */}
        <Section>
          <SectionTitle>Serviços</SectionTitle>

          <View style={styles.servicesRow}>
            <AnimatedButton
              style={[styles.serviceButton, { borderTopColor: '#0057a3' }]}
              onPress={() =>
                navigation.navigate('ChecklistServicos', {
                  id_veiculo,
                  prefixo: veiculo.prefixo,
                })
              }>
              <FontAwesome5 name="clipboard-check" size={28} color="#0057a3" />
              <Text style={styles.serviceText}>Checklist</Text>
            </AnimatedButton>

            {/* 🔹 Só renderiza se tiver abastecimento */}
            {temAbastecimento && (
              <AnimatedButton
                style={[styles.serviceButton, { borderTopColor: '#e67e22' }]}
                onPress={() =>
                  navigation.navigate('VeiculoAbastFrota', {
                    id_veiculo,
                    prefixo: veiculo.prefixo,
                    id_obra: veiculo.obra_id,
                  })
                }>
                <MaterialIcons name="local-gas-station" size={30} color="#e67e22" />
                <Text style={styles.serviceText}>Abastecimento</Text>
              </AnimatedButton>
            )}

            <AnimatedButton
              style={[styles.serviceButton, { borderTopColor: '#2ecc71' }]}
              onPress={() =>
                navigation.navigate('VeiculosDiarioBordo', {
                  id_veiculo: id_veiculo,
                  prefixo: veiculo.prefixo,
                  id_obra: veiculo.obra_id,
                })
              }>
              <FontAwesome5 name="book" size={28} color="#2ecc71" />
              <Text style={styles.serviceText}>Diário</Text>
            </AnimatedButton>
          </View>
        </Section>
      </Container>
    </ScrollView>
  );
}

// =============================
// 🔹 Estilos
// =============================
const styles = StyleSheet.create({
  servicesRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'stretch',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  serviceButton: {
    width: 105,
    height: 105,
    backgroundColor: '#fff',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginHorizontal: 6,
    marginVertical: 6,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    borderTopWidth: 4,
  },
  serviceText: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
});
