// src/screens/ChecklistAlugados.js

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { createTable, getChecklists } from './useChecklist'
import Paginate from '../../../components/Paginate';
import ChecklistItem from '../../../components/ChecklistItem';
import Font from '../../../constants/Font';
import FontSize from '../../../constants/FontSize';
import Colors from '../../../constants/Colors';

const ChecklistAlugados = () => {
  const [checklists, setChecklists] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const navigation = useNavigation();

  useFocusEffect(
  useCallback(() => {
    getChecklists(data => {
      console.log('Dados recebidos do banco:', data); // <---- debug
      setChecklists(data);
    });
  }, [])
);


  const lastPage = Math.ceil(checklists.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = checklists.slice(startIndex, startIndex + itemsPerPage);

  const renderItem = ({ item }) => (
    <ChecklistItem
      modelo={item.modelo}
      data={item.data}
      km={item.km} 
    />
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Veículos Alugados</Text>

      <TouchableOpacity
        style={styles.greenContainer}
        onPress={() => navigation.navigate('FormRuv')}
      >
        <Text style={styles.greenButtonText}
        onPress={() => navigation.navigate("ChecklistCreateAlugados")}
        >Cadastrar RUV</Text>
      </TouchableOpacity>

      <FlatList
        data={currentItems}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
      />

      <Paginate
        currentPage={currentPage}
        lastPage={lastPage}
        onPageChange={(page) => setCurrentPage(page)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  greenContainer: {
    width: '100%',
    padding: 10,
    borderRadius: 16,
    marginBottom: '5%',
    backgroundColor: 'rgba(78,167,46,1)',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  greenButtonText: {
    fontSize: FontSize.xLarge,
    color: Colors.onPrimary,
    fontFamily: Font['poppins-bold'],
  },
});

export default ChecklistAlugados;
