// src/config/hooks/useConnectionMode.js
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// Definindo uma chave constante para o AsyncStorage
const MODOO_ONLINE_STORAGE_KEY = '@modoOnline';

export function useConnectionMode() {
  const [modoOnline, setModoOnline] = useState(true); // Controlado pelo usuário, padrão: online
  const [isConnected, setIsConnected] = useState(true); // Status real da rede, padrão: conectado
  const [isReady, setIsReady] = useState(false); // Indica se o hook já carregou as preferências do AsyncStorage

  useEffect(() => {
    const carregarModo = async () => {
      try {
        const value = await AsyncStorage.getItem(MODOO_ONLINE_STORAGE_KEY);
        // Se o valor não for '0' (string), assume-se true (online), caso contrário, false (offline)
        setModoOnline(value !== '0');
      } catch (e) {
        console.error('Erro ao carregar modo de conexão do AsyncStorage:', e);
        // Em caso de erro ao carregar, assume o padrão (true)
        setModoOnline(true);
      } finally {
        setIsReady(true); // O hook está pronto após tentar carregar as preferências
      }
    };
    
    carregarModo();

    // Listener para o status da rede
    const unsubscribe = NetInfo.addEventListener(state => {
      // isInternetReachable pode ser null em algumas plataformas, então a checagem é importante
      setIsConnected(state.isConnected && state.isInternetReachable !== false);
    });

    // Função de limpeza do useEffect
    return () => unsubscribe();
  }, []); // Array de dependências vazio para rodar apenas uma vez na montagem

  const toggleModo = async () => {
    const novoModo = !modoOnline;
    setModoOnline(novoModo);
    try {
      await AsyncStorage.setItem(MODOO_ONLINE_STORAGE_KEY, novoModo ? '1' : '0');
    } catch (e) {
      console.error('Erro ao salvar modo de conexão no AsyncStorage:', e);
    }
  };

  return {
    modoOnline, // Preferência do usuário: quer usar internet ou não
    isConnected, // Status real: há conexão de rede e internet?
    toggleModo, // Função para alternar a preferência
    // Combinação para saber se o app DEVE tentar conectar à internet
    // Só tenta conectar se o usuário PERMITIR (modoOnline) E se HOUVER conexão física (isConnected)
    shouldConnectToInternet: modoOnline && isConnected,
    isReady, // Propriedade para indicar que o hook está pronto (preferências carregadas)
  };
}