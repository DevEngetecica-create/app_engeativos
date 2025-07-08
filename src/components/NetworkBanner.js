// src/components/NetworkBanner.js

import React from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet
} from 'react-native';
import { useConnectionMode } from '../config/hooks/useConnectionMode';

export default function NetworkBanner() {
  // Pega modoOnline e isConnected, e a ação toggleModo
  const { modoOnline, isConnected, toggleModo, modoDisponivel } = useConnectionMode();

  // Cor do “dot” para representar:
  // - verde escuro  = modoOnline *e* conectado (tudo ok)
  // - laranja      = modoOnline *mas* sem conexão real (modo ainda online, mas sem internet)
  // - vermelho     = modoOffline (independente da rede física)
  let corDot = '#e74c3c';
  if (modoOnline && isConnected)      corDot = '#2ecc71';   // verde
  else if (modoOnline && !isConnected) corDot = '#f39c12';  // laranja

  // Texto de status a exibir:
  // - Quando modoOnline === false → “offline”
  // - Quando modoOnline === true  e isConnected === true → “on-line”
  // - Quando modoOnline === true  mas isConnected === false → “sem rede”
  let textoStatus = 'off-line';
  if (modoOnline && isConnected) textoStatus = 'on-line';
  else if (modoOnline && !isConnected) textoStatus = 'sem rede';

  return (
    <TouchableOpacity onPress={toggleModo} activeOpacity={0.8}>
      <View style={styles.container}>
        <View style={[styles.statusDot, { backgroundColor: corDot }]} />
        <Text style={[styles.statusText, { color: corDot }]}>
          {textoStatus}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end', // para ficar no canto direito do header
    paddingHorizontal: 12,
    marginTop: 8,
    marginBottom: -8,      // aproxima mais do topo
    zIndex: 10,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  statusText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
});
