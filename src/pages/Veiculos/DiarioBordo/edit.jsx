import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  Text,
  Alert,
  ActivityIndicator,
  Image,
  View,
  StyleSheet,
  Platform
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { TextInputMask } from 'react-native-masked-text';
import * as ImagePicker from 'expo-image-picker';
import styled from 'styled-components/native';
import { executeSql } from '../../../config/database/database';
import { showToast } from '../../../utils/toast';

// =============================
// 🔹 Styled Components
// =============================
const Container = styled.View`
  flex: 1;
  padding: 6px;
  background: #f5f5f5;
`;
const Card = styled.View`
  background-color: #fff;
  padding: 8px;
  margin-bottom: 10px;
  border-radius: 8px;
  elevation: 2;
`;
const Label = styled.Text`
  font-weight: bold;
  margin-bottom: 4px;
  color: #333;
`;
const Input = styled.TextInput`
  border: 1px solid ${props => (props.error ? '#d9534f' : '#ccc')};
  border-radius: 6px;
  padding: ${Platform.OS === 'ios' ? '8px' : '8px'};
  margin-bottom: 6px;
  color: #000;
`;
const TextArea = styled.TextInput`
  border: 1px solid #ccc;
  border-radius: 6px;
  padding: 8px;
  margin-bottom: 12px;
  height: 120px;
  text-align-vertical: top;
  color: #000;
`;
const Btn = styled.TouchableOpacity`
  background-color: ${props => (props.disabled ? '#999' : props.color || '#1f51fe')};
  padding: 12px;
  border-radius: 6px;
  align-items: center;
  margin-bottom: 12px;
`;
const BtnText = styled.Text`
  color: #fff;
  font-weight: bold;
`;
const InputGroup = styled.View`
  margin-bottom: 14px;
`;
const Linha = styled.View`
  width: 100%;
  height: 1px;
  background-color: #1f51fe;
  margin-vertical: 10px;
`;

// =============================
// 🔹 Principal
// =============================
export default function DiarioEdit() {
  const navigation = useNavigation();
  const { id } = useRoute().params;

  const [loading, setLoading] = useState(true);
  const [valores, setValores] = useState({ tipo: null });
  const [form, setForm] = useState({});
  const [inputError, setInputError] = useState('');

  // =============================
  // 🔹 Buscar registro existente
  // =============================
  const carregarRegistro = async () => {
    try {
      setLoading(true);
      const res = await executeSql(`SELECT * FROM veiculos_diario_bordo WHERE id = ?`, [id]);
      if (res.length > 0) {
        const registro = res[0];
        setForm({
          ...registro,
          horario_inicial: formatarDataHora(registro.horario_inicial),
          horario_final: registro.horario_final || '',
          descricao_atividade: registro.descricao_atividade || '',
          arquivo: registro.arquivo || null,
        });

        // Detecta se é máquina (tem horímetro)
        setValores({ tipo: registro.horimetro_inicial ? 4 : 1 });
      } else {
        Alert.alert('Erro', 'Registro não encontrado.');
        navigation.goBack();
      }
    } catch (e) {
      console.error('Erro ao carregar diário:', e);
      Alert.alert('Erro', 'Falha ao carregar o registro.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarRegistro();
  }, [id]);

  // =============================
  // 🔹 Funções auxiliares
  // =============================
  const formatarDataHora = iso => {
    try {
      if (!iso) return '';
      const d = new Date(iso);
      const dia = String(d.getDate()).padStart(2, '0');
      const mes = String(d.getMonth() + 1).padStart(2, '0');
      const ano = d.getFullYear();
      const hora = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${dia}/${mes}/${ano} ${hora}:${min}`;
    } catch {
      return iso;
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão negada', 'Conceda acesso à câmera para tirar fotos.');
      return;
    }

    const res = await ImagePicker.launchCameraAsync({ quality: 0.6 });
    if (!res.canceled && res.assets?.length) {
      setForm({ ...form, arquivo: res.assets[0].uri });
    }
  };

  // =============================
  // 🔹 Atualizar registro
  // =============================
  const handleUpdate = async () => {
    if (!form.descricao_atividade?.trim()) {
      Alert.alert('Atenção', 'Informe a descrição da atividade.');
      return;
    }

    if (inputError) {
      Alert.alert('Atenção', 'Corrija os valores antes de salvar.');
      return;
    }

    try {
      setLoading(true);

      await executeSql(
        `UPDATE veiculos_diario_bordo
         SET horario_final = ?, horimetro_final = ?, hodometro_final = ?, descricao_atividade = ?, arquivo = ?, sync_status = 0
         WHERE id = ?`,
        [
          form.horario_final,
          form.horimetro_final || null,
          form.hodometro_final || null,
          form.descricao_atividade,
          form.arquivo || '',
          id
        ]
      );

      showToast('✅ Diário atualizado com sucesso!', 'success');
      navigation.navigate('VeiculosDiarioBordo');
    } catch (e) {
      console.error('Erro ao atualizar diário:', e);
      showToast('❌ Falha ao atualizar o diário.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // =============================
  // 🔹 Interface
  // =============================
  if (loading) {
    return (
      <Container style={{ justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="green" />
      </Container>
    );
  }

  const isMaquina = valores.tipo === 4;

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <Container>
        <Text style={{ fontWeight: 'bold', marginBottom: 10, color: '#333' }}>
          Editar Diário #{form.id}
        </Text>
        <Linha />

        {/* ===================================== */}
        {isMaquina ? (
          <Card style={{ borderLeftWidth: 6, borderLeftColor: '#e67e22', backgroundColor: '#fff9f2' }}>
            <Label>Horímetro Inicial</Label>
            <Input
              editable={false}
              value={form.horimetro_inicial}
            />
            <Label>Horímetro Final</Label>
            <Input
              value={form.horimetro_final}
              onChangeText={t => {
                const v = t.replace(/[^0-9]/g, '');
                setForm({ ...form, horimetro_final: v });
                if (parseInt(v || 0) < parseInt(form.horimetro_inicial || 0)) {
                  setInputError('⚠️ O horímetro final não pode ser menor que o inicial.');
                } else {
                  setInputError('');
                }
              }}
              keyboardType="numeric"
            />
            {inputError ? <Text style={styles.errorText}>{inputError}</Text> : null}
          </Card>
        ) : (
          <Card style={{ borderLeftWidth: 6, borderLeftColor: '#3498db', backgroundColor: '#f4f9ff' }}>
            <Label>Hodômetro Inicial</Label>
            <Input editable={false} value={form.hodometro_inicial} />
            <Label>Hodômetro Final</Label>
            <Input
              value={form.hodometro_final}
              onChangeText={t => {
                const v = t.replace(/[^0-9]/g, '');
                setForm({ ...form, hodometro_final: v });
                if (parseInt(v || 0) < parseInt(form.hodometro_inicial || 0)) {
                  setInputError('⚠️ A quilometragem final não pode ser menor que a inicial.');
                } else {
                  setInputError('');
                }
              }}
              keyboardType="numeric"
            />
            {inputError ? <Text style={styles.errorText}>{inputError}</Text> : null}
          </Card>
        )}

        {/* Horários */}
        <Card>
          <Label>Horário Inicial</Label>
          <Input editable={false} value={form.horario_inicial} />
          <Label>Horário Final</Label>
          <TextInputMask
            type={'datetime'}
            options={{ format: 'DD/MM/YYYY HH:mm' }}
            value={form.horario_final}
            onChangeText={v => setForm({ ...form, horario_final: v })}
            style={styles.maskInput}
            keyboardType="numeric"
          />
        </Card>

        {/* Descrição */}
        <Card>
          <Label>Descrição da Atividade</Label>
          <TextArea
            multiline
            numberOfLines={4}
            value={form.descricao_atividade}
            onChangeText={v => setForm({ ...form, descricao_atividade: v })}
          />
        </Card>

        {/* Foto */}
        {form.arquivo ? (
          <Image
            source={{ uri: form.arquivo }}
            style={{ width: '100%', height: 200, borderRadius: 8, marginBottom: 12 }}
          />
        ) : null}

        <Btn color="darkorange" onPress={handleTakePhoto}>
          <BtnText>{form.arquivo ? 'Tirar outra foto' : 'Tirar foto'}</BtnText>
        </Btn>

        <Btn color="green" onPress={handleUpdate} disabled={!!inputError || loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <BtnText>Salvar Alterações</BtnText>}
        </Btn>
      </Container>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  maskInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 8,
    marginBottom: 12,
  },
  errorText: { color: '#d9534f', fontSize: 12, marginTop: 2, marginBottom: 8 },
});
