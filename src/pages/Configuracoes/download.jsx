import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { downloadDados, uploadDados } from '../../config/database/syncService';

const SyncManager = () => {
  const [status, setStatus] = useState({});
  const [operacao, setOperacao] = useState(null);
  const [progressoGeral, setProgressoGeral] = useState(0);
  const [mensagemGeral, setMensagemGeral] = useState('Selecione uma operação');

  const tabelas = [
    { nome: 'usuarios', label: 'Usuários' },
    { nome: 'niveis_usuarios', label: 'Níveis' },
    { nome: 'usuario_vinculo', label: 'Vínculos' },
    { nome: 'obras', label: 'Obras' },
    { nome: 'veiculos', label: 'Veículos' },
    { nome: 'veiculos_locacaos', label: 'Veículos Locados' }
  ];

  const executarOperacao = async (tipo) => {
    setOperacao(tipo);
    setMensagemGeral(tipo === 'download' ? 'Download em andamento...' : 'Upload em andamento...');
    setProgressoGeral(0);

    // Inicializa status
    const statusInicial = {};
    tabelas.forEach(t => {
      statusInicial[t.nome] = {
        status: 'pendente',
        mensagem: 'Aguardando',
        progresso: 0
      };
    });
    setStatus(statusInicial);

    try {
      const funcao = tipo === 'download' ? downloadDados : uploadDados;
      await funcao((tabela, status, mensagem, progresso) => {
        setStatus(prev => ({
          ...prev,
          [tabela]: { status, mensagem, progresso }
        }));

        // Calcula progresso geral
        const concluidos = Object.values(status)
          .filter(s => s.status === 'concluido').length;
        setProgressoGeral((concluidos / tabelas.length) * 100);
      });

      setMensagemGeral(tipo === 'download' 
        ? 'Download concluído!' 
        : 'Upload concluído!');
    } catch (error) {
      setMensagemGeral(`Erro no ${tipo}: ${error.message}`);
    } finally {
      setOperacao(null);
    }
  };

  const getCorStatus = (status) => {
    switch (status) {
      case 'concluido': return '#4CAF50';
      case 'erro': return '#F44336';
      case 'baixando': return '#2196F3';
      case 'enviando': return '#FF9800';
      default: return '#9E9E9E';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Gerenciador de Sincronização</Text>
      <Text style={styles.subtitulo}>{mensagemGeral}</Text>

      {(operacao === 'download' || operacao === 'upload') && (
        <View style={styles.progressoContainer}>
          <Text>{Math.round(progressoGeral)}% completo</Text>
          <View style={styles.barraProgresso}>
            <View style={[
              styles.barraProgressoPreenchimento,
              { width: `${progressoGeral}%` }
            ]} />
          </View>
        </View>
      )}

      <View style={styles.botoesContainer}>
        <TouchableOpacity
          style={[styles.botao, styles.botaoDownload]}
          onPress={() => executarOperacao('download')}
          disabled={!!operacao}
        >
          {operacao === 'download' ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.textoBotao}>BAIXAR DO SERVIDOR</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.botao, styles.botaoUpload]}
          onPress={() => executarOperacao('upload')}
          disabled={!!operacao}
        >
          {operacao === 'upload' ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.textoBotao}>ENVIAR PARA O SERVIDOR</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.listaTabelas}>
        {tabelas.map(tabela => (
          <View key={tabela.nome} style={styles.itemTabela}>
            <Text style={styles.nomeTabela}>{tabela.label}</Text>
            <View style={styles.statusContainer}>
              <View style={[
                styles.indicadorStatus,
                { backgroundColor: getCorStatus(status[tabela.nome]?.status || 'pendente') }
              ]} />
              <Text style={styles.textoStatus}>
                {status[tabela.nome]?.mensagem || 'Aguardando operação'}
              </Text>
              {(status[tabela.nome]?.status === 'baixando' || 
                status[tabela.nome]?.status === 'enviando') && (
                <ActivityIndicator size="small" color="#666" style={styles.carregando} />
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F5F5F5'
  },
  titulo: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
    color: '#333'
  },
  subtitulo: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666'
  },
  progressoContainer: {
    marginBottom: 15
  },
  barraProgresso: {
    height: 10,
    backgroundColor: '#E0E0E0',
    borderRadius: 5,
    marginTop: 5,
    overflow: 'hidden'
  },
  barraProgressoPreenchimento: {
    height: '100%',
    backgroundColor: '#4CAF50'
  },
  botoesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20
  },
  botao: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5
  },
  botaoDownload: {
    backgroundColor: '#2196F3'
  },
  botaoUpload: {
    backgroundColor: '#FF9800'
  },
  textoBotao: {
    color: '#FFF',
    fontWeight: 'bold'
  },
  listaTabelas: {
    marginBottom: 20
  },
  itemTabela: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    elevation: 2
  },
  nomeTabela: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  indicadorStatus: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8
  },
  textoStatus: {
    flex: 1,
    fontSize: 14,
    color: '#616161'
  },
  carregando: {
    marginLeft: 10
  }
});

export default SyncManager;
