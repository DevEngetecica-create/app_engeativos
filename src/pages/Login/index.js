import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Linking,
} from "react-native";

import {
  LogoFooter,
  ImageFooter,
  BtnPressedBiometria,
  BtnBiometria,
  TxtBiometria,
} from "../../styles/custom2";

import * as LocalAuthentication from "expo-local-authentication";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/auth";
import {
  getConnectionSnapshot,
  isGoodSignal,
} from "../../config/net/connectionSnapshot";
import useKeyboardVisible from "../../utils/useKeyboardVisible";

const LoginScreen = () => {
  const { signIn, switchConnectionMode, loading } = useAuth();
  const keyboardVisible = useKeyboardVisible();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [logging, setLogging] = useState(false);
  const [biometrySupported, setBiometrySupported] = useState(false);
  const [hasStoredCredentials, setHasStoredCredentials] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // animações
  const logoAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoAnim, {
        toValue: keyboardVisible ? -0 : 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(formAnim, {
        toValue: keyboardVisible ? -30 : 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [keyboardVisible]);

  // snapshot de rede
  const snapshot = getConnectionSnapshot();
  const quality = snapshot?.qualityPct ?? 0;
  const good = isGoodSignal(quality);

  // define o modo efetivo para o ÚNICO botão
  const effectiveMode = snapshot.isConnected && good ? "online" : "offline";

  // Entrada única para login
  const handleLogin = async (mode, em = email, pw = password) => {
    if (!em || !pw) {
      alert("Preencha email e senha.");
      return;
    }
    setLogging(true);
    const ok = await signIn({ email: em, password: pw, mode });
    setLogging(false);
    if (!ok) return;

    switchConnectionMode(mode);
    if (mode === "online") {
      await AsyncStorage.setItem("@credentials", JSON.stringify({ email: em, password: pw }));
    }
  };

  useEffect(() => {
    (async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      const stored = await AsyncStorage.getItem("@credentials");
      setBiometrySupported(compatible && enrolled);
      setHasStoredCredentials(!!stored);
    })();
  }, []);

  const handleBiometricAuth = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Autentique-se",
        fallbackLabel: "Usar senha",
      });

      if (result.success) {
        const stored = await AsyncStorage.getItem("@credentials");
        if (stored) {
          const { email: em, password: pw } = JSON.parse(stored);
          // usa o mesmo critério do botão único
          await handleLogin(effectiveMode, em, pw);
        } else {
          alert("Nenhuma credencial salva para login biométrico.");
        }
      }
    } catch {
      alert("Falha na autenticação biométrica");
    }
  };

  const openEnge = () => {
    const url = "https://www.engetecnica.com.br";
    Linking.canOpenURL(url).then((supported) => {
      if (supported) Linking.openURL(url);
    });
  };

  // textos do banner e do botão dinâmico
  const bannerText = snapshot.isConnected
    ? good
      ? "✅ Sinal bom, recomendado login ONLINE"
      : "⚠️ Sinal fraco, recomendado login OFFLINE"
    : "❌ Sem conexão, apenas OFFLINE disponível";

  const buttonText = effectiveMode === "online" ? "Acessar (ONLINE)" : "Acessar (OFFLINE)";
  const buttonStyle = effectiveMode === "online" ? styles.onlineBtn : styles.offlineBtn;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* LOGO ANIMADA */}
        <Animated.View
          style={[styles.logoContainer, { transform: [{ translateY: logoAnim }] }]}
        >
          <Image
            source={require("../../../assets/new-logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        {/* FORM ANIMADO */}
        <Animated.View style={[styles.form, { transform: [{ translateY: formAnim }] }]}>
          <TextInput
            style={styles.input}
            placeholder="E-mail"
            placeholderTextColor="#999"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          {/* CAMPO DE SENHA COM BOTÃO DE EXIBIR/OCULTAR */}
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder="Senha"
              placeholderTextColor="#999"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeButton}
            >
              <MaterialIcons
                name={showPassword ? "visibility-off" : "visibility"}
                size={24}
                color="#666"
              />
            </TouchableOpacity>
          </View>

          {/* STATUS DA REDE */}
          <View style={styles.banner}>
            <Text style={{ color: good ? "green" : "red", fontWeight: "bold" }}>
              {bannerText}
            </Text>
            <Text style={styles.subBanner}>Intensidade: {quality.toFixed(0)}%</Text>
          </View>

          {/* ÚNICO BOTÃO – decide o modo */}
          <TouchableOpacity
            style={[styles.button, buttonStyle]}
            onPress={() => handleLogin(effectiveMode)}
            disabled={logging || loading}
          >
            {logging ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{buttonText}</Text>}
          </TouchableOpacity>

          {/* BIOMETRIA */}
          {biometrySupported && hasStoredCredentials && (
            <BtnBiometria
              onPress={handleBiometricAuth}
              style={({ pressed }) => BtnPressedBiometria(pressed)}
            >
              <MaterialIcons
                name="fingerprint"
                size={34}
                color="#fff"
                style={{ marginRight: 8 }}
              />
              <TxtBiometria>Login Biométrico</TxtBiometria>
            </BtnBiometria>
          )}
        </Animated.View>

        {/* RODAPÉ */}
        {!keyboardVisible && (
          <LogoFooter>
            <ImageFooter source={require("../../../assets/logo-sem-fundo-1.png")} />
            <TouchableOpacity onPress={openEnge}>
              <Text style={{ color: "blue", textDecorationLine: "underline" }}>
                www.engetecnica.com.br
              </Text>
            </TouchableOpacity>
          </LogoFooter>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scrollContent: { flexGrow: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  logoContainer: { top: -20, alignItems: "center", marginBottom: 25 },
  logo: { width: 450, height: 250 },
  form: { width: "100%", alignItems: "center" },
  input: {
    width: "100%",
    height: 50,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 15,
    paddingHorizontal: 10,
    fontSize: 16,
  },
  banner: { alignItems: "center", marginBottom: 10 },
  subBanner: { fontSize: 13, color: "#555", marginTop: 2 },
  button: {
    width: "100%",
    height: 50,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  onlineBtn: { backgroundColor: "#007bff" },
  offlineBtn: { backgroundColor: "darkorange" },
  buttonText: { color: "#fff", fontSize: 17, fontWeight: "bold" },
  passwordContainer: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    marginBottom: 15,
    paddingHorizontal: 0,
  },
  eyeButton: { padding: 6 },
});
