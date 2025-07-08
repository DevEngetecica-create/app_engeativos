import React from 'react';
import { Text, View, Image, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAuth } from '../contexts/auth';
import { useNetwork } from '../contexts/network';

import Upload from '../pages/Configuracoes/upload';
import Download from '../pages/Configuracoes/download';
import Construction from '../pages/Notification/construction';

import Login from '../pages/Login';
import NewUser from '../pages/NewUser';
import RecoverPassword from '../pages/RecoverPassword';
import VerifyKey from '../pages/VerifyKey';
import Perfil from '../pages/Usuarios/Perfil/index';

import Home from '../pages/Home';
import Veiculos from '../pages/Veiculos';
import VeiculosDetalhes from '../pages/Veiculos/show';
import VeiculosLocacao from '../pages/Veiculos/Locacoes';
import VeiculosDiarioBordo from '../pages/Veiculos/DiarioBordo/index';
import VeiculosDiarioBordoCreate from '../pages/Veiculos/DiarioBordo/create';
import VeiculosDiarioBordoEdit from '../pages/Veiculos/DiarioBordo/edit';
import VeiculosDiarioBordoShow from '../pages/Veiculos/DiarioBordo/show';

import VeiculoAbastFrota from '../pages/Veiculos/Abastecimento';
import VeiculoAbastFrotaCreate from '../pages/Veiculos/Abastecimento/create';
import VeiculoAbastFrotaEdit from '../pages/Veiculos/Abastecimento/edit';
import VeiculoAbastFrotaShow from '../pages/Veiculos/Abastecimento/show';

import ChecklistFrota from '../pages/Veiculos/ChecklistFrota';
import ChecklistServicos from '../pages/Veiculos/ChecklistFrota/Servicos/index';
import CreateChecklistServicos from '../pages/Veiculos/ChecklistFrota/Servicos/create';
import EditChecklistServicos from '../pages/Veiculos/ChecklistFrota/Servicos/edit';
import ShowChecklistServicos from '../pages/Veiculos/ChecklistFrota/Servicos/show';

import HomeAlugados from '../pages/VeiculosAlugados';
import ChecklistAlugados from '../pages/VeiculosAlugados/Checklist';
import ChecklistCreate from '../pages/VeiculosAlugados/Checklist/create';
import ChecklistDetalhesAlugados from '../pages/VeiculosAlugados/Checklist/show';

import SincronizarUsuarios from '../components/SincronizarUsuarios';

const Stack = createNativeStackNavigator();

// Componente que aparece em todas as telas no header
function HeaderRight() {
  const { authData, signOut } = useAuth();
  const avatarUri = authData?.user?.avatarUrl;

  // networkStatus = true → offline | false → online
  const { networkStatus: isOffline, forceOfflineMode } = useNetwork();
  const modoOnline = !isOffline;

  const toggleModo = () => {
    forceOfflineMode(!isOffline);
  };

  return (
    <View style={styles.headerRight}>
      <View style={styles.switchContainer}>
        <Switch
          value={modoOnline}
          onValueChange={toggleModo}
          thumbColor={modoOnline ? '#4CAF50' : '#f44336'}
          trackColor={{ false: '#ccc', true: '#81C784' }}
        />
        <Text style={[styles.statusText, { color: modoOnline ? '#4CAF50' : '#f44336' }]}>          
          {modoOnline ? 'on-line' : 'off-line'}
        </Text>
      </View>

      <Image
        source={
          avatarUri
            ? { uri: avatarUri }
            : require('../../assets/icone.png')
        }
        style={styles.avatar}
      />
      <TouchableOpacity onPress={signOut} style={styles.logoutButton}>
        <MaterialCommunityIcons name="logout" size={24} color="#333" />
      </TouchableOpacity>
    </View>
  );
}

export default function Routes() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return null;

  return (
    <Stack.Navigator
      screenOptions={{
        headerTitleAlign: 'left',
        headerRight: () => <HeaderRight />,
      }}
    >
      {isAuthenticated ? (
        <>          
          <Stack.Screen name="Home" component={Home} options={{ title: 'Dashboard' }} />
          <Stack.Screen name="Upload" component={Upload} options={{ title: 'Enviar Dados' }} />
          <Stack.Screen name="Download" component={Download} options={{ title: 'Download' }} />
          <Stack.Screen name="Construction" component={Construction} options={{ title: 'Em construção' }} />
          <Stack.Screen name="Perfil" component={Perfil} options={{ title: 'Perfil' }} />

          <Stack.Screen name="Veiculos" component={Veiculos} options={{ title: 'Veículos' }} />
          <Stack.Screen name="VeiculosDetalhes" component={VeiculosDetalhes} options={{ title: 'Detalhes do Veículo' }} />
          <Stack.Screen name="VeiculosLocacao" component={VeiculosLocacao} options={{ title: 'Locação de Veículos' }} />

          <Stack.Screen name="VeiculosDiarioBordo" component={VeiculosDiarioBordo} options={{ title: 'Diário de Bordo' }} />
          <Stack.Screen name="VeiculosDiarioBordoCreate" component={VeiculosDiarioBordoCreate} options={{ title: 'Cadastrar' }} />
          <Stack.Screen name="VeiculosDiarioBordoEdit" component={VeiculosDiarioBordoEdit} options={{ title: 'Editar' }} />
          <Stack.Screen name="VeiculosDiarioBordoShow" component={VeiculosDiarioBordoShow} options={{ title: 'Detalhes' }} />

          <Stack.Screen name="VeiculoAbastFrota" component={VeiculoAbastFrota} options={{ title: 'Abastecimentos' }} />
          <Stack.Screen name="VeiculoAbastFrotaCreate" component={VeiculoAbastFrotaCreate} options={{ title: 'Cadastro' }} />
          <Stack.Screen name="VeiculoAbastFrotaEdit" component={VeiculoAbastFrotaEdit} options={{ title: 'Editar' }} />
          <Stack.Screen name="VeiculoAbastFrotaShow" component={VeiculoAbastFrotaShow} options={{ title: 'Detalhes' }} />

          <Stack.Screen name="ChecklistFrota" component={ChecklistFrota} options={{ title: 'Checklist da Frota' }} />
          <Stack.Screen name="ChecklistServicos" component={ChecklistServicos} options={{ title: 'Checklist Realizados' }} />
          <Stack.Screen name="CreateChecklistServicos" component={CreateChecklistServicos} options={{ title: 'Cadastrar Checklist' }} />
          <Stack.Screen name="EditChecklistServicos" component={EditChecklistServicos} options={{ title: 'Editar Checklist' }} />
          <Stack.Screen name="ShowChecklistServicos" component={ShowChecklistServicos} options={{ title: 'Detalhes do Checklist' }} />

          <Stack.Screen name="HomeAlugados" component={HomeAlugados} options={{ title: 'Veículos Alugados' }} />
          <Stack.Screen name="ChecklistAlugados" component={ChecklistAlugados} options={{ title: 'Checklist Veículos Alugados' }} />
          <Stack.Screen name="ChecklistCreateAlugados" component={ChecklistCreate} options={{ title: 'Cadastro Checklist' }} />
          <Stack.Screen name="ChecklistDetalhesAlugados" component={ChecklistDetalhesAlugados} options={{ title: 'Checklist Detalhes' }} />

          <Stack.Screen name="SincronizarUsuarios" component={SincronizarUsuarios} options={{ title: 'Sincronização' }} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={Login} options={{ headerShown: false }} />
          <Stack.Screen name="NewUser" component={NewUser} options={{ title: 'Cadastro' }} />
          <Stack.Screen name="RecoverPassword" component={RecoverPassword} options={{ title: 'Recuperar Acesso' }} />
          <Stack.Screen name="VerifyKey" component={VerifyKey} options={{ title: 'Verificar Código' }} />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 21,
  },
  statusText: {
    marginLeft: 6,
    fontWeight: 'bold',
    fontSize: 14,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  logoutButton: {
    marginLeft: 16,
  },
});
