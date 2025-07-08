import axios from 'axios';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const api = axios.create({
  baseURL: 'http://192.168.2.152:8000/api/',  
  //baseURL: 'https://sga-engeativos.com.br/api/',
  timeout: 30000, // timeout para uploads de até 30 segundos
});

// Handler para logout automático
let onUnauthorized = null;

// Permite registrar função de logout externa (AuthContext)
export const setUnauthorizedHandler = (handler) => {
  onUnauthorized = handler;
};

// Interceptor de requisição
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('@token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (config.data instanceof FormData) {
    config.headers['Content-Type'] = 'multipart/form-data';
    config.transformRequest = (data) => data;
  }

  return config;
});


// Interceptor de resposta
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const message =
    
      error.response?.data?.message || error.message || 'Erro desconhecido';

    if (error.message === 'Sem sinal') {
      Alert.alert(
        'Atenção',
        'Não foi possível conectar ao servidor. Verifique sua internet ou tente novamente mais tarde.'
      );

    } else if (error.response?.status === 401) {
      
      Alert.alert('Sessão Expirada', 'Faça login novamente.');

      // Executa logout automático se handler estiver definido
      if (onUnauthorized) {
        onUnauthorized();
      }
    } else {
      Alert.alert('Erro', message);
    }

    return Promise.reject(error);
  }
);

export default api;
