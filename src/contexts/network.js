// .src/contexts/network.js

import React, { createContext, useState, useEffect, useContext, useMemo } from 'react';
import NetInfo from '@react-native-community/netinfo';

// 1. Criando o "quadro de avisos" (o Contexto)
const NetworkContext = createContext();

// 2. Criando o componente que gerencia e provê a informação (o Provedor)
const NetworkProvider = ({ children }) => {
  // Estado para saber se estamos offline (seja por falta de conexão ou forçado)
  const [isOffline, setOffline] = useState(false);
  
  // Estado para forçar o modo offline manualmente (útil para testes)
  const [isForcedOffline, setForcedOffline] = useState(false);

  useEffect(() => {
    // Adiciona um "ouvinte" que avisa sempre que o estado da conexão muda
    const unsubscribe = NetInfo.addEventListener(state => {
      // O estado é considerado offline se a internet não estiver acessível
      // 'state.isConnected' diz se há uma conexão (Wi-Fi, 4G), mas 
      // 'state.isInternetReachable' é mais confiável, pois testa se realmente há acesso à internet.
      const offline = !(state.isConnected && state.isInternetReachable);
      setOffline(offline);
    });

    // Função de limpeza: remove o "ouvinte" quando o componente é desmontado
    return () => {
      unsubscribe();
    };
  }, []);

  // Função para permitir que outras partes do app forcem o modo offline
  const forceOfflineMode = (value) => {
    setForcedOffline(value);
  };

  // O valor final que será compartilhado: estamos offline se a conexão caiu OU se foi forçado.
  // 'useMemo' otimiza a performance, recalculando o valor apenas quando uma das dependências muda.
  const networkStatus = useMemo(() => isOffline || isForcedOffline, [isOffline, isForcedOffline]);

  return (
    <NetworkContext.Provider 
      value={{ 
        networkStatus, // O estado combinado (true se offline, false se online)
        forceOfflineMode // A função para forçar o modo offline
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
};

// 3. Criando a "ferramenta" para ler a informação (o Hook)
const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error('useNetwork deve ser usado dentro de um NetworkProvider');
  }
  return context;
};

// Exportando as peças para que outros arquivos possam usá-las
export { NetworkProvider, useNetwork };