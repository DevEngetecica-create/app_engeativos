// src/config/api.js
import axios from "axios";
import { Alert } from "react-native";
import * as SecureStore from "expo-secure-store";
import { getConnectionSnapshot, isGoodSignal, SIGNAL_OK_THRESHOLD } from "./net/connectionSnapshot";


const api = axios.create({
  baseURL: "https://sga-engeativos.com.br/api/",
  //baseURL: "http://192.168.3.227:8000/api/",
  timeout: 30000,
});


// 👉 handler configurável pelo AuthProvider
let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

// 👉 flag global para não repetir alerta/handler
let isHandling401 = false;

const TOKEN_KEY = "auth_token";

// Requisições
api.interceptors.request.use(async (config) => {
  // injeta token (fonte única: SecureStore)
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch {}

  // aviso para uploads com sinal fraco
  if (config.data instanceof FormData && !config.__skipSignalWarn) {
    const { qualityPct = 0 } = getConnectionSnapshot() || {};
    if (!isGoodSignal(qualityPct)) {
      Alert.alert(
        "⚠️ Sinal fraco",
        `Qualidade ≈ ${qualityPct.toFixed(0)}% (mín. ${SIGNAL_OK_THRESHOLD}%).`
      );
    }
  }

  return config;
});

// Respostas
api.interceptors.response.use(
  (resp) => resp,
  (err) => {
    const status  = err?.response?.status;
    const message = err?.response?.data?.message || err?.message || "Erro desconhecido";
    const cfg     = err?.config || {};

    // ⛔️ 401: ignore se a própria chamada pediu para pular
    if (status === 401 && !cfg.__skip401Handler && !cfg.__isLogout) {
      if (!isHandling401) {
        isHandling401 = true;
        Alert.alert("Sessão expirada", "Faça login novamente.");
        // chama handler 1x
        onUnauthorized?.();
        // solta a trava depois de um pequeno intervalo
        setTimeout(() => { isHandling401 = false; }, 1200);
      }
      return Promise.reject(err);
    }

    // Erros de rede: deixe para o caller
    if (String(message).toLowerCase().includes("network")) {
      return Promise.reject(err);
    }

    // Outros erros: alerta único aqui
    if (!cfg.__silent) Alert.alert("Erro", message);
    return Promise.reject(err);
  }
);

export default api;
