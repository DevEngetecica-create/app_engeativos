// Incluir AsyncStorage para armazenar dados
import AsyncStorage from '@react-native-async-storage/async-storage';

// Arquivo com as configurações da API
import api from '../config/api';

// Remover o token do aplicativo e do banco de dados
export const logoutRemoveToken = async () => {

    // Recuperar o token do AsyncStorage
    const valueToken = await AsyncStorage.getItem('@token');

    // Enviar no cabeçalho o token
    const headers = {
        'headers': {
            'Authorization': `Bearer ${valueToken}`
        }
    }

    // Requisição para a API indicando a rota e os dados
    await api.post('logout', {}, headers)
        .then(() => { // Acessar o then quando a API retornar status sucesso

        }).catch((err) => { // Acessar o catch quando a API retornar status erro

            if (err.response) { // Acessa o IF quando a API retornar erro
                Alert.alert("Ops", err.response.data.message);
            } else { // Acessa o ELSE quando a API não responder
                Alert.alert("Ops", "Tente novamente!");
            }

        });

    // Remover os dados no AsyncStorage
    AsyncStorage.removeItem('@token');
    AsyncStorage.removeItem('@name');
    AsyncStorage.removeItem('@email');

}