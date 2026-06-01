// ./src/contexts/auth.js
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";

import api, { setUnauthorizedHandler } from "../config/api";
import {
  initDatabase,
  hasAnyUser,
  findUserByEmail,
  upsertUserFromOnline,
  updateUserPasswordHash,
  executeSql,
} from "../config/database/database";
import { forceGlobalOfflineMode } from "./network";
import { downloadDados } from "../config/database/syncService";
import {
  hashPasswordCurrent,
  verifyPassword,
  isHashUpgradeNeeded,
} from "../utils/crypto";
import logger from "../utils/logger";

const AuthContext = createContext(null);
const TOKEN_KEY = "auth_token";
const PROFILE_KEY = "userProfile";

/**
 * Remove campos sensíveis (hash da senha + salt) do registro do banco local
 * antes de gravá-lo no AsyncStorage como parte do "profile". O AsyncStorage
 * não é criptografado em Android — hash/salt devem permanecer apenas no SQLite.
 */
function sanitizeUserForProfile(row) {
  if (!row || typeof row !== 'object') return row;
  // eslint-disable-next-line no-unused-vars
  const { password_app, password_salt, password_algo, ...safe } = row;
  return safe;
}

async function limparBancoLocal() {
  const tabelas = [
    "users",
    "funcionarios",
    "veiculos",
    "veiculos_locacaos",
    "veiculo_checklist",
    "veiculo_checklist_itens",
    // "veiculo_checklist_itens_realizados",
    // "veiculo_checklist_itens_servicos",
    // "veiculo_abastecimentos",
    // "veiculos_diario_bordo",
    // "veiculo_horimetro",
    // "veiculo_quilometragems",
  ];

  for (const tabela of tabelas) {
    try {
      await executeSql(`DELETE FROM ${tabela}`);
    } catch (e) {
      logger.warn(`⚠️ Falha ao limpar tabela ${tabela}:`, e.message);
    }
  }
  logger.log("🧹 Banco local limpo com sucesso (mudança de usuário).");
}

export const AuthProvider = ({ children }) => {
  const [authData, setAuthData] = useState(null);
  const [loading, setLoading] = useState(true);

  const handling401Ref = useRef(false); // debounce 401

  const switchConnectionMode = (mode) => {
    setAuthData((prev) => {
      const updated = { ...prev, connectionMode: mode };
      AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(updated));
      forceGlobalOfflineMode(mode === "offline");
      return updated;
    });
  };

  const clearAuthData = async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await AsyncStorage.removeItem(PROFILE_KEY);
    // ⚠️ Não mexer em api.defaults.headers.common. O interceptor em src/config/api.js
    // é a ÚNICA fonte do header Authorization: lê o token diretamente do SecureStore
    // a cada request. Manter um "default" paralelo já causou dessincronia no passado.
    setAuthData(null);
  };

  const loadUser = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const rawProfile = await AsyncStorage.getItem(PROFILE_KEY);

      if (token && rawProfile) {
        const profile = JSON.parse(rawProfile);
        await initDatabase();
        // ⚠️ O Authorization header é injetado pelo interceptor de api.js a partir
        // do SecureStore — não duplicar em api.defaults para evitar dessincronia.
        forceGlobalOfflineMode(profile.connectionMode === "offline");
        setAuthData({ token, ...profile });
      }
    } catch (err) {
      logger.error("Erro ao carregar sessão:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const signIn = async ({ email, password, mode }) => {
    await initDatabase();

    if (mode === "offline") {
      const hasUser = await hasAnyUser();
      if (!hasUser) {
        Alert.alert("Primeiro acesso", "É necessário estar ONLINE no primeiro login.");
        return false;
      }

      // 🔐 Verificação offline com suporte a hash legado (SHA-256) E
      // ao algoritmo atual (PBKDF2-like). Usuários em campo cujo
      // password_app ainda é SHA-256 continuam logando normalmente.
      const localUser = await findUserByEmail(email);
      if (!localUser) {
        Alert.alert("Atenção", "Credenciais inválidas para login offline.");
        return false;
      }

      const ok = await verifyPassword(
        password,
        localUser.password_app,
        localUser.password_salt,
        localUser.password_algo
      );
      if (!ok) {
        Alert.alert("Atenção", "Credenciais inválidas para login offline.");
        return false;
      }

      // 🔁 Migração transparente — se o hash gravado ainda é legado, sobe
      // para o algoritmo atual. Não bloqueia o login se falhar.
      if (isHashUpgradeNeeded(localUser.password_algo, localUser.password_salt)) {
        try {
          const upgraded = await hashPasswordCurrent(password);
          await updateUserPasswordHash(
            localUser.id,
            upgraded.hash,
            upgraded.salt,
            upgraded.algo
          );
          if (__DEV__) {
            console.log("[auth] hash local migrado para", upgraded.algo);
          }
        } catch (e) {
          if (__DEV__) {
            console.warn("[auth] falha na migração do hash local:", e?.message);
          }
        }
      }

      const profile = {
        user: sanitizeUserForProfile(localUser),
        data_local: {},
        connectionMode: "offline",
      };
      await SecureStore.setItemAsync(TOKEN_KEY, "offline-token");
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
      forceGlobalOfflineMode(true);
      setAuthData({ token: "offline-token", ...profile });
      return true;
    }

    if (mode === "online") {
      try {
        // ⬇️ pula o handler 401 nesta requisição específica
        const { data } = await api.post(
          "app_login",
          { email, password },
          { __skip401Handler: true }
        );

        const { token, user, data_local } = data;
        if (!token) throw new Error("Token não recebido do servidor");

        // 🩹 Fix de bug: detecta se há OUTRO usuário cacheado e só então
        // limpa o banco local. A implementação anterior chamava
        // findUserByEmailAndPassHash(email, null, true) — onde o 3º arg era
        // ignorado e password_app = NULL nunca casa → "outro usuário" era
        // SEMPRE detectado, e o banco local era ZERADO em todo login online.
        const hasUser = await hasAnyUser();
        if (hasUser) {
          const cached = await findUserByEmail(email);
          // - cached null: e-mail novo, mas há outro usuário cacheado → limpa.
          // - cached existe mas id diferente: trocou de pessoa → limpa.
          // - cached existe e id bate: mesmo usuário → preserva os dados offline.
          if (!cached || cached.id !== user.id) {
            if (__DEV__) console.log("👥 Usuário diferente detectado — limpando banco local...");
            await limparBancoLocal();
          }
        }

        // 🔐 Novo hash com PBKDF2-like + salt único.
        const { hash, salt, algo } = await hashPasswordCurrent(password);
        await upsertUserFromOnline(user, hash, salt, algo);

        const profile = { user, data_local, connectionMode: "online" };
        await SecureStore.setItemAsync(TOKEN_KEY, token);
        await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
        forceGlobalOfflineMode(false);

        // ⚠️ Authorization é injetado pelo interceptor de api.js a partir do SecureStore.
        setAuthData({ token, ...profile });

        // 🔄 sync inicial (best-effort)
        try {
          logger.log("🔄 Iniciando sincronização automática inicial...");
          const userCtx = { user_id: user.id, user_create: user.email };
          await downloadDados(
            (tabela, status, msg, progresso) => {
              logger.log(`📦 ${tabela}: ${status} → ${msg} (${progresso}%)`);
            },
            false,
            null,
            userCtx
          );
          logger.log("✅ Sincronização automática inicial concluída com sucesso.");
        } catch (syncErr) {
          logger.warn("⚠️ Falha na sincronização automática inicial:", syncErr.message);
        }

        return true;
      } catch (e) {
        const status = e?.response?.status;
        const msg = e?.response?.data?.message;

        let friendly;
        if (status === 404 || status === 401) {
          friendly = "Usuário ou senha incorreta.";
        } else if (!status) {
          friendly = "Não foi possível conectar ao servidor. Verifique sua internet.";
        } else {
          friendly = msg || "Falha ao efetuar login.";
        }

        Alert.alert("Atenção", friendly);
        return false;
      }
    }

    return false;
  };

  const signingOutRef = useRef(false);
  const signOut = async ({ silent = true } = {}) => {
    if (signingOutRef.current) return;
    signingOutRef.current = true;
    try {
      // informa o servidor mas sem gerar 401 em cascata        
      await api.post(
        "logout",
        {},
        { __skip401Handler: true, __isLogout: true, __silent: silent }
      );
    } catch { }
    await clearAuthData();
    // pequena folga para requisições ainda em voo
    setTimeout(() => { signingOutRef.current = false; }, 800);
  };

  // Handler global para 401 não-skippados
  const onUnauthorized = async () => {
    if (handling401Ref.current) return; // debounce
    handling401Ref.current = true;

    try {
      const hasRealToken = !!authData?.token && authData?.token !== "offline-token";
      if (!hasRealToken) return; // não alerta/limpa na tela de login

      Alert.alert("Sessão expirada", "Faça login novamente.");
     
      await signOut({ silent: true });

    } finally {
      handling401Ref.current = false;
    }
  };

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    setUnauthorizedHandler(onUnauthorized);
  }, [authData]); // atualiza quando token/usuário mudar

  return (
    <AuthContext.Provider
      value={{
        authData,
        loading,
        signIn,
        signOut,
        switchConnectionMode,
        setAuthData,
        isAuthenticated: !!authData?.token,
        user: authData?.user,
        connectionMode: authData?.connectionMode || "online",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return context;
};
