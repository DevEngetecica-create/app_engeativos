// useState - Adicionar estado ao componente
import { useState } from 'react';

// Incluir os componentes utilizado para estruturar o conteúdo
import { Alert, ScrollView } from 'react-native';

// Importar o arquivo com os componentes CSS
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

// Importar o componente para apresentar o alerta com as mensagens de erro retornadas da API.
import ErrorAlert from '../../components/ErrorAlert';

// Incluir a função navegar entre as telas
import { useNavigation } from '@react-navigation/native';

// Arquivo com as configurações da API
import api from '../../config/api';

// Validar os dados do formulário
import * as yup from 'yup';

// Ocultar componente quando clicar no Input.
import useKeyboardVisible from '../../utils/useKeyboardVisible';


// Criar e exportar a função com a tela recuperar senha 
export default function RecoverPassword() {

    // Navegar entre as telas
    const Navigation = useNavigation();

    // Armazenar as informações do usuário
    const [email, setEmail] = useState('');
    const [errors, setErrors] = useState(null);
    const [loading, setLoading] = useState(false);

    // Processar/submeter os dados do formulário
    const recoverPass = async () => {

        // Usar try e catch para gerenciar exceção/erro
        try { // Permanece no try se não houver nenhum erro

            // Alterar para TRUE e apresentar loading
            setLoading(true);

            // Validar o formulário com Yup
            await validationSchema.validate({ email }, { abortEarly: false });

            // Requisição para a API indicando a rota e os dados
            await api.post('forgot-password-code', { email })
                .then((response) => { // Acessar o then quando a API retornar status sucesso
                    Alert.alert("Sucesso", response.data.message);

                    // Redirecionar para página para verificar a chave
                    Navigation.navigate('VerifyKey');

                }).catch((err) => { // Acessar o catch quando a API retornar status erro
                    if (err.response) { // Acessa o IF quando a API retornar erro
                        // Receber os erros e atribuir à constante errors.
                        const errors = err.response?.data?.erros;

                        setErrors(errors)
                    } else { // Acessa o ELSE quando a API não responder
                        Alert.alert("Ops", "Tente novamente!");
                    }
                });

        } catch (error) { // Acessa o catch quando houver erro no try
            if (error.errors) { // Acessa o IF quando existir a mensagem de erro
                Alert.alert("Ops", error.errors[0]);
            } else { // Acessa o ELSE quando não existir a mensagem de erro
                Alert.alert("Ops", "Erro: Tente novamente!");
            }
        } finally {

            // Alterar para false e ocultar loading
            setLoading(false);
        }

    }

    // Validar o formulário com Yup
    const validationSchema = yup.object().shape({
        email: yup.string("Necessário preencher o campo e-mail!")
            .required("Necessário preencher o campo e-mail!")
            .email("Necessário preencher e-mail válido!"),
    });

    const keyboardVisible = useKeyboardVisible();

    return (
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>

            <Main>
                {/* Acrescentar a logo na tela */}
                <Logo>
                    <ImageLogo source={require('../../../assets/new-logo.png')} />
                </Logo>

                <ContainerLogin>

                    {/* Usar o componente para apresentar as mensagens de erro retornadas da API. */}
                    <ErrorAlert errors={errors} />


                    {/* Criar o campo e-mail */}
                    <InputForm
                        placeholder='E-mail cadastrado'
                        autoCorrect={false}
                        keyboardType='email-address'
                        autoCapitalize='none'
                        editable={!loading}
                        value={email}
                        onChangeText={text => setEmail(text)}
                    />

                    {/* Criar o botão para submeter/enviar os dados do formulário */}
                    <BtnSubmitForm
                        disabled={loading}
                        onPress={recoverPass}
                        style={({ pressed }) => BtnPressedSubmitForm(pressed)}
                    >
                        <TxtSubmitForm >Enviar</TxtSubmitForm>
                    </BtnSubmitForm>

                    {/* Link para tela login */}
                    <LinkLogin onPress={() => Navigation.navigate('Login')}>Login</LinkLogin>

                    {/* Apresentar o loading */}
                    {loading && <Loading />}
                </ContainerLogin>
                {!keyboardVisible && (
                <LogoFooter>
                    <ImageFooter source={require('../../../assets/engetecnica.png')} />
                </LogoFooter>)}
            </Main>
        </ScrollView>
    )
}