import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";

const STORAGE_KEY = "mode_online_user_pref"; // '1' = online preferido, '0' = offline

// 🔹 Global para acesso fora do hook
let globalShouldUseOnline = false;
export const getGlobalShouldUseOnline = () => globalShouldUseOnline;

// 🔹 calcula qualidade (%)
function computeQualityPct(state) {
  if (!state.isConnected || state.isInternetReachable === false) return 0;
  if (state.type === "wifi") return 100;
  if (state.type === "cellular") {
    switch (state.details?.cellularGeneration) {
      case "2g": return 20;
      case "3g": return 40;
      case "4g": return 70;
      case "5g": return 90;
      default: return 30;
    }
  }
  return 50;
}

export function useConnectionMode() {
  const [userWantsOnline, setUserWantsOnline] = useState(true);
  const [isConnected, setIsConnected] = useState(true);
  const [isInternetReachable, setIsInternetReachable] = useState(true);
  const [type, setType] = useState("unknown");
  const [details, setDetails] = useState({});
  const [qualityPct, setQualityPct] = useState(100);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        setUserWantsOnline(raw !== "0"); // default online
      } finally {
        setReady(true);
      }
    })();

    const unsub = NetInfo.addEventListener((state) => {
      const q = computeQualityPct(state);
      setIsConnected(!!state.isConnected);
      setIsInternetReachable(state.isInternetReachable !== false);
      setType(state.type);
      setDetails(state.details || {});
      setQualityPct(q);
    });

    return () => unsub();
  }, []);

  const toggleMode = async () => {
    const next = !userWantsOnline;
    setUserWantsOnline(next);
    await AsyncStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  };

  const isQualityGood = qualityPct >= 40;
  const shouldUseOnline = userWantsOnline && isConnected && isInternetReachable && isQualityGood;

  // mantém valor global atualizado
  globalShouldUseOnline = shouldUseOnline;

  return {
    ready,
    userWantsOnline,
    shouldUseOnline,
    isConnected,
    isInternetReachable,
    type,
    details,
    qualityPct,
    isQualityGood,
    toggleMode,
    setUserWantsOnline,
  };
}
