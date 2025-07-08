// Formatar a data para o formato brasileiro
const formatDate = (dateString) => {

    // Verifica se 'dateString' é nulo, indefinido ou vazio. Se for, retorna uma string vazia
    if(!dateString) return '';

    // Desestrutura a string da data, separando-a em 'year', 'month' e 'day' usando o método 'split' com o delimitador '-'
    const [year, month, day ]= dateString.split('-');

    // Retorna a data formatada no formato 'DD/MM/YYYY' usando template literals
    return `${day}/${month}/${year}`;

}

// Exportar a função
export default formatDate;