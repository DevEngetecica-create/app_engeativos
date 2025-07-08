// src/pages/Veiculos/ChecklistFrota/Servicos/index.js

import React, { useCallback, useState, useEffect } from 'react';
import {
  Alert,
  ScrollView,
  View,
  StyleSheet,
  Text,
  ActivityIndicator,
  TouchableOpacity
} from 'react-native';
import { useRoute, useFocusEffect, useNavigation } from '@react-navigation/native';
import styled from 'styled-components/native';
import api from '../../../../config/api';
import ErrorAlert from '../../../../components/ErrorAlert';
import Paginate from '../../../../components/Paginate';

// src/config/database/dataBaseSave.js
import { db } from '../../../..//config/database/database';

const Container = styled.View`
  flex: 1;
  padding: 16px;
  background-color: #f5f5f5;
`;
const TotalText = styled.Text`
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 12px;
`;
const CreateButton = styled.TouchableOpacity`
  background-color: #3CB371;
  padding: 7px;
  border-radius: 6px;
  align-self: flex-start;
  margin-bottom: 14px;
`;
const CreateText = styled.Text`
  color: #fff;
  font-weight: bold;
  font-size: 16px;
  text-align: center;
  min-width: 150px;
`;

const Card = styled.View`
  background: #fff;  
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
`;
const Label = styled.Text`
  font-weight: bold;
  color: #333;
  margin-bottom: 4px;
`;
const Value = styled.Text`
  color: #555;
  margin-bottom: 4px;
`;

const Linha = styled.Text`width:100%; background-color:green;  height: 1px; margin-bottom: 25px`;

export default function ChecklistRealizados() {
  const navigation = useNavigation();
  const route = useRoute();
  const { id, periodo, id_veiculo, id_obra, prefixo, codigo_obra } = route.params || {};

  const [errors, setErrors] = useState(null);
  const [servicos, setServicos] = useState([]);
  const [codigoObra, setCodigoObra] = useState(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);


  const getServicos = async (page = 1) => {
    setLoading(true);
    setErrors(null);

    try {
      setServicos([]);

      /* const { data } = await api.get(`admin/ativo/veiculo/checklist/servicos/${id}`, {
        params: { periodo, page }
      }); */

      const list = Array.isArray(data.servicos) ? data.servicos : [];

      setServicos(list);
      setTotal(data.total_servicos ?? list.length);
      setCurrentPage(page);
      setLastPage(data.last_page ?? 1);
      setCodigoObra(list[0]?.veiculo?.obra?.codigo_obra ?? '');

    } catch (err) {
      const apiErrs = err.response?.data?.erros || err.response?.data?.errors;

      if (apiErrs) {
        setErrors(apiErrs);
      } else {
        // Sem internet: tentar carregar local
        try {
          const localServicos = await loadServicosOffline(id);
          setServicos(localServicos);
          setTotal(localServicos.length);
          setCurrentPage(1);
          setLastPage(1);
          setCodigoObra('Local');

          Alert.alert('Modo Offline', 'Dados carregados do dispositivo.');
        } catch (e) {
          Alert.alert('Erro Offline', 'Falha ao carregar dados locais.');
        }
      }
    } finally {
      setLoading(false);
    }
  };


  const loadServicosOffline = async (id_checklist) => {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT r.id as id, r.id_checklist_itens, r.data_cadastro, 
                r.status, r.observacao, s.id_obra, s.periodo, s.id_veiculo
         FROM veiculo_checklist_realizados r
         JOIN veiculo_checklist_servicos s ON r.id_servico_local = s.id
         WHERE s.id_checklist = ?
         ORDER BY r.id DESC`,
          [id_checklist],
          (_, { rows }) => resolve(rows._array),
          (_, err) => reject(err)
        );
      });
    });
    
  };

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const run = async () => {
        if (isActive) await getServicos(1);
      };

      run();

      return () => {
        isActive = false;
      };
    }, [id])
  );

  const handlePageChange = (page) => {
    getServicos(page);
  };

  const confirmDelete = (svcId) => {
    Alert.alert(
      'Confirmação',
      'Deseja realmente excluir este serviço?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`admin/ativo/veiculo/checklist/servicos/delete/${svcId}`);
              getServicos(currentPage);
            } catch (e) {
              Alert.alert('Erro', 'Não foi possível excluir.');
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <Container>
        <ErrorAlert errors={errors} />

        <CreateButton
          onPress={() =>
            navigation.navigate('CreateChecklistServicos', {
              id,
              periodo,
              id_veiculo,
              id_obra,
              prefixo,
              codigoObra
            })
          }
        >
          <CreateText>Fazer Checklist</CreateText>
        </CreateButton>

        <TotalText>Total de serviços realizados: {total}</TotalText>
        {loading && <ActivityIndicator style={{ marginVertical: 20 }} />}

        {!loading && !servicos.length && (
          <Text>Nenhum serviço encontrado nesta página.</Text>
        )}

        {!loading && servicos.map(svc => (
          <Card key={svc.id}>

            <Linha />

            <Label>Serviço #{svc.id}</Label>
            <Value>Item Checklist: {svc.id_checklist_itens}</Value>
            <Value>Obra: {codigoObra}</Value>
            <Value>Veiculo: {prefixo}</Value>
            <Value>Data cadastro: {svc.data_cadastro}</Value>
            <Value>Criado em: {new Date(svc.created_at).toLocaleString()} </Value>

            {/* Verifica se veio do backend (online) */}
            {/*  {svc.user_create && <Value>Usuário: {svc.user_create}</Value>}
            <Value>Data cadastro: {svc.data_cadastro}</Value>
            {svc.created_at && (
              <Value>Criado em: {new Date(svc.created_at).toLocaleString()}</Value>
            )} */}

            {/* AÇÕES */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.btnAction}
                onPress={() =>
                  navigation.navigate('ShowChecklistServicos', { id_checklist: svc.id })
                }
              >
                <Text style={styles.btnText}>Detalhes</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.btnEdit}
                onPress={() =>
                  navigation.navigate('EditChecklistServicos', { id: svc.id, prefixo, codigo_obra })
                }
              >
                <Text style={styles.btnText}>Editar</Text>
              </TouchableOpacity>
            </View>
          </Card>
        ))}

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
  btnDelete: {
    backgroundColor: '#e53935',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginLeft: 8
  },
  btnText: {
    color: '#fff',
    fontWeight: 'bold'
  },
  paginate: {
    marginVertical: 16
  }
});
