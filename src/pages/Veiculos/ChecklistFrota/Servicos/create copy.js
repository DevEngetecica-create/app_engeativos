// src/pages/Veiculos/ChecklistFrota/Servicos/create.js

import React, { useCallback, useState } from 'react';
import {
  Alert,
  ScrollView,
  View,
  Text,
  Image,
  ActivityIndicator,
  StyleSheet
} from 'react-native';
import { useRoute, useFocusEffect, useNavigation } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import styled from 'styled-components/native';
import api from '../../../../config/api';
import ErrorAlert from '../../../../components/ErrorAlert';
import Checklist from '..';

const Container = styled.View`flex:1; padding:7px; background:#f5f5f5;`;

const Card = styled.View`
  background-color: #fff;
  padding: 16px;
  margin-bottom: 12px;
  border-radius: 8px;
  elevation: 2;
`;

const HeaderCard = styled.TouchableOpacity`
  background: #fff;
  border: 1px solid #e67e22;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 4px;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;
const HeaderText = styled.Text`font-weight:bold; font-size:16px; color:#333;`;
const FormView = styled.View`
  background: #fff;
  border: 1px solid #e67e22;
  border-top-width: 0;
  border-radius: 0 0 8px 8px;
  padding: 12px;
  margin-bottom: 12px;
`;
const Label = styled.Text`font-weight:bold; margin-bottom:4px; color:#333;`;
const Input = styled.TextInput`
  border:1px solid #ccc;
  border-radius:6px;
  padding:8px;
  margin-bottom:12px;
  color:#000;
`;
const Btn = styled.TouchableOpacity`
  background-color:#1f51fe;
  padding:12px;
  border-radius:6px;
  align-items:center;
  margin-bottom:12px;
`;
const BtnText = styled.Text`color:#fff; font-weight:bold;`;
const InputGroup = styled.View`margin-bottom:16px;`;
const ErrorText = styled.Text`
  color: #c00;
  font-size: 12px;
  margin-top: -8px;
  margin-bottom: 8px;
`;

export default function CreateChecklistRealizadosAccordion() {
  const navigation = useNavigation();
  const { id, periodo, id_veiculo, id_obra, prefixo, codigoObra } = useRoute().params;

  const [errors, setErrors] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openIds, setOpenIds] = useState({});
  const [forms, setForms] = useState({});
  const [maiorHr, setMaiorHr] = useState('');
  const [horimetroNovo, setHorimetroNovo] = useState('');
  const [cheklistVeiculo, setChecklist] = useState('');

  // Carrega checklist e valores iniciais
  const fetchItems = async () => {
    setLoading(true);
    setErrors(null);
    try {
      const { data } = await api.get(
        `admin/ativo/veiculo/checklist/servicos/create/${id}`,
        { params: { periodo } }
      );

      const lista = Array.isArray(data.consulta_checklist)
        ? data.consulta_checklist
        : [];
      setItems(lista);

      const cheklist = data.consulta_checklist ? data.consulta_checklist : "";

      setChecklist(cheklist)

      console.log(cheklist[0].id_veiculo)

      // valores máximo de horímetro/quilometragem
      setMaiorHr(data.maiorValorHorimetro ?? '');

      // inicializa campo de cada item
      const now = new Date()
        .toISOString()
        .slice(0, 19)
        .replace('T', ' ');
      const inicial = lista.reduce((acc, item) => ({
        ...acc,
        [item.id]: { status: 'sim', observacao: '', image: null, dataCadastro: now }
      }), {});
      setForms(inicial);

    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(Object.values(err.response.data.errors).flat());
      } else {
        setErrors([err.message]);
      }
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(fetchItems, [id, periodo]));

  const toggleOpen = itemId =>
    setOpenIds(prev => ({ ...prev, [itemId]: !prev[itemId] }));

  // Seleção de imagem
  const pickImage = async itemId => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão negada');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7
    });
    if (!res.cancelled) {
      setForms(prev => ({
        ...prev,
        [itemId]: { ...prev[itemId], image: res }
      }));
    }
  };

  // Envia todo o checklist para mysql
  const saveAll = async () => {
    setLoading(true);
    setErrors(null);

    try {

      const formData = new FormData();

      formData.append('id_obra', id_obra);
      formData.append('id_checklist', cheklistVeiculo[0].id_checklist);
      formData.append('id_veiculo', cheklistVeiculo[0].id_veiculo);

      // >> adiciona aqui <<
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      formData.append('data_cadastro', now);

      formData.append('horimetro_atual', maiorHr ?? null);
      formData.append('horimetro_novo', horimetroNovo ?? null);

      Object.entries(forms).forEach(([itemId, f], idx) => {
        formData.append(`itens[${idx}][id_checklist_itens]`, itemId);
        formData.append(`itens[${idx}][status]`, f.status);
        formData.append(`itens[${idx}][observacao]`, f.observacao);
        formData.append(`itens[${idx}][data_cadastro]`, f.dataCadastro);
        if (f.image) {
          formData.append(`itens[${idx}][arquivo]`, {
            uri: f.image.uri,
            name: f.image.uri.split('/').pop(),
            type: 'image/jpeg'
          });
        }
      });

      await api.post(
        'admin/ativo/veiculo/checklist/servicos/store',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      Alert.alert('Sucesso', 'Checklist cadastrado.', [
        {
          text: 'OK',
          onPress: () => navigation.navigate('ChecklistServicos', { id_checklist: id, periodo })
        }
      ]);

    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(Object.values(err.response.data.errors).flat());
      } else {
        setErrors([err.message]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Loading inicial
  if (loading && !items.length) {
    return <ActivityIndicator style={styles.loader} size="large" />;
  }

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <Container>

        <Card>
          <ErrorAlert errors={errors} />

          <Text style={styles.infoText}>Veículo: {prefixo}   Obra: {codigoObra}</Text>
          <Text style={styles.infoText}>Total de itens: {items.length}</Text>

          <InputGroup>
            <Label>Horímetro Anterior (não editável)</Label>
            <Input
              value={String(maiorHr)}
              editable={false}
              keyboardType="numeric"
            />
          </InputGroup>

          <InputGroup>
            <Label>Horímetro Atual *</Label>
            <Input
              value={horimetroNovo}
              onChangeText={setHorimetroNovo}
              placeholder="0000"
              keyboardType="numeric"
            />

          </InputGroup>

          {items.map(item => {
            const open = !!openIds[item.id];
            const f = forms[item.id] || {};
            return (
              <View key={item.id}>
                <HeaderCard onPress={() => toggleOpen(item.id)}>
                  <HeaderText>{item.nome_servico}</HeaderText>
                  <Text>{open ? '–' : '+'}</Text>
                </HeaderCard>
                {open && (
                  <FormView>
                    <Label>Data de cadastro</Label>
                    <Text style={styles.valueText}>{f.dataCadastro}</Text>

                    <Label>Status</Label>
                    <View style={styles.picker}>
                      <Picker
                        selectedValue={f.status}
                        onValueChange={v =>
                          setForms(prev => ({
                            ...prev,
                            [item.id]: { ...prev[item.id], status: v }
                          }))
                        }
                      >
                        <Picker.Item label="Sim" value="sim" />
                        <Picker.Item label="Não" value="nao" />
                      </Picker>
                    </View>

                    <Label>Observação</Label>
                    <Input
                      multiline
                      numberOfLines={3}
                      value={f.observacao}
                      onChangeText={t =>
                        setForms(prev => ({
                          ...prev,
                          [item.id]: { ...prev[item.id], observacao: t }
                        }))
                      }
                    />

                    <Label>Imagem</Label>
                    {f.image && (
                      <Image source={{ uri: f.image.uri }} style={styles.thumb} />
                    )}
                    <Btn onPress={() => pickImage(item.id)}>
                      <BtnText>
                        {f.image ? 'Trocar imagem' : 'Selecionar imagem'}
                      </BtnText>
                    </Btn>
                  </FormView>
                )}
              </View>
            );
          })}

          <Btn onPress={saveAll} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <BtnText>Salvar tudo</BtnText>
            }
          </Btn>
        </Card>
      </Container>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  infoText: { fontWeight: 'bold', marginBottom: 12, color: '#333' },
  picker: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, marginBottom: 12 },
  thumb: { width: 80, height: 80, marginBottom: 8 },
  valueText: { marginBottom: 12, color: '#333' }
});
