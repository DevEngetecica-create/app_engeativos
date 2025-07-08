// src/pages/Configuracoes/index.js (Mantido quase igual)

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Button,
  Alert // Importar Alert para exibir mensagens de erro
} from 'react-native';
import { downloadDados, uploadDados } from '../../config/database/syncService';
import * as FileSystem from 'expo-file-system';

const SQLITE_DIR = `${FileSystem.documentDirectory}SQLite/`;

// -------------------------------
// 1) Listagem das tabelas para DOWNLOAD (MySQL → SQLite)
//    Essas são usadas para exibir o progresso na UI
// -------------------------------
const tabelasDownload = [
  { nome: 'funcionarios', label: 'Vínculos' },
  { nome: 'obras', label: 'Obras' },
  { nome: 'veiculos', label: 'Veículos' },
  { nome: 'veiculos_locacaos', label: 'Veículos Locados' },
  { nome: 'veiculo_checklist', label: 'Checklist dos Veículos' },
  { nome: 'veiculo_checklist_itens', label: 'Itens de Checklist' },
  { nome: 'veiculo_horimetro', label: 'Horímetro (Download)' }, // Adicionado (Download) para diferenciar
  { nome: 'veiculo_quilometragem', label: 'Hodômetro (Download)' } // Adicionado (Download) para diferenciar
];


// -------------------------------
// 2) Listagem das tabelas para UPLOAD (SQLite → MySQL)
//    Essas são usadas para exibir o progresso na UI
// -------------------------------
const tabelasUpload = [
  { nome: 'veiculo_checklist_servicos', label: 'Checklist (Serviços)' },
  { nome: 'veiculo_checklist_realizados', label: 'Itens de Checklist Realizados' },
  { nome: 'veiculo_abastecimentos', label: 'Abastecimentos de Veículo' },
  { nome: 'veiculos_diario_bordo', label: 'Diário de Bordo' }
];

export default function SyncManager() {
  const [status, setStatus] = useState({});
  const [operacao, setOperacao] = useState(null);
  const [progressoGeral, setProgressoGeral] = useState(0);
  const [mensagemGeral, setMensagemGeral] = useState('Selecione uma operação');

  // -----------------------------------------
  // LIMPAR BANCOS: apaga arquivos .db em SQLite
  // -----------------------------------------
  const limparBancosSQLite = async () => {
    Alert.alert(
      "Limpar Bancos de Dados",
      "Isso apagará todos os dados locais. Tem certeza?",
      [
        {
          text: "Cancelar",
          style: "cancel"
        },
        {
          text: "Confirmar",
          onPress: async () => {
            try {
              const arquivos = await FileSystem.readDirectoryAsync(SQLITE_DIR);
              console.log('Arquivos em SQLite:', arquivos);

              // Apaga todos os arquivos .db na pasta SQLite
              const arquivosParaExcluir = arquivos.filter(nome =>
                nome.endsWith('.db')
              );

              if (arquivosParaExcluir.length === 0) {
                Alert.alert('Sucesso', 'Nenhum banco de dados para limpar.');
                return;
              }

              for (const nomeArquivo of arquivosParaExcluir) {
                const caminho = SQLITE_DIR + nomeArquivo;
                try {
                  await FileSystem.deleteAsync(caminho, { idempotent: true });
                  console.log(`Arquivo excluído: ${nomeArquivo}`);
                } catch (erro) {
                  console.error(`Erro ao excluir ${nomeArquivo}:`, erro);
                  Alert.alert('Erro', `Falha ao excluir ${nomeArquivo}: ${erro.message}`);
                }
              }

              Alert.alert('Sucesso', 'Limpeza de bancos de dados concluída.');
              console.log('Limpeza concluída.');
            } catch (erro) {
              console.error('Erro ao acessar pasta SQLite:', erro);
              Alert.alert('Erro', `Erro ao acessar diretório SQLite: ${erro.message}`);
            }
          }
        }
      ]
    );
  };

  // -----------------------------------------
  // EXECUTAR OPERAÇÃO: download ou upload
  // -----------------------------------------
  const executarOperacao = async (tipo) => {
    setOperacao(tipo);
    setMensagemGeral(tipo === 'download' ? 'Download em andamento...' : 'Upload em andamento...');
    setProgressoGeral(0);

    const tabelasAtuaisParaUI = tipo === 'download' ? tabelasDownload : tabelasUpload;

    const statusInicial = {};
    tabelasAtuaisParaUI.forEach(t => {
      statusInicial[t.nome] = {
        status: 'pendente',
        mensagem: 'Aguardando',
        progresso: 0
      };
    });
    setStatus(statusInicial);

    try {
      const funcaoDeSincronizacao = tipo === 'download' ? downloadDados : uploadDados;

      await funcaoDeSincronizacao((tabelaNome, novoStatus, mensagem, progresso) => {
        // Atualiza o estado global de status e recalcula progresso geral
        setStatus(prev => {
          // Atualiza apenas a tabela em questão
          const atualizado = {
            ...prev,
            [tabelaNome]: { status: novoStatus, mensagem, progresso }
          };

          // Recalcula progresso geral baseado nas tabelas que a UI está exibindo
          let totalConcluidos = 0;
          let totalDeTabelasParaProgresso = 0;

          // Contar apenas as tabelas que estão sendo exibidas na UI para o cálculo do progresso geral
          tabelasAtuaisParaUI.forEach(tabelaUI => {
            totalDeTabelasParaProgresso++;
            if (atualizado[tabelaUI.nome]?.status === 'concluido') {
              totalConcluidos++;
            }
          });

          const pct = (totalConcluidos / totalDeTabelasParaProgresso) * 100;
          setProgressoGeral(pct);

          return atualizado;
        });
      });

      setMensagemGeral(tipo === 'download' ? 'Download concluído!' : 'Upload concluído!');
      Alert.alert('Sucesso', tipo === 'download' ? 'Todos os dados foram baixados com sucesso!' : 'Todos os dados foram enviados com sucesso!');
    } catch (error) {
      const errorMessage = `Erro no ${tipo}: ${error.message}`;
      setMensagemGeral(errorMessage);
      Alert.alert('Erro', errorMessage);
      console.error(errorMessage, error);
    } finally {
      setOperacao(null);
    }
  };

  const getCorStatus = (st) => {
    switch (st) {
      case 'concluido':   return '#4CAF50';
      case 'erro':        return '#F44336';
      case 'baixando':    return '#2196F3';
      case 'enviando':    return '#FF9800';
      default:            return '#9E9E9E';
    }
  };

  const tabelasAtuaisParaUI = operacao === 'upload' ? tabelasUpload : tabelasDownload;

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Gerenciador de Sincronização</Text>
      <Text style={styles.subtitulo}>{mensagemGeral}</Text>

      {(operacao === 'download' || operacao === 'upload') && (
        <View style={styles.progressoContainer}>
          <Text>{Math.round(progressoGeral)}% completo</Text>
          <View style={styles.barraProgresso}>
            <View
              style={[
                styles.barraProgressoPreenchimento,
                { width: `${progressoGeral}%` }
              ]}
            />
          </View>
        </View>
      )}

      <View style={styles.botoesContainer}>
        <TouchableOpacity
          style={[
            styles.botao,
            styles.botaoDownload,
            operacao && { opacity: 0.5 }
          ]}
          onPress={() => executarOperacao('download')}
          disabled={!!operacao}
        >
          {operacao === 'download'
            ? <ActivityIndicator color="#FFF" />
            : <Text style={styles.textoBotao}>BAIXAR DO SERVIDOR</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity style={[styles.botao, styles.botaoLimpar]}>
          <Button title="Limpar Bancos" onPress={limparBancosSQLite} color="#0000" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.botao,
            styles.botaoUpload,
            operacao && { opacity: 0.5 }
          ]}
          onPress={() => executarOperacao('upload')}
          disabled={!!operacao}
        >
          {operacao === 'upload'
            ? <ActivityIndicator color="#FFF" />
            : <Text style={styles.textoBotao}>ENVIAR PARA O SERVIDOR</Text>
          }
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.listaTabelas}>
        {tabelasAtuaisParaUI.map(tabela => (
          <View key={tabela.nome} style={styles.itemTabela}>
            <Text style={styles.nomeTabela}>{tabela.label}</Text>
            <View style={styles.statusContainer}>
              <View
                style={[
                  styles.indicadorStatus,
                  { backgroundColor: getCorStatus(status[tabela.nome]?.status || 'pendente') }
                ]}
              />
              <Text style={styles.textoStatus}>
                {status[tabela.nome]?.mensagem || 'Aguardando'}
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
}

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
    marginBottom: 8,
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
    padding: 12,
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
  botaoLimpar: {
    backgroundColor: '#757575'
  },
  textoBotao: {
    color: '#FFF',
    fontWeight: 'bold'
  },
  listaTabelas: {
    flex: 1,
    marginTop: 10
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
    marginBottom: 6
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
