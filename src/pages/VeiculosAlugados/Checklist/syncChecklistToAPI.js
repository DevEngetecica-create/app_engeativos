import api from '../../../config/api';
import { Alert } from 'react-native';

export const syncChecklistToAPI = async (checklist) => {
  console.log("⏫ Sincronizando checklist com a API...");

  // Etapa 1: VALIDAR PLACA ANTES DE ENVIAR
  try {
    const checkPlaca = new FormData();
    checkPlaca.append('placa', checklist.placa);

    const placaResponse = await api.post(
      'admin/ativo/veiculoAlugados/checklist/store',
      checkPlaca,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    if (placaResponse.status === 422) {
      Alert.alert(
        'Placa inválida',
        placaResponse.data.message || 'Por favor, insira uma placa válida.'
      );
      return false;
    }

  } catch (e) {
    console.error('❌ Falha ao validar placa durante sync:', e);
    Alert.alert('Atenção', 'Não foi possível validar a placa durante a sincronização.');
    return false;
  }

  // Etapa 2: ENVIAR DADOS
  try {
    const formData = new FormData();

    for (const key in checklist) {
      const value = checklist[key];

      if (value != null) {
        formData.append(key, value);
      }
    }

    const response = await api.post(
      'admin/ativo/veiculoAlugados/checklist/store',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    if (response.status === 200 || response.status === 201) {
      const data = response.data;
      console.log('✅ Checklist sincronizado com sucesso:', data);
      return true;
    } else {
      console.error('❌ Erro na resposta da API:', response.status, response.data);
      return false;
    }

  } catch (error) {
    console.error('❌ Erro ao enviar checklist para API:', error);
    return false;
  }
};
