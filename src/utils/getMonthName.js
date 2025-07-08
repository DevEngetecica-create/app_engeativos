// Retornar o mês que está na data ano-mês-dia "0000-00-00"
const getMonthName = (dateString) => {

    // Array com os meses do ano
    const months = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    // Extrair o mês da data (considerando que a data está no formato YYYY-MM-DD)
    const monthIndex = new Date(dateString).getMonth();

    // Retornar o mês
    return months[monthIndex];
}

// Exportar a função
export default getMonthName;