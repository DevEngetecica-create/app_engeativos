// Importar o contexto AuthContext para verificar se o usuário está logado
import { AuthContext } from '../contexts/auth';

// Importar componentes necessários do @react-navigation/drawer
import { DrawerContentScrollView, DrawerItem, DrawerItemList, createDrawerNavigator } from '@react-navigation/drawer';

// Importar os ícones da biblioteca react-native-vector-icons
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'

// Importar componentes ícone do usuário para o cabeçalho
import UserIcon from '../components/UserIcon';

// Importar useContext para compartilhar dados entre componentes
import { useContext } from 'react';

// Importar as telas 
import Home from '../pages/Home';
import Veiculos from '../pages/Veiculos';
import Billys from '../pages/Billys';
import Revenues from '../pages/Revenues';

// Criar uma instância do Drawer Navigator
const Drawer = createDrawerNavigator();

// Função para personalizar o conteúdo do drawer com a opção de logout
function DrawerSignOut(props) {

    // Pegar a função signOut do contexto AuthContext
    const { signOut } = useContext(AuthContext);

    return (
        // Renderizar o conteúdo do drawer com a opção de logout
        <DrawerContentScrollView {...props}>
            <DrawerItemList {...props} />
            <DrawerItem
                label="Sair"
                onPress={() => signOut()}
                icon={() => (
                    <MaterialCommunityIcons
                        name='logout'
                        size={25}
                        color='#1f51fe'
                        style={{ marginRight: -20 }}
                    />
                )}
            />
        </DrawerContentScrollView>
    );
}

// Função principal do Drawer Navigator
export default function DrawerNavigator() {

    return (
        // Configurar o Drawer Navigator com o componente de conteúdo personalizado
        <Drawer.Navigator drawerContent={props => <DrawerSignOut {...props} />}>

            {/* Configurar a tela Home no drawer */}
            <Drawer.Screen
                name='Dashboard'
                component={Home}
                options={{
                    headerRight: () => <UserIcon />,
                    drawerIcon: () => (
                        <MaterialCommunityIcons
                            name='home'
                            size={25}
                            color='#1f51fe'
                            style={{ marginRight: -20 }}
                        />
                    ),
                    drawerLabel: 'Dashboard'
                }}
            />

            {/* Configurar a tela Billys no drawer */}
            <Drawer.Screen
                name='Contas'
                component={Billys}
                options={{
                    headerRight: () => <UserIcon />,
                    drawerIcon: () => (
                        <MaterialCommunityIcons
                            name='currency-usd-off'
                            size={25}
                            color='#1f51fe'
                            style={{ marginRight: -20 }}
                        />
                    ),
                    drawerLabel: 'Contas'
                }}
            />

            {/* Configurar a tela Revenues no drawer */}
            <Drawer.Screen
                name='Receitas'
                component={Revenues}
                options={{
                    headerRight: () => <UserIcon />,
                    drawerIcon: () => (
                        <MaterialCommunityIcons
                            name='cash'
                            size={25}
                            color='#1f51fe'
                            style={{ marginRight: -20 }}
                        />
                    ),
                    drawerLabel: 'Receitas'
                }}
            />

        </Drawer.Navigator>

    )

}