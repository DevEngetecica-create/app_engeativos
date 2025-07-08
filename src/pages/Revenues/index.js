// useCallback - A função não será recriada a cada renderização, somente quando a dependências
// useState - Adicionar estado ao componente
import { useCallback, useState } from 'react';

// useFocusEffect para executar um efeito quando o componente recebe o foco
import { useFocusEffect } from '@react-navigation/native';

// Incluir os componentes utilizado para estruturar o conteúdo
import { ScrollView, View } from 'react-native';

// Importar o arquivo com os componentes CSS.
import { Container, ContentSpaceBetweenHome, RowDataHome, SpaceBetweenBilly, TextHome, TextSubTitleBilly, ValueHomeContent, VerticalBarContent } from '../../styles/custom';

// Importar o componente para apresentar o alerta com as mensagens de erro retornadas da API.
import ErrorAlert from '../../components/ErrorAlert';

// Incluir AsyncStorage para armazenar dados
import AsyncStorage from '@react-native-async-storage/async-storage';

// Importar o componente para formatar moeda.
import CurrencyFormatter from '../../utils/CurrencyFormatter';

// Importar o componente para apresentar carregando
import Loading from '../../components/Loading';

// Importar o componente de paginação.
import Paginate from '../../components/Paginate';

// Importar a funçãp para formatar a data.
import formatDate from '../../utils/formatDate';

// Arquivo com as configurações da API
import api from '../../config/api';

// Criar e exportar a função com a tela Contas
export default function Revenues() {

    const [revenues, setRevenues] = useState([]);
    const [errors, setErrors] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [loading, setLoading] = useState(false);

    // Recuperar o relatório mensal
    const getRevenues = async (page) => {

        // Usar try e catch para gerenciar exceção/erro
        try { // Permanece no try se não houver nenhum erro

            // Alterar para TRUE e apresentar loading
            setLoading(true);

            // Recuperar o token
            const token = await AsyncStorage.getItem('@token');

            // Fazer a requisição para a API e receber a lista de receitas
            await api.get(`revenues?page=${page}`, {
                'headers': {
                    'Authorization': `Bearer ${token}`
                }
            }).then((response) => { // Acessar o then quando a API retornar status sucesso

                // console.log(response.data.revenues.data);
                // Atribuir os dados retornado da API
                setRevenues(response.data.revenues.data);

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

    // Executar quando o usuário carregar a tela e chamar a função getRevenues
    useFocusEffect(
        useCallback(() => {
            getRevenues(1);
        }, [])
    );

    return (
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>

            <Container>

                {/* Usar o componente para apresentar as mensagens de erro retornadas da API. */}
                <ErrorAlert errors={errors} />

                {/* Ler a lista de receitas */}
                {revenues.map((revenue) => {

                    // Imprimir os dados da receita
                    return (
                        <RowDataHome key={revenue.id}>
                            <SpaceBetweenBilly>
                                <VerticalBarContent />

                                <ContentSpaceBetweenHome>
                                    <View>
                                        <TextHome>{revenue.name}</TextHome>
                                        <TextSubTitleBilly>{revenue.revenue_type.name}</TextSubTitleBilly>
                                    </View>

                                    <View>
                                        <ValueHomeContent>
                                            <CurrencyFormatter value={revenue.amount} />
                                        </ValueHomeContent>
                                        <TextSubTitleBilly>{formatDate(revenue.revenue_date)}</TextSubTitleBilly>
                                    </View>
                                </ContentSpaceBetweenHome>
                            </SpaceBetweenBilly>
                        </RowDataHome>
                    )
                })}

                {/* Apresentar a paginação */}
                <Paginate currentPage={currentPage} lastPage={lastPage} />

                {/* Apresentar o loading */}
                {loading && <Loading />}

            </Container>
        </ScrollView>
    )
}