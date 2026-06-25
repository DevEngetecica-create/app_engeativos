// ./src/pages/Home/index.js
import React, { useState, useCallback } from "react";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Image,
  ToastAndroid,
  Platform,
  Alert,
  RefreshControl,
  Linking,
} from "react-native";
import styled from "styled-components/native";

import styles from "./home.styles";


import ErrorAlert from "../../components/ErrorAlert";
import Loading from "../../components/Loading";
import AutoSyncModal from "../../components/Sync/AutoSyncModal";
import api from "../../config/api";
import { useAuth } from "../../contexts/auth";
import { db } from "../../config/database/database";

import { MaterialIcons, Ionicons, FontAwesome } from '@expo/vector-icons';


const { width } = Dimensions.get("window");
const HEADER_HEIGHT = 78;
const FOOTER_HEIGHT = 78;

// helper para exibir toast cross-platform
const showToast = (msg) => {
  if (Platform.OS === "android") {
    ToastAndroid.show(msg, ToastAndroid.SHORT);
  } else {
    Alert.alert("Aviso", msg);
  }
};

export default function Home() {
  const navigation = useNavigation();
  const { user, connectionMode, id_nivel, modulosPermitidos, setAuthData, authData } = useAuth(); // Pega também setAuthData e authData
  const modoOnline = connectionMode === "online";

  const [errors, setErrors] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [funcionario, setFuncionario] = useState(null);
  const [nivel_acesso, setNivelAcesso] = useState(null);

  // O aplicativo desativa a inicialização automática do modal de Sincronização. O usuário utilizará o botão de Sincronização manualmente.
  const [showSyncModal, setShowSyncModal] = useState(false);

  // 🔹 Buscar dados via SQLite
  const getOfflineData = useCallback(() => {
    return new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          `SELECT * FROM funcionarios LIMIT 1;`,
          [],
          (_, { rows }) => {
            if (rows.length > 0) {
              resolve(rows.item(0));
            } else {
              reject(new Error("Nenhum funcionário local encontrado."));
            }
          },
          (_, err) => reject(err)
        );
      });
    });
  }, []);

  // 🔹 Buscar funcionário (online/offline)
  const getFuncionario = async () => {
    setLoading(true);
    setErrors(null);

    try {
      let dadosFunc = null;

      if (modoOnline) {
        try {
          const { data } = await api.get(`users/show/${user?.id}`);
          dadosFunc = data?.dados_func ?? null;
          const nivelAcessoUpdate = data?.nivel_acesso?.id_nivel ?? null;
          setNivelAcesso(nivelAcessoUpdate);

          // 🚨 Atualiza o Contexto global para que telas como Veiculos saibam o nível de acesso
          if (nivelAcessoUpdate) {
            setAuthData(prev => ({ ...prev, id_nivel: nivelAcessoUpdate }));
          }

          if (dadosFunc) {
            // cache local atualizado
            db.transaction((tx) => {
              tx.executeSql(
                `INSERT OR REPLACE INTO funcionarios 
                 (id, nome, email, celular) VALUES (?, ?, ?, ?);`,
                [
                  dadosFunc.id,
                  dadosFunc.nome,
                  dadosFunc.email ?? null,
                  dadosFunc.celular ?? null,
                ]
              );
            });
            showToast("✅ Dados atualizados do servidor");
          } else {
            showToast("⚠️ Nenhum dado retornado do servidor");
          }
        } catch (err) {
          showToast("📴 Modo offline — usando dados locais");
          if (authData?.dados_func) {
            dadosFunc = authData.dados_func;
          } else {
            dadosFunc = await getOfflineData().catch(() => null);
          }
        }
      } else {
        showToast("📴 Modo offline — usando dados locais");
        if (authData?.dados_func) {
          dadosFunc = authData.dados_func;
        } else {
          dadosFunc = await getOfflineData().catch(() => null);
        }
      }

      setFuncionario(dadosFunc);
    } catch (err) {
      setErrors([err.message]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        getFuncionario();
      }
    }, [user?.id, modoOnline])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (user?.id) {
      await getFuncionario();
      
      // Atualiza também os módulos permitidos!
      if (modoOnline) {
        try {
          const resModulos = await api.get("modulos-permitidos", { __silent: true });
          const novosModulos = resModulos.data || [];
          setAuthData(prev => ({
            ...prev,
            modulosPermitidos: novosModulos
          }));
        } catch (err) {
          console.warn("Falha ao atualizar permissões no refresh:", err.message);
        }
      }
    }
    setRefreshing(false);
  }, [user?.id, modoOnline]);

  const getData = () => {
    // Botões base: Sempre visíveis para todos, pois são nativos do aplicativo
    const baseItens = [
      { id: "1", label: "Perfil", icon: "user", color: "#007AFF", screen: "Perfil" },
      { id: "2", label: "Sincronização", icon: "refresh", color: "#ff3807ff", screen: "Upload" }
    ];

    let customData = [...baseItens];

    // O dicionário mapeia a "url_amigavel" ou "titulo" vindo do backend para a respectiva Tela (Screen) no App
    const MAPA_MODULOS = {
      "veiculo": { id: "5", label: "Veículos da Frota", icon: "truck", color: "#FF9F0A", screen: "Veiculos" },
      "ativo": { id: "5", label: "Veículos da Frota", icon: "truck", color: "#FF9F0A", screen: "Veiculos" }, // Fallback para título
      "sms": { id: "3", label: "Segurança do Trabalho", icon: "shield", color: "#0A84FF", screen: "SMS" },
      "meio": { id: "4", label: "Meio Ambiente", icon: "tree", color: "#34C759", screen: "Construction" },
      "alugad": { id: "6", label: "Veículos Alugados", icon: "car", color: "#ff1852ff", screen: "Construction" },
      "qualidade": { id: "7", label: "Qualidade", icon: "bar-chart-o", color: "#5856D6", screen: "Construction" },
      "obra": { id: "8", label: "Obras", icon: "handshake-o", color: "#5AC8FA", screen: "Construction" }
    };

    // O aplicativo itera sobre as permissões armazenadas offline e renderiza apenas o que foi autorizado
    if (Array.isArray(modulosPermitidos)) {
      const removerAcentos = (str) => {
        return str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
      };

      const verificarEAdicionar = (item) => {
        const urlAmigavel = removerAcentos(item.url_amigavel?.toLowerCase() || "");
        const titulo = removerAcentos(item.titulo?.toLowerCase() || "");
        
        // Se a url amigavel ou o título der match com as chaves do nosso mapa, ele exibe o botão
        const itemMapeado = Object.entries(MAPA_MODULOS).find(
          ([key, value]) => urlAmigavel.includes(key) || titulo.includes(key)
        );

        if (itemMapeado) {
          // Garante que não duplique botões
          const jaExiste = customData.find(d => d.id === itemMapeado[1].id);
          if (!jaExiste) {
             customData.push(itemMapeado[1]);
          }
        }
      };

      modulosPermitidos.forEach(modulo => {
        // Verifica o módulo pai
        verificarEAdicionar(modulo);
        
        // Verifica também os submódulos (onde normalmente ficam "Veículos", "Checklist", etc)
        if (Array.isArray(modulo.submodulos)) {
          modulo.submodulos.forEach(submodulo => {
            verificarEAdicionar(submodulo);
          });
        }
      });
    }

    return customData;
  };


  return (
    <View style={styles.container}>
      <Image
        source={require("../../../assets/header.png")}
        style={styles.header}
        resizeMode="cover"
      />
      <Image
        source={require("../../../assets/footer.png")}
        style={styles.footer}
        resizeMode="cover"
      />

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#007AFF']} />
        }
      >
        <Container>
          <ErrorAlert errors={errors} />

          <Card>
            <Text style={styles.greeting}>Olá,</Text>
            <Name>{funcionario?.nome || "Usuário offline"}</Name>
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
              <Role online={modoOnline}>
                {modoOnline ? "Engeativos" : "Modo Offline"}
              </Role>
              <TouchableOpacity
                style={localStyles.tutorialBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={async () => {
                  if (!modoOnline) {
                    Alert.alert(
                      "Tutorial Indisponível",
                      "Os tutoriais ficam no servidor. Conecte-se à internet para acessá-los."
                    );
                    return;
                  }
                  const url = "https://sga-engeativos.com.br/tutorial";
                  try {
                    const supported = await Linking.canOpenURL(url);
                    if (supported) {
                      await Linking.openURL(url);
                    } else {
                      showToast("Não foi possível abrir o navegador");
                    }
                  } catch (e) {
                    showToast("Erro ao abrir tutorial");
                  }
                }}
              >
                <FontAwesome name="book" size={13} color="#22b07d" />
                <Text style={localStyles.tutorialBtnText}>Como usar o aplicativo</Text>
              </TouchableOpacity>
            </View>
          </Card>

          <View style={styles.grid}>
            {getData().map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.item}
                onPress={() => {
                  // O aplicativo intercepta o clique do botão de Sincronização para verificar o modo da conexão
                  if (item.screen === "Upload") {
                    if (!modoOnline) {
                      Alert.alert(
                        "Sincronização Indisponível",
                        "A sincronização só é possível em modo on-line e conectado à internet."
                      );
                    } else {
                      navigation.navigate(item.screen);
                    }
                  } else {
                    navigation.navigate(item.screen);
                  }
                }}
              >
                <IconWrapper style={{ backgroundColor: item.color + 25 }}>
                  <FontAwesome name={item.icon} size={25} color={item.color} />
                </IconWrapper>
                <Text style={styles.label}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {loading && <Loading />}
        </Container>
      </ScrollView>

      {/* MODAL DE SINCRONIZAÇÃO AUTOMÁTICA NO LOGIN */}
      {modoOnline && (
        <AutoSyncModal 
          visible={showSyncModal} 
          onClose={() => setShowSyncModal(false)} 
          autoStart={true} 
        />
      )}
    </View>
  );
}


const Container = styled.View`
  flex: 1;
  padding: 0px;
`;

const Card = styled(View)`
  background-color: #ffffff;
  padding: 12px 20px;
  border-radius: 14px;
  margin-bottom: 10px;
  shadow-color: #000;
  shadow-opacity: 0.08;
  shadow-offset: 0px 2px;
  shadow-radius: 4px;
  elevation: 2;
`;

const Name = styled(Text)`
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
`;

const Role = styled(Text)`
  background-color: ${(props) => (props.online ? "#007AFF" : "#64748B")};
  padding: 4px 10px;
  color: white;
  font-size: 13px;
  border-radius: 6px;
  align-self: flex-start;
  margin-top: 6px;
  font-weight: 500;
`;

const IconWrapper = styled.View`
  width: 53px;
  height: 53px;
  border-radius: 16px;
  justify-content: center;
  align-items: center;
  margin-bottom: 8px;
`;

// Estilos locais usados apenas no botão Tutorial (mantemos junto da página
// para não inflar o home.styles.js partilhado)
const localStyles = StyleSheet.create({
  tutorialBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginLeft: 60,
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#cfeed6",
    backgroundColor: "#f3faf5",
  },
  tutorialBtnText: {
    color: "#22b07d",
    fontWeight: "700",
    fontSize: 12.5,
  },
});

