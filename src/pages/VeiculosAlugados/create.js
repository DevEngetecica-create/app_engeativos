// ./src/pages/VeiculosAlugados/Consulta.js
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  Modal,
  ActivityIndicator,
} from "react-native";
import styled from "styled-components/native";
import api from "../../config/api";
import { useNavigation } from "@react-navigation/native";
import * as LocalAuthentication from "expo-local-authentication";
import { executeSql } from "../../config/database/database";
import emptyImg from "../../../assets/icons/empty_checklist.png";

const Container = styled.View`
  flex: 1;
  padding: 18px;
  background-color: #f8f9fa;
`;

const Input = styled.TextInput`
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
  background-color: #fff;
  text-transform: uppercase;
  font-size: 16px;
`;

const Button = styled.TouchableOpacity`
  background-color: ${({ color }) => color || "#0057a3"};
  padding: 12px;
  border-radius: 8px;
  align-items: center;
  margin-top: ${({ mt }) => mt || "10px"};
`;

const BtnText = styled.Text`
  color: #fff;
  font-weight: bold;
  font-size: 16px;
`;

const Card = styled.View`
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-top: 18px;
  elevation: 3;
  shadow-color: #000;
  shadow-opacity: 0.1;
  shadow-radius: 4px;
  shadow-offset: 0px 2px;
`;

const Row = styled.View`
  flex-direction: row;
  align-items: flex-start;
`;

const Info = styled.View`
  flex: 1;
  padding-right: 8px;
`;

const VehicleImage = styled.Image`
  width: 200px;
  height: 200px;
  border-radius: 8px;
  border: 2px solid #bbb;
`;

const Status = styled.Text`
  font-weight: bold;
  font-size: 16px;
  color: ${({ status }) =>
    status === "Aberto"
      ? "#f39c12"
      : status === "Encerrado"
      ? "#2ecc71"
      : "#999"};
`;

export default function ConsultaPlaca() {
  const [placa, setPlaca] = useState("");
  const [dados, setDados] = useState(null);
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [senhaDigitada, setSenhaDigitada] = useState("");
  const [confirmacaoBiometria, setConfirmacaoBiometria] = useState(false);

  const navigation = useNavigation();

  // Buscar usuário logado e biometria habilitada
  React.useEffect(() => {
    const fetchUser = async () => {
      const res = await executeSql(`SELECT * FROM users LIMIT 1`);
      if (res.length) setUsuario(res[0]);
    };
    fetchUser();
  }, []);

  const consultar = async () => {
    if (!placa) {
      Alert.alert("Atenção", "Digite uma placa para consultar.");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.get(`/veiculos/checklist/consultar?placa=${placa}`);
      if (data.success) {

        console.log(data.km_anterior)

        setDados(data);
      } else {
        Alert.alert("Atenção", data.message);
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Falha na consulta.";
      setDados(null);
      Alert.alert("Atenção", msg);
    } finally {
      setLoading(false);
    }
  };

  // ===================================================
  // 🔹 Validação biométrica
  // ===================================================
  const autenticarBiometria = async () => {
    const isEnrolled = await LocalAuthentication.hasHardwareAsync();
    if (!isEnrolled) {
      Alert.alert("Dispositivo sem suporte biométrico.");
      return false;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Confirme sua identidade",
      cancelLabel: "Cancelar",
    });

    if (result.success) {
      setConfirmacaoBiometria(true);
      return true;
    } else {
      Alert.alert("Biometria não confirmada.");
      return false;
    }
  };

  // ===================================================
  // 🔹 Enviar aceite (senha ou biometria)
  // ===================================================
  const confirmarAssumir = async () => {
    if (!usuario) return;

    if (!confirmacaoBiometria && !senhaDigitada) {
      Alert.alert("Atenção", "É necessário confirmar via biometria ou senha.");
      return;
    }

    setModalVisible(false);
    Alert.alert(
      "Confirmação",
      "Responsabilidade assumida. Continue para o checklist.",
      [
        {
          text: "OK",
          onPress: () =>
            navigation.navigate("ChecklistDevolucao", { veiculo: dados.veiculo }),
        },
      ]
    );
  };

  // ===================================================
  // 🔹 Renderização
  // ===================================================
  return (
    <Container>
      <Text style={styles.title}>Consulta de Veículo</Text>

      <Input
        placeholder="Digite a placa (ex: ABC1D23)"
        value={placa}
        onChangeText={setPlaca}
        autoCapitalize="characters"
      />

      <Button onPress={consultar}>
        {loading ? <ActivityIndicator color="#fff" /> : <BtnText>🔍 Pesquisar</BtnText>}
      </Button>

      {dados ? (
        dados.success ? (
          <Card>
            <Row>
              <Info>
                <Text style={styles.label}>Placa:</Text>
                <Text style={styles.value}>{dados.veiculo.placa}</Text>

                <Text style={styles.label}>Modelo:</Text>
                <Text style={styles.value}>{dados.veiculo.modelo ?? "-"}</Text>

                <Text style={styles.label}>Situação:</Text>
                <Status status={dados.situacao}>{dados.situacao ?? "-"}</Status>

                <Text style={styles.label}>Km atual:</Text>
                <Text style={styles.value}>{dados.km_anterior ?? 0}</Text>
              </Info>

              <VehicleImage
                source={
                  dados.veiculo?.imagem
                    ? { uri: `https://sga-engeativos.com.br/imagens/veiculos/${dados.veiculo.id}/${dados.veiculo.imagem}` }
                    : require("../../../assets/veiculos/servico.png")
                }
                resizeMode="cover"
              />
            </Row>

            {dados.situacao === "Aberto" ? (
              <>
                <Button color="#f39c12" mt="15px" onPress={() => setModalVisible(true)}>
                  <BtnText>⚠️ Assumir Responsabilidade</BtnText>
                </Button>
              </>
            ) : (
              <Button color="#27ae60" mt="15px" onPress={() => navigation.navigate("ChecklistRetirada", { veiculo: dados.veiculo })}>
                <BtnText>🚗 Iniciar Checklist</BtnText>
              </Button>
            )}
          </Card>
        ) : (
          <View style={styles.emptyBox}>
            <Image source={emptyImg} style={styles.image} resizeMode="contain" />
            <Text style={styles.emptyText}>Nenhum registro encontrado</Text>
          </View>
        )
      ) : (
        <View style={styles.emptyBox}>
          <Image source={emptyImg} style={styles.image} resizeMode="contain" />
          <Text style={styles.emptyText}>Digite a placa e clique em Pesquisar</Text>
        </View>
      )}

      {/* ===================================================
          🔹 Modal de Confirmação Responsabilidade
      =================================================== */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Assumir Responsabilidade</Text>
            <Text style={styles.modalText}>
              Você está prestes a assumir a responsabilidade pelo veículo{" "}
              <Text style={{ fontWeight: "bold" }}>{placa}</Text>. 
              Confirme sua identidade antes de prosseguir.
            </Text>

            {usuario?.biometria === 1 && (
              <Button color="#2ecc71" mt="15px" onPress={autenticarBiometria}>
                <BtnText>✅ Confirmar com Biometria</BtnText>
              </Button>
            )}

            <TextInput
              placeholder="Digite sua senha de acesso"
              value={senhaDigitada}
              onChangeText={setSenhaDigitada}
              secureTextEntry
              style={styles.inputSenha}
            />

            <Button color="#0057a3" mt="10px" onPress={confirmarAssumir}>
              <BtnText>Confirmar e Continuar</BtnText>
            </Button>

            <Button color="#999" mt="10px" onPress={() => setModalVisible(false)}>
              <BtnText>Cancelar</BtnText>
            </Button>
          </View>
        </View>
      </Modal>
    </Container>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: "bold", fontSize: 18, marginBottom: 16, color: "#333" },
  label: { fontWeight: "bold", fontSize: 14, color: "#555", marginTop: 6 },
  value: { fontSize: 15, color: "#000" },
  emptyBox: { flex: 1, alignItems: "center", marginTop: 50 },
  image: { width: 180, height: 180, marginBottom: 12 },
  emptyText: { color: "#555", fontSize: 14 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "#fff",
    width: "85%",
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#333", marginBottom: 10 },
  modalText: { fontSize: 14, color: "#444", marginBottom: 10 },
  inputSenha: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
    backgroundColor: "#fff",
  },
});
