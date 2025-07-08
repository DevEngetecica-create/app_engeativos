// Incluir AsyncStorage para armazenar dados
import AsyncStorage from '@react-native-async-storage/async-storage';

// Arquivo com as configurações da API
import api from '../config/api';

// Recuperar o token e validar o token
export const getValToken = async () => {

    // Chamar a função validar token
    await valTokenUser();

    // Recuperar o token do AsyncStorage
    const valueToken = await AsyncStorage.getItem('@token');

    // Verificar se existe token
    if (valueToken !== null) {
        return valueToken;
    } else {
        return null;
    }
};

// Validar o token na API
const valTokenUser = async () => {

    // Recuperar o token do AsyncStorage
    const valueToken = await AsyncStorage.getItem('@token');

    // Enviar no cabeçalho o token
    const headers = {
        'headers': {
            'Authorization': `Bearer ${valueToken}`
            // 'Authorization': `Bearer 45`
        }
    }

    // Requisição para a API indicando a rota e os dados
    await api.post('validate-token', {}, headers)
    .then((response) => { // Acessar o then quando a API retornar status sucesso

        // Receber o token atualizado da API
        //AsyncStorage.setItem('@token', response.data.token);
        // Salvar os dados no AsyncStorage        
        AsyncStorage.setItem('@name', response.data.user.name);
        AsyncStorage.setItem('@email', response.data.user.email);

    }).catch((err) => { // Acessar o catch quando a API retornar status erro

        // Remover os dados no AsyncStorage
        AsyncStorage.removeItem('@token');
        AsyncStorage.removeItem('@name');
        AsyncStorage.removeItem('@email');

        if (err.response) { // Acessa o IF quando a API retornar erro
            Alert.alert("Opsaaaaaaaa", err.response.data.message);
        } else { // Acessa o ELSE quando a API não responder
            Alert.alert("Ops", "Tente novamente!");
        }

    });

}