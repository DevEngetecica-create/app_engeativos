// useState - Adicionar estado ao componente
import { useState } from 'react';

// Incluir os componentes utilizado para estruturar o conteúdo
import { Alert, ScrollView } from 'react-native';

// Importar o arquivo com os componentes CSS
import { BtnPressedSubmitForm, BtnSubmitForm, ContainerLogin, ImageLogo, InputForm, LinkLogin, Logo, TxtSubmitForm } from '../../styles/custom';

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


// Criar e exportar a função com a tela recuperar senha 
export default function VerifyKey() {

    // Navegar entre as telas
    const Navigation = useNavigation();

    // Armazenar as informações do usuário
    const [code, setCode] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [formNewPassword, setFormNewPassword] = useState(false);
    const [errors, setErrors] = useState(null);
    const [loading, setLoading] = useState(false);

    // Processar/submeter os dados do formulário
    const verifyKey = async () => {

        // Usar try e catch para gerenciar exceção/erro
        try { // Permanece no try se não houver nenhum erro

            // Alterar para TRUE e apresentar loading
            setLoading(true);

            // Validar o formulário com Yup
            await validationSchema.validate({ code, email }, { abortEarly: false });

            // Requisição para a API indicando a rota e os dados
            await api.post('reset-password-validate-code', { code, email })
                .then((response) => { // Acessar o then quando a API retornar status sucesso

                    // Alert.alert("Sucesso", response.data.message);

                    // Alterar para true e apresentar o formulário nova senha
                    setFormNewPassword(true);

                }).catch((err) => { // Acessar o catch quando a API retornar status erro
                    if (err.response) { // Acessa o IF quando a API retornar erro
                        // Receber os erros e atribuir à constante errors.
                        const errors = err.response?.data?.erros;

                        setErrors(errors)
                    } else { // Acessa o ELSE quando a API não responder
                        Alert.alert("Ops", "Tente novamente 1!");
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
        code: yup.string("Necessário preencher o campo código!")
            .required("Necessário preencher o campo código!"),
    });

    // Processar/submeter os dados do formulário
    const editPassword = async () => {

        // Usar try e catch para gerenciar exceção/erro
        try { // Permanece no try se não houver nenhum erro

            // Alterar para TRUE e apresentar loading
            setLoading(true);

            // Validar o formulário com Yup
            await validationSchemaPassword.validate({ password }, { abortEarly: false });

            // Requisição para a API indicando a rota e os dados
            await api.post('reset-password-code', { email, code, password })
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
    const validationSchemaPassword = yup.object().shape({
        password: yup.string("Necessário preencher o campo senha!")
            .required("Necessário preencher o campo senha!")
            .min(6, "A senha deve ter no mínimo 6 caracteres!"),
    });

    return (
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
            <ContainerLogin>

                {/* Usar o componente para apresentar as mensagens de erro retornadas da API. */}
                <ErrorAlert errors={errors} /> 

                {/* Acrescentar a logo na tela */}
                <Logo>
                    <ImageLogo source={require('../../../assets/Engeativos_Logo.png')} />
                </Logo>

                {/* Se formNewPassword for TRUE, carrega o formulário nova senha */}
                {formNewPassword ? <>

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
                        onPress={editPassword}
                        style={({ pressed }) => BtnPressedSubmitForm(pressed)}
                    >
                        <TxtSubmitForm>Salvar</TxtSubmitForm>
                    </BtnSubmitForm>

                </>
                    :
                    <>

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

                        {/* Criar o campo código */}
                        <InputForm
                            placeholder='Código de verificação'
                            autoCorrect={false}
                            autoCapitalize='none'
                            editable={!loading}
                            value={code}
                            onChangeText={text => setCode(text)}
                        />

                        {/* Criar o botão para submeter/enviar os dados do formulário */}
                        <BtnSubmitForm
                            disabled={loading}
                            onPress={verifyKey}
                            style={({ pressed }) => BtnPressedSubmitForm(pressed)}
                        >
                            <TxtSubmitForm >Validar</TxtSubmitForm>
                        </BtnSubmitForm>
                    </>}



                {/* Link para tela login */}
                <LinkLogin onPress={() => Navigation.navigate('Login')}>Login</LinkLogin>

                {/* Apresentar o loading */}
                {loading && <Loading />}

            </ContainerLogin>
        </ScrollView>
    )
}