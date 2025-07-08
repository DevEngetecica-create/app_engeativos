// utils/CurrencyFormatter.js
import React from 'react';
import { Text } from 'react-native';

// Versão como componente
const CurrencyFormatter = ({ value, style }) => {
  const formattedValue = parseFloat(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

  return <Text style={style}>{formattedValue}</Text>;
};

export default CurrencyFormatter;

