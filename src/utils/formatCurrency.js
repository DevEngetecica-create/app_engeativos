// formatCurrency.js
const formatCurrency = (value) => {
  if (!value) return 'R$ 0,00';

  const number = typeof value === 'string'
    ? parseFloat(value.replace(',', '.'))
    : value;

  return isNaN(number)
    ? 'R$ 0,00'
    : number.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      });
};

export default formatCurrency;
