// src/config/api.js
import axios from "axios";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import { getConnectionSnapshot, isGoodSignal, SIGNAL_OK_THRESHOLD } from "./net/connectionSnapshot";
import { showToast } from "../utils/toast";
import logger from "../utils/logger";

// 🔧 baseURL lida de expo-constants (alimentado por app.config.js + APP_ENV/APP_API_URL).
// Fallback defensivo para produção caso alguém rode o app sem app.config.js
// (ex: instâncias antigas pré-migração ou erro de bundle).
const FALLBACK_BASE_URL = "https://sga-engeativos.com.br/api/";
const baseURL =
  Constants?.expoConfig?.extra?.apiBaseUrl ||
  Constants?.manifest?.extra?.apiBaseUrl ||
  Constants?.manifest2?.extra?.expoClient?.extra?.apiBaseUrl ||
  FALLBACK_BASE_URL;

logger.log("[api] baseURL =", baseURL, "| env =", Constants?.expoConfig?.extra?.appEnv);

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
  } catch {}

  // aviso para uploads com sinal fraco — toast (não bloqueia o upload)
  if (config.data instanceof FormData && !config.__skipSignalWarn) {
    const { qualityPct = 0 } = getConnectionSnapshot() || {};
    if (!isGoodSignal(qualityPct)) {
      showToast(
        `Sinal fraco (${qualityPct.toFixed(0)}%, mín. ${SIGNAL_OK_THRESHOLD}%). O envio pode falhar.`,
        "warning"
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
        // ⚠️ NÃO exibir Alert aqui. O handler único definido pelo AuthProvider
        // (onUnauthorized) é a fonte da verdade: mostra o aviso de sessão expirada
        // E executa o signOut. Antes havia DOIS Alert.alert (este + auth.js),
        // causando duplicidade na UX.
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

    // Outros erros: toast (menos intrusivo que Alert). O caller pode passar
    // __silent: true para suprimir, ou capturar e exibir mensagem própria.
    if (!cfg.__silent) showToast(message, "error");
    return Promise.reject(err);
  }
);

export default api;
