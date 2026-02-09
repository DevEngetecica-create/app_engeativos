// src/hooks/useSafeApi.js
import { useAuth } from '../contexts/auth';
import { useCallback } from 'react';
import { Alert } from 'react-native';

export default function useSafeApi() {
  const { token, loading, signOut } = useAuth();

  const safeApi = useCallback(
    async (apiCallFn) => {
      if (loading) {
        Alert.alert('Aguarde', 'Carregando dados de autenticação...');
        return null;
      }

      if (!token) {
        Alert.alert('Erro', 'Sessão não autenticada. Faça login novamente.');
        signOut?.(); // Garante logout limpo
        return null;
      }

      try {
        const response = await apiCallFn();
        return response;
      } catch (error) {
        // Erro já tratado globalmente no interceptor
        return null;
      }
    },
    [token, loading, signOut]
  );

  return safeApi;
}
