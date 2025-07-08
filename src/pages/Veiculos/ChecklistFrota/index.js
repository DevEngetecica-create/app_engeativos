// src/pages/Checklist/index.js

import React, { useCallback, useState } from 'react';
import {
  Alert,
  ScrollView,
  TextInput,
  View,
  StyleSheet,
  TouchableOpacity,
  Text
} from 'react-native';
import { useRoute, useFocusEffect, useNavigation } from '@react-navigation/native';
import styled from 'styled-components/native';

import ErrorAlert from '../../../components/ErrorAlert';
import Loading from '../../../components/Loading';
import Paginate from '../../../components/Paginate';
import api from '../../../config/api';

const Container = styled.View`flex:1; padding:16px; background-color:#f5f5f5;`;
const TotalText = styled.Text`font-size:18px; font-weight:bold; margin-bottom:12px;`;
const Card = styled.View`background:#fff; border-left:1px solid #3CB371; border-radius:8px; padding:12px; margin-bottom:12px;`;
const PeriodButton = styled.TouchableOpacity`background-color: #e67e22; padding-vertical: 10px; padding-horizontal: 16px; border-radius: 5px; align-self: flex-start;`;
const PeriodText = styled.Text`color: #fff; font-weight: bold; font-size: 16px;`;
const Linha = styled.Text`flex-direction: row;
  align-items: center;
  margin-bottom: 8px;
  padding-left: 8px;
  border-left-width: 4px;
  border-left-color: orange;`;

export default function Checklist() {
  const navigation = useNavigation();
  const route = useRoute();
  const { id, id_obra } = route.params;

  const [errors, setErrors] = useState(null);
  const [checklist, setChecklist] = useState([]);
  const [codigoObra, setCodigoObra] = useState([]);
  const [countChecklist, setCountChecklist] = useState(0);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [search, setSearch] = useState('');

  const getChecklist = async (page = 1, filtro = '') => {
    
    setLoading(true);
    setErrors(null);

    try { const { data } = await api.get(`admin/ativo/veiculo/checklist/${id}`, { params: { page, prefixo: filtro } });

      const pag = data.checklist;
      const list = Array.isArray(pag.data) ? pag.data : [];
      const primeiraObra = list[0]?.veiculo?.obra ?? '';

      console.log(primeiraObra)

      setCodigoObra(primeiraObra);

      setChecklist(list);
      setCountChecklist(data.count_checklist_list);
      setCurrentPage(pag.current_page);
      setLastPage(pag.last_page);

    } catch (err) {

      const apiErrs = err.response?.data?.erros || err.response?.data?.errors;
      if (apiErrs) setErrors(apiErrs);
      else Alert.alert('Ops', err.message || 'Não foi possível carregar.');

    } finally {

      setLoading(false);
      
    }

  };

  useFocusEffect(
    useCallback(() => {
      getChecklist(1, search);
    }, [search])
  );

  const handlePageChange = (page) => {
    getChecklist(page, search);
  };

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <Container>
        <ErrorAlert errors={errors} />

        <TotalText>Total de checklist: {countChecklist}</TotalText>
        {loading && <Loading />}

        {!loading && checklist.map(item => (
          <Card key={item.periodo_maq_vei}>
            
            <PeriodButton
              activeOpacity={0.8}
              onPress={() =>
                navigation.navigate('ChecklistServicos', {
                  id: item.id_checklist,
                  periodo: item.periodo_maq_vei,  // Mude de 'texte' para 'periodo' para bater com o esperado
                  id_veiculo: item.id_veiculo,
                  id_obra: id_obra,
                  codigo_obra: codigoObra.codigo_obra,
                  prefixo: item.veiculo.prefixo,
                })
              }
            >
              <PeriodText>
                {item.periodo_maq_vei}{' '}
                {item.veiculo?.tipo === 4 ? 'hr' : 'km'}
              </PeriodText>
            </PeriodButton>
          </Card>
        ))}

        {!loading && checklist.length === 0 && (
          <TotalText>Nenhum checklist encontrado.</TotalText>
        )}

        {/* Paginação */}
        <View style={styles.paginate}>
          <Paginate
            currentPage={currentPage}
            lastPage={lastPage}
            onPageChange={handlePageChange}
          />
        </View>
      </Container>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  searchInput: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  paginate: {
    marginVertical: 16,
  },
});
