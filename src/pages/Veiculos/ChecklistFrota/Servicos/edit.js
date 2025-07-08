// src/pages/Veiculos/ChecklistFrota/Servicos/EditChecklistRealizadosAccordion.js

import React, { useCallback, useState } from 'react';
import {
  Alert,
  ScrollView,
  View,
  Text,
  ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import styled from 'styled-components/native';
import api from '../../../../config/api';
import ErrorAlert from '../../../../components/ErrorAlert';

const Container = styled.View`
  flex: 1;
  padding: 16px;
  background-color: #f5f5f5;
`;

const Card = styled.View`
  background-color: #fff;
  padding: 16px;
  margin-bottom: 12px;
  border-radius: 8px;
  elevation: 2;
`;

const HeaderInfo = styled.View`
  margin-bottom: 16px;
`;
const HeaderText = styled.Text`
  font-weight: bold;
  margin-bottom: 8px;
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
const CardTitle = styled.Text`
  font-size: 16px;
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
`;
const Input = styled.TextInput`
  border: 1px solid #ccc;
  border-radius: 6px;
  padding: 8px;
  margin-bottom: 12px;
  text-align-vertical: top;
`;
const Btn = styled.TouchableOpacity`
  background-color: #1f51fe;
  padding: 12px;
  border-radius: 6px;
  align-items: center;
  margin-bottom: 12px;
`;
const BtnText = styled.Text`
  color: #fff;
  font-weight: bold;
`;
const Thumbnail = styled.Image`
  width: 80px;
  height: 80px;
  margin-bottom: 8px;
`;

export default function EditChecklistRealizadosAccordion() {
  const route = useRoute();
  const {
    id,
    id_obra,
    id_veiculo,
    periodo,
    prefixo,
    codigo_obra
  } = route.params;

  const [errors, setErrors] = useState(null);
  const [items, setItems] = useState([]);
  const [forms, setForms] = useState({});
  const [openIds, setOpenIds] = useState({});
  const [loading, setLoading] = useState(false);

  // busca os itens já realizados
  const fetchItems = async () => {
    setLoading(true);
    setErrors(null);
    try {
      const { data } = await api.get(
        `admin/ativo/veiculo/checklist/servicos/show/${id}`,
        { params: { periodo } }
      );
      const list = Array.isArray(data.checklists_itens)
        ? data.checklists_itens
        : [];
      setItems(list);

      // inicializa os forms com os valores existentes
      const f = {};
      list.forEach(it => {
        f[it.id] = {
          status: it.status || 'sim',
          observacao: it.observacao || '',
          dataCadastro: it.data_cadastro || '',
          image: null, // não carregamos imagem antiga
        };
      });
      setForms(f);
    } catch (err) {
      setErrors(
        err.response?.data?.message
          ? [err.response.data.message]
          : [err.message]
      );
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchItems();
    }, [id, periodo])
  );

  // alterna a abertura do card
  const toggleOpen = itemId =>
    setOpenIds(prev => ({ ...prev, [itemId]: !prev[itemId] }));

  // seleciona nova imagem
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

  // salva apenas um item
  const saveItem = async (itemId) => {
    setLoading(true);
    setErrors(null);
    try {
      const f = forms[itemId];
      const token = await AsyncStorage.getItem('@token');

      const formData = new FormData();

      formData.append('status', f.status);
      formData.append('observacao', f.observacao || '');
      formData.append('data_cadastro', f.dataCadastro || '');

      // Adiciona a imagem se existir
      if (f.image && f.image.uri) {
        formData.append('arquivo', {
          uri: f.image.uri,
          name: `image_${Date.now()}.jpg`,
          type: 'image/jpeg'
        });
      }

      // monta headers com Authorization + content-typess
      const headers = {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      };

      await api.post(
        `admin/ativo/veiculo/checklist/servicos/update/${itemId}`,
        formData,
        { headers }
      );

      Alert.alert('Sucesso', 'Item atualizado.', [
        { text: 'OK', onPress: fetchItems }
      ]);

    } catch (err) {
      if (err.response?.status === 422) {
        // mostra os erros de validação vindos do Laravel
        setErrors(Object.values(err.response.data.errors).flat());
      } else {
        setErrors([err.message]);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading && items.length === 0) {
    return <ActivityIndicator style={{ flex: 1, justifyContent: 'center' }} />;
  }

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <Container>
        <Card>
          <ErrorAlert errors={errors} />

          <HeaderInfo>
            <HeaderText>Veículo: {prefixo}   Obra: {codigo_obra}</HeaderText>
            <HeaderText>Total de itens: {items.length}</HeaderText>
          </HeaderInfo>

          {items.map(it => {
            const open = !!openIds[it.id];
            const f = forms[it.id] || {};
            return (
              <View key={it.id}>
                <HeaderCard onPress={() => toggleOpen(it.id)}>
                  <CardTitle>{it.servico_checklist.nome_servico}</CardTitle>
                  <Text>{open ? '–' : '+'}</Text>
                </HeaderCard>
                {open && (
                  <FormView>
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
                      value={f.observacao}
                      onChangeText={t =>
                        setForms(prev => ({
                          ...prev,
                          [it.id]: { ...prev[it.id], observacao: t }
                        }))
                      }
                    />

                    <Label>Data de cadastro</Label>
                    <Text style={{ marginBottom: 12 }}>{f.dataCadastro}</Text>

                    <Label>Imagem (opcional)</Label>
                    {f.image && <Thumbnail source={{ uri: f.image.uri }} />}
                    <Btn onPress={() => pickImage(it.id)}>
                      <BtnText>
                        {f.image ? 'Trocar imagem' : 'Selecionar imagem'}
                      </BtnText>
                    </Btn>

                    <Btn onPress={() => saveItem(it.id)} disabled={loading}>
                      <BtnText>
                        {loading ? 'Salvando...' : 'Salvar'}
                      </BtnText>
                    </Btn>
                  </FormView>
                )}
              </View>
            );
          })}
        </Card>
      </Container>
    </ScrollView>
  );
}
