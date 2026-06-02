// src/config/api.js
import axios from "axios";
import { Alert } from "react-native";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import { getConnectionSnapshot, isGoodSignal, SIGNAL_OK_THRESHOLD } from "./net/connectionSnapshot";

// 🔧 baseURL resolvida via app.config.js (extra.apiBaseUrl), alimentada por
// APP_ENV / APP_API_URL. Fallback de producao (COM /api/) caso o extra falte.
//
// Corrige o bug que causava 405 "GET, HEAD" no app_login:
//   - baseURL anterior NAO tinha "/api/" -> o POST caia nas rotas web.
//   - o "||" com string literal truthy ("http://..." ou
//     "process.env.EXPO_PUBLIC_API_URL") fixava o lado esquerdo e nunca
//     usava a producao.
// process.env tambem nao funciona dentro de aspas; a fonte correta no Expo
// e o app.config.js (extra), lido aqui via expo-constants.
const FALLBACK_BASE_URL = "https://sga-engeativos.com.br/api/";
const baseURL =
  Constants?.expoConfig?.extra?.apiBaseUrl ||
  Constants?.manifest?.extra?.apiBaseUrl ||
  FALLBACK_BASE_URL;

if (__DEV__) {
  // eslint-disable-next-line no-console
  console.log("[api] baseURL =", baseURL, "| env =", Constants?.expoConfig?.extra?.appEnv);
}

const api = axios.create({
  baseURL,
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
    config.headers.Accept = 'application/json';
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
    let message = err?.response?.data?.message || err?.message || "Erro desconhecido";
    const cfg     = err?.config || {};

    // 🛡️ Prevenção contra exibição de HTML (ex: páginas de redirect ou erros 500 do Laravel)
    if (typeof err?.response?.data === 'string' && err.response.data.toLowerCase().includes('<html')) {
      message = "Erro de comunicação: O servidor retornou uma página inválida em vez de dados (possível expiração de sessão ou erro interno).";
      console.warn(`[API] HTML recebido da URL: ${cfg.url}`); // Apenas um log curto no console, sem travar o app
    }


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
