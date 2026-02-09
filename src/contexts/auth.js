// ./src/contexts/auth.js
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import { Alert } from "react-native";

import api, { setUnauthorizedHandler } from "../config/api";
import { initDatabase, hasAnyUser, findUserByEmailAndPassHash, upsertUserFromOnline } from "../config/database/database";
import { forceGlobalOfflineMode } from "./network";
import { executeSql } from "../config/database/database";
import { downloadDados } from "../config/database/syncService";

const AuthContext = createContext(null);
const TOKEN_KEY = "auth_token";
const PROFILE_KEY = "userProfile";

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
      console.warn(`⚠️ Falha ao limpar tabela ${tabela}:`, e.message);
    }
  }
  console.log("🧹 Banco local limpo com sucesso (mudança de usuário).");
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
    delete api.defaults.headers.common["Authorization"];
    setAuthData(null);
  };

  const loadUser = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const rawProfile = await AsyncStorage.getItem(PROFILE_KEY);

      if (token && rawProfile) {
        const profile = JSON.parse(rawProfile);
        await initDatabase();
        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        forceGlobalOfflineMode(profile.connectionMode === "offline");
        setAuthData({ token, ...profile });
      }
    } catch (err) {
      console.error("Erro ao carregar sessão:", err);
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

      const senhaHash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, password);
      const user = await findUserByEmailAndPassHash(email, senhaHash);
      if (!user) {
        Alert.alert("Atenção", "Credenciais inválidas para login offline.");
        return false;
      }

      const profile = { user, data_local: {}, connectionMode: "offline" };
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

        const hasUser = await hasAnyUser();
        if (hasUser) {
          const localUser = await findUserByEmailAndPassHash(email, null, true);
          if (!localUser || localUser.id !== user.id) {
            console.log("👥 Usuário diferente detectado — limpando banco local...");
            await limparBancoLocal();
          }
        }

        const senhaHash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, password);
        await upsertUserFromOnline(user, senhaHash);

        const profile = { user, data_local, connectionMode: "online" };
        await SecureStore.setItemAsync(TOKEN_KEY, token);
        await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
        forceGlobalOfflineMode(false);

        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        setAuthData({ token, ...profile });

        // 🔄 sync inicial (best-effort)
        try {
          console.log("🔄 Iniciando sincronização automática inicial...");
          const userCtx = { user_id: user.id, user_create: user.email };
          await downloadDados(
            (tabela, status, msg, progresso) => {
              console.log(`📦 ${tabela}: ${status} → ${msg} (${progresso}%)`);
            },
            false,
            null,
            userCtx
          );
          console.log("✅ Sincronização automática inicial concluída com sucesso.");
        } catch (syncErr) {
          console.warn("⚠️ Falha na sincronização automática inicial:", syncErr.message);
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
