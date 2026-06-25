// src/pages/Veiculos/ChecklistFrota/Servicos/EditChecklistRealizadosAccordion.js

import React, { useCallback, useState } from 'react';
import {
  Alert,
  ScrollView,
  View,
  Text,
  ActivityIndicator,
  Image,
  StyleSheet,
  Platform,
  RefreshControl,
} from 'react-native';
import { useRoute, useFocusEffect, useNavigation } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import styled from 'styled-components/native';

import ErrorAlert from '../../../../components/ErrorAlert';
import { db } from '../../../../config/database/database';
import { showToast } from '../../../../utils/toast';
import { nowLocalTimestamp, nowLocalDMYHM } from '../../../../utils/datetime';

const BASE_FS = 16;
const INC = 1.2;

const Container = styled.View`
  flex: 1;
  padding: 8px;
  background: #f5f5f5;
`;
const Card = styled.View`
  background-color: #fff;
  padding: 12px;
  margin-bottom: 10px;
  border-radius: 8px;
  elevation: 2;
`;
const HeaderCard = styled.TouchableOpacity`
  background: #fff;
  border: 1px solid #e67e22;
  border-radius: 7px;
  padding: 10px;
  margin-bottom: 6px;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;
const CardTitle = styled.Text`
  font-size: ${Math.round(16 * INC)}px;
  font-weight: bold;
  color: #333;
`;
const FormView = styled.View`
  background: #fff;
  border: 1px solid #e67e22;
  border-top-width: 0;
  border-radius: 0 0 8px 8px;
  padding: 12px;
  margin-bottom: 12px;
`;
const Label = styled.Text`
  font-weight: bold;
  margin-bottom: 4px;
  color: #333;
  font-size: ${Math.round(BASE_FS * INC)}px;
`;
const Input = styled.TextInput`
  border: 1px solid ${props => (props.error ? '#d9534f' : '#ccc')};
  border-radius: 6px;
  padding: ${Platform.OS === 'ios' ? '10px' : '10px'};
  margin-bottom: 8px;
  color: #000;
  font-size: ${Math.round(BASE_FS * INC)}px;
  text-align-vertical: top;
`;
const Btn = styled.TouchableOpacity`
  background-color: ${props => (props.disabled ? '#cccccc' : props.bg || '#1f51fe')};
  padding: 12px;
  border-radius: 6px;
  align-items: center;
  margin-bottom: 10px;
`;
const BtnText = styled.Text`
  color: #fff;
  font-weight: bold;
  font-size: ${Math.round(BASE_FS * INC)}px;
`;
const BtnFoto = styled.TouchableOpacity`
  background-color: darkorange;
  padding: 14px;
  border-radius: 6px;
  align-items: center;
  margin-vertical: 8px;
`;

const Row = styled.View`
  flex-direction: row;
  margin-bottom: 12px;
`;
const Col = styled.View`
  flex: 1;
`;
const Border = styled.View`
  height: 1px;
  background-color: #ccc;
  margin-vertical: 10px;
`;

const executeSql = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        sql,
        params,
        (_, { rows }) => resolve(rows._array),
        (_, err) => reject(err)
      );
    });
  });

export default function EditChecklistRealizadosAccordion() {
  const navigation = useNavigation();
  const route = useRoute();

  // params esperados: id (TOKEN id_local), prefixo, codigo_obra
  const { id: token, prefixo, codigo_obra } = route.params;

  const [errors, setErrors] = useState(null);
  const [items, setItems] = useState([]);
  const [forms, setForms] = useState({});
  const [openIds, setOpenIds] = useState({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [headerData, setHeaderData] = useState({
    dataLocalBr: nowLocalDMYHM(),
  });

  // Carrega itens já realizados (SQLite) pelo token id_local (id_checklist_realizado)
  const loadOffline = async (idToken) => {
    return executeSql(
      `
        SELECT 
          r.*,
          s.id_obra,
          s.data_cadastro AS data_servico,
          o.codigo_obra,
          ci.nome_servico AS servico_checklist
        FROM veiculo_checklist_itens_realizados r
        LEFT JOIN veiculo_checklist_itens_servicos s 
          ON r.id_checklist_realizado = s.id_local
        LEFT JOIN veiculo_checklist_itens ci 
          ON r.id_checklist_itens = ci.id
        LEFT JOIN obras o 
          ON o.id = s.id_obra
        WHERE r.id_checklist_realizado = ?
        ORDER BY r.id ASC
      `,
      [idToken]
    );
  };

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setErrors(null);
    try {
      const list = await loadOffline(token);

      setItems(list);

      const formInit = {};
      list.forEach((it) => {
        formInit[it.id] = {
          status: it.status || 'sim',
          observacao: it.observacao || '',
          dataCadastro: it.data_cadastro || nowLocalTimestamp(),
          image: it.arquivo_app || null, // manter referência local do caminho se já existir
        };
      });
      setForms(formInit);

      const dataHdr = nowLocalDMYHM();
      setHeaderData({ dataLocalBr: dataHdr });

    } catch (err) {
      console.error('Erro ao carregar (offline):', err);
      setErrors([err.message]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { fetchItems(); }, [fetchItems]));

  const toggleOpen = itemId =>
    setOpenIds(prev => ({ ...prev, [itemId]: !prev[itemId] }));

  // Tirar foto (câmera) e salvar URI no form
  const pickImage = async (itemId) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão negada', 'Você precisa conceder permissão à câmera.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.6 });
    if (!res.canceled && res.assets?.length) {
      const { uri } = res.assets[0];
      const nome = uri.split('/').pop();
      setForms(prev => ({
        ...prev,
        [itemId]: { ...prev[itemId], image: uri, arquivo_app: nome }
      }));
    }
  };

  // Atualiza UM item localmente. Marca como pendente novamente (sync_status=0)
  // e zera sync_attempts/sync_error — assim reativa registros abandonados (99)
  // ou em erro (3) quando o usuario corrige o conteudo.
  const saveItem = async (itemId) => {
    try {
      const f = forms[itemId];
      if (!f) {
        Alert.alert('Erro', 'Item não encontrado no formulário.');
        return;
      }

      const agora = nowLocalTimestamp();

      await executeSql(
        `
          UPDATE veiculo_checklist_itens_realizados
             SET status = ?,
                 observacao = ?,
                 data_cadastro = ?,
                 arquivo_app = ?,
                 sync_status = 0,
                 sync_attempts = 0,
                 sync_error = NULL,
                 updated_at = ?
           WHERE id = ?
        `,
        [
          f.status || 'sim',
          f.observacao || '',
          f.dataCadastro || agora,
          f.image || null,
          agora,
          itemId
        ]
      );

      // Tambem reativa o servico pai, caso esteja abandonado/em erro,
      // para que a alteracao seja transmitida ao MySQL no proximo sync.
      await executeSql(
        `
          UPDATE veiculo_checklist_itens_servicos
             SET sync_status = CASE
                   WHEN sync_status IN (3, 99) THEN 0
                   WHEN sync_status = 1 THEN 0
                   ELSE sync_status
                 END,
                 sync_attempts = 0,
                 sync_error = NULL,
                 updated_at = ?
           WHERE id_local = (
             SELECT id_checklist_realizado FROM veiculo_checklist_itens_realizados WHERE id = ?
           );
        `,
        [agora, itemId]
      );

      showToast('Item atualizado. Sera reenviado no proximo sync.', 'success');
    } catch (err) {
      console.error('Erro ao salvar item (offline):', err);
      showToast(`❌ Erro ao salvar: ${err.message}`, 'error');
    }
  };

  if (loading && items.length === 0) {
    return <ActivityIndicator style={{ flex: 1, justifyContent: 'center' }} />;
  }

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchItems(); }} colors={['darkorange']} />}
    >
      <Container>
        <Card>
          <ErrorAlert errors={errors} />

          <Text style={styles.headerInfo}>
            {`Veículo: ${prefixo || '—'}  |  Obra: ${codigo_obra || '—'}  |  ${headerData.dataLocalBr}`}
          </Text>
          <Border />
          <Text style={styles.headerInfo}>{`Total de itens: ${items.length}`}</Text>

          {items.map(it => {
            const open = !!openIds[it.id];
            const f = forms[it.id] || {};
            const titulo = it.servico_checklist || 'Serviço';

            return (
              <View key={it.id}>
                <HeaderCard onPress={() => toggleOpen(it.id)}>
                  <CardTitle numberOfLines={1}>{titulo}</CardTitle>
                  <Text style={{ fontWeight: 'bold', fontSize: Math.round(18 * INC), color: '#e67e22' }}>
                    {open ? '−' : '+'}
                  </Text>
                </HeaderCard>

                {open && (
                  <FormView>
                    <Label>Data</Label>
                    <Text style={styles.valueText}>
                      {f.dataCadastro || nowLocalTimestamp()}
                    </Text>

                    <Label>Status</Label>
                    <Picker
                      selectedValue={f.status}
                      onValueChange={v =>
                        setForms(prev => ({
                          ...prev,
                          [it.id]: { ...prev[it.id], status: v }
                        }))
                      }
                    >
                      <Picker.Item label="Sim" value="sim" />
                      <Picker.Item label="Não" value="nao" />
                    </Picker>

                    <Label>Observação</Label>
                    <Input
                      multiline
                      numberOfLines={3}
                      value={f.observacao}
                      onChangeText={t =>
                        setForms(prev => ({
                          ...prev,
                          [it.id]: { ...prev[it.id], observacao: t }
                        }))
                      }
                    />

                    {f.image && <Image source={{ uri: f.image }} style={styles.preview} />}

                    <BtnFoto onPress={() => pickImage(it.id)}>
                      <BtnText>{f.image ? 'Trocar foto' : 'Tirar Foto'}</BtnText>
                    </BtnFoto>

                    <Btn onPress={() => saveItem(it.id)}>
                      <BtnText>Salvar (offline)</BtnText>
                    </Btn>
                  </FormView>
                )}
              </View>
            );
          })}
        </Card>

        {items.length > 0 && (
          <Btn bg="#4caf50" onPress={() => { showToast('Alteracoes salvas no dispositivo. Sincronize quando tiver internet.', 'info'); navigation.goBack(); }}>
            <BtnText>Concluir</BtnText>
          </Btn>
        )}
      </Container>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  headerInfo: { fontWeight: 'bold', marginBottom: 6, color: '#333', fontSize: Math.round(14 * INC), textAlign: 'center' },
  valueText: { marginBottom: 8, color: '#000', fontSize: Math.round(14 * INC) },
  preview: { width: '100%', height: 200, marginVertical: 8, borderRadius: 8, resizeMode: 'cover' },
});
