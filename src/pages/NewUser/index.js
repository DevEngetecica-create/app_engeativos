// Incluir os componentes utilizado para estruturar o conteúdo
import { Alert, ScrollView, TouchableOpacity, Linking, Text } from 'react-native';

// Importar o arquivo com os componentes CSS
import {
    Main,
    ContainerNewUser,
    BtnPressedSubmitForm,
    BtnSubmitForm,
    LogoNewUser,
    ImageLogo,
    InputForm,
    LinkLogin,
    LinkUrl,
    Logo,
    LogoFooter,
    ImageFooter,
    TxtSubmitForm
} from '../../styles/custom';

// Importar o componente para apresentar o alerta com as mensagens de erro retornadas da API.
import ErrorAlert from '../../components/ErrorAlert';

// Importar o componente para apresentar carregando
import Loading from '../../components/Loading';

// useState - Adicionar estado ao componente
import { useState } from 'react';

// Incluir a função navegar entre as telas
import { useNavigation } from '@react-navigation/native';

// Arquivo com as configurações da API
import api from '../../config/api';

// Validar os dados do formulário
import * as yup from 'yup';


// Ocultar componente quando clicar no Input.
import useKeyboardVisible from '../../utils/useKeyboardVisible';

// Criar e exportar a função com a tela novo usuário 
export default function NewUser() {

    // Navegar entre as telas
    const Navigation = useNavigation();

    // Armazenar as informações
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState(null);
    const [loading, setLoading] = useState(false);

    // Processar/submeter os dados do formulário
    const addUser = async () => {

        // Usar try e catch para gerenciar exceção/erro
        try { // Permanece no try se não houver nenhum erro

            // Alterar para TRUE e apresentar loading
            setLoading(true);

            // Validar o formulário com Yup
            await validationSchema.validate({ name, email, password }, { abortEarly: false });

            // Requisição para a API indicando a rota e os dados
            await api.post('users', { name, email, password })
                .then((response) => { // Acessar o then quando a API retornar status sucesso

                    Alert.alert("Sucesso", response.data.message);

                    // Redirecionar para página de login após o cadastro
                    Navigation.navigate('Login');

                }).catch((err) => { // Acessar o catch quando a API retornar status erro

                    if (err.response) { // Acessa o IF quando a API retornar erro

                        // Receber os erros e atribuir à constante errors.
                        const errors = err.response?.data?.erros;

                        setErrors(errors)

                    } else { // Acessa o ELSE quando a API não responder
                        Alert.alert("Ops", "Tente novamente!");
                    }

                })

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
        name: yup.string("Necessário preencher o campo nome!").required("Necessário preencher o campo nome!"),
        email: yup.string("Necessário preencher o campo e-mail!").required("Necessário preencher o campo e-mail!")
            .email("Necessário preencher e-mail válido!"),
        password: yup.string("Necessário preencher o campo senha!").required("Necessário preencher o campo senha!")
            .min(6, "A senha deve ter no mínimo 6 caracteres!"),
    });

    const keyboardVisible = useKeyboardVisible();

    const openEnge = () => {
        const url = 'https://www.engetecnica.com.br';
        Linking.canOpenURL(url)
            .then(supported => {
                if (supported) {
                    return Linking.openURL(url);
                } else {
                    console.warn("Não é possível abrir esse URL:", url);
                }
            })
            .catch(err => console.error('Erro ao abrir URL:', err));
    };

    return (
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
            {/* Acrescentar a logo na tela */}

            <Main>
                <LogoNewUser>
                    <ImageLogo source={require('../../../assets/new-logo.png')} />
                </LogoNewUser>

                <ContainerNewUser>

                    {/* Usar o componente para apresentar as mensagens de erro retornadas da API. */}
                    <ErrorAlert errors={errors} />

                    {/* Criar o campo nome do usuário */}
                    <InputForm
                        placeholder='Nome completo'
                        editable={!loading}
                        value={name}
                        onChangeText={text => setName(text)}
                    />

                    {/* Criar o campo e-mail */}
                    <InputForm
                        placeholder='Melhor e-mail'
                        autoCorrect={false}
                        keyboardType='email-address'
                        autoCapitalize='none'
                        editable={!loading}
                        value={email}
                        onChangeText={text => setEmail(text)}
                    />

                    {/* Criar o campo senha */}
                    <InputForm
                        placeholder='Senha com no mínimo 6 caracteres'
                        autoCorrect={false}
                        secureTextEntry={true}
                        editable={!loading}
                        value={password}
                        onChangeText={text => setPassword(text)}
                    />

                    {/* Criar o botão para submeter/enviar os dados do formulário */}
                    <BtnSubmitForm
                        disabled={loading}
                        onPress={addUser}
                        style={({ pressed }) => BtnPressedSubmitForm(pressed)}
                    >
                        <TxtSubmitForm>Cadastrar</TxtSubmitForm>
                    </BtnSubmitForm>

                    {/* Link para tela de login */}
                    <LinkLogin onPress={() => Navigation.navigate('Login')}>Login</LinkLogin>

                    {/* Apresentar o loading */}
                    {loading && <Loading />}

                </ContainerNewUser>
                {!keyboardVisible && (
                <LogoFooter>
                    <ImageFooter source={require('../../../assets/engetecnica.png')} />

                    {/* Link para site engetecnica */}
                    <TouchableOpacity onPress={openEnge}>
                        <Text style={{ color: 'blue', textDecorationLine: 'underline' }}>
                            www.engetecnica.com.br
                        </Text>
                    </TouchableOpacity>
                </LogoFooter>)}
            </Main>
        </ScrollView>
    )
}
