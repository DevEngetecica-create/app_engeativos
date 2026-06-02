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
  const [forceOffline, setForceOffline] = useState(false); // O aplicativo permite ao usuário forçar a entrada pelo modo off-line

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

  // O aplicativo define o modo efetivo para o ÚNICO botão, permitindo override caso selecionado off-line
  const effectiveMode = forceOffline ? "offline" : (snapshot.isConnected && good ? "online" : "offline");

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

    // Salvar credenciais localmente para uso futuro (Biometria)
    await AsyncStorage.setItem("@credentials", JSON.stringify({ email: em, password: pw }));
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

  const openExternal = (url) => {
    Linking.canOpenURL(url).then((supported) => {
      if (supported) Linking.openURL(url);
    });
  };

  // textos do banner e do botão dinâmico
  const bannerText = forceOffline
    ? "⚠️ Modo Off-line ativado manualmente"
    : snapshot.isConnected
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
            <Text style={{ color: good && !forceOffline ? "green" : "red", fontWeight: "bold" }}>
              {bannerText}
            </Text>
            {!forceOffline && <Text style={styles.subBanner}>Intensidade: {quality.toFixed(0)}%</Text>}
          </View>

          {/* CHECKBOX: FORÇAR MODO OFF-LINE */}
          <TouchableOpacity 
            style={styles.forceOfflineContainer} 
            onPress={() => setForceOffline(!forceOffline)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, forceOffline && styles.checkboxSelected]}>
               {forceOffline && <MaterialIcons name="check" size={16} color="#fff" />}
            </View>
            <Text style={styles.forceOfflineText}>Acessar sem internet (Off-line)</Text>
          </TouchableOpacity>

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

            {/* Politica de Privacidade e Termos de Uso */}
            <View style={styles.legalLinks}>
              <TouchableOpacity onPress={() => openExternal('https://sga-engeativos.com.br/privacidade')}>
                <Text style={styles.legalLink}>Politica de Privacidade</Text>
              </TouchableOpacity>
              <Text style={styles.legalSep}>  •  </Text>
              <TouchableOpacity onPress={() => openExternal('https://sga-engeativos.com.br/suporte')}>
                <Text style={styles.legalLink}>Termos e Suporte</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.legalConsent}>
              Ao entrar, voce concorda com nossa Politica de Privacidade e Termos de Uso.
            </Text>
          </LogoFooter>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  // paddingBottom reserva espaço para o rodapé (position: absolute) + o botão
  // de biometria. Sem isso, o bloco centralizado (logo + form + biometria)
  // colidia com o rodapé expandido (links legais + consentimento).
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 170,
  },
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
  forceOfflineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    width: '100%',
    justifyContent: 'center'
  },
  forceOfflineText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500'
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: '#007bff',
    borderRadius: 6,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkboxSelected: {
    backgroundColor: '#007bff'
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  legalLink: {
    color: '#1f51fe',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  legalSep: {
    color: '#888',
    fontSize: 13,
  },
  legalConsent: {
    color: '#666',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 20,
  },
});
