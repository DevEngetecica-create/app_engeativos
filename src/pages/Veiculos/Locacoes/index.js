// src/pages/Locacao/index.js

import React, { useState, useCallback } from 'react';
import {
  ScrollView,
  View,
  Text,
  Alert,
  StyleSheet,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../../config/api';
import { useAuth } from '../../../contexts/auth';
import Loading from '../../../components/Loading';
import ErrorAlert from '../../../components/ErrorAlert';

export default function Locacao() {
  const navigation = useNavigation();
  const { signOut } = useAuth();

  const [locacoes, setLocacoes]             = useState([]);
  const [count, setCount]                   = useState(0);
  const [quilometragem, setQuilometragem]   = useState(null);
  const [loading, setLoading]               = useState(false);
  const [errors, setErrors]                 = useState(null);

  const fetchLocacoes = useCallback(async () => {
    setLoading(true);
    setErrors(null);

    try {
      // rota autenticada com token e header já foram configurados no AuthContext
      const { data } = await api.get('admin/ativo/veiculo/locacaoVeiculos');

      if (data.status) {
        setLocacoes(data.veiculos);
        setCount(data.count_veiculos_list);
        setQuilometragem(data.quilometragem);
      } else {
        setErrors([data.message || 'Falha ao carregar dados']);
      }
    } catch (err) {
      if (err.response?.status === 401) {
        Alert.alert('Sessão expirada', 'Faça login novamente.');
        signOut();
        return;
      }
      Alert.alert('Ops', 'Não foi possível carregar as locações.');
    } finally {
      setLoading(false);
    }
  }, [signOut]);

  useFocusEffect(fetchLocacoes);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ErrorAlert errors={errors} />

      <Text style={styles.headerText}>Total de veículos: {count}</Text>

      {quilometragem && (
        <Text style={styles.subHeaderText}>
          Quilometragem veículo #51: {quilometragem.km_inicial ?? quilometragem.km ?? '-'}
        </Text>
      )}

      {loading && <Loading />}

      {!loading && locacoes.map(item => (
        <View key={item.id} style={styles.card}>
          <Text style={styles.cardTitle}>
            {item.veiculo.prefixo} — {item.veiculo.modelo}
          </Text>
          <Text>Origem: {item.obraOrigem.razao_social}</Text>
          <Text>Destino: {item.obraDestino.razao_social}</Text>
          <Text>Manutenções: {item.manutencoes.length}</Text>
          <Text>
            Km inicial: {item.veiculo.km_inicial} | Km final: {item.veiculo.km_final}
          </Text>
          <Text
            style={styles.link}
            onPress={() => navigation.navigate('ChecklistFrota', { id: item.id })}
          >
            Ver checklist
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subHeaderText: {
    fontSize: 14,
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
  },
  cardTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  link: {
    marginTop: 8,
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
});
