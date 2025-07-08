// useContext - compartilhar dados entre as páginas
// useState - Adicionar estado ao componente
import { useContext, useState, useEffect } from 'react';

// Incluir os componentes utilizado para estruturar o conteúdo
import { Alert, ScrollView, TouchableOpacity, View, Text, Linking, ActivityIndicator, Platform } from 'react-native';

// Importar o arquivo com os componentes CSS
import {
  BtnPressedSubmitForm,
  BtnSubmitForm,
  ContainerLogin,
  ImageLogo,
  InputForm,
  Logo,
  LogoFooter,
  ImageFooter,
  TxtSubmitForm,
  ErrorText,
  BtnPressedBiometria,
  BtnBiometria,
  TxtBiometria


} from '../../styles/custom2';


// Incluir AsyncStorage para armazenar dados
import AsyncStorage from '@react-native-async-storage/async-storage';

// Importar o context verificar se o usuário está logado
import { AuthContext } from '../../contexts/auth';

// Incluir a função navegar entre as telas
import { useNavigation } from '@react-navigation/native';

// Validar os dados do formulário
import * as yup from 'yup';

// Para biometria
import * as LocalAuthentication from 'expo-local-authentication';

// Ícone para exibir senha
import { MaterialIcons } from '@expo/vector-icons';

import useKeyboardVisible from '../../utils/useKeyboardVisible';

// Criar e exportar a função com a tela login 
export default function Login() {
  // Navegar entre as telas
  const navigation = useNavigation();

  // Armazenar as informações do usuário
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [biometrySupported, setBiometrySupported] = useState(false);
  const keyboardVisible = useKeyboardVisible();

  // Recuperar a função signIn do context
  const { signIn } = useContext(AuthContext);

  // Verificar suporte a biometria
  useEffect(() => {
    (async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometrySupported(compatible && enrolled);
    })();
  }, []);

  // Chama biometria
  const handleBiometricAuth = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Autentique-se',
        fallbackLabel: 'Use senha'
      });
      if (result.success) {
        // Caso tenha credenciais salvas, auto login
        const stored = await AsyncStorage.getItem('@credentials');
        if (stored) {
          const { email: em, password: pw } = JSON.parse(stored);
          setEmail(em);
          setPassword(pw);
          handleLogin(em, pw);
        }
      }
    } catch (e) {
      Alert.alert('Erro', 'Falha na autenticação biométrica');
    }
  };

  const handleLogin = async (em = email, pw = password) => {
    setLoading(true);
    setError('');

    try {
      if (!em || !pw) {
        throw new Error('Email e senha são obrigatórios');
      }

      // validação Yup
      await validationSchema.validate({ email: em, password: pw });

      await signIn({ email: em, password: pw });

      // salva credenciais para biometria
      await AsyncStorage.setItem('@credentials', JSON.stringify({ email: em, password: pw }));

    } catch (err) {
      setError(err.message || 'Erro ao fazer login');
      Alert.alert('Atenção', err.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  const openEnge = () => {
    const url = 'https://www.engetecnica.com.br';
    Linking.canOpenURL(url)
      .then(supported => supported && Linking.openURL(url))
      .catch(() => console.warn('Não é possível abrir esse URL:', url));
  };

  // Validar o formulário com Yup
  const validationSchema = yup.object().shape({
    email: yup.string().required('Necessário preencher o campo usuário!').email('Email inválido'),
    password: yup.string().required('Necessário preencher o campo senha!')
  });

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <ContainerLogin>
        {/* Acrescentar a logo na tela */}
        <Logo>
          <ImageLogo source={require('../../../assets/new-logo.png')} />
        </Logo>

        {typeof error === 'string' && error.includes('usuário') && (
          <ErrorText>{error}</ErrorText>
        )}

        {typeof error === 'string' && error.includes('senha') && (
          <ErrorText>{error}</ErrorText>
        )}

        {/* Campo usuário */}
        <InputForm
          placeholder='Usuário'
          autoCorrect={false}
          keyboardType='email-address'
          autoCapitalize='none'
          editable={!loading}
          value={email}
          onChangeText={text => setEmail(text)}
        />
        {/* Campo senha com toggle */}
        <View style={{ position: 'relative', width: '100%' }}>
          <InputForm style={{ position: 'relative', left: 20 }}
            placeholder='Senha'
            autoCorrect={false}
            secureTextEntry={!showPassword}
            editable={!loading}
            value={password}
            onChangeText={text => setPassword(text)}
          />
          <TouchableOpacity
            style={{ position: 'absolute', right: 16, top: 12 }}
            onPress={() => setShowPassword(prev => !prev)}
          >
            <MaterialIcons
              name={showPassword ? 'visibility' : 'visibility-off'}
              size={24}
              color='#888'
              style={{ position: 'absolute', right: 16, }}
            />
          </TouchableOpacity>
        </View>


        {/* Botão para acessar */}
        <BtnSubmitForm
          disabled={loading}
          onPress={() => handleLogin()}
          style={({ pressed }) => BtnPressedSubmitForm(pressed)}
        >
          <TxtSubmitForm>Acessar</TxtSubmitForm>
        </BtnSubmitForm>

        {/* Biometria */}
        {/*  {biometrySupported && ( */}
        <BtnBiometria
          onPress={handleBiometricAuth}
          style={({ pressed }) => BtnPressedBiometria(pressed)}
        >
          {/* Ícone de impressão digital */}
          <MaterialIcons
            name="fingerprint"
            size={34}
            color="#fff"
            style={{ marginRight: 8 }}
          />
          <TxtBiometria>Login Biométrico</TxtBiometria>
        </BtnBiometria>
        {/*  )} */}


        {/* Links */}
        {/* <LinkLogin onPress={() => navigation.navigate('NewUser')}>Cadastrar</LinkLogin>
        <LinkLogin onPress={() => navigation.navigate('RecoverPassword')}>Recuperar Senha</LinkLogin> */}

        {/* Loading */}
        {loading && <ActivityIndicator size="large" style={{ flex: 1, justifyContent: 'center' }} />}

        {!keyboardVisible && (
          <LogoFooter>
            <ImageFooter source={require('../../../assets/logo-sem-fundo-1.png')} />
            <TouchableOpacity onPress={openEnge}>
              <Text style={{ color: 'blue', textDecorationLine: 'underline' }}>
                www.engetecnica.com.br
              </Text>
            </TouchableOpacity>
          </LogoFooter>
        )}
      </ContainerLogin>
    </ScrollView>
  );
}
