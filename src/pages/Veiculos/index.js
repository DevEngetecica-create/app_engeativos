// src/pages/Veiculos/index.js
import React, { useCallback, useState, useRef } from "react";
import { FlatList, Text, StyleSheet, TextInput, View, TouchableOpacity, Alert } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Camera, useCameraDevice, useCameraPermission, useCodeScanner, useFrameProcessor } from 'react-native-vision-camera';
import { scanOCR } from '@ismaelmoreiraa/vision-camera-ocr';
import { useRunOnJS } from 'react-native-worklets-core';
import styled from "styled-components/native";
import Toast from "react-native-root-toast";

import ErrorAlert from "../../components/ErrorAlert";
import Loading from "../../components/Loading";
import api from "../../config/api";
import { db } from "../../config/database/database";
import { useAuth } from "../../contexts/auth";
import { parseApiResponsePayload } from "../../utils/apiResponse";

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
  const { connectionMode, id_nivel, user } = useAuth();
  const modoOnline = connectionMode === "online";

  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');

  const [isScanning, setIsScanning] = useState(false);
  const [scanMode, setScanMode] = useState('qr'); // 'qr' ou 'ocr'

  // Pegando id_nivel de dados_func ou diretamente do user como fallback
  const currentLevel = Number(id_nivel) || Number(user?.id_nivel) || 0;

  const [state, setState] = useState({
    loading: false,
    error: null,
    veiculos: [],
    count: 0,
    page: 0,
    hasMore: true,
  });

  const [searchQuery, setSearchQuery] = useState("");

  const LIMIT = 15;

  const baseImageUrl = "https://sga-engeativos.com.br/imagens/veiculos";

  // ===============================
  // 🔹 Buscar online
  // ===============================
  const fetchOnline = useCallback(async () => {
    
    Toast.show("🟢 Carregando veículos online...", { duration: 1000 });

    const resp = await api.get("admin/ativo/veiculo");

    let responseData = resp?.data;

    responseData = parseApiResponsePayload(responseData);

    if (!responseData?.status) {
      throw new Error(responseData?.message || "Falha ao obter veículos.");
    }

    const veiculos = responseData.veiculos || [];

    // 🔸 Atualiza cache local no SQLite
    db.transaction((tx) => {
      tx.executeSql("DELETE FROM veiculos;"); // limpa para evitar duplicados
      veiculos.forEach((v) => {
        tx.executeSql(
          `INSERT OR REPLACE INTO veiculos 
           (id, obra_id, prefixo, placa, marca, modelo, imagem, tipo, tipo_km, tipo_hr) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            v.id,
            v.obra_id ?? v.id_obra ?? null,
            v.prefixo ?? null,
            v.placa ?? null,
            v.marca ?? null,
            v.modelo ?? null,
            v.imagem ?? null,
            v.tipo ?? null,
            v.tipo_km ?? null,
            v.tipo_hr ?? null,
          ]
        );
      });
    });

    return { veiculos, count: veiculos.length };
  }, []);

  // ===============================
  // 🔹 Buscar offline (SQLite com Filtro e Paginação)
  // ===============================
  const fetchOffline = useCallback(async (query = "", page = 0) => {
    return new Promise((resolve, reject) => {
      db.transaction((tx) => {
        const sqlLike = `%${query}%`;
        const offset = page * LIMIT;

        // Pega Total
        tx.executeSql(
          `SELECT COUNT(*) as total FROM veiculos WHERE prefixo LIKE ?;`,
          [sqlLike],
          (_, { rows }) => {
            const count = rows.item(0).total;

            // Pega Registros
            tx.executeSql(
              `SELECT * FROM veiculos WHERE prefixo LIKE ? ORDER BY prefixo ASC LIMIT ? OFFSET ?;`,
              [sqlLike, LIMIT, offset],
              (_, { rows: resultRows }) => {
                resolve({
                  newVeiculos: resultRows._array,
                  count,
                  hasMore: resultRows._array.length === LIMIT,
                });
              },
              (_, error) => reject(error)
            );
          },
          (_, error) => reject(error)
        );
      });
    });
  }, []);

  // ===============================
  // 🔹 Carregar lista
  // ===============================
  const loadVeiculos = useCallback(async (page = 0, query = searchQuery, append = false, syncOnline = false) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      // 🚨 Sincroniza online apenas no pull-to-refresh ou mount inicial
      if (modoOnline && page === 0 && !append && syncOnline) {
        try {
          await fetchOnline();
        } catch (err) {
          // Alterado para log silencioso, evitando a tela amarela no LogBox
        }
      }

      const { newVeiculos, count, hasMore } = await fetchOffline(query, page);

      setState((s) => ({
        ...s,
        loading: false,
        error: null,
        veiculos: append ? [...s.veiculos, ...newVeiculos] : newVeiculos,
        count,
        page,
        hasMore,
      }));
    } catch (error) {
      setState((s) => ({ ...s, loading: false, error }));
    }
  }, [modoOnline, fetchOnline, fetchOffline, searchQuery]);

  // Efeito ao focar a tela.
  //
  // Comportamento: sempre que a tela ganha foco — entrada inicial OU volta
  // de uma tela-filho (ex.: cadastro de checklist) —, ZERAMOS o estado:
  //   - searchQuery em branco
  //   - lista vazia, page=0, count=0
  //
  // Motivos:
  //   1. UX: usuário voltou do checklist e espera fazer um novo scan,
  //      não ver resultados antigos.
  //   2. Bug evitado: havia stale closure aqui — a deps era [modoOnline],
  //      então o loadVeiculos capturado podia rodar com searchQuery vazio
  //      (closure) enquanto a UI ainda mostrava "Buscando por: ac-001",
  //      resultando em LIKE '%%' que retornava TODOS os veículos.
  //
  // Se precisar de sync online ao entrar, dispare via pull-to-refresh
  // (o handler onRefresh já chama loadVeiculos(0, searchQuery, false, true)).
  useFocusEffect(
    useCallback(() => {
      setSearchQuery("");
      setState({
        loading: false,
        error: null,
        veiculos: [],
        count: 0,
        page: 0,
        hasMore: true,
      });
    }, [])
  );

  // Filtro de Pesquisa com Debounce para não travar o teclado
  const searchTimeout = useRef(null);

  const handleSearch = (text) => {
    setSearchQuery(text);

    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    searchTimeout.current = setTimeout(() => {
      // 🚨 Busca APENAS no SQLite para ser instantâneo e não congelar
      loadVeiculos(0, text, false, false);
    }, 400); // 400ms debounce
  };

  const loadMore = () => {
    if (!state.loading && state.hasMore) {
      loadVeiculos(state.page + 1, searchQuery, true);
    }
  };

  const startScan = async () => {
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        Alert.alert("Permissão negada", "É necessário acesso à câmera para escanear o veículo.");
        return;
      }
    }
    if (!device) {
      Alert.alert("Erro", "Nenhuma câmera traseira encontrada neste dispositivo.");
      return;
    }
    setScanMode('qr'); // Começa sempre no modo QR Code
    setIsScanning(true);
  };

  // Lida com o texto encontrado pelo OCR de forma síncrona com o JS
  const handleOcrResult = useCallback((texto) => {
    if (!isScanning) return;

    // Expressão regular robusta: Letras(2-3) + Traço (opcional) + Números(3)
    const match = texto.match(/[A-Z]{2,3}\s*-?\s*\d{3}/i);

    if (match) {
      let prefixo = match[0].toUpperCase().replace(/\s+/g, '');
      if (!prefixo.includes('-')) {
        const letras = prefixo.replace(/[0-9]/g, '');
        const numeros = prefixo.replace(/[^0-9]/g, '');
        prefixo = `${letras}-${numeros}`;
      }

      // Bloqueia complementos pegando apenas os 7 primeiros caracteres
      if (prefixo.length > 7) {
        prefixo = prefixo.substring(0, 7);
      }

      setIsScanning(false);
      setSearchQuery(prefixo);
      loadVeiculos(0, prefixo, false, false);
      Toast.show(`OCR Lido: ${prefixo}`, { duration: Toast.durations.SHORT });
    }
  }, [isScanning, setSearchQuery, loadVeiculos]);

  // Cria o conector para a thread do Javascript apenas UMA vez para evitar sobrecarga de memória (crash)
  const processDataOnJS = useRunOnJS(handleOcrResult, [handleOcrResult]);

  // Processador de Quadros em C++ / Worklets
  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    if (isScanning && scanMode === 'ocr') {
      const data = scanOCR(frame);
      if (data?.result?.text) {
        processDataOnJS(data.result.text);
      }
    }
  }, [isScanning, scanMode, processDataOnJS]);

  // Scanner de QR Code Nativo (Fallback/Duplo)
  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'ean-13', 'code-128', 'code-39'],
    onCodeScanned: (codes) => {
      if (codes.length > 0 && isScanning && scanMode === 'qr') {
        let data = codes[0].value;

        // Bloqueia complementos pegando apenas os 7 primeiros caracteres
        // Ex: CM-002GD-002 vira CM-002G (se o pai tiver 7)
        if (data.length > 7) {
          data = data.substring(0, 7);
        }

        setIsScanning(false);
        setSearchQuery(data);
        loadVeiculos(0, data, false, false);
        Toast.show(`QR Code lido: ${data}`, { duration: Toast.durations.SHORT });
      }
    }
  });

  // ===============================
  // 🔹 Renderização
  // ===============================

  // Controle do Refresh Manual (Pull-to-refresh)
  const [isRefreshing, setIsRefreshing] = useState(false);

  const onRefreshManual = async () => {
    setIsRefreshing(true);
    await loadVeiculos(0, searchQuery, false, true);
    setIsRefreshing(false);
  };

  const renderEmpty = () => {
    if (state.loading && !isRefreshing) return null;
    return <TotalText>Nenhum veículo encontrado.</TotalText>;
  };

  const renderItem = ({ item: v }) => {
    const icon = v.tipo == 4 ? "🚜" : "🚛";
    const unidadeInfo = v.maiorValor && v.unidade ? `🔧 ${v.maiorValor} ${v.unidade}` : null;

    return (
      <Card
        activeOpacity={0.9}
        onPress={() => navigation.navigate("VeiculosDetalhes", { id: v.id })}
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
          <SubInfo>🏷️ Marca: {v.marca ?? "-"}</SubInfo>
          {unidadeInfo && <SubInfo>{unidadeInfo}</SubInfo>}
        </Info>
      </Card>
    );
  };

  if (isScanning && device) {
    return (
      <View style={{ flex: 1 }}>
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={isScanning}
          frameProcessor={scanMode === 'ocr' ? frameProcessor : undefined}
          pixelFormat={scanMode === 'ocr' ? "yuv" : undefined}
          codeScanner={scanMode === 'qr' ? codeScanner : undefined}
        />

        {/* Overlay de Enquadramento */}
        <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', zIndex: 1 }]} pointerEvents="none">
          <View style={{
            width: 250,
            height: 250,
            borderWidth: 2,
            borderColor: 'rgba(255, 255, 255, 0.3)',
            borderRadius: 24,
            backgroundColor: 'transparent'
          }}>
            {/* Cantoneiras Visuais */}
            <View style={{ position: 'absolute', top: -2, left: -2, width: 50, height: 50, borderTopWidth: 5, borderLeftWidth: 5, borderColor: '#007AFF', borderTopLeftRadius: 24 }} />
            <View style={{ position: 'absolute', top: -2, right: -2, width: 50, height: 50, borderTopWidth: 5, borderRightWidth: 5, borderColor: '#007AFF', borderTopRightRadius: 24 }} />
            <View style={{ position: 'absolute', bottom: -2, left: -2, width: 50, height: 50, borderBottomWidth: 5, borderLeftWidth: 5, borderColor: '#007AFF', borderBottomLeftRadius: 24 }} />
            <View style={{ position: 'absolute', bottom: -2, right: -2, width: 50, height: 50, borderBottomWidth: 5, borderRightWidth: 5, borderColor: '#007AFF', borderBottomRightRadius: 24 }} />
          </View>
        </View>

        <View style={{ flex: 1, backgroundColor: 'transparent', justifyContent: 'flex-end', padding: 20, zIndex: 2 }}>
          <View style={{ backgroundColor: 'rgba(0,0,0,0.7)', padding: 10, borderRadius: 8, marginBottom: 15 }}>
            <Text style={{ color: '#fff', textAlign: 'center', fontSize: 16, fontWeight: 'bold' }}>
              {scanMode === 'qr' ? 'Modo QR Code' : 'Modo Leitura de Texto (OCR)'}
            </Text>
            <Text style={{ color: '#ddd', textAlign: 'center', fontSize: 14, marginTop: 4 }}>
              {scanMode === 'qr' ? 'Aponte para o código de barras ou QR Code' : 'Aponte para o prefixo (Ex: CM-002)'}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
            <TouchableOpacity
              style={{ backgroundColor: scanMode === 'qr' ? '#007AFF' : '#555', padding: 12, borderRadius: 10, flex: 1, marginRight: 5, alignItems: 'center' }}
              onPress={() => setScanMode('qr')}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>QR Code</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ backgroundColor: scanMode === 'ocr' ? '#007AFF' : '#555', padding: 12, borderRadius: 10, flex: 1, marginLeft: 5, alignItems: 'center' }}
              onPress={() => setScanMode('ocr')}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Texto (OCR)</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={{ backgroundColor: '#ff3b30', padding: 15, borderRadius: 10, alignItems: 'center' }}
            onPress={() => setIsScanning(false)}
          >
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <Container>
      <View style={{ marginBottom: 16 }}>
        <TouchableOpacity
          style={{ backgroundColor: '#007AFF', padding: 15, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}
          onPress={startScan}
          activeOpacity={0.8}
        >
          <Text style={{ fontSize: 20, marginRight: 10 }}>📷</Text>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>Escanear QR Code</Text>
        </TouchableOpacity>

        {/* O campo abaixo apenas exibe o resultado do scanner, sem permitir digitação manual 
        <TextInput
          style={[styles.searchInput, { marginBottom: 5, marginTop: 10, textAlign: 'center', backgroundColor: '#f0f0f0', color: '#333' }]}
          placeholder="Resultado do scanner"
          value={searchQuery}
          editable={true}
          returnKeyType="search"
          autoCapitalize="characters"
        />*/}

        <TextInput
          style={[styles.searchInput, { marginBottom: 5, marginTop: 10, textAlign: 'center', backgroundColor: '#f0f0f0', color: '#333' }]}
          placeholder="Digite o prefixo ou escaneie"
          value={searchQuery}
          onChangeText={handleSearch}
          editable={true}
          returnKeyType="search"
          autoCapitalize="characters"
          autoCorrect={false}
          onSubmitEditing={() => loadVeiculos(0, searchQuery, false, modoOnline)}
        />


        {searchQuery ? (
          <Text style={{ marginTop: 10, fontSize: 15, color: '#333' }}>
            Buscando por: <Text style={{ fontWeight: 'bold' }}>{searchQuery}</Text>
          </Text>
        ) : (
          <Text style={{ marginTop: 10, fontSize: 14, color: '#666', textAlign: 'center' }}>
            Aponte a câmera para o código.
          </Text>
        )}
      </View>
      <ErrorAlert errors={state.error} />

      {/* Para o nível 25, só exibe o total e a lista se tiver buscado algo */}
      {(searchQuery !== "") && (
        <>
          <TotalText>Total de veículos: {state.count}</TotalText>

          {state.loading && state.page === 0 && !isRefreshing && <Loading />}

          <FlatList
            data={state.veiculos}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            ListEmptyComponent={renderEmpty}
            contentContainerStyle={{ flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
            initialNumToRender={10}
            maxToRenderPerBatch={15}
            windowSize={5}
            onEndReached={loadMore}
            onEndReachedThreshold={0.3}
            refreshing={isRefreshing}
            onRefresh={onRefreshManual}
            ListFooterComponent={state.loading && state.page > 0 ? <Loading /> : null}
          />
        </>
      )}
    </Container>
  );
}

const styles = StyleSheet.create({
  searchInput: {
    height: 50,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    fontSize: 16,
  },
  ouTexto: {
    textAlign: 'center',
    marginVertical: 12,
    color: '#888',
    fontWeight: 'bold',
    fontSize: 14,
  }
});
