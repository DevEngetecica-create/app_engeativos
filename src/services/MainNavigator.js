// navigation/MainNavigator.js
import React, { useContext } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../contexts/auth';

// Telas públicas
import Login from '../pages/Login';
import NewUser from '../pages/NewUser';
import RecoverPassword from '../pages/RecoverPassword';
import VerifyKey from '../pages/VerifyKey';

// Telas protegidas
import Home from '../pages/Home';
//import Profile from '../pages/Profile';

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

function LoadingScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="NewUser" component={NewUser} />
      <Stack.Screen name="RecoverPassword" component={RecoverPassword} />
      <Stack.Screen name="VerifyKey" component={VerifyKey} />
    </Stack.Navigator>
  );
}

function AppStack() {
  return (
    <Drawer.Navigator>
      <Drawer.Screen name="Home" component={Home} />
      {/* <Drawer.Screen name="Profile" component={Profile} /> */}
    </Drawer.Navigator>
  );
}

export default function MainNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return user ? <AppStack /> : <AuthStack />;
}