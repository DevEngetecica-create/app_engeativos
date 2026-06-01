// src/components/Paginate.js

import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

export default function Paginate({ currentPage, lastPage, onPageChange }) {
  // Calcula quais páginas mostrar: sempre 3
  let start = Math.max(1, currentPage - 1);
  let end = Math.min(lastPage, currentPage + 1);

  // Se estamos na primeira, mostramos 1,2,3
  if (currentPage === 1) {
    start = 1;
    end = Math.min(3, lastPage);
  }
  // Se estamos na última, mostramos lastPage-2, lastPage-1, lastPage
  if (currentPage === lastPage) {
    end = lastPage;
    start = Math.max(1, lastPage - 2);
  }

  const pagesToShow = [];
  for (let i = start; i <= end; i++) pagesToShow.push(i);

  return (
    <View style={styles.container}>
      {/* Botão Anterior */}
      <TouchableOpacity
        style={[styles.button, currentPage === 1 && styles.disabled]}
        disabled={currentPage === 1}
        onPress={() => onPageChange(currentPage - 1)}
      >
        <Text style={styles.text}>Anterior</Text>
      </TouchableOpacity>

      {/* Páginas */}
      <View style={styles.pages}>
        {pagesToShow.map(page => (
          <TouchableOpacity
            key={page}
            style={[
              styles.pageNumber,
              currentPage === page && styles.activePage,
            ]}
            onPress={() => onPageChange(page)}
          >
            <Text
              style={[
                styles.text,
                currentPage === page && styles.activeText,
              ]}
            >
              {page}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Botão Próximo */}
      <TouchableOpacity
        style={[styles.button, currentPage === lastPage && styles.disabled]}
        disabled={currentPage === lastPage}
        onPress={() => onPageChange(currentPage + 1)}
      >
        <Text style={styles.text}>Próximo</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
  },
  button: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#212121',
    borderRadius: 5,
  },
  disabled: {
    backgroundColor: '#dddddd',
  },
  text: {
    color: '#FFF',
    fontSize: 14,
  },
  pages: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pageNumber: {
    marginHorizontal: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#dddddd',
    borderRadius: 5,
    backgroundColor: '#dddddd',
  },
  activePage: {
    backgroundColor: '#212121',
    borderColor: '#212121',
  },
  activeText: {
    color: '#FFF',
  },
});
