import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

export default function Construction() {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Image
          source={require('../../../assets/task.png')} // Certifique-se de ter a imagem nesta localização
          style={styles.image}
          resizeMode="contain"
        />
        <Text style={styles.text}>Componente em construção</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center', // Centraliza verticalmente
    alignItems: 'center',     // Centraliza horizontalmente
    backgroundColor: '#f5f5f5', // Cor de fundo opcional
  },
  card: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center', // Centraliza o conteúdo do card
    elevation: 5, // Sombra no Android
    shadowColor: '#000', // Sombra no iOS
    shadowOffset: { width: 0, height: 2 }, // Sombra no iOS
    shadowOpacity: 0.25, // Sombra no iOS
    shadowRadius: 3.84, // Sombra no iOS
  },
  image: {
    width: '100%',
    height: 200, // Ajuste a altura conforme necessário
    marginBottom: 16,
  },
  text: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
