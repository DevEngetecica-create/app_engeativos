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
  Alert,
} from "react-native";

import {
  LogoFooter,
  ImageFooter,
  BtnPressedBiometria,
  BtnBiometria,
  TxtBiometria,
} from "../../styles/custom2";

import * as LocalAuthentication from "expo-local-authentication";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/auth";
import {
  getConnectionSnapshot,
  isGoodSignal,
} from "../../config/net/connectionSnapshot";
import useKeyboardVisible from "../../utils/useKeyboardVisible";
import {
  getCredentials,
  setCredentials,
  hasCredentials,
} from "../../utils/credentialsStore";
import theme from "../../styles/theme";

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
      Alert.alert("Atenção", "Preencha email e senha.");
      return;
    }
    setLogging(true);
    const ok = await signIn({ email: em, password: pw, mode });
    setLogging(false);
    if (!ok) return;

    switchConnectionMode(mode);
    if (mode === "online") {
      // Credenciais para futuro login biométrico: criptografadas pelo SO
      // via SecureStore. Antes ficavam em texto plano no AsyncStorage.
      await setCredentials(em, pw);
    }
  };

  useEffect(() => {
    (async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometrySupported(compatible && enrolled);
      // hasCredentials lê do SecureStore com fallback para AsyncStorage legado,
      // migrando-as silenciosamente — não força re-login de quem está em campo.
      setHasStoredCredentials(await hasCredentials());
    })();
  }, []);

  const handleBiometricAuth = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Autentique-se",
        fallbackLabel: "Usar senha",
      });

      if (result.success) {
        const stored = await getCredentials();
        if (stored) {
          const { email: em, password: pw } = stored;
          // usa o mesmo critério do botão único
          await handleLogin(effectiveMode, em, pw);
        } else {
          Alert.alert("Atenção", "Nenhuma credencial salva para login biométrico.");
        }
      }
    } catch {
      Alert.alert("Atenção", "Falha na autenticação biométrica.");
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

// 🎨 Migração para tokens do theme.js (modo agressivo — mudanças visuais
// sutis aceitas deliberadamente).
//
// Diferenças visuais resultantes (todas pequenas):
//   • padding/margin: ±1–4px arredondando para o token mais próximo
//   • borderRadius dos inputs/botões: 8 → 10 (mais arredondado)
//   • borderColor do input: "#ccc" → "#e0e0e0" (mais claro)
//   • cor do botão ONLINE: "#007bff" → theme.colors.primary ("#1f51fe")
//     ⚠ azul Engeativos do theme — substitui o azul Bootstrap antigo
//   • cor do botão OFFLINE: "darkorange" → theme.colors.orange ("#ff7639")
//   • fontSize do botão: 17 → 16 (typography.button)
//
// Valores hardcoded que ficam (sem token equivalente):
//   • dimensões fixas (logo 450×250, height 50 dos inputs)
//   • top: -20 (posicionamento específico)
//   • marginTop: 2 (subBanner — muito pequeno)
//   • fontSize: 13 (subBanner — caption=12 seria perceptível, fica 13)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.surface },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.xl,
  },
  logoContainer: { top: -20, alignItems: "center", marginBottom: theme.spacing.xl },
  logo: { width: 450, height: 250 },
  form: { width: "100%", alignItems: "center" },
  input: {
    width: "100%",
    height: 50,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radii.md,
    marginBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
    fontSize: 16,
  },
  banner: { alignItems: "center", marginBottom: theme.spacing.md },
  subBanner: { fontSize: 13, color: theme.colors.textMuted, marginTop: 2 },
  button: {
    width: "100%",
    height: 50,
    borderRadius: theme.radii.md,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  onlineBtn: { backgroundColor: theme.colors.primary },
  offlineBtn: { backgroundColor: theme.colors.orange },
  buttonText: {
    color: theme.colors.white,
    fontSize: theme.typography.button.fontSize,
    fontWeight: theme.typography.button.fontWeight,
  },
  passwordContainer: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    borderRadius: theme.radii.md,
    marginBottom: theme.spacing.lg,
    paddingHorizontal: 0,
  },
  eyeButton: { padding: theme.spacing.xs },
});
