import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { downloadDados, isSyncBusy } from '../../config/database/syncService';
import { useAuth } from '../../contexts/auth';

const { width, height } = Dimensions.get('window');

const tabelasDownload = [
  { nome: 'funcionarios', label: 'Vínculos' },
  { nome: 'obras', label: 'Obras' },
  { nome: 'veiculos', label: 'Veículos da Frota' },
  { nome: 'veiculos_locacaos', label: 'Veículos Locados' },
  { nome: 'veiculo_checklist', label: 'Modelos de Checklist' },
  { nome: 'veiculo_checklist_itens', label: 'Itens de Checklist' },
  { nome: 'veiculo_horimetro', label: 'Horímetros' },
  { nome: 'veiculo_quilometragems', label: 'Hodômetros' }, // Correção plural real usado no bd
  // SMS
  { nome: 'sms_checklist', label: 'SMS: Base Checklists' },
  { nome: 'sms_checklist_itens', label: 'SMS: Itens e Regras' },
  { nome: 'sms_funcionarios', label: 'SMS: Funcionários' }
];

export default function AutoSyncModal({ visible, onClose, autoStart = true }) {
  const { user, switchConnectionMode } = useAuth();
  const [status, setStatus] = useState({});
  const [progressoGeral, setProgressoGeral] = useState(0);
  const [mensagemGeral, setMensagemGeral] = useState('Analisando conexões com o servidor...');
  const [finished, setFinished] = useState(false);
  const [success, setSuccess] = useState(true);

  // O aplicativo utiliza a referência para controlar se a sincronização excedeu o tempo
  const timeoutHandled = useRef(false);
  const runningRef = useRef(false);

  useEffect(() => {
    if (visible && autoStart) {
      iniciarDownload();
    }
  }, [visible, autoStart]);

  const iniciarDownload = async () => {
    if (runningRef.current || isSyncBusy()) {
      setMensagemGeral('Sincronização já em andamento. Aguarde a conclusão.');
      return;
    }

    runningRef.current = true;
    setFinished(false);
    setSuccess(true);
    setMensagemGeral('Sincronização em andamento...');
    setProgressoGeral(0);
    timeoutHandled.current = false;

    const statusInicial = {};
    tabelasDownload.forEach((t) => {
      statusInicial[t.nome] = {
        status: 'pendente',
        mensagem: 'Aguardando',
        progresso: 0,
      };
    });
    setStatus(statusInicial);

    // O aplicativo aguarda a conexão por 15 segundos. Caso o servidor não responda, encerra o processo on-line e direciona o usuário ao modo off-line.
    const timeoutId = setTimeout(() => {
      timeoutHandled.current = true;
      setSuccess(false);
      setMensagemGeral('Tempo esgotado. Sem resposta do servidor. Por favor, acesse no modo Off-line.');
      setProgressoGeral(100);
      setFinished(true);
      if (switchConnectionMode) {
        switchConnectionMode('offline');
      }
    }, 15000);

    try {
      const userCtx = user ? { user_id: user.id, user_create: user.email } : null;
      const resultado = await downloadDados(
        (tabelaNome, novoStatus, mensagem, progresso) => {
          // O aplicativo ignora a atualização visual se o processo já tiver encerrado por limite de tempo
          if (timeoutHandled.current) return;
          
          setStatus((prev) => {
            const atualizado = {
              ...prev,
              [tabelaNome]: { status: novoStatus, mensagem, progresso },
            };

            let totalConcluidos = 0;
            let totalDeTabelas = tabelasDownload.length;

            tabelasDownload.forEach((tabelaUI) => {
              if (atualizado[tabelaUI.nome]?.status === 'concluido' || atualizado[tabelaUI.nome]?.status === 'erro') {
                totalConcluidos++;
              }
            });

            const pct = (totalConcluidos / totalDeTabelas) * 100;
            setProgressoGeral(pct);

            return atualizado;
          });
        },
        false,
        null,
        userCtx
      );

      clearTimeout(timeoutId);

      // Validação rápida de como foi a sessão
      if (!timeoutHandled.current) {
        if (resultado?.alreadyRunning || resultado?.success === false) {
          setMensagemGeral(resultado?.message || 'Nao foi possivel concluir a sincronizacao.');
          setSuccess(false);
        } else {
          setMensagemGeral('Todos os dados essenciais estão atualizados!');
          setSuccess(true);
        }
      }
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (!timeoutHandled.current) {
        console.warn("AutoSyncModal Error:", error.message);
        setMensagemGeral(`Aviso de Sincronização: ${error.message}`);
        setSuccess(false);
      }
    } finally {
      runningRef.current = false;
      if (!timeoutHandled.current) {
        setProgressoGeral(100);
        setFinished(true);
      }
    }
  };

  const getCorStatus = (st) => {
    switch (st) {
      case 'concluido': return '#4CAF50';
      case 'erro': return '#F44336';
      case 'baixando': return '#2196F3';
      case 'pendente': return '#9E9E9E';
      default: return '#9E9E9E';
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent={true} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Cabaçalho ou Mensagem de Sucesso */}
          {!finished ? (
            <View style={styles.header}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.titulo}>Preparando seu ambiente</Text>
              <Text style={styles.subtitulo}>{mensagemGeral}</Text>
            </View>
          ) : (
            <View style={styles.header}>
              <Ionicons 
                name={success ? "checkmark-circle" : "alert-circle"} 
                size={60} 
                color={success ? "#4CAF50" : "#FF9800"} 
              />
              <Text style={styles.titulo}>
                {success ? "Tudo Pronto!" : "Sincronização Parcial"}
              </Text>
              <Text style={styles.subtitulo}>{mensagemGeral}</Text>
            </View>
          )}

          {/* Barra de Progresso */}
          {!finished && (
            <View style={styles.progressoContainer}>
              <Text style={styles.progressoTexto}>{Math.round(progressoGeral)}% Verificado</Text>
              <View style={styles.barraBg}>
                <View style={[styles.barraFill, { width: `${progressoGeral}%` }]} />
              </View>
            </View>
          )}

          {/* Listagem Visível enquanto estiver rodando ou em erro */}
          <ScrollView style={styles.lista} showsVerticalScrollIndicator={false}>
            {tabelasDownload.map((tabela) => {
              const info = status[tabela.nome] || {};
              const cor = getCorStatus(info.status);
              return (
                <View key={tabela.nome} style={styles.itemTable}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemLabel}>{tabela.label}</Text>
                    {info.status === 'baixando' && <ActivityIndicator size="small" color="#2196F3" />}
                  </View>
                  <View style={styles.row}>
                    <View style={[styles.dot, { backgroundColor: cor }]} />
                    <Text style={styles.itemMsg} numberOfLines={1}>{info.mensagem || 'Aguardando'}</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* Botões do Rodapé */}
          {finished && (
            <TouchableOpacity style={styles.btnAcessar} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.btnAcessarTexto}>Acessar Minha Home</Text>
            </TouchableOpacity>
          )}

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  card: {
    backgroundColor: '#fff',
    width: width * 0.9,
    maxHeight: height * 0.85,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  titulo: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 15,
    marginBottom: 5,
    textAlign: 'center'
  },
  subtitulo: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 10
  },
  progressoContainer: {
    marginBottom: 20,
  },
  progressoTexto: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  barraBg: {
    height: 12,
    backgroundColor: '#E2E8F0',
    borderRadius: 6,
    overflow: 'hidden'
  },
  barraFill: {
    height: '100%',
    backgroundColor: '#007AFF', // Azul mais corporativo
  },
  lista: {
    flexGrow: 0,
    maxHeight: height * 0.45,
  },
  itemTable: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  itemLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  itemMsg: {
    flex: 1,
    fontSize: 13,
    color: '#64748B',
  },
  btnAcessar: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  btnAcessarTexto: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  }
});
