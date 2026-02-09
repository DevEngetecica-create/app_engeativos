import React, { useState, useCallback, useEffect } from 'react';
import {
  ScrollView,
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image
} from 'react-native';
import { useRoute, useFocusEffect, useNavigation } from '@react-navigation/native';
import styled from 'styled-components/native';
import { executeSql } from '../../../config/database/database';
import { showToast } from '../../../utils/toast';

// =============================
// 🔹 Styled Components
// =============================
const Container = styled.View`
  flex: 1;
  padding: 14px;
  background-color: #f5f5f5;
`;
const SectionTitle = styled.Text`
  font-size: 18px;
  font-weight: bold;
  margin-top: 16px;
  margin-bottom: 8px;
  color: #1f51fe;
`;
const Card = styled.View`
  background: #fff;
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 14px;
  elevation: 2;
`;
const Row = styled.View`
  flex-direction: row;
  margin-bottom: 6px;
`;
const Label = styled.Text`
  font-weight: bold;
  color: #333;
  width: 140px;
`;
const Value = styled.Text`
  color: #444;
  flex: 1;
`;
const BackButton = styled.TouchableOpacity`
  margin-top: 20px;
  padding: 12px;
  background: #1f51fe;
  border-radius: 6px;
  align-items: center;
`;
const BackText = styled.Text`
  color: #fff;
  font-weight: bold;
`;
const ImageThumb = styled.Image`
  width: 100%;
  height: 180px;
  border-radius: 8px;
  margin-top: 10px;
  border-width: 1px;
  border-color: #ccc;
`;

// =============================
// 🔹 Formata data/hora
// =============================
const formatarData = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const ano = d.getFullYear();
  const hora = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dia}/${mes}/${ano} ${hora}:${min}`;
};

// =============================
// 🔹 Tela principal
// =============================
export default function AbastecimentoShow() {
  const navigation = useNavigation();
  const { id } = useRoute().params;
  const [loading, setLoading] = useState(true);
  const [dados, setDados] = useState(null);
  const [modalImage, setModalImage] = useState(null);

  // =============================
  // 🔹 Buscar dados do SQLite
  // =============================
  const carregarDados = useCallback(async () => {
    setLoading(true);
    try {
      const res = await executeSql(
        `SELECT 
            ab.*, 
            ob.codigo_obra AS nome_obra,
            vc.prefixo,
            vc.tipo AS tipo_veiculo
          FROM veiculo_abastecimentos ab
          LEFT JOIN obras ob ON ob.id = ab.id_obra
          LEFT JOIN veiculos vc ON vc.id = ab.veiculo_id
          WHERE ab.id = ? LIMIT 1`,
        [id]
      );

      console.log('Dados do abastecimento:', res);

      if (res.length) setDados(res[0]);
      else showToast('Nenhum registro encontrado', 'warning');
    } catch (err) {
      console.error('Erro ao carregar abastecimento:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      carregarDados();
    }, [carregarDados])
  );

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  if (loading) {
    return (
      <Container style={{ justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#1f51fe" />
      </Container>
    );
  }

  if (!dados) {
    return (
      <Container>
        <Text>Nenhum dado encontrado.</Text>
        <BackButton onPress={() => navigation.goBack()}>
          <BackText>Voltar</BackText>
        </BackButton>
      </Container>
    );
  }

  const isMaquina = dados.tipo_veiculo == 4;

  return (
    <>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <Container>
          <SectionTitle>Detalhes do Abastecimento</SectionTitle>
          <Card>
            <Row>
              <Label>Veículo:</Label>
              <Value>{dados.prefixo || '–'}</Value>
            </Row>
            <Row>
              <Label>Obra:</Label>
              <Value>{dados.nome_obra || dados.id_obra}</Value>
            </Row>
            <Row>
              <Label>Data Abastecimento:</Label>
              <Value>{formatarData(dados.data_abastecimento)}</Value>
            </Row>
            <Row>
              <Label>Fornecedor:</Label>
              <Value>{dados.fornecedor || '–'}</Value>
            </Row>
            <Row>
              <Label>Combustível:</Label>
              <Value>{dados.combustivel || '–'}</Value>
            </Row>

            {isMaquina ? (
              <>
                <Row>
                  <Label>Horímetro Anterior:</Label>
                  <Value>{dados.hr_anterior || '–'}</Value>
                </Row>
                <Row>
                  <Label>Horímetro Atual:</Label>
                  <Value>{dados.hr_atual || '–'}</Value>
                </Row>
              </>
            ) : (
              <>
                <Row>
                  <Label>Hodômetro Anterior:</Label>
                  <Value>{dados.km_anterior || '–'}</Value>
                </Row>
                <Row>
                  <Label>Hodômetro Atual:</Label>
                  <Value>{dados.km_atual || '–'}</Value>
                </Row>
              </>
            )}

            <Row>
              <Label>Quantidade (L):</Label>
              <Value>{dados.quantidade || '0'} L</Value>
            </Row>
            <Row>
              <Label>Valor por Litro:</Label>
              <Value>R$ {dados.valor_do_litro || '0.00'}</Value>
            </Row>
            <Row>
              <Label>Total:</Label>
              <Value style={{ fontWeight: 'bold', color: '#1f51fe' }}>
                R$ {dados.valor_total || '0.00'}
              </Value>
            </Row>

            <Row>
              <Label>Usuário:</Label>
              <Value>{dados.user_create || '–'}</Value>
            </Row>

            <Row>
              <Label>Status:</Label>
              <Value>
                {dados.sync_status == 1 ? (
                  <Text style={{ color: 'green' }}>Sincronizado ✅</Text>
                ) : (
                  <Text style={{ color: 'red' }}>Pendente de sincronização ⚠️</Text>
                )}
              </Value>
            </Row>

            {/* Imagem comprovante */}
            {dados.arquivo_app ? (
              <>
                <Text style={{ marginTop: 10, fontWeight: 'bold', color: '#333' }}>
                  Comprovante
                </Text>
                <TouchableOpacity onPress={() => setModalImage(`file://${dados.arquivo_app}`)}>
                  <ImageThumb
                    source={{ uri: `file://${dados.arquivo_app}` }}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              </>
            ) : (
              <Text style={{ marginTop: 10, fontStyle: 'italic', color: '#999' }}>
                Nenhum comprovante registrado.
              </Text>
            )}
          </Card>

          <BackButton onPress={() => navigation.goBack()}>
            <BackText>Voltar</BackText>
          </BackButton>
        </Container>
      </ScrollView>

      {/* Modal fullscreen da imagem */}
      <Modal visible={!!modalImage} transparent>
        <View style={styles.modalBg}>
          <TouchableOpacity
            style={styles.modalClose}
            onPress={() => setModalImage(null)}
          >
            <Text style={{ color: '#fff', fontSize: 16 }}>Fechar</Text>
          </TouchableOpacity>
          <Image
            source={{ uri: modalImage }}
            style={styles.modalImage}
            resizeMode="contain"
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalImage: {
    width: '95%',
    height: '80%',
    borderRadius: 10
  },
  modalClose: {
    position: 'absolute',
    top: 40,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 10,
    borderRadius: 6
  }
});
