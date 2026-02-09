// src/components/ListItem.js

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import styled from 'styled-components/native';

//Importe o hook
import { useNavigation } from '@react-navigation/native';

// Este é um componente de apresentação simples e reutilizável.
// Ele não tem lógica, apenas exibe os dados que recebe via props.
const ListItem = ({ veiculo, maiorValorUnidade, isOnline, onPress }) => {

    // 2. Chame o hook para obter o objeto de navegação
    const navigation = useNavigation();
    if (!veiculo) { // Adiciona uma proteção extra
        return null;
    }
    const baseImageUrl = 'https://sga-engeativos.com.br/imagens/veiculos';

    return (
        <TouchableOpacity style={styles.container}
            key={veiculo.id.toString()}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('VeiculosDetalhes', { id: veiculo.id })}>

            <CardImage
                source={
                    // Corrigido de v.imagem para veiculo.imagem
                    veiculo.imagem && isOnline
                        ? { uri: `${baseImageUrl}/${veiculo.id}/${veiculo.imagem}` }
                        : require('../../assets/no-photos.png')
                }
                resizeMode="cover"
            />
            {/* O resto do seu código... */}
            <View style={styles.textContainer}>
                <Text style={styles.title}>{`Prefixo ${veiculo.prefixo} - ${veiculo.placa}`}</Text>
                <Text style={styles.subtitle}>{`${veiculo.marca} ${veiculo.modelo}`}</Text>
                {/* <Text style={styles.details}>{`Último registro: ${maiorValorUnidade}`}</Text> */}
            </View>
            <View style={styles.iconContainer}>
                <Text style={styles.icon}>›</Text>
            </View>
        </TouchableOpacity>
    );
};
const CardImage = styled.Image`
  width: 90px;
  height: 70px;
  border-radius: 4px;
  margin-right: 12px;
`;

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#eee',
        marginBottom: 12,
        flexDirection: 'row', // Alinha itens lado a lado
        alignItems: 'center', // Centraliza verticalmente
        justifyContent: 'space-between', // Espaço entre o texto e o ícone
    },
    textContainer: {
        flex: 1, // Permite que o container de texto ocupe o espaço disponível
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    details: {
        fontSize: 14,
        color: '#007bff', // Uma cor de destaque para o detalhe principal
        marginTop: 8,
        fontWeight: '500',
    },
    iconContainer: {
        paddingLeft: 10,
    },
    icon: {
        fontSize: 24,
        color: '#ccc',
        fontWeight: 'bold',
    },
});

export default ListItem;
