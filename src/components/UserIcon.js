// Importar TouchableOpacity e Image da biblioteca react-native
import { TouchableOpacity, Image } from 'react-native';

// Definir o componente funcional UserIcon
function UserIcon() {

    return (
        // Criar um botão de toque (TouchableOpacity) que envolverá a imagem
        <TouchableOpacity>

            {/* Exibir uma imagem dentro do botão de toque */}
            <Image
                source={require('../../assets/icone.png')}
                style={{ width: 40, height: 40, marginRight: 10 }}
            />
        </TouchableOpacity>
    )

}


export default UserIcon;