import React, { useCallback, useState } from "react";
import {
  FlatList,
  RefreshControl,
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import styled from "styled-components/native";
import { Ionicons,MaterialIcons,  MaterialCommunityIcons } from "@expo/vector-icons";
import api from "../../config/api";
import { db } from "../../config/database/database";
import { useAuth } from "../../contexts/auth";
import { showToast } from "../../utils/toast";

// ✅ Imagem ilustrativa (caso esteja vazia)
import EmptyChecklist from "../../../assets/icons/empty_checklist.png";

// =============================
// 🔹 Styled Components
// =============================
const Container = styled.View`
  flex: 1;
  background-color: #f8f9fa;
  padding: 12px;
`;

const Card = styled.TouchableOpacity`
  background-color: #fff;
  border-radius: 12px;
  padding: 14px;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  elevation: 2;
`;

const Info = styled.View`
  flex: 1;
`;

const Title = styled.Text`
  font-size: 16px;
  font-weight: bold;
  color: #333;
`;

const Subtitle = styled.Text`
  color: #666;
  font-size: 13px;
`;

const StatusBadge = styled.View`
  background-color: ${(props) => (props.$status === "Aberto" ? "#e67e22" : "#2ecc71")};
  padding: 4px 10px;
  border-radius: 8px;
`;

const StatusText = styled.Text`
  color: #fff;
  font-weight: bold;
  font-size: 12px;
`;

// =============================
// 🔹 Componente Principal
// =============================
export default function ChecklistIndex() {
  const { connectionMode } = useAuth();
  const modoOnline = connectionMode === "online";
  const navigation = useNavigation();

  const [checklists, setChecklists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // =============================
  // 🔹 SQLite (Offline)
  // =============================
  const fetchOffline = async () => {
    return new Promise((resolve) => {
      db.transaction((tx) => {
        tx.executeSql(
          `SELECT id, placa, modelo, situacao, data FROM veiculos_alugados_checklists ORDER BY id DESC LIMIT 5;`,
          [],
          (_, { rows }) => resolve(rows._array || []),
          (_, error) => {
            console.error("Erro SQLite:", error);
            resolve([]);
          }
        );
      });
    });
  };

  // =============================
  // 🔹 API (Online)
  // =============================
  const fetchOnline = async () => {
    const { data } = await api.get("admin/ativo/veiculosAlugados/checklist");

    console.log(data)


    if (data.success) return data.data;
    return [];
  };


  // =============================
  // 🔹 Carregar Dados
  // =============================
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = modoOnline ? await fetchOnline() : await fetchOffline();
      setChecklists(result);
    } catch (error) {
      console.error("Erro ao carregar:", error);
      showToast("Erro ao carregar checklists", "error");
    } finally {
      setLoading(false);
    }
  }, [modoOnline]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // =============================
  // 🔹 Interface
  // =============================
  if (loading && !refreshing) {
    return (
      <Container style={{ justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#0057a3" />
        <Text style={{ color: "#555", marginTop: 10 }}>Carregando...</Text>
      </Container>
    );
  }

  const renderHeader = () => (
    <TouchableOpacity
      style={styles.btnPrimary}
      onPress={() => navigation.navigate("ChecklistCreate")}
    >
      <Ionicons name="add-circle-outline" size={20} color="#fff" />
      <Text style={styles.btnText}>Novo Checklist</Text>
    </TouchableOpacity>
  );

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={{ alignItems: "center", marginTop: 40 }}>
        <Image
          source={EmptyChecklist}
          style={{ width: 220, height: 220, marginBottom: 10 }}
          resizeMode="contain"
        />
        <Text style={{ color: "#666", fontSize: 16 }}>Nenhum checklist encontrado</Text>
      </View>
    );
  };

  const renderItem = ({ item }) => (
    <Card onPress={() => navigation.navigate("ChecklistShow", { id: item.id })}>
      <Info>
        <Title>{item.modelo || "Modelo não informado"}</Title>
        <Subtitle>Placa: {item.placa || "-"}</Subtitle>
        <Subtitle>Data: {item.data || "-"}</Subtitle>
      </Info>
      <StatusBadge $status={item.status}>
        <StatusText>{item.status}</StatusText>
      </StatusBadge>
    </Card>
  );

  return (
    <Container>
      <FlatList
        data={checklists}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
    </Container>
  );
}

// =============================
// 🔹 Estilos extras
// =============================
const styles = StyleSheet.create({
  btnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0057a3",
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  btnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
    marginLeft: 8,
  },
});
