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
import {
  integerInputBlockingSeparators,
  integerInputValue,
  integerNumberValue,
  onlyDigits
} from '../../../utils/numberInput';
import { nowLocalTimestamp, nowLocalDMYHM, toDMYHM } from '../../../utils/datetime';

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
  const [valores, setValores] = useState({ tipo_hr: 0, tipo_km: 0 });
  const [form, setForm] = useState({ descricao_encerramento: '', arquivo: null });
  const [inputError, setInputError] = useState('');
  // Display de "Horario Final" em tempo real (atualiza a cada 30s).
  // No salvamento, o valor final eh capturado novamente para garantir freshness.
  const [horarioFinalDisplay, setHorarioFinalDisplay] = useState(nowLocalDMYHM());

  useEffect(() => {
    const timer = setInterval(() => {
      setHorarioFinalDisplay(nowLocalDMYHM());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

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
          horimetro_inicial: integerInputValue(registro.horimetro_inicial),
          horimetro_final: integerInputValue(registro.horimetro_final),
          hodometro_inicial: integerInputValue(registro.hodometro_inicial),
          hodometro_final: integerInputValue(registro.hodometro_final),
          descricao_atividade: registro.descricao_atividade || '',
          descricao_encerramento: registro.descricao_encerramento || '',
          arquivo: registro.arquivo_app || registro.arquivo || null,
        });

        const veiculoRes = await executeSql(`SELECT tipo_hr, tipo_km, tipo FROM veiculos WHERE id = ?`, [registro.id_veiculo]);
        let tipo_hr = veiculoRes[0]?.tipo_hr || 0;
        let tipo_km = veiculoRes[0]?.tipo_km || 0;

        if (!tipo_km && !tipo_hr) {
          const isMaquina = veiculoRes[0]?.tipo == 4;
          tipo_hr = isMaquina ? 1 : 0;
          tipo_km = !isMaquina ? 1 : 0;
        }
        setValores({ tipo_hr, tipo_km });
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
  // 🔹 Tirar foto (somente câmera)
  // =============================
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
  // 🔹 Funções auxiliares
  // =============================
  function parseDataHoraBR(dataStr) {
    if (!dataStr) return null;
    const [dataPart, horaPart] = dataStr.split(' ');
    if (!dataPart || !horaPart) return null;
    const [dia, mes, ano] = dataPart.split('/');
    const [hora, minuto] = horaPart.split(':');
    if (ano && mes && dia && hora && minuto) {
      return new Date(Number(ano), Number(mes) - 1, Number(dia), Number(hora), Number(minuto), 0);
    }
    const data = new Date(dataStr);
    return Number.isNaN(data.getTime()) ? null : data;
  }

  function calcularHorasTrabalhadasMinutos(inicio, fim) {
    const dataInicio = parseDataHoraBR(inicio);
    const dataFim = parseDataHoraBR(fim);
    if (!dataInicio || !dataFim) return 0;
    const diffMs = dataFim.getTime() - dataInicio.getTime();
    if (diffMs <= 0) return 0;
    return Math.floor(diffMs / 60000);
  }
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

  // =============================
  // 🔹 Atualizar registro
  // =============================

  const handleUpdate = async () => {
    if (inputError) {
      Alert.alert('Atenção', 'Corrija os valores antes de salvar.');
      return;
    }

    try {
      setLoading(true);
      // Captura o horario final AGORA (timezone America/Sao_Paulo).
      // Salva tanto o display (DD/MM/YYYY HH:mm) quanto o ISO (YYYY-MM-DD HH:mm:ss)
      // — o display vai para horario_final, o ISO entra em updated_at/data_sincronizacao.
      const horarioFinalISO = nowLocalTimestamp();
      const horarioFinalBR = nowLocalDMYHM();
      const horasTrabalhadas = calcularHorasTrabalhadasMinutos(form.horario_inicial, horarioFinalBR);

      await executeSql(
        `UPDATE veiculos_diario_bordo
         SET horario_final = ?, horimetro_final = ?, hodometro_final = ?, descricao_encerramento = ?, horas_trabalhadas_minutos = ?, arquivo_app = ?, ciclo_status = 'ENCERRADO', sync_status = 0, updated_at = ?
         WHERE id = ?`,
        [
          horarioFinalISO,
          onlyDigits(form.horimetro_final) || null,
          onlyDigits(form.hodometro_final) || null,
          form.descricao_encerramento,
          horasTrabalhadas,
          form.arquivo,
          horarioFinalISO,
          id
        ]
      );

      showToast('✅ Diário encerrado com sucesso!', 'success');
      navigation.goBack();
    } catch (e) {
      console.error('Erro ao encerrar diário:', e);
      showToast('❌ Falha ao encerrar o diário.', 'error');
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

  const isHr = valores.tipo_hr == 1;
  const isKm = valores.tipo_km == 1;

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <Container>
        <Text style={{ fontWeight: 'bold', marginBottom: 10, color: '#333' }}>
          Encerrar Diário de Bordo #{form.id}
        </Text>
        <Linha />

        {/* ===================================== */}
        {isHr && (
          <Card style={{ borderLeftWidth: 6, borderLeftColor: '#e67e22', backgroundColor: '#fff9f2' }}>
            <Label>Horímetro Inicial</Label>
            <Input
              editable={false}
              value={form.horimetro_inicial}
              style={{ backgroundColor: '#eee' }}
            />
            <Label>Horímetro Final</Label>
            <Input
              value={form.horimetro_final}
              onChangeText={t => {
                const v = integerInputBlockingSeparators(t, form.horimetro_final);
                setForm({ ...form, horimetro_final: v });
                if (integerNumberValue(v, 0) < integerNumberValue(form.horimetro_inicial, 0)) {
                  setInputError('⚠️ O horímetro final não pode ser menor que o inicial.');
                } else {
                  setInputError('');
                }
              }}
              keyboardType="numeric"
            />
            {inputError ? <Text style={styles.errorText}>{inputError}</Text> : null}
          </Card>
        )}
        
        {isKm && (
          <Card style={{ borderLeftWidth: 6, borderLeftColor: '#3498db', backgroundColor: '#f4f9ff' }}>
            <Label>Hodômetro Inicial</Label>
            <Input editable={false} value={form.hodometro_inicial} style={{ backgroundColor: '#eee' }} />
            <Label>Hodômetro Final</Label>
            <Input
              value={form.hodometro_final}
              onChangeText={t => {
                const v = integerInputBlockingSeparators(t, form.hodometro_final);
                setForm({ ...form, hodometro_final: v });
                if (integerNumberValue(v, 0) < integerNumberValue(form.hodometro_inicial, 0)) {
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
          <Input editable={false} value={form.horario_inicial} style={{ backgroundColor: '#eee' }} />
          <Label>Horário Final (automatico)</Label>
          <Input
            editable={false}
            value={horarioFinalDisplay}
            style={{ backgroundColor: '#eee' }}
          />
          <Text style={{ fontSize: 11, color: '#666', marginTop: -4, marginBottom: 8 }}>
            O horario final eh capturado automaticamente ao salvar (fuso de Brasilia).
          </Text>
        </Card>

        {/* Descrição Abertura */}
        <Card>
          <Label>Descrição da Atividade (Abertura)</Label>
          <TextArea
            editable={false}
            multiline
            numberOfLines={4}
            value={form.descricao_atividade}
            style={{ backgroundColor: '#eee' }}
          />
        </Card>

        {/* Descrição Encerramento */}
        <Card>
          <Label>Observação de Encerramento</Label>
          <TextArea
            multiline
            numberOfLines={4}
            value={form.descricao_encerramento}
            onChangeText={v => setForm({ ...form, descricao_encerramento: v })}
            placeholder="Digite os detalhes do encerramento..."
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
          {loading ? <ActivityIndicator color="#fff" /> : <BtnText>Encerrar Diário</BtnText>}
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
