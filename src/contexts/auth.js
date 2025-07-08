// .src/contexts/auth.js

import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useContext
} from 'react';
import { Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { setUnauthorizedHandler } from '../config/api';
import { initDatabase } from '../config/database/database';
import { useNetwork } from './network'; // 🟢 Adicionado

const TOKEN_KEY = 'authToken';
const PROFILE_KEY = 'userProfile';

export const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const { networkStatus } = useNetwork(); // 🟢 Acessa o modo offline
  const [authData, setAuthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loggingIn, setLoggingIn] = useState(false);

  const clearAuthData = async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await AsyncStorage.removeItem(PROFILE_KEY);
    delete api.defaults.headers.common['Authorization'];
    setAuthData(null);
  };

  const loadUser = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const rawProfile = await AsyncStorage.getItem(PROFILE_KEY);

      if (token && rawProfile) {
        const profile = JSON.parse(rawProfile);

        // Aguarda inicialização do banco local mesmo offline
        await initDatabase();

        // 🔴 Se estiver offline, não tenta validar com backend
        if (networkStatus) {
          const response = await api.get('validate-token', {
            headers: { Authorization: `Bearer ${token}` }
          });

          if (response.data.status) {
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            setAuthData({ token, ...profile });
            setLoading(false);
            return;
          } else {
            await clearAuthData();
          }
        } else {
          // 🔁 Se offline, apenas assume os dados locais
          setAuthData({ token, ...profile });
        }
      } else {
        await clearAuthData();
      }

      setLoading(false);
    } catch (err) {
      if (networkStatus) {
        Alert.alert(
          'Erro de Conexão',
          'Não foi possível validar sua sessão. Tente novamente mais tarde.'
        );
        await clearAuthData();
      } else {
        // Offline, assume que o login anterior é válido
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        const rawProfile = await AsyncStorage.getItem(PROFILE_KEY);
        if (token && rawProfile) {
          const profile = JSON.parse(rawProfile);
          setAuthData({ token, ...profile });
        }
      }
      setLoading(false);
    }
  }, [networkStatus]);

  const signIn = async ({ email, password }) => {
    if (loggingIn) return;
    setLoggingIn(true);

    try {
      const { data } = await api.post('login', { email, password });
      const { token, user, data_local } = data;

      if (!token) throw new Error('Token não recebido do servidor');

      await initDatabase();

      const profile = { user, data_local };

      await SecureStore.setItemAsync(TOKEN_KEY, token);
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));

      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setAuthData({ token, ...profile });

      return true;
    } catch (err) {
      await clearAuthData();
      const msg = err.response?.data?.message || err.message || 'Falha no login';
      Alert.alert('Erro', msg);
      throw err;
    } finally {
      setLoggingIn(false);
    }
  };

  const signOut = async () => {
    try {
      await api.post('logout');
    } catch { }
    finally {
      await clearAuthData();
    }
  };

  useEffect(() => {
    loadUser();
    setUnauthorizedHandler(signOut);
  }, [loadUser]);

  return (
    <AuthContext.Provider
      value={{
        authData,
        loading,
        signIn,
        signOut,
        isAuthenticated: !!authData?.token,
        token: authData?.token,
        user: authData?.user,
        data_local: authData?.data_local
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
