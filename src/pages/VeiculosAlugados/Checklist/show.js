import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ChecklistDetalhesAlugados = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Tela Detalhes Veículos Alugados</Text>
    </View>
  );
};

export default ChecklistDetalhesAlugados;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 18,
    color: '#000000',
  },
});
