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
} from "react-native";
import styled from "styled-components/native";

import styles from "./home.styles";


import ErrorAlert from "../../components/ErrorAlert";
import Loading from "../../components/Loading";
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
  const { user, connectionMode } = useAuth(); // ✅ pega usuário + modo global
  const modoOnline = connectionMode === "online";

  const [errors, setErrors] = useState(null);
  const [loading, setLoading] = useState(false);
  const [funcionario, setFuncionario] = useState(null);
  const [nivel_acesso, setNivelAcesso] = useState(null);

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
          //setNivelAcesso(data?.nivel_acesso?.id_nivel ?? null);

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
          console.warn(
            `⚠️ Falha online → fallback offline: ${err?.message ?? "Erro desconhecido"}`
          );
          showToast("📴 Modo offline — usando dados locais");
          dadosFunc = await getOfflineData().catch(() => null);
        }
      } else {
        showToast("📴 Modo offline — usando dados locais");
        dadosFunc = await getOfflineData().catch(() => null);
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

  const getData = () => [

    { id: "1", label: "Perfil", icon: "user", color: "#007AFF", screen: "Perfil" },

    { id: "2", label: "Sincronização", icon: "refresh", color: "#ff3807ff", screen: "Upload" },

    { id: "5", label: "Veículos da Frota", icon: "truck", color: "#FF9F0A", screen: "Veiculos" },

    { id: "3", label: "Segurança do Trabalho", icon: "shield", color: "#0A84FF", screen: "SMS" },

    { id: "4", label: "Meio Ambiente", icon: "tree", color: "#34C759", screen: "Construction" },

    { id: "6", label: "Veículos Alugados", icon: "car", color: "#ff1852ff", screen: "Construction" },

    { id: "7", label: "Qualidade", icon: "bar-chart-o", color: "#5856D6", screen: "Construction" },

    { id: "8", label: "Obras", icon: "handshake-o", color: "#5AC8FA", screen: "Construction" },

  ];


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

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Container>
          <ErrorAlert errors={errors} />

          <Card>
            <Text style={styles.greeting}>Olá,</Text>
            <Name>{funcionario?.nome || "Usuário offline"}</Name>
            <Role online={modoOnline}>
              {modoOnline ? "Engeativos" : "Modo Offline"}
            </Role>
          </Card>

          <View style={styles.grid}>
            {getData().map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.item}
                onPress={() => navigation.navigate(item.screen)}
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

