// src/pages/Veiculos/index.js
import React, { useCallback, useState } from "react";
import { ScrollView, Text, StyleSheet } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import styled from "styled-components/native";
import Toast from "react-native-root-toast";

import ErrorAlert from "../../components/ErrorAlert";
import Loading from "../../components/Loading";
import api from "../../config/api";
import { db } from "../../config/database/database";
import { useAuth } from "../../contexts/auth";

const Container = styled.View`
  flex: 1;
  padding: 16px;
  background-color: #f8f9fa;
`;

const TotalText = styled.Text`
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 16px;
  color: #333;
`;

const Card = styled.TouchableOpacity`
  background: #fff;
  border-radius: 12px;
  flex-direction: row;
  padding: 14px;
  margin-bottom: 14px;
  align-items: center;
  elevation: 3;
  shadow-color: #000;
  shadow-opacity: 0.1;
  shadow-radius: 4px;
  shadow-offset: 0px 2px;
`;

const CardImage = styled.Image`
  width: 90px;
  height: 70px;
  border-radius: 8px;
  margin-right: 14px;
`;

const Info = styled.View`
  flex: 1;
`;

const TitleRow = styled.View`
  flex-direction: row;
  align-items: center;
  margin-bottom: 6px;
`;

const Title = styled.Text`
  font-weight: bold;
  font-size: 17px;
  margin-left: 8px;
  color: #222;
`;

const SubInfo = styled.Text`
  font-size: 14px;
  color: #555;
  margin-bottom: 2px;
`;

export default function Veiculos() {
  const navigation = useNavigation();
  const { connectionMode } = useAuth();
  const modoOnline = connectionMode === "online";

  const [state, setState] = useState({
    loading: false,
    error: null,
    veiculos: [],
    count: 0,
  });

  const baseImageUrl = "https://sga-engeativos.com.br/imagens/veiculos";

  // ===============================
  // 🔹 Buscar online
  // ===============================
  const fetchOnline = useCallback(async () => {
    Toast.show("🟢 Carregando veículos online...", { duration: 1000 });

    const resp = await api.get("admin/ativo/veiculo");
    console.log("📡 Resposta API veículos:", resp.data);

    if (!resp?.data?.status) {
      throw new Error(resp?.data?.message || "Falha ao obter veículos.");
    }

    const veiculos = resp.data.veiculos || [];

    // 🔸 Atualiza cache local no SQLite
    db.transaction((tx) => {
      tx.executeSql("DELETE FROM veiculos;"); // limpa para evitar duplicados
      veiculos.forEach((v) => {
        tx.executeSql(
          `INSERT OR REPLACE INTO veiculos 
           (id, prefixo, placa, nun_serie_chassi, marca, imagem, tipo) 
           VALUES (?, ?, ?, ?, ?, ?, ?);`,
          [
            v.id,
            v.prefixo ?? null,
            v.placa ?? null,
            v.nun_serie_chassi ?? null,
            v.marca ?? null,
            v.imagem ?? null,
            v.tipo ?? null,
          ]
        );
      });
    });

    return { veiculos, count: veiculos.length };
  }, []);

  // ===============================
  // 🔹 Buscar offline (SQLite)
  // ===============================
  const fetchOffline = useCallback(async () => {
    Toast.show("🔴 Carregando veículos offline...", { duration: 1500 });

    return new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          `SELECT * FROM veiculos ORDER BY prefixo ASC;`,
          [],
          (_, { rows }) =>
            resolve({
              veiculos: rows._array,
              count: rows._array.length,
            }),
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }, []);

  // ===============================
  // 🔹 Carregar lista
  // ===============================
  const loadVeiculos = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      let result;
      if (modoOnline) {
        try {
          result = await fetchOnline();
        } catch (err) {
          console.warn("⚠️ Falha online, fallback para SQLite:", err.message);
          result = await fetchOffline();
        }
      } else {
        result = await fetchOffline();
      }
      setState({ loading: false, error: null, ...result });
    } catch (error) {
      setState((s) => ({ ...s, loading: false, error }));
    }
  }, [modoOnline, fetchOnline, fetchOffline]);

  useFocusEffect(
    useCallback(() => {
      loadVeiculos();
    }, [modoOnline])
  );

  // ===============================
  // 🔹 Renderização
  // ===============================
  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <Container>
        <ErrorAlert errors={state.error} />
        <TotalText>Total de veículos: {state.count}</TotalText>

        {state.loading && <Loading />}

        {!state.loading &&
          state.veiculos.map((v) => {
            const icon = v.tipo == 4 ? "🚜" : "🚛";
            const unidadeInfo =
              v.maiorValor && v.unidade
                ? `🔧 ${v.maiorValor} ${v.unidade}`
                : null;

            return (
              <Card
                key={v.id}
                activeOpacity={0.9}
                onPress={() =>
                  navigation.navigate("VeiculosDetalhes", { id: v.id })
                }
              >
                <CardImage
                  source={
                    v.imagem
                      ? { uri: `${baseImageUrl}/${v.id}/${v.imagem}` }
                      : require("../../../assets/no-photos.png")
                  }
                  resizeMode="cover"
                />
                <Info>
                  <TitleRow>
                    <Text style={{ fontSize: 20 }}>{icon}</Text>
                    <Title>{v.prefixo}</Title>
                  </TitleRow>
                  <SubInfo>
                    📋 Placa / Série: {v.placa ?? v.nun_serie_chassi ?? "-"}
                  </SubInfo>
                  <SubInfo>🏷️ Marca: {v.marca ?? "-"}</SubInfo>
                  {unidadeInfo && <SubInfo>{unidadeInfo}</SubInfo>}
                </Info>
              </Card>
            );
          })}

        {!state.loading && state.veiculos.length === 0 && (
          <TotalText>Nenhum veículo encontrado.</TotalText>
        )}
      </Container>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  searchInput: {
    height: 50,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 12,
    backgroundColor: "#fff",
  },
});
