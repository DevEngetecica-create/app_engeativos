import React, { useContext, useState } from 'react';
import {
  Alert,
  ScrollView,
  TouchableOpacity,
  Text,
  KeyboardAvoidingView,
  Platform,
  Linking,
  ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as yup from 'yup';

import { AuthContext } from '../../contexts/auth';
import useKeyboardVisible from '../../utils/useKeyboardVisible';

import {
  BtnPressedSubmitForm,
  BtnSubmitForm,
  ContainerLogin,
  ImageLogo,
  InputForm,
  LinkLogin,
  Logo,
  LogoFooter,
  ImageFooter,
  TxtSubmitForm,
  Main
} from '../../styles/custom';

// Importar o componente para apresentar carregando
import Loading from '../../components/Loading';

export default function Login() {
  // Navegar entre as telas
  const Navigation = useNavigation();

  // Armazenar as informações do usuário
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const keyboardVisible = useKeyboardVisible();
  //

  // Recuperar a função signIn do context
  const { signIn } = useContext(AuthContext);

  // Processar/submeter os dados do formulário
  const loginSubmit = async () => {

    // Usar try e catch para gerenciar exceção/erro
    try { // Permanece no try se não houver nenhum erro

      // Alterar para TRUE e apresentar loading
      setLoading(true);

      // Validar o formulário com Yup
      await validationSchema.validate({ email, password }, { abortEarly: false });

      // Requisição para a API indicando a rota e os dados
      await api.post('login', { email, password })
        .then((response) => { // Acessar o then quando a API retornar status sucesso

          // Alert.alert("Sucesso", response.data.user.email);

          // Salvar os dados no AsyncStorage
          AsyncStorage.setItem('@token', response.data.token);
          AsyncStorage.setItem('@name', response.data.user.name);
          AsyncStorage.setItem('@email', response.data.user.email);

          // Chamar a função que está no memo e no context
          signIn();

          // Redirecionar para página dashboard
          // Navigation.navigate('Home');

        }).catch((err) => { // Acessar o catch quando a API retornar status erro
          if (err.response) { // Acessa o IF quando a API retornar erro
            Alert.alert("Ops", err.response.data.message);
          } else { // Acessa o ELSE quando a API não responder
            Alert.alert("Ops", "Tente novamente!");
          }
        });
    } catch (error) { // Acessa o catch quando houver erro no try
      Alert.alert("Ops", "Tente novamente!");
    } finally {

      // Alterar para false e ocultar loading
      setLoading(false);
    }
  }

  // Validar o formulário com Yup
  const validationSchema = yup.object().shape({
    email: yup.string("Necessário preencher o campo usuário!").required("Necessário preencher o campo usuário!"),
    password: yup.string("Necessário preencher o campo senha!").required("Necessário preencher o campo senha!"),
  });

  const openEnge = () => {
    const url = 'https://www.engetecnica.com.br';
    Linking.canOpenURL(url)
      .then(supported => supported && Linking.openURL(url))
      .catch(() => console.warn('Não é possível abrir esse URL:', url));
  };

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
    >
      <Main>
        <Logo>
          <ImageLogo source={require('../../../assets/new-logo.png')} />
        </Logo>

        <KeyboardAvoidingView
          style={{ width: '90%', alignItems: 'center' }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ContainerLogin>

            {/* Criar o campo usuário */}
            <InputForm
              placeholder='Usuário'
              autoCorrect={false}
              keyboardType='email-address'
              autoCapitalize='none'
              editable={!loading}
              value={email}
              onChangeText={text => setEmail(text)}
            />

            {/* Criar o campo senha */}
            <InputForm
              placeholder='Senha'
              autoCorrect={false}
              secureTextEntry={true}
              editable={!loading}
              value={password}
              onChangeText={text => setPassword(text)}
            />

            {/* Criar o botão para submeter/enviar os dados do formulário */}
            <BtnSubmitForm
              disabled={loading}
              onPress={loginSubmit}
              style={({ pressed }) => BtnPressedSubmitForm(pressed)}
            >
              <TxtSubmitForm >Acessar</TxtSubmitForm>
            </BtnSubmitForm>

            {/* Link para tela cadastrar novo usuário */}
            <LinkLogin onPress={() => Navigation.navigate('NewUser')}>Cadastrar</LinkLogin>

            {/* Link para tela recuperar senha */}
            <LinkLogin onPress={() => Navigation.navigate('RecoverPassword')}>Recuperar Senha</LinkLogin>

            {/* Apresentar o loading */}
            {loading && <Loading />}

          </ContainerLogin>
        </KeyboardAvoidingView>

        {!keyboardVisible && (
          <LogoFooter>
            <ImageFooter source={require('../../../assets/engetecnica.png')} />
            <TouchableOpacity onPress={openEnge}>
              <Text style={{ color: 'blue', textDecorationLine: 'underline' }}>
                www.engetecnica.com.br
              </Text>
            </TouchableOpacity>
          </LogoFooter>
        )}
      </Main>
    </ScrollView>
  );
}
