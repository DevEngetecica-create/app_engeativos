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
import { downloadDados, uploadDados, isSyncBusy } from '../../config/database/syncService';
import * as FileSystem from 'expo-file-system';
import { limparDadosLocaisSeguro } from '../../config/database/cleanupService';

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
  { nome: 'veiculo_quilometragems', label: 'Hodômetro (Download)' }, // Adicionado (Download) para diferenciar
  { nome: 'veiculo_preventivas', label: 'Preventivas: Ciclos' },
  { nome: 'veiculo_preventivas_itens_realizadas', label: 'Preventivas: Histórico' }
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
              await limparDadosLocaisSeguro();
              Alert.alert('Sucesso', 'Limpeza de bancos e imagens locais concluída.');
              console.log('Limpeza concluída.');
            } catch (erro) {
              if (erro.code === 'PENDENCIAS_ENCONTRADAS') {
                const linhasDetalhe = (erro.detalhes || []).map(d => {
                  const partes = [];
                  if (d.pendentes > 0) partes.push(`${d.pendentes} pendente${d.pendentes > 1 ? 's' : ''}`);
                  if (d.abandonados > 0) partes.push(`${d.abandonados} c/ erro`);
                  return `• ${d.label}: ${partes.join(', ')}`;
                });

                const partesMsg = [
                  `Existem ${erro.totalRegistros} registro(s) ainda nao enviados ao servidor:`,
                  '',
                  ...linhasDetalhe,
                ];
                if (erro.totalLogs > 0) {
                  partesMsg.push('', `+ ${erro.totalLogs} log(s) de erro pendentes`);
                }
                partesMsg.push('', 'Toque em ENVIAR PARA O SERVIDOR antes de limpar para nao perder os dados.');

                Alert.alert(
                  'Existem dados nao enviados',
                  partesMsg.join('\n'),
                  [
                    { text: 'OK', style: 'cancel' },
                    { text: 'Enviar agora', onPress: () => executarOperacao('upload') },
                  ]
                );
              } else {
                console.error('Erro ao limpar dados locais:', erro);
                Alert.alert('Erro', `Erro na limpeza: ${erro.message}`);
              }
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
    // Bloqueio de clique duplo + sync simultaneo (defesa em profundidade — o syncService tambem bloqueia)
    if (operacao || isSyncBusy()) {
      Alert.alert('Aguarde', 'Já existe uma sincronização em andamento.');
      return;
    }

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

      const resultado = await funcaoDeSincronizacao((tabelaNome, novoStatus, mensagem, progresso) => {
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

      const tituloFimServico = tipo === 'download' ? 'Download concluido' : 'Upload concluido';

      if (resultado?.alreadyRunning) {
        setMensagemGeral(resultado.message);
        Alert.alert('Aguarde', resultado.message);
        return;
      }

      if (resultado?.success === false) {
        const totalErrosServico = resultado.totalErros ?? 1;
        const totalProcessadosServico = resultado.totalProcessados ?? 0;
        setMensagemGeral(`${tituloFimServico} com ${totalErrosServico} erro(s)`);
        Alert.alert(
          'Concluido com erros',
          `Processados: ${totalProcessadosServico}\nCom erro: ${totalErrosServico}\n\n${resultado.message || 'Os dados continuam salvos no dispositivo. Tente sincronizar novamente.'}`
        );
        return;
      }

      // Resumo final: conta sucessos e erros por tabela
      let totalErros = 0;
      let totalConcluidos = 0;
      const tabelasComErro = [];
      setStatus(prev => {
        tabelasAtuaisParaUI.forEach(t => {
          const st = prev[t.nome]?.status;
          if (st === 'erro') { totalErros++; tabelasComErro.push(t.label); }
          if (st === 'concluido') totalConcluidos++;
        });
        return prev;
      });

      const tituloFim = tipo === 'download' ? 'Download concluído' : 'Upload concluído';
      if (totalErros === 0) {
        setMensagemGeral(`${tituloFim} (${totalConcluidos} OK)`);
        Alert.alert('Sucesso', `${tituloFim}.\n\n${totalConcluidos} tabela(s) processada(s) sem erro.`);
      } else {
        setMensagemGeral(`${tituloFim} com ${totalErros} erro(s)`);
        Alert.alert(
          'Concluído com erros',
          `OK: ${totalConcluidos}\nCom erro: ${totalErros}\n\nPendências:\n• ${tabelasComErro.join('\n• ')}\n\nOs dados continuam salvos no dispositivo. Tente sincronizar novamente.`
        );
      }
    } catch (error) {
      const errorMessage = `Erro no ${tipo}: ${error.message}`;
      setMensagemGeral(errorMessage);
      Alert.alert('Erro', `${errorMessage}\n\nOs dados pendentes continuam no dispositivo.`);
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
  const syncBloqueado = !!operacao || isSyncBusy();

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
            syncBloqueado && { opacity: 0.5 }
          ]}
          onPress={() => executarOperacao('download')}
          disabled={syncBloqueado}
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
            syncBloqueado && { opacity: 0.5 }
          ]}
          onPress={() => executarOperacao('upload')}
          disabled={syncBloqueado}
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
