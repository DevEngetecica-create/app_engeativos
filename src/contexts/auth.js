// ./src/contexts/auth.js
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";

import api, { setUnauthorizedHandler } from "../config/api";
import { initDatabase, aplicarHardeningSync, hasAnyUser, findUserByEmail, upsertUserFromOnline, updateUserPasswordHash, db, executeSql } from "../config/database/database";
import { forceGlobalOfflineMode } from "./network";
import { downloadDados } from "../config/database/syncService";
import { hashPasswordCurrent, verifyPassword, isHashUpgradeNeeded } from "../utils/crypto";

const AuthContext = createContext(null);
const TOKEN_KEY = "auth_token";
const PROFILE_KEY = "userProfile";

/**
 * Remove campos sensiveis (hash + salt da senha) do registro do banco local
 * antes de grava-lo no AsyncStorage como parte do "profile". O AsyncStorage
 * nao e criptografado no Android — hash/salt devem ficar apenas no SQLite.
 * (P1.3 security-port)
 */
function sanitizeUserForProfile(row) {
  if (!row || typeof row !== "object") return row;
  // eslint-disable-next-line no-unused-vars
  const { password_app, password_salt, password_algo, ...safe } = row;
  return safe;
}

async function limparBancoLocal() {
  const tabelas = [
    "users",
    "funcionarios",
    "sincronizacaos",
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

  return new Promise((resolve) => {
    db.transaction(
      (tx) => {
        tabelas.forEach((tabela) => {
          tx.executeSql(`DELETE FROM ${tabela}`, []);
        });
      },
      (error) => {
        console.warn("⚠️ Falha ao limpar banco local:", error.message);
        resolve();
      },
      () => {
        console.log("🧹 Banco local limpo com sucesso (mudança de usuário).");
        resolve();
      }
    );
  });
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
        // Hardening pos-init: reverter orfaos sync_status=2 e sanear id_local duplicados
        try { await aplicarHardeningSync(); } catch (e) { console.warn('aplicarHardeningSync falhou no boot:', e?.message); }
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

  const signIn = async ({ email, password, mode, skipPrompt = false }) => {
    await initDatabase();
    try { await aplicarHardeningSync(); } catch (e) { console.warn('aplicarHardeningSync falhou no signIn:', e?.message); }

    if (mode === "offline") {
      const hasUser = await hasAnyUser();
      if (!hasUser) {
        Alert.alert("Primeiro acesso", "É necessário estar ONLINE no primeiro login.");
        return false;
      }

      // 🔐 P1.3: verificacao offline com suporte a hash legado (SHA-256) E ao
      // algoritmo atual (PBKDF2-like). Usuarios em campo cujo password_app
      // ainda e SHA-256 continuam logando normalmente.
      const user = await findUserByEmail(email);
      if (!user) {
        Alert.alert("Atenção", "Credenciais inválidas para login offline.");
        return false;
      }

      const senhaOk = await verifyPassword(
        password,
        user.password_app,
        user.password_salt,
        user.password_algo
      );
      if (!senhaOk) {
        Alert.alert("Atenção", "Credenciais inválidas para login offline.");
        return false;
      }

      // 🔁 Migracao transparente: se o hash gravado ainda e legado, sobe para
      // PBKDF2-like na primeira autenticacao offline bem-sucedida. Nao bloqueia
      // o login se falhar (best-effort).
      if (isHashUpgradeNeeded(user.password_algo, user.password_salt)) {
        try {
          const up = await hashPasswordCurrent(password);
          await updateUserPasswordHash(user.id, up.hash, up.salt, up.algo);
        } catch (e) {
          if (__DEV__) console.warn("[auth] falha na migracao do hash local:", e?.message);
        }
      }

      const doLogin = async () => {
        let perfilOffline = {};
        try {
          if (user.perfil_offline) perfilOffline = JSON.parse(user.perfil_offline);
        } catch(e) {}

        const rawProfile = await AsyncStorage.getItem(PROFILE_KEY);
        let profile = { user: sanitizeUserForProfile(user), data_local: {}, connectionMode: "offline" };

        if (rawProfile) {
          const existing = JSON.parse(rawProfile);
          if (existing.user?.id === user.id) {
            profile = { ...existing, connectionMode: "offline" };
          }
        }

        if (Object.keys(perfilOffline).length > 0) {
           profile.modulosPermitidos = perfilOffline.modulosPermitidos || [];
           profile.id_nivel = perfilOffline.id_nivel || null;
           profile.dados_func = perfilOffline.dados_func || null;
           profile.obra_acesso = perfilOffline.obra_acesso || null;
           profile.funcao = perfilOffline.funcao || null;
        }

        await SecureStore.setItemAsync(TOKEN_KEY, "offline-token");
        await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
        forceGlobalOfflineMode(true);
        setAuthData({ token: "offline-token", ...profile });
        return true;
      };

      if (skipPrompt) {
        return await doLogin();
      } else {
        return new Promise((resolve) => {
          Alert.alert(
            "Acesso Offline",
            "Você está entrando sem conexão. O sistema usará os dados salvos no aparelho. Lembre-se de que precisará de sinal de internet posteriormente para sincronizar as informações.",
            [
              { text: "Cancelar", style: "cancel", onPress: () => resolve(false) },
              {
                text: "Entrar Offline",
                onPress: async () => resolve(await doLogin()),
              },
            ]
          );
        });
      }
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

        // Detecta o cenario do login:
        //  - primeiroAcesso: SQLite sem nenhum usuario gravado
        //  - usuarioDiferente: ja existe outro usuario na tabela users
        //  - mesmoUsuario: o mesmo user.id ja esta cadastrado
        const hasUser = await hasAnyUser();
        let primeiroAcesso = !hasUser;
        let usuarioDiferente = false;

        if (hasUser) {
          // Busca QUALQUER usuario cadastrado para comparar id
          const localUser = await findUserByEmail(email);
          if (!localUser || Number(localUser.id) !== Number(user.id)) {
            // Email novo OU mesmo email mas id_servidor diferente (raro)
            usuarioDiferente = true;
          } else {
            // Email casou — confirma comparando todos os ids registrados
            // (cobre o caso de existir usuario DIFERENTE alem desse)
            const todosOsIds = await executeSql('SELECT id FROM users');
            const algumIdDiferente = todosOsIds.some(u => Number(u.id) !== Number(user.id));
            if (algumIdDiferente) usuarioDiferente = true;
          }
        }

        if (usuarioDiferente) {
          console.log("[Auth] Usuario diferente detectado — limpando banco local...");
          await limparBancoLocal();
        }

        // 🔐 P1.3: hash PBKDF2-like + salt (substitui SHA-256 puro).
        // perfilOfflineStr fica null aqui — o master atualiza perfil_offline
        // logo abaixo via executeSql, depois de montar o profile completo.
        const { hash, salt, algo } = await hashPasswordCurrent(password);
        await upsertUserFromOnline(user, hash, null, salt, algo);

        // Configura o token imediatamente para permitir próximas requisições
        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

        // O aplicativo busca as permissões atualizadas do usuário logado
        let modulosPermitidos = [];
        try {
          const resModulos = await api.get("modulos-permitidos", { __silent: true });
          modulosPermitidos = resModulos.data || [];
        } catch (errPerm) {
          console.warn("Falha ao buscar permissoes online", errPerm?.message);
          const rawProfile = await AsyncStorage.getItem(PROFILE_KEY); 
          if (rawProfile) { 
            const existing = JSON.parse(rawProfile); 
            modulosPermitidos = existing.modulosPermitidos || []; 
          } 
        }

        const profile = { 
          user, 
          data_local, 
          connectionMode: "online",
          id_nivel: data?.dados_func?.id_nivel ?? null,
          modulosPermitidos,
          dados_func: data?.dados_func ?? null,
          obra_acesso: data?.obra_acesso ?? null,
          funcao: data?.funcao ?? null
        };
        
        try {
          await executeSql("UPDATE users SET perfil_offline = ? WHERE id = ?", [JSON.stringify(profile), user.id]);
        } catch(e) { console.warn("Failed to update SQLite perfil_offline"); }

        await SecureStore.setItemAsync(TOKEN_KEY, token);
        await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
        forceGlobalOfflineMode(false);

        // A.3 — Refresh dos catalogos em TODO login online, de forma BLOQUEANTE
        // (o spinner do botao de login cobre a espera). Os catalogos sao
        // full-refresh (veiculos, checklists, obras, etc.) -> propaga edicoes,
        // novos E REMOCOES feitas no servidor. Best-effort: se o download
        // falhar (sinal/erro), o login NAO e bloqueado — entra com o cache.
        try {
          await downloadDados(
            (tabela, status, msg) => {
              if (status === 'erro' && __DEV__) console.warn(`Download ${tabela}: ${msg}`);
            },
            false,
            null,
            { user_id: user.id, user_create: user.email }
          );
        } catch (err) {
          if (__DEV__) console.warn('Refresh de catalogos no login falhou:', err?.message);
        }

        setAuthData({ token, ...profile });
        return true;
      } catch (e) {
        const status = e?.response?.status;
        const msg = e?.response?.data?.message;

        if (status === 404 || status === 401) {
          Alert.alert("Atenção", "Usuário ou senha incorreta.");
          return false;
        } else if (!status || status >= 500) {
          // Erro de rede ou servidor inacessível -> fallback para offline
          return new Promise((resolve) => {
            Alert.alert(
              "Servidor Inacessível",
              "Não foi possível conectar. Deseja acessar OFFLINE com seus dados salvos? Lembre-se de que precisará de sinal posteriormente para sincronizar.",
              [
                { text: "Cancelar", style: "cancel", onPress: () => resolve(false) },
                {
                  text: "Acessar Offline",
                  onPress: async () => {
                    const result = await signIn({ email, password, mode: "offline", skipPrompt: true });
                    resolve(result);
                  },
                },
              ]
            );
          });
        } else {
          Alert.alert("Atenção", msg || "Falha ao efetuar login.");
          return false;
        }
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
        id_nivel: authData?.id_nivel,
        modulosPermitidos: authData?.modulosPermitidos || [],
        connectionMode: authData?.connectionMode || "online",
        dados_func: authData?.dados_func || null,
        obra_acesso: authData?.obra_acesso || null,
        funcao: authData?.funcao || null
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
