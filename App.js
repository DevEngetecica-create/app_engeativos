// App.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './src/contexts/auth';
import { NetworkProvider } from './src/contexts/network'; // Importe o seu Provider
import Routes from './src/routes/routes';
import { LogBox } from 'react-native';

LogBox.ignoreLogs([
  "This is a development-only warning and won't be shown in production."
]);

export default function App() {
  return (
    // Envolva o AuthProvider com o NetworkProvider
    <NetworkProvider>
      <AuthProvider>
        <NavigationContainer>
          <Routes/>
        </NavigationContainer>
      </AuthProvider>
    </NetworkProvider>
  );
}