import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Text, TextInput, Button, Alert, TouchableOpacity, Image, ActivityIndicator, ScrollView } from 'react-native';
import { useRoute, useFocusEffect, useNavigation } from '@react-navigation/native';
import { TextInputMask } from 'react-native-masked-text';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import styled from 'styled-components/native';
import api from '../../../config/api';

const Container = styled.View` padding: 20px; `;

const Input = styled.TextInput`border:1px solid #ccc; border-radius:6px; padding:8px; margin-bottom:12px; text-align-vertical:top;`;
const Btn = styled.TouchableOpacity`background-color:#1f51fe; padding:12px; border-radius:6px; align-items:center; margin-bottom:12px;`;
const BtnText = styled.Text`color:#fff; font-weight:bold;`;
const BtnSalvar = styled.TouchableOpacity`background-color:green; padding:12px; border-radius:6px; align-items:center; margin-bottom:12px;`;
const Label = styled.Text`font-weight:bold; margin-bottom:4px; color:#333;`;
const Linha = styled.Text`width:100%; background-color:green;  height: 1px; margin-bottom: 25px`;



const TextArea = styled.TextInput`border: 1px solid #ccc;
  border-radius: 6px;
  padding: 8px;
  margin-bottom: 12px;
  height: 150px;
  text-align-vertical: top;
`;

export default function DiarioCadastro() {

  const { id_veiculo, id_item } = useRoute().params;
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState(null);
  const [items, setItems] = useState([]);
  const [codigoObra, setCodigoObra] = useState([]);
  const [formsDiario, setForms] = useState({});

  // Estado do formulário corrigido (removido campo duplicado)
  const [form, setForm] = useState({
    horario_inicial: '',
    horimetro_inicial: '',
    hodometro_inicial: '',
    horario_final: '',
    horimetro_final: '',
    hodometro_final: '',
    descricao_atividade: '',
    leitura_final: '',
    arquivo: null
  });

  //carregar a imagem
  const handlePickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7
    });

    if (!res.canceled) {
      setForm({ ...form, arquivo: res.assets[0] });
    }
  };


  //informações do diário de bordo
  const fetchItems = async () => {
    setLoading(true);
    setErrors(null);
    try {
      const { data } = await api.get(`admin/ativo/veiculo/diario_bordo/show/${id_item}`);

      if (data.registro) {
        setItems(data.registro);
        setCodigoObra(data.registro.veiculo?.obra?.codigo_obra || ''); // Acesso correto à obra

        setForm({
          ...form,
          horario_inicial: data.registro.horario_inicial || '',
          horimetro_inicial: data.registro.horimetro_inicial || '',
          hodometro_inicial: data.registro.hodometro_inicial || '',
          horario_final: data.registro.horario_final || '',
          horimetro_final: data.registro.horimetro_final || '',
          hodometro_final: data.registro.hodometro_final || '',
          descricao_atividade: data.registro.descricao_atividade || '',
          leitura_final: data.registro.leitura_final || '',
          arquivo: data.registro.arquivo || null
        });
      }
    } catch (err) {
      setErrors([err.message]);
    } finally {
      setLoading(false);
    }
  };


  const saveItem = async () => {
    setLoading(true);
    setErrors(null);

    // Cria FormData com os dados do estado 'form'
    const formData = new FormData();
    formData.append('horario_inicial', form.horario_inicial);
    formData.append('horimetro_inicial', form.horimetro_inicial || '');
    formData.append('hodometro_inicial', form.hodometro_inicial || '');
    formData.append('descricao_atividade', form.descricao_atividade);
    formData.append('horario_final', form.horario_final || '');
    formData.append('leitura_final', form.leitura_final || '');
    formData.append('horimetro_final', form.horimetro_final || '');
    formData.append('hodometro_final', form.hodometro_final || '');

    // Adiciona a imagem se existir
    if (form.arquivo && form.arquivo.uri) {
      formData.append('arquivo', {
        uri: form.arquivo.uri,
        name: form.arquivo.uri.split('/').pop(),
        type: form.arquivo.type || 'image/jpeg',
      });
    }

    const token = await AsyncStorage.getItem('@token');
    try {
      const headers = {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      };

      // Usar PUT para atualização
      await api.post( `admin/ativo/veiculo/diario_bordo/update/${id_item}`,
        formData,
        { headers }
      );

      Alert.alert('Sucesso', 'Registro atualizado com sucesso!', [
        {
          text: 'OK',
          onPress: () => navigation.navigate('VeiculosDiarioBordo', { id: id_veiculo })
        }
      ]);

    } catch (error) {
      // Tratamento melhorado de erros
      const errorMessage = error.response?.data?.message || 'Erro ao atualizar registro';
      Alert.alert('Erro', errorMessage);
      console.error('Erro no update:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchItems();
    }, [id_veiculo])
  );


  if (loading && !items.length) {
    return <ActivityIndicator style={styles.loader} size="large" />;
  }



  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <Container>
        <Text style={{ fontWeight: 'bold', marginBottom: 12 }}>
          Veículo: {items.veiculo?.prefixo} | Obra: {items.obra?.codigo_obra}
        </Text>

        <Linha />

        {items[0]?.veiculo?.tipo == 4 ? (
          <>
            <Text>Horímetro Inicial:</Text>
            <Input
              value={form.horimetro_inicial}
            onChangeText={(text) => setForm({ ...form, horimetro_inicial: text })}
            />
          </>

        ) : (
          <>
            <Text>Hodômetro inicial:</Text>
            <Input
              value={form.hodometro_inicial}
              onChangeText={(text) => setForm({ ...form, hodometro_inicial: text })}
            />
          </>
        )}

        <Text style={{ color: 'red' }}>Horário inicial:</Text>
        <TextInputMask
          type={'custom'}
          options={{ mask: '99:99' }}
          value={form.horario_inicial}
          onChangeText={(text) => setForm({ ...form, horario_inicial: text })} /* onChangeText={(text) => setItems({ ...items, horario_inicial: text }) } */
          style={{
            borderWidth: 1,
            borderColor: '#ccc',
            borderRadius: 6,
            padding: 8,
            marginBottom: 12
          }}
          keyboardType="numeric"
        />

        <Text>Descrição da Atividade:</Text>
        <TextArea value={form.descricao_atividade}
          onChangeText={(text) => setForm({ ...form, descricao_atividade: text })}
        />


        <Text style={{ color: 'red' }}>Horário Final:</Text>
        <TextInputMask
          type={'custom'}
          options={{ mask: '99:99' }}
          value={form.horario_final}
          onChangeText={(text) => setForm({ ...form, horario_final: text })}
          style={{
            borderWidth: 1,
            borderColor: '#ccc',
            borderRadius: 6,
            padding: 8,
            marginBottom: 12
          }}
          keyboardType="numeric"
        />

        {items[0]?.tipo == 4 ? (
          <>
            <Text>Horímetro final:</Text>
            <Input
              value={form.horimetro_final}
              onChangeText={(text) => setForm({ ...form, horimetro_final: text })}
            />
          </>
        ) : (
          <>
            <Text>Hodômetro final:</Text>
            <Input
              value={form.hodometro_final}
              oonChangeText={(text) => setForm({ ...form, hodometro_final: text })}
            />
          </>
        )}

        <Label>Imagem</Label>
        {form.arquivo?.uri && <Image source={{ uri: form.arquivo.uri }} style={{ width: 100, height: 100, marginVertical: 10 }} />}
        <Btn onPress={handlePickImage}>
          <BtnText>{form.arquivo ? 'Trocar imagem' : 'Selecionar imagem'}</BtnText>
        </Btn>

        <BtnSalvar onPress={saveItem} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <BtnText>Salvar tudo</BtnText>}
        </BtnSalvar>
      </Container>
    </ScrollView>
  );

}


const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  picker: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, marginBottom: 12 },
  thumb: { width: 80, height: 80, marginBottom: 8 }
});