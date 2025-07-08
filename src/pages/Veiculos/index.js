import React, { useCallback, useState, useRef } from 'react';
import { ScrollView, TextInput, View, StyleSheet, RefreshControl } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import styled from 'styled-components/native';
import axios from 'axios';

import ErrorAlert from '../../components/ErrorAlert';
import Loading from '../../components/Loading';
import Paginate from '../../components/Paginate';
import api from '../../config/api';
import Toast from 'react-native-root-toast';
import { db } from '../../config/database/database';
import useDebounce from '../../config/hooks/useDebounce';
import { useNetwork } from '../../contexts/network';

const Container = styled.View`
  flex: 1;
  padding: 16px;
  background-color: #f5f5f5;
`;
const StatusBadge = styled.View`
  padding: 6px 12px;
  background-color: ${({ online }) => (online ? '#2ecc71' : '#e67e22')};
  border-radius: 4px;
  align-self: center;
  margin-bottom: 12px;
`;
const StatusText = styled.Text`
  color: #fff;
  font-weight: bold;
`;
const TotalText = styled.Text`
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 12px;
`;
const Card = styled.TouchableOpacity`
  background: #fff;
  border-radius: 8px;
  flex-direction: row;
  padding: 12px;
  margin-bottom: 12px;
  align-items: center;
  height: 100px;
`;
const CardImage = styled.Image`
  width: 90px;
  height: 70px;
  border-radius: 4px;
  margin-right: 12px;
`;
const Info = styled.View`
  flex: 1;
  justify-content: space-around;
`;
const Row = styled.View`
  flex-direction: row;
  align-items: center;
`;
const Bar = styled.View`
  width: 3px;
  height: 20px;
  background: #e67e22;
  margin-right: 8px;
`;
const Label = styled.Text`
  font-weight: bold;
  color: #333;
`;
const Value = styled.Text`
  margin-left: 4px;
  color: #555;
`;

export default function Veiculos() {

  const navigation = useNavigation();
  const { networkStatus: isOffline } = useNetwork();
  const modoOnline = !isOffline;

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [state, setState] = useState({
    loading: false,
    error: null,
    veiculos: [],
    count: 0,
    currentPage: 1,
    lastPage: 1,
  });
  const [refreshing, setRefreshing] = useState(false);

  const cancelSource = useRef(null);
  const baseImageUrl = 'https://sga-engeativos.com.br/imagens/veiculos';

  const fetchOnline = useCallback(async (page, prefixo) => {
    if (cancelSource.current) cancelSource.current.cancel();
    cancelSource.current = axios.CancelToken.source();
    Toast.show('🔵 Carregando online...', { duration: 1000 });
    const resp = await api.get('admin/ativo/veiculo', {
      params: { page, prefixo },
      cancelToken: cancelSource.current.token,
    });
    const pag = resp.data.veiculos;
    return {
      veiculos: Array.isArray(pag.data) ? pag.data : [],
      count: resp.data.count_veiculos_list,
      currentPage: pag.current_page,
      lastPage: pag.last_page,
    };
    
  }, []);

  const fetchOffline = useCallback(async (prefixo) => {
    Toast.show('🔴 Modo off-line, carregando SQLite...', { duration: 2000 });
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT * FROM veiculos WHERE prefixo LIKE ? ORDER BY prefixo ASC;`,
          [`%${prefixo}%`],
          (_, { rows }) => resolve({ veiculos: rows._array, count: rows._array.length, currentPage: 1, lastPage: 1 }),
          (_, error) => { reject(error); return false; }
        );
      });
    });
  }, []);

  const loadVeiculos = useCallback(async (page = 1, prefixo = '') => {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      let result;
      if (modoOnline) {
        try {
          result = await fetchOnline(page, prefixo);
        } catch (err) {
          result = await fetchOffline(prefixo);
        }
      } else {
        result = await fetchOffline(prefixo);
      }
      setState({ loading: false, error: null, ...result });
    } catch (error) {
      setState(s => ({ ...s, loading: false, error }));
    }
  }, [modoOnline, fetchOnline, fetchOffline]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadVeiculos(1, debouncedSearch);
    setRefreshing(false);
  }, [debouncedSearch, loadVeiculos]);

  useFocusEffect(useCallback(() => {
    loadVeiculos(1, debouncedSearch);
  }, [debouncedSearch, modoOnline]));

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Container>
        <ErrorAlert errors={state.error} />
        <StatusBadge online={modoOnline}>
          <StatusText>{modoOnline ? '🔵 Online' : '🔴 Offline'}</StatusText>
        </StatusBadge>

        <TextInput
          style={styles.searchInput}
          placeholder="Pesquisar prefixo..."
          value={search}
          onChangeText={setSearch}
        />

        <TotalText>Total de veículos: {state.count}</TotalText>

        {state.loading && <Loading />}

        {!state.loading && state.veiculos.map(v => (
          <Card
            key={v.id}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('VeiculosDetalhes', { id: v.id })}
          >
            <CardImage
              source={
                v.imagem
                  ? { uri: `${baseImageUrl}/${v.id}/${v.imagem}` }
                  : require('../../../assets/no-photos.png')
              }
              resizeMode="cover"
            />
            <Info>
              <Row><Bar/><Label>Prefixo:</Label><Value>{v.prefixo}</Value></Row>
              <Row><Bar/><Label>Placa / Série:</Label><Value>{v.placa ?? v.nun_serie_chassi}</Value></Row>
              <Row><Bar/><Label>Marca:</Label><Value>{v.marca}</Value></Row>
            </Info>
          </Card>
        ))}

        {!state.loading && state.veiculos.length === 0 && (
          <TotalText>Nenhum veículo encontrado.</TotalText>
        )}

        <View style={styles.paginate}>
          <Paginate
            currentPage={state.currentPage}
            lastPage={state.lastPage}
            onPageChange={page => loadVeiculos(page, debouncedSearch)}
          />
        </View>
      </Container>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  searchInput: { height: 50, borderRadius: 5, paddingHorizontal: 10, marginBottom: 12, backgroundColor: '#fff' },
  paginate: { marginVertical: 16 },
});
