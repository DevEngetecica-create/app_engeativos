import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
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

// ========================================================
// 🔹 Styled Components
// ========================================================
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

export default function CreateChecklist() {
  const navigation = useNavigation();
  const route = useRoute();
  const [loading, setLoading] = useState(false);

  // ========================================================
  // 🔹 Campos do formulário
  // ========================================================
  const [form, setForm] = useState({
    modelo: "",
    placa: "",
    horario: "",
    km: "",
    nivel_oleo: false,
    nivel_agua: false,
    observacoes: "",
    data: new Date().toLocaleDateString("pt-BR"),
  });

  // =============================
  // 🔹 Usuário logado
  // =============================
  const getUsuario = async () => {
    const res = await executeSql(`SELECT id, email FROM users LIMIT 1`);
    return res.length ? res[0] : { id: null, email: 'desconhecido' };
  };

  const getObra = async () => {
    const res = await executeSql(`SELECT id, codigo_obra FROM obras LIMIT 1`);
    return res.length ? res[0] : { id: null, codigo_obra: 'desconhecida' };
  };

  // ========================================================
  // 🔹 Preencher com dados da consulta de placa
  // ========================================================
  useEffect(() => {
    const fetchData = async () => {
      try {
        const usuario = await getUsuario();
        const obra = await getObra();

        const now = new Date();
        const dataFormatada = `${String(now.getDate()).padStart(2, "0")}/${String(
          now.getMonth() + 1
        ).padStart(2, "0")}/${now.getFullYear()} ${String(
          now.getHours()
        ).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(
          now.getSeconds()
        ).padStart(2, "0")}`;

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
            data_cadastro: dataFormatada, // YYYY-MM-DD
          }));

        }
      } catch (error) {
        console.error("❌ Erro ao carregar dados iniciais:", error);
      }
    };

    fetchData();
  }, [route.params]);


  // ========================================================
  // 🔹 Imagens
  // ========================================================
  const [imgHodometro, setImgHodometro] = useState(null);
  const [imgFrente, setImgFrente] = useState(null);
  const [imgLateralEsq, setImgLateralEsq] = useState(null);
  const [imgLateralDir, setImgLateralDir] = useState(null);
  const [imgTraseira, setImgTraseira] = useState(null);
  const [imgAvaria1, setImgAvaria1] = useState(null);
  const [imgAvaria2, setImgAvaria2] = useState(null);

  // ========================================================
  // 🔹 Capturar imagem (somente câmera)
  // ========================================================
  const pickImage = async (setter) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permissão negada", "É necessário permitir o uso da câmera.");
      return;
    }

    const res = await ImagePicker.launchCameraAsync({
      quality: 0.6,
      allowsEditing: true,
    });

    if (!res.canceled && res.assets?.[0]?.uri) {
      setter(res.assets[0].uri);
    }
  };

  // ========================================================
  // 🔹 Submeter formulário
  // ========================================================
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
        // 🔹 Envia para API Laravel
        const data = new FormData();
        data.append("obra_id", form.id_obra);
        data.append("veiculo_id", form.id_veiculo);
        data.append("id_user", usuario.id);
        data.append("user_create", usuario.email);
        data.append("modelo", form.modelo);
        data.append("placa", form.placa);
        data.append("horario", form.horario);
        data.append("km_anterior", form.km_anterior);
        data.append("km", form.km);
        data.append("nivel_oleo", form.nivel_oleo ? 1 : 0);
        data.append("nivel_agua", form.nivel_agua ? 1 : 0);
        data.append("observacoes", String(form.observacoes ?? ""));
        data.append("data_cadastro", form.data_cadastro);
        data.append("situacao", "retirada");

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

        const resp = await api.post("admin/ativo/veiculosAlugados/store", data, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        if (resp.data?.success) {
          showToast("✅ Checklist salvo no servidor!", "success");
        } else {
          showToast("Erro ao salvar checklist no servidor", "error");
        }
      } else {
        // 🔹 Salvar localmente no SQLite
        db.transaction((tx) => {
          tx.executeSql(
            `INSERT INTO veiculos_alugados_checklists 
            (obra_id, veiculo_id, id_user, user_create, placa, modelo, horario, km_anterior, km, nivel_oleo, nivel_agua, observacoes, data, situacao,
             foto_hodometro, foto_carro_frente, foto_carro_traseira, 
             foto_carro_esquerda, foto_carro_direita, foto_avaria_1, foto_avaria_2, sync_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [
              form.id_obra,
              form.id_veiculo,
              usuario.id,
              usuario.email,
              form.placa,
              form.modelo,
              form.horario,
              form.km_anterior,
              form.km,
              form.nivel_oleo ? 1 : 0,
              form.nivel_agua ? 1 : 0,
              form.observacoes,
              form.data,
              "retirada",
              imgHodometro,
              imgFrente,
              imgTraseira,
              imgLateralEsq,
              imgLateralDir,
              imgAvaria1,
              imgAvaria2,
              "pending",
            ],
            () => {
              showToast("💾 Checklist salvo localmente (offline)", "success");
            },
            (_, error) => {
              console.error("Erro ao salvar offline:", error);
              showToast("Erro ao salvar no modo offline", "error");
            }
          );
        });
      }

      navigation.goBack();
    } catch (e) {
      console.error("Erro ao salvar checklist:", e);
      showToast("Erro ao salvar checklist", "error");
    } finally {
      setLoading(false);
    }
  };

  // ========================================================
  // 🔹 Renderização
  // ========================================================
  return (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      <Container>

         <Text style={styles.banner}> Centro de custo: {form.codigo_obra} </Text>
        <Text style={styles.banner}> Data: {form.data_cadastro} </Text>
        <Text style={styles.banner}> Modelo: {form.modelo} </Text>
        <Text style={styles.banner}> Placa: {form.placa} </Text>
        <Text style={styles.banner}> km anterior: {form.km_anterior} </Text>

        <Label>Horário</Label>
        <Input
          placeholder="Ex: 08:00"
          value={form.horario}
          onChangeText={(t) => setForm({ ...form, horario: t })}

        />

        <Label>KM Atual</Label>
        <Input
          placeholder="Ex: 12000"
          keyboardType="numeric"
          value={form.km}
          onChangeText={(t) => setForm({ ...form, km: t })}
        />

        <Label>Observações</Label>
        <Input
          placeholder="Observações adicionais"
          multiline
          numberOfLines={3}
          value={form.observacoes}
          onChangeText={(t) => setForm({ ...form, observacoes: t })}
        />

        <Text style={styles.sectionTitle}>Adicionar Fotos Iniciais</Text>

        {[
          { label: "Hodômetro", uri: imgHodometro, setter: setImgHodometro, asset: require("../../../assets/veiculos/odometro.png") },
          { label: "Frente", uri: imgFrente, setter: setImgFrente, asset: require("../../../assets/veiculos/veiculo_frente.png") },
          { label: "Lado Esquerdo", uri: imgLateralEsq, setter: setImgLateralEsq, asset: require("../../../assets/veiculos/veiculo_lado_esq.png") },
          { label: "Lado Direito", uri: imgLateralDir, setter: setImgLateralDir, asset: require("../../../assets/veiculos/veiculo_lado_dir.png") },
          { label: "Traseira", uri: imgTraseira, setter: setImgTraseira, asset: require("../../../assets/veiculos/veiculo_traseira.png") },
        ].map(({ label, uri, setter, asset }, i) => (
          <View key={i} style={styles.imageSection}>
            <Text style={styles.label}>{label}</Text>
            <TouchableOpacity onPress={() => pickImage(setter)}>
              <View style={styles.imageContainer}>
                <Image source={uri ? { uri } : asset} style={styles.image} resizeMode="contain" />
              </View>
            </TouchableOpacity>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Fotos de Avarias (opcional)</Text>

        {[
          { label: "Avaria 1", uri: imgAvaria1, setter: setImgAvaria1 },
          { label: "Avaria 2", uri: imgAvaria2, setter: setImgAvaria2 },
        ].map(({ label, uri, setter }, i) => (
          <View key={i} style={styles.imageSection}>
            <Text style={styles.label}>{label}</Text>
            <TouchableOpacity onPress={() => pickImage(setter)}>
              <View style={styles.imageContainer}>
                <Image
                  source={uri ? { uri } : require("../../../assets/placeholder_avaria.png")}
                  style={styles.image}
                  resizeMode="contain"
                />
              </View>
            </TouchableOpacity>
          </View>
        ))}

        <Btn onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <BtnText>Salvar Checklist</BtnText>}
        </Btn>
      </Container>
    </ScrollView>
  );
}

// ========================================================
// 🔹 Estilos adicionais
// ========================================================
const styles = StyleSheet.create({
  sectionTitle: { fontWeight: "bold", fontSize: 16, color: "#333", marginTop: 16, marginBottom: 6 },
  imageSection: { marginBottom: 12 },
  banner: { fontWeight: 'bold', textAlign: 'center', marginTop: 0, color: '#333', fontSize: 15, padding: 10, backgroundColor: "#e2dadaff", borderRadius: 4 },
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
