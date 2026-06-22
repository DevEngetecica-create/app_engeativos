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
            r.sync_status AS r_sync_status,
            r.sync_error AS r_sync_error,
            r.arquivo_servidor AS r_arquivo_servidor,
            s.id_obra,
            s.data_cadastro AS data_servico,
            s.sync_status AS s_sync_status,
            s.sync_error AS s_sync_error,
            s.foto_extra_1,
            s.foto_extra_2,
            s.foto_extra_3,
            s.foto_extra_4,
            o.codigo_obra,
            checklist_itens.nome_servico AS servico_checklist
          FROM veiculo_checklist_itens_realizados r
          LEFT JOIN veiculo_checklist_itens_servicos s ON r.id_checklist_realizado = s.id_local
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

  // Resolve a URL da imagem: prefere arquivo_servidor (preenchido pos-sync);
  // cai para o file:// local; ultimo recurso e a URL legada por id_checklist (compat).
  const resolverUriImagem = (arquivoApp, arquivoServidor, idChecklist) => {
    if (arquivoServidor && /^https?:\/\//.test(arquivoServidor)) return arquivoServidor;
    if (!arquivoApp) return null;
    if (arquivoApp.startsWith('file://') || arquivoApp.startsWith('data:')) return arquivoApp;
    // fallback (registros antigos sem arquivo_servidor): monta URL pela convencao
    return `https://sga-engeativos.com.br/imagens/checklists/${idChecklist}/${arquivoApp}`;
  };

  // Badge textual por sync_status
  const labelSync = (st) => {
    switch (Number(st)) {
      case 1: return { text: 'Sincronizado', color: '#16a34a' };
      case 2: return { text: 'Enviando...', color: '#f59e0b' };
      case 3: return { text: 'Erro — sera retentado', color: '#dc2626' };
      case 99: return { text: 'Falhou (apos 5 tentativas)', color: '#7f1d1d' };
      default: return { text: 'Pendente', color: '#0ea5e9' };
    }
  };

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
          const { data } = await api.get(`admin/ativo/veiculo/checklist/servicos/show/${id_checklist}`, { __silent: true });
          masterData = data.checklists || data;
          itens = data.checklists_itens || [];
        } catch (err) {
          itens = await loadOffline(id_checklist);
          if (itens.length) {
            const primeira = itens[0];
            masterData = {
              id: id_checklist,
              offline: true,
              data_cadastro: primeira.data_servico,
              codigo_obra: primeira.codigo_obra || primeira.nome_obra || '–',
              foto_extra_1: primeira.foto_extra_1,
              foto_extra_2: primeira.foto_extra_2,
              foto_extra_3: primeira.foto_extra_3,
              foto_extra_4: primeira.foto_extra_4
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
            codigo_obra: primeira.codigo_obra || primeira.nome_obra || '–',
            foto_extra_1: primeira.foto_extra_1,
            foto_extra_2: primeira.foto_extra_2,
            foto_extra_3: primeira.foto_extra_3,
            foto_extra_4: primeira.foto_extra_4
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
  // 🔹 Helper para foto geral
  // =============================
  const renderFotoGeral = (fotoUri) => {
    if (!fotoUri) return null;
    // foto_extra_1..4 podem ser file:// (local) ou nome do arquivo no servidor.
    // arquivo_servidor pode tambem ser uma URL completa (depende da feature).
    const uri = resolverUriImagem(fotoUri, null, id_checklist);
    if (!uri) return null;

    return (
      <TouchableOpacity onPress={() => setModalImage(uri)}>
        <PhotoThumb source={{ uri }} resizeMode="cover" />
      </TouchableOpacity>
    );
  };

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
          {master ? (() => {
            // Sync_status do servico vem do primeiro item (todos compartilham o servico pai).
            // Se nao houver itens (caso degenerado), usa o flag legacy `master.offline`.
            const syncStatusServico = items.length > 0 ? items[0].s_sync_status : (master.offline ? 0 : 1);
            const syncErrorServico = items.length > 0 ? items[0].s_sync_error : null;
            const syncInfoMaster = labelSync(syncStatusServico);
            const sincronizado = Number(syncStatusServico) === 1;
            return (
              <Card offline={!sincronizado}>
                <Value>Veículo: {prefixo || '–'}</Value>
                <Value>Obra: {master.codigo_obra || codigoObra || '–'}</Value>
                <Value>Data Cadastro: {formatarData(master.data_cadastro_br || master.data_cadastro)}</Value>

                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                  <View style={{
                    backgroundColor: syncInfoMaster.color,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 6,
                  }}>
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
                      {syncInfoMaster.text}
                    </Text>
                  </View>
                </View>
                {syncErrorServico ? (
                  <Text style={{ color: '#7f1d1d', fontSize: 12, marginTop: 6 }} numberOfLines={3}>
                    Ultimo erro: {syncErrorServico}
                  </Text>
                ) : null}

                {master.foto_extra_1 && renderFotoGeral(master.foto_extra_1)}
                {master.foto_extra_2 && renderFotoGeral(master.foto_extra_2)}
                {master.foto_extra_3 && renderFotoGeral(master.foto_extra_3)}
                {master.foto_extra_4 && renderFotoGeral(master.foto_extra_4)}
              </Card>
            );
          })() : (
            <Text>Nenhum dado encontrado.</Text>
          )}

          <SectionTitle>🧾 Itens Verificados</SectionTitle>
          {items.length === 0 ? (
            <Text>Nenhum item registrado.</Text>
          ) : (
            items.map(it => {
              const uriImagem = resolverUriImagem(it.arquivo_app, it.r_arquivo_servidor, id_checklist);
              const syncInfo = labelSync(it.r_sync_status);
              return (
                <Card key={it.id} offline={!!master.offline}>
                  <Label>Item:</Label>
                  <Value>{it.servico_checklist || '–'}</Value>
                  <Label>Situação:</Label>
                  <Value>{it.status || '–'}</Value>
                  <Label>Observação:</Label>
                  <Value>{it.observacao || '–'}</Value>
                  <Label>Data Cadastro:</Label>
                  <Value>{formatarData(it.data_cadastro)}</Value>

                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <View style={{
                      backgroundColor: syncInfo.color,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 6,
                      marginRight: 6,
                    }}>
                      <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
                        {syncInfo.text}
                      </Text>
                    </View>
                    {it.r_sync_error ? (
                      <Text style={{ color: '#7f1d1d', fontSize: 11, flex: 1 }} numberOfLines={2}>
                        {it.r_sync_error}
                      </Text>
                    ) : null}
                  </View>

                  {uriImagem && (
                    <TouchableOpacity onPress={() => setModalImage(uriImagem)}>
                      <PhotoThumb source={{ uri: uriImagem }} resizeMode="cover" />
                    </TouchableOpacity>
                  )}
                </Card>
              );
            })
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
