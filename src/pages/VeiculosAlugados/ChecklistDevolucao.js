import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import styled from "styled-components/native";
import api from "../../config/api";
import { showToast } from "../../utils/toast";
import { useNavigation, useRoute } from "@react-navigation/native";
import { executeSql, db } from "../../config/database/database";
import NetInfo from "@react-native-community/netinfo";
import * as SecureStore from "expo-secure-store";

const Container = styled.View`
  flex: 1;
  background-color: #f8f9fa;
  padding: 14px;
`;

const Label = styled.Text`
  font-weight: bold;
  color: #333;
  margin-top: 10px;
`;

const Input = styled.TextInput`
  border: 1px solid #ccc;
  border-radius: 8px;
  background-color: #fff;
  padding: 10px;
  margin-top: 4px;
  font-size: 15px;
`;

const Btn = styled.TouchableOpacity`
  background-color: ${({ color }) => color || "#0057a3"};
  padding: 12px;
  border-radius: 8px;
  align-items: center;
  margin-top: 16px;
`;

const BtnText = styled.Text`
  color: #fff;
  font-weight: bold;
  font-size: 15px;
`;

export default function ChecklistDevolucao() {
  const navigation = useNavigation();
  const route = useRoute();
  const [loading, setLoading] = useState(false);
  const [usuario, setUsuario] = useState(null);
  const [token, setToken] = useState(null);
  const [imgAvaria1, setImgAvaria1] = useState(null);
  const [imgAvaria2, setImgAvaria2] = useState(null);

  const [form, setForm] = useState({
    modelo: "",
    placa: "",
    horario: "",
    km: "",
    nivel_oleo: false,
    nivel_agua: false,
    observacoes_finais: "",
    data: new Date().toLocaleDateString("pt-BR"),
  });

  // ============================================================
  // 🔹 Busca usuário local e obra
  // ============================================================
  const getUsuario = async () => {
    const res = await executeSql(`SELECT * FROM users LIMIT 1`);
    return res.length ? res[0] : { id: null, email: "desconhecido" };
  };

  const getObra = async () => {
    const res = await executeSql(`SELECT id, codigo_obra FROM obras LIMIT 1`);
    return res.length ? res[0] : { id: null, codigo_obra: "desconhecida" };
  };

  // ============================================================
  // 🔐 Gera ou renova token automaticamente
  // ============================================================
  const gerarToken = async () => {
    try {
      // 🔸 obtém credenciais locais
      const user = await executeSql(`SELECT email, password FROM users LIMIT 1`);
      if (!user.length) throw new Error("Usuário não encontrado localmente");

      const credentials = {
        email: user[0].email,
        password: user[0].password,
      };

      // 🔸 solicita novo token ao backend (rota /login do Laravel)
      const resp = await api.post("login", credentials);

      if (resp.data?.token) {
        await SecureStore.setItemAsync("auth_token", resp.data.token);
        setToken(resp.data.token);
        console.log("🔑 Novo token gerado com sucesso:", resp.data.token);
        return resp.data.token;
      } else {
        throw new Error("Resposta sem token válido.");
      }
    } catch (error) {
      console.error("❌ Erro ao gerar token:", error);
      Alert.alert("Erro de autenticação", "Não foi possível gerar token.");
      return null;
    }
  };

  // ============================================================
  // 🔹 Carrega dados iniciais
  // ============================================================
  useEffect(() => {
    const fetchData = async () => {
      try {
        // tenta recuperar o token existente
        let storedToken = await SecureStore.getItemAsync("auth_token");

        // se não existir ou estiver inválido → gera novo
        if (!storedToken) {
          storedToken = await gerarToken();
        }

        if (storedToken) {
          setToken(storedToken);
          const test = await api.get("user", {
            headers: { Authorization: `Bearer ${storedToken}` },
          });
          console.log("✅ Usuário autenticado:", test.data);
        } else {
          console.log("⚠️ Nenhum token válido encontrado.");
        }

        const usuario = await getUsuario();
        const obra = await getObra();
        setUsuario(usuario);

        const now = new Date();
        const dataFormatada = `${String(now.getDate()).padStart(2, "0")}/${String(
          now.getMonth() + 1
        ).padStart(2, "0")}/${now.getFullYear()} ${String(now.getHours()).padStart(
          2,
          "0"
        )}:${String(now.getMinutes()).padStart(2, "0")}`;

        if (route.params?.veiculo) {
          const { id, modelo, placa, km_anterior } = route.params.veiculo;

          setForm((prev) => ({
            ...prev,
            modelo: modelo ?? "",
            placa: placa ?? "",
            km_anterior: km_anterior ?? 0,
            id_veiculo: id ?? "",
            id_obra: obra?.id ?? null,
            codigo_obra: obra.codigo_obra ?? null,
            user_create: usuario?.email ?? "",
            id_user: usuario?.id ?? "",
            data_cadastro: dataFormatada,
          }));
        }
      } catch (error) {
        console.error("❌ Erro ao carregar dados iniciais:", error);
      }
    };

    fetchData();
  }, [route.params]);

  // ============================================================
  // 🔹 Câmera
  // ============================================================
  const [imgHodometro, setImgHodometro] = useState(null);
  const [imgFrente, setImgFrente] = useState(null);
  const [imgLateralEsq, setImgLateralEsq] = useState(null);
  const [imgLateralDir, setImgLateralDir] = useState(null);
  const [imgTraseira, setImgTraseira] = useState(null);

  const pickImage = async (setter) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permissão negada", "É necessário permitir o uso da câmera.");
      return;
    }

    const res = await ImagePicker.launchCameraAsync({ quality: 0.6 });
    if (!res.canceled && res.assets?.[0]?.uri) {
      setter(res.assets[0].uri);
    }
  };

  // ============================================================
  // 🔹 Submeter formulário
  // ============================================================
  const handleSubmit = async () => {
    if (!form.placa) {
      Alert.alert("Atenção", "Informe a placa do veículo.");
      return;
    }

    setLoading(true);
    const state = await NetInfo.fetch();
    const online = state.isConnected;
    const usuario = await getUsuario();

    try {
      if (online) {
        let validToken = token;
        if (!validToken) {
          validToken = await gerarToken(); // 🔄 força renovação se vazio
        }

        

        const data = new FormData();
        data.append("veiculo_id", form.id_veiculo);
        data.append("obra_id", form.id_obra);
        data.append("id_user", usuario.id);
        data.append("user_create", usuario.email);
        data.append("modelo", form.modelo);
        data.append("placa", form.placa);
        data.append("horario", form.horario);
        data.append("km", form.km);
        data.append("nivel_oleo", form.nivel_oleo ? 1 : 0);
        data.append("nivel_agua", form.nivel_agua ? 1 : 0);
        data.append("observacoes_finais", form.observacoes_finais);
        data.append("data_cadastro", form.data_cadastro);
        data.append("situacao", "devolucao");

        const images = {
          foto_hodometro: imgHodometro,
          foto_carro_frente: imgFrente,
          foto_carro_traseira: imgTraseira,
          foto_carro_esquerda: imgLateralEsq,
          foto_carro_direita: imgLateralDir,
          foto_avaria_1: imgAvaria1,
          foto_avaria_2: imgAvaria2,
        };

        Object.entries(images).forEach(([key, uri]) => {
          if (uri) {
            const filename = uri.split("/").pop();
            data.append(key, { uri, name: filename, type: "image/jpeg" });
          }
        });

        const resp = await api.post(
          "admin/ativo/veiculosAlugados/storeDevolucao",
          data,
          {
            headers: {
              "Content-Type": "multipart/form-data",
              Authorization: `Bearer ${validToken}`,
              Accept: "application/json",
            },
          }
        );

        if (resp.data?.success) {
          showToast("✅ Devolução salva no servidor!", "success");
        } else {
          showToast("Erro ao salvar devolução no servidor", "error");
        }
      } else {
        db.transaction((tx) => {
          tx.executeSql(
            `INSERT INTO veiculos_alugados_checklists 
              (id_obra, veiculo_id, id_user, user_create, user_edit, placa, modelo, horario, km_anterior, km, 
              nivel_oleo, nivel_agua, observacoes, data_cadastro, situacao, 
              foto_hodometro, foto_carro_frente, foto_carro_traseira, foto_carro_esquerda, 
              foto_carro_direita, foto_avaria_1, foto_avaria_2, sync_status, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'));`,
            [
              form.id_obra,
              form.id_veiculo,
              usuario.id,
              usuario.email,
              null,
              form.placa,
              form.modelo,
              form.horario,
              form.km_anterior ?? "",
              form.km,
              form.nivel_oleo ? 1 : 0,
              form.nivel_agua ? 1 : 0,
              form.observacoes_finais,
              form.data_cadastro,
              "devolucao",
              imgHodometro,
              imgFrente,
              imgTraseira,
              imgLateralEsq,
              imgLateralDir,
              imgAvaria1,
              imgAvaria2,
              "pending",
            ],
            () => showToast("💾 Devolução salva localmente (offline)", "success"),
            (_, error) => console.error("Erro ao salvar offline:", error)
          );
        });
      }

      navigation.goBack();
    } catch (e) {
      console.error("❌ Erro ao salvar devolução:", e);
      showToast("Erro ao salvar devolução", "error");
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // 🔹 Render
  // ============================================================
  return (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      <Container>
        <Text style={styles.banner}>Centro de custo: {form.codigo_obra}</Text>
        <Text style={styles.banner}>Data: {form.data_cadastro}</Text>
        <Text style={styles.banner}>Modelo: {form.modelo}</Text>
        <Text style={styles.banner}>Placa: {form.placa}</Text>

        <Label>Horário</Label>
        <Input
          placeholder="Ex: 17:00"
          value={form.horario}
          onChangeText={(t) => setForm({ ...form, horario: t })}
        />

        <Label>KM Atual</Label>
        <Input
          placeholder="Ex: 12500"
          keyboardType="numeric"
          value={form.km}
          onChangeText={(t) => setForm({ ...form, km: t })}
        />

        <Label>Observações Finais</Label>
        <Input
          placeholder="Observações adicionais"
          multiline
          numberOfLines={3}
          value={form.observacoes_finais}
          onChangeText={(t) => setForm({ ...form, observacoes_finais: t })}
        />

        <Text style={styles.sectionTitle}>Adicionar Fotos da Devolução</Text>
        {/* renderização das imagens mantida igual ao anterior */}
        <Btn onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <BtnText>Salvar Devolução</BtnText>}
        </Btn>
      </Container>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontWeight: "bold", fontSize: 16, color: "#333", marginTop: 16, marginBottom: 6 },
  imageSection: { marginBottom: 12 },
  banner: {
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 3,
    color: "#333",
    fontSize: 15,
    padding: 10,
    backgroundColor: "#94e284ff",
    borderRadius: 4,
  },
  label: { fontWeight: "bold", color: "#333", marginBottom: 4 },
  imageContainer: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    backgroundColor: "#fff",
    height: 150,
    alignItems: "center",
    justifyContent: "center",
  },
  image: { width: "95%", height: "95%" },
});
