// src/utils/credentialsStore.js
//
// Armazena as credenciais usadas pelo LOGIN BIOMÉTRICO em SecureStore
// (criptografado pelo sistema operacional).
//
// 🟢 Offline-first: a migração do AsyncStorage legado ("@credentials") é
// totalmente local e acontece na próxima abertura do app — não exige
// conexão de internet. Usuários que estão em campo offline não precisam
// fazer login novamente.
//
// Estratégia:
//   1. Tenta ler do SecureStore (fonte da verdade).
//   2. Se vazio, lê do AsyncStorage legado. Se achou, copia para o
//      SecureStore e apaga o registro do AsyncStorage. A partir daí,
//      todas as leituras ficam no SecureStore.
//
// ⚠️ Migração silenciosa: nada é exibido ao usuário; apenas falhas são
// logadas em console (somente em desenvolvimento).

import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SECURE_KEY = "biometric_credentials";
const LEGACY_KEY = "@credentials";

function logIfDev(msg, err) {
  if (__DEV__) console.warn(`[credentialsStore] ${msg}`, err?.message ?? "");
}

/**
 * Retorna { email, password } ou null.
 * Migra do AsyncStorage legado para SecureStore na primeira leitura.
 */
export async function getCredentials() {
  try {
    const secure = await SecureStore.getItemAsync(SECURE_KEY);
    if (secure) return JSON.parse(secure);
  } catch (e) {
    logIfDev("falha ao ler SecureStore", e);
  }

  // Fallback legado — apenas durante a transição.
  try {
    const legacy = await AsyncStorage.getItem(LEGACY_KEY);
    if (legacy) {
      // Migra para SecureStore antes de apagar o legado.
      await SecureStore.setItemAsync(SECURE_KEY, legacy);
      await AsyncStorage.removeItem(LEGACY_KEY);
      return JSON.parse(legacy);
    }
  } catch (e) {
    logIfDev("falha na leitura/migração legada", e);
  }
  return null;
}

/** Persiste credenciais com criptografia do SO. */
export async function setCredentials(email, password) {
  const payload = JSON.stringify({ email, password });
  await SecureStore.setItemAsync(SECURE_KEY, payload);
  // Garante limpeza do registro legado, caso ainda exista.
  try { await AsyncStorage.removeItem(LEGACY_KEY); } catch {}
}

/** Verifica se há credenciais (em SecureStore ou legado). */
export async function hasCredentials() {
  const value = await getCredentials();
  return !!value;
}

/** Remove credenciais de ambos os storages. */
export async function clearCredentials() {
  try { await SecureStore.deleteItemAsync(SECURE_KEY); } catch {}
  try { await AsyncStorage.removeItem(LEGACY_KEY); } catch {}
}
