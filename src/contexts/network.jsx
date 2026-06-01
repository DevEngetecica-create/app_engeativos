import React, { createContext, useState, useEffect, useContext, useMemo, useRef } from "react";
import NetInfo from "@react-native-community/netinfo";
import { setConnectionSnapshot, computeQualityPct } from "../config/net/connectionSnapshot";
import logger from "../utils/logger";

const NetworkContext = createContext();

// 🔹 Estado global compartilhado (acessado fora de componentes)
let globalNetworkStatus = { isOffline: false, isOnline: true };
let externalForceOffline = false; // Modo manual (forçado via banner ou login)

export const forceGlobalOfflineMode = (value) => {
  externalForceOffline = value;
  globalNetworkStatus = { isOffline: value, isOnline: !value };
};

export const getGlobalNetworkStatus = () => globalNetworkStatus;

const NetworkProvider = ({ children }) => {
  const [isDeviceOffline, setDeviceOffline] = useState(false);
  const [isForcedOffline, setForcedOffline] = useState(externalForceOffline);

  // 📡 Monitora mudanças automáticas de rede
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const offline = !(state.isConnected && state.isInternetReachable);
      const qualityPct = computeQualityPct(state);

      // Atualiza snapshot global
      setConnectionSnapshot({
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
        details: state.details,
        qualityPct,
      });

      setDeviceOffline(offline);
    });
    return () => unsubscribe();
  }, []);

  // 🔘 Força modo offline manual (usado via banner/login)
  const forceOfflineMode = (value) => {
    setForcedOffline(value);
    forceGlobalOfflineMode(value);
  };

  // 🧠 Lógica de prioridade: modo forçado > NetInfo
  const isOffline = useMemo(() => (isForcedOffline ? true : isDeviceOffline), [isDeviceOffline, isForcedOffline]);
  const isOnline = !isOffline;

  // Atualiza estado global sempre que mudar
  globalNetworkStatus = { isOffline, isOnline };

  // Log de diagnóstico — só quando o estado MUDA (antes logava em todo render,
  // poluindo Logcat) e apenas em __DEV__.
  const lastLoggedRef = useRef(null);
  useEffect(() => {
    const key = `${isOffline ? "OFFLINE" : "ONLINE"}|forced=${isForcedOffline}`;
    if (lastLoggedRef.current !== key) {
      lastLoggedRef.current = key;
      logger.log(`[Net] ${isOffline ? "OFFLINE" : "ONLINE"} (forçado: ${isForcedOffline})`);
    }
  }, [isOffline, isForcedOffline]);

  return (
    <NetworkContext.Provider value={{ isOffline, isOnline, forceOfflineMode }}>
      {children}
    </NetworkContext.Provider>
  );
};

// Hook
const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (!context) throw new Error("useNetwork deve ser usado dentro de um NetworkProvider");
  return context;
};

export { NetworkProvider, useNetwork };
