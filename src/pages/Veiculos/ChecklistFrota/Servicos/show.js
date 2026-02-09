import React, { useState, useCallback } from 'react';
import {
  ScrollView,
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Modal,
  TouchableOpacity,
  Image
} from 'react-native';
import { useRoute, useFocusEffect, useNavigation } from '@react-navigation/native';
import styled from 'styled-components/native';
import { db } from '../../../../config/database/database';
import { useAuth } from '../../../../contexts/auth';
import ErrorAlert from '../../../../components/ErrorAlert';
import api from '../../../../config/api';

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
  elevation: 2;
  padding: 10px;
  margin-bottom: 10px;
  border-left-width: 6px;
  border-left-color: ${props => (props.offline ? '#e67e22' : '#3cb371')};
  background-color: ${props => (props.offline ? '#fff9f2' : '#f4f9ff')};
`;
const Label = styled.Text`
  font-weight: bold;
  color: #333;
`;
const Value = styled.Text`
  color: #000;
  margin-bottom: 6px;
`;
const SyncText = styled.Text`
  font-weight: bold;
  color: ${props => (props.synced ? 'green' : 'red')};
  margin-top: 6px;
`;
const SectionTitle = styled.Text`
  font-size: 18px;
  font-weight: bold;
  color: #1f51fe;
  margin-top: 14px;
  margin-bottom: 8px;
`;
const Btn = styled.TouchableOpacity`
  background-color: ${props => props.color || '#3cb371'};
  padding: 12px;
  border-radius: 6px;
  align-items: center;
  margin-top: 12px;
`;
const BtnText = styled.Text`
  color: #fff;
  font-weight: bold;
`;
const PhotoThumb = styled.Image`
  width: 100%;
  height: 200px;
  border-radius: 8px;
  margin-top: 8px;
`;

// =============================
// 🔹 Função auxiliar para formatar data
// =============================
const formatarData = dataISO => {
  if (!dataISO) return '–';
  try {
    const data = new Date(dataISO);
    if (isNaN(data)) return dataISO; // caso venha no formato texto já formatado

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
// 🔹 Principal
// =============================
export default function ShowChecklistServicos() {
  const navigation = useNavigation();
  const { id_checklist, prefixo, codigoObra } = useRoute().params;
  const { connectionMode } = useAuth();
  const modoOnline = connectionMode === 'online';


  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errors, setErrors] = useState(null);
  const [master, setMaster] = useState(null);
  const [items, setItems] = useState([]);
  const [modalImage, setModalImage] = useState(null);

  // =============================
  // 🔹 Carregar dados offline (com JOINs)
  // =============================
  const loadOffline = id =>
    new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `
          SELECT 
            r.*, 
            s.id_obra,
            s.data_cadastro AS data_servico,
            o.codigo_obra,
            checklist_itens.nome_servico AS servico_checklist
          FROM veiculo_checklist_itens_realizados r
          LEFT JOIN veiculo_checklist_itens_servicos s ON r.id_checklist_realizado = s.id
          LEFT JOIN veiculo_checklist_itens checklist_itens ON r.id_checklist_itens = checklist_itens.id
          LEFT JOIN obras o ON o.id = s.id_obra
          WHERE r.id_checklist_realizado = ?
          `,
          [id],
          (_, { rows }) => resolve(rows._array),
          (_, err) => reject(err)
        );
      });
    });

  // =============================
  // 🔹 Buscar dados
  // =============================
  const fetchChecklist = useCallback(async () => {
    setLoading(true);
    setErrors(null);


    try {
      let masterData = {};
      let itens = [];

      if (modoOnline) {
        try {
          const { data } = await api.get(`admin/ativo/veiculo/checklist/servicos/show/${id_checklist}`);
          masterData = data.checklists || data;
          itens = data.checklists_itens || [];
        } catch (err) {
          console.warn('⚠️ Falha online, carregando offline...');
          itens = await loadOffline(id_checklist);
          if (itens.length) {
            const primeira = itens[0];
            masterData = {
              id: id_checklist,
              offline: true,
              data_cadastro: primeira.data_servico,
              codigo_obra: primeira.codigo_obra || primeira.nome_obra || '–'
            };
          } else {
            masterData = { id: id_checklist, offline: true };
          }
        }
      } else {
        itens = await loadOffline(id_checklist);
        if (itens.length) {
          const primeira = itens[0];
          masterData = {
            id: id_checklist,
            offline: true,
            data_cadastro: primeira.data_servico,
            codigo_obra: primeira.codigo_obra || primeira.nome_obra || '–'
          };
        } else {
          masterData = { id: id_checklist, offline: true };
        }
      }
      setMaster(masterData);
      setItems(itens);
    } catch (err) {
      console.error(err);
      setErrors([err.message]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id_checklist, modoOnline]);

  useFocusEffect(useCallback(() => { fetchChecklist(); }, [fetchChecklist]));

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchChecklist();
  }, [fetchChecklist]);

  // =============================
  // 🔹 Interface
  // =============================
  if (loading && !master) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="green" />
      </View>
    );
  }

  return (
    <>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <Container>
          <ErrorAlert errors={errors} />

          <SectionTitle>📋 Informações do Checklist</SectionTitle>
          {master ? (
            <Card offline={master.offline}>               
              <Value>Veículo: {prefixo || '–'}</Value>
              <Value>Obra: {master.codigo_obra || codigoObra || '–'}</Value>
              <Value>Data Cadastro: {formatarData(master.data_cadastro)}</Value>
              <SyncText synced={!master.offline}>
                {master.offline
                  ? '⛔ Checklist salvo localmente (aguardando sincronização)'
                  : '✅ Checklist sincronizado com servidor'}
              </SyncText>
            </Card>
          ) : (
            <Text>Nenhum dado encontrado.</Text>
          )}

          <SectionTitle>🧾 Itens Verificados</SectionTitle>
          {items.length === 0 ? (
            <Text>Nenhum item registrado.</Text>
          ) : (
            items.map(it => (
              <Card key={it.id} offline={!!master.offline}>
                <Label>Item:</Label>
                <Value>
                  {it.servico_checklist || '–'}
                </Value>
                <Label>Situação:</Label>
                <Value>{it.status || '–'}</Value>
                <Label>Observação:</Label>
                <Value>{it.observacao || '–'}</Value>
                <Label>Data Cadastro:</Label>
                <Value>{formatarData(it.data_cadastro)}</Value>

                {/* Foto se houver */}
                {it.arquivo_app && (
                  <TouchableOpacity
                    onPress={() =>
                      setModalImage(
                        modoOnline
                          ? `https://sga-engeativos.com.br/imagens/checklists/${id_checklist}/${it.arquivo_app}`
                          : `file://${it.arquivo_app}`
                      )
                    }
                  >
                    <PhotoThumb
                      source={{
                        uri: modoOnline
                          ? `https://sga-engeativos.com.br/imagens/checklists/${id_checklist}/${it.arquivo_app}`
                          : `file://${it.arquivo_app}`
                      }}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                )}
              </Card>
            ))
          )}

          <Btn color="#1f51fe" onPress={() => navigation.goBack()}>
            <BtnText>Voltar</BtnText>
          </Btn>
        </Container>
      </ScrollView>

      {/* Modal imagem fullscreen */}
      <Modal visible={!!modalImage} transparent>
        <View style={styles.modalBg}>
          <TouchableOpacity style={styles.modalClose} onPress={() => setModalImage(null)}>
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Fechar</Text>
          </TouchableOpacity>
          <Image source={{ uri: modalImage }} style={styles.modalImage} resizeMode="contain" />
        </View>
      </Modal>
    </>
  );
}

// =============================
// 🔹 Estilos adicionais
// =============================
const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: { width: '95%', height: '80%', borderRadius: 12 },
  modalClose: {
    position: 'absolute',
    top: 40,
    right: 20,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 6,
  },
});
