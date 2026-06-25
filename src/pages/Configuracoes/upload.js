// src/pages/Configuracoes/upload.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  DevSettings
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';

// expo-updates carregado lazy via require dentro da funcao de reload.
// Evita crash em Expo Go quando a lib nao tem configuracao nativa completa.
import { useNetwork } from '../../contexts/network';
import { useAuth } from '../../contexts/auth';
import api from '../../config/api';
import {
  TABELAS_DOWNLOAD,
  TABELAS_UPLOAD,
  downloadDados,
  uploadDados,
  isSyncBusy
} from '../../config/database/syncService';
import { executeSql } from '../../config/database/database';
import { getConnectionSnapshot } from '../../config/net/connectionSnapshot';

import { showToast } from "../../utils/toast";
import { getGlobalNetworkStatus } from "../../contexts/network";// 👈 sempre certifique-se que este import está presente
import { limparDadosLocaisSeguro, excluirRegistrosAbandonados } from '../../config/database/cleanupService';

const SQLITE_DIR = `${FileSystem.documentDirectory}SQLite/`;

export default function SyncManager() {
  const [status, setStatus] = useState({});
  const [operacao, setOperacao] = useState(null);
  const [totalPendentes, setTotalPendentes] = useState(0); // soma sync_status=0 das tabelas de upload
  const executando = useRef(false);
  const { isOffline } = useNetwork();
  const { user, id_nivel, signOut } = useAuth();
  const userCtx = { user_id: user?.id, user_create: user?.email, id_nivel: id_nivel };
  const syncBloqueado = operacao !== null || isSyncBusy();

  // Filtra as tabelas que não são pertinentes ao perfil Motorista (ID 25)
  const tabelasDownloadFiltradas = TABELAS_DOWNLOAD.filter(t => {
    if (id_nivel == 25 && t.nome.startsWith('sms_')) return false;
    return true;
  });

  const tabelasUploadFiltradas = TABELAS_UPLOAD.filter(t => {
    if (id_nivel == 25 && t.nome.startsWith('sms_')) return false;
    return true;
  });

  // Atualiza o status visual
  const updateStatus = (tabela, novoStatus, mensagem, progresso = 0, tipoOperacao = null) => {
    setStatus(prev => ({
      ...prev,
      [tabela]: {
        ...prev[tabela],
        ...(tipoOperacao === 'download' && {
           downloadStatus: novoStatus,
           downloadMensagem: mensagem,
           downloadProgresso: progresso
        }),
        ...(tipoOperacao === 'upload' && {
           uploadStatus: novoStatus,
           uploadMensagem: mensagem,
           uploadProgresso: progresso
        }),
        // Fallback legado caso tipoOperacao não seja enviado
        ...(!tipoOperacao && {
           status: novoStatus,
           mensagem,
           progresso
        }),
        ultimaSync: new Date().toLocaleString('pt-BR'),
      },
    }));
  };

  // Carrega as últimas sincronizações do servidor
  const carregarUltimasSyncs = async () => {
    try {
      const { data } = await api.get('sincronizacoes/ultima');
      const statusInicial = {};

      if (Array.isArray(data?.data)) {
        data.data.forEach(sync => {
          statusInicial[sync.tabela] = {
            ultimaDownload:
              sync.tipo === 'download'
                ? sync.ultima_sincronizacao
                : status[sync.tabela]?.ultimaDownload || 'Nunca sincronizado',
            ultimaUpload:
              sync.tipo === 'upload'
                ? sync.ultima_sincronizacao
                : status[sync.tabela]?.ultimaUpload || 'Nunca sincronizado',
          };
        });
      } else {
        [...TABELAS_DOWNLOAD, ...TABELAS_UPLOAD].forEach(t => {
          statusInicial[t.nome] = {
            ultimaDownload: 'Nunca sincronizado',
            ultimaUpload: 'Nunca sincronizado',
          };
        });
      }

      setStatus(prev => ({ ...prev, ...statusInicial }));
    } catch (e) {
      console.warn('⚠️ Erro ao buscar sincronizações:', e.message);
    }
  };

  // Conta registros pendentes (sync_status = 0) somando todas as tabelas de upload.
  // Best-effort: se uma tabela falhar (ex.: ainda não existe), apenas ignora.
  const contarPendentes = async () => {
    let soma = 0;
    for (const t of TABELAS_UPLOAD) {
      if (t.nome === 'checklists_frota') continue; // pseudo-tabela
      try {
        const rows = await executeSql(`SELECT COUNT(*) AS qtd FROM ${t.nome} WHERE sync_status = 0;`);
        soma += Number(rows?.[0]?.qtd || 0);
      } catch (_) { /* ignora tabelas inexistentes/erros pontuais */ }
    }
    setTotalPendentes(soma);
  };

  useEffect(() => {
    carregarUltimasSyncs();
    contarPendentes();
  }, []);

  // Recalcula pendentes sempre que uma operação termina (operacao volta a null)
  useEffect(() => {
    if (operacao === null) contarPendentes();
  }, [operacao]);

  // Executa sincronização individual
  const executar = async (tipo, tabela) => {
    if (executando.current || isSyncBusy()) {
      Alert.alert('Atenção', 'Uma sincronização já está em andamento.');
      return;
    }
    if (isOffline) {
      Alert.alert('Sem Conexão', `Não é possível ${tipo} sem internet.`);
      return;
    }

    executando.current = true;
    setOperacao(`${tipo}_${tabela}`);
    updateStatus(tabela, tipo === 'download' ? 'baixando' : 'enviando', 'Iniciando...', 0, tipo);

    try {
      let resultado;
      if (tipo === 'download') {
        resultado = await downloadDados((nome, s, msg, prog) => {
          if (nome === tabela) updateStatus(nome, s, msg, prog, 'download');
        }, false, tabela, userCtx);
      } else {
        resultado = await uploadDados((nome, s, msg, prog) => {
          if (nome === tabela) updateStatus(nome, s, msg, prog, 'upload');
        }, false, tabela, userCtx);
      }

      if (resultado?.alreadyRunning) {
        updateStatus(tabela, 'erro', resultado.message, 0, tipo);
        Alert.alert('Aguarde', resultado.message);
        return;
      }

      if (resultado?.success === false) {
        const msg = resultado.message || 'Nao foi possivel concluir a sincronizacao.';
        updateStatus(tabela, 'erro', msg, 0, tipo);
        Alert.alert('Sincronizacao nao concluida', `${msg}\n\nAs pendencias continuam salvas no dispositivo.`);
        return;
      }

      updateStatus(tabela, 'concluido', 'Sincronizacao concluida', 100, tipo);
      Alert.alert('Sucesso', `${tabela} sincronizada com sucesso.`);
      carregarUltimasSyncs();
    } catch (e) {
      console.error(e);
      updateStatus(tabela, 'erro', e.message || 'Erro ao sincronizar');
      Alert.alert('Erro', `Falha ao sincronizar ${tabela}: ${e.message}`);
    } finally {
      executando.current = false;
      setOperacao(null);
    }
  };


  // ==================== EXECUTAR TODAS AS TABELAS (FILA SEQUENCIAL) ====================
  const executarOperacao = async (tipo) => {
    const { isOffline } = getGlobalNetworkStatus();

    if (executando.current || isSyncBusy()) {
      showToast("⚠️ Já existe uma sincronização em andamento.", "warning");
      return;
    }

    // 🔹 Bloqueia se estiver OFFLINE
    if (isOffline) {
      const msg =
        tipo === "download"
          ? "📥 Modo OFFLINE — download de dados não permitido."
          : "📤 Modo OFFLINE — upload de dados não permitido.";

      showToast(msg, "offline");
      return;
    }

    executando.current = true;
    setOperacao(tipo);
    const lista = tipo === "download" ? tabelasDownloadFiltradas : tabelasUploadFiltradas;

    try {
      let houveErro = false;
      for (const tab of lista) {
        updateStatus(
          tab.nome,
          tipo === "download" ? "baixando" : "enviando",
          "Processando...",
          0,
          tipo
        );

        const resultado = tipo === "download"
          ? await downloadDados((nome, s, msg, prog) => updateStatus(nome, s, msg, prog, 'download'), false, tab.nome, userCtx)
          : await uploadDados((nome, s, msg, prog) => updateStatus(nome, s, msg, prog, 'upload'), false, tab.nome, userCtx);

        if (resultado?.alreadyRunning) {
          updateStatus(tab.nome, "erro", resultado.message, 0, tipo);
          showToast(resultado.message, "warning");
          houveErro = true;
          break;
        }

        if (resultado?.success === false) {
          updateStatus(tab.nome, "erro", resultado.message || "Falha na sincronizacao", 0, tipo);
          houveErro = true;
        }
      }

      showToast(
        houveErro
          ? `Sincronizacao de ${tipo} concluida com pendencias. Tente novamente.`
          : `✅ Todos os módulos (${tipo}) foram sincronizados.`,
        houveErro ? "warning" : "success"
      );
      carregarUltimasSyncs();
    } catch (e) {
      console.error(`Erro ao ${tipo}:`, e);
      showToast(`❌ Falha ao ${tipo} dados: ${e.message}`, "error");
    } finally {
      executando.current = false;
      setOperacao(null);
    }
  };


  // Apaga somente registros abandonados (sync_status=99) — opcao intermediaria
  // entre "enviar tudo" e "forcar limpeza total".
  const confirmarExclusaoAbandonados = (qtd) => {
    Alert.alert(
      'Apagar registros com erro',
      `Sera apagado ${qtd} registro(s) que excederam o limite de tentativas e nao conseguem ser enviados.\n\n` +
      `Os arquivos locais (fotos/assinaturas) vinculados tambem serao removidos.\n\n` +
      `Esta acao nao pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { totalApagados, porTabela } = await excluirRegistrosAbandonados();
              const detalhe = Object.entries(porTabela)
                .map(([t, q]) => `• ${t}: ${q}`).join('\n');
              Alert.alert(
                'Registros apagados',
                `${totalApagados} registro(s) removido(s).\n\n${detalhe}\n\nAgora voce pode tentar limpar a base novamente.`
              );
            } catch (e) {
              Alert.alert('Erro', `Falha ao apagar abandonados: ${e.message}`);
            }
          },
        },
      ]
    );
  };

  // ULTIMO RECURSO: apaga TUDO ignorando pendencias. Requer dupla confirmacao
  // porque dados nao enviados serao perdidos permanentemente.
  const confirmarForcarLimpeza = (totalRegistros) => {
    Alert.alert(
      'ATENCAO — Acao destrutiva',
      `Voce esta prestes a APAGAR PERMANENTEMENTE ${totalRegistros} registro(s) ` +
      `que ainda NAO foram enviados ao servidor.\n\n` +
      `Estes dados serao PERDIDOS para sempre. Nao havera como recupera-los.\n\n` +
      `Tem certeza absoluta que deseja prosseguir?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sim, apagar tudo',
          style: 'destructive',
          onPress: () => {
            // Segunda confirmacao
            Alert.alert(
              'Confirmar exclusao',
              `Ultima chance — esta operacao e IRREVERSIVEL.\n\nDigite mentalmente "APAGAR" e confirme.`,
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'APAGAR TUDO',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await limparDadosLocaisSeguro({ force: true });
                      // Logout + reinicio do bundle:
                      //  - signOut limpa token/profile (SecureStore + AsyncStorage)
                      //  - DevSettings.reload reinicia o JS, recriando o handle SQLite
                      //    em memoria (que ficou apontando para um .db deletado).
                      //  - Em produção (sem DevSettings disponivel), pede o usuario
                      //    fechar e reabrir o app manualmente.
                      Alert.alert(
                        'Limpeza forcada concluida',
                        'Todos os dados locais foram removidos. O app sera reiniciado para concluir.',
                        [{
                          text: 'OK',
                          onPress: async () => {
                            try { await signOut({ silent: true }); }
                            catch (e) { console.warn('Falha no signOut pos-limpeza:', e?.message); }

                            // Reinicia o bundle JS para recriar o handle SQLite em memoria
                            // (que ficou apontando para um .db deletado).
                            //  - Producao (build EAS): Updates.reloadAsync()
                            //  - DEV (Expo Go / metro): DevSettings.reload()
                            // expo-updates eh carregado via require lazy para evitar
                            // crash top-level no Expo Go (lib pode falhar setup nativo
                            // antes do build EAS estar disponivel).
                            try {
                              if (!__DEV__) {
                                try {
                                  const Updates = require('expo-updates');
                                  await Updates.reloadAsync();
                                } catch (errUpd) {
                                  console.warn('expo-updates indisponivel:', errUpd?.message);
                                  Alert.alert(
                                    'Reabra o app',
                                    'Por favor, feche e abra o aplicativo novamente para concluir.'
                                  );
                                }
                              } else if (DevSettings && typeof DevSettings.reload === 'function') {
                                DevSettings.reload();
                              }
                            } catch (e) {
                              console.warn('Reload do bundle falhou:', e?.message);
                              Alert.alert(
                                'Reabra o app',
                                'Por favor, feche e abra o aplicativo novamente para concluir.'
                              );
                            }
                          },
                        }]
                      );
                    } catch (e) {
                      Alert.alert('Erro', `Falha na limpeza forcada: ${e.message}`);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  // Limpa bancos locais
  const limparBancosSQLite = async () => {
    Alert.alert(
      'Limpar Bancos de Dados',
      'Isso apagará todos os dados locais. Deseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              await limparDadosLocaisSeguro();
              Alert.alert('Sucesso', 'Todos os bancos e imagens locais foram removidos.');
            } catch (erro) {
              if (erro.code === 'PENDENCIAS_ENCONTRADAS') {
                const totalAbandonados = (erro.detalhes || []).reduce((acc, d) => acc + (d.abandonados || 0), 0);
                const totalPendentes = (erro.detalhes || []).reduce((acc, d) => acc + (d.pendentes || 0), 0);

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

                const botoes = [
                  { text: 'Cancelar', style: 'cancel' },
                ];

                // Se ha registros que excederam o limite de tentativas, oferece apagar so eles
                if (totalAbandonados > 0) {
                  botoes.push({
                    text: `Apagar ${totalAbandonados} com erro`,
                    onPress: () => confirmarExclusaoAbandonados(totalAbandonados),
                  });
                }

                if (totalPendentes > 0) {
                  botoes.push({
                    text: 'Enviar agora',
                    onPress: () => executarOperacao('upload'),
                  });
                }

                // Ultima opcao: forcar limpeza total (destrutiva)
                botoes.push({
                  text: 'Forcar limpeza',
                  style: 'destructive',
                  onPress: () => confirmarForcarLimpeza(erro.totalRegistros),
                });

                Alert.alert('Existem dados nao enviados', partesMsg.join('\n'), botoes);
              } else {
                Alert.alert('Erro', `Falha ao limpar bancos: ${erro.message}`);
              }
            }
          },
        },
      ]
    );
  };

  const getCorStatus = st => {
    switch (st) {
      case 'concluido':
        return '#4CAF50';
      case 'erro':
        return '#F44336';
      case 'baixando':
        return '#2196F3';
      case 'enviando':
        return '#FF9800';
      default:
        return '#9E9E9E';
    }
  };

  // Card compacto da tabela — durante operacao expande com barra de progresso
  const renderCard = (t, tipo) => {
    const st = status[t.nome] || {};
    const ativoTabela = operacao === `${tipo}_${t.nome}`;
    const ativoTodos = operacao === tipo;
    const ativo = ativoTabela || ativoTodos;

    const currentStatus = tipo === 'download' ? st.downloadStatus : st.uploadStatus;
    const currentMensagem = tipo === 'download' ? st.downloadMensagem : st.uploadMensagem;
    const currentProgresso = tipo === 'download' ? st.downloadProgresso : st.uploadProgresso;

    const displayStatus = currentStatus || st.status;
    const displayMensagem = currentMensagem || st.mensagem;
    const displayProgresso = currentProgresso ?? st.progresso ?? 0;

    const ultimaData = tipo === 'download' ? st.ultimaDownload : st.ultimaUpload;
    const ehConcluido = displayStatus === 'concluido';
    const ehErro = displayStatus === 'erro';

    return (
      <View key={t.nome} style={[styles.card, ativo && styles.cardActive, ehConcluido && styles.cardDone]}>
        <View style={styles.cardRow}>
          <View style={[styles.statusDot, { backgroundColor: getCorStatus(displayStatus) }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.cardLabel} numberOfLines={1}>{t.label}</Text>
            {ultimaData && ultimaData !== 'Nunca sincronizado' ? (
              <Text style={styles.cardMeta} numberOfLines={1}>
                {tipo === 'download' ? '↓' : '↑'} {ultimaData}
              </Text>
            ) : (
              <Text style={[styles.cardMeta, { fontStyle: 'italic' }]}>Nunca sincronizado</Text>
            )}
          </View>
          <TouchableOpacity
            style={[styles.iconButton, syncBloqueado && { opacity: 0.4 }]}
            disabled={syncBloqueado}
            onPress={() => executar(tipo, t.nome)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={tipo === 'download' ? 'cloud-download' : 'cloud-upload'}
              size={22}
              color={tipo === 'download' ? '#2196F3' : '#FF9800'}
            />
          </TouchableOpacity>
        </View>

        {ativo && (
          <View style={styles.progressBlock}>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${Math.max(8, Number(displayProgresso) || 0)}%`,
                    backgroundColor: tipo === 'download' ? '#2196F3' : '#FF9800',
                  },
                ]}
              />
            </View>
            <Text style={styles.progressMsg} numberOfLines={1}>
              {displayMensagem || (tipo === 'download' ? 'Baixando...' : 'Enviando...')}
            </Text>
          </View>
        )}

        {!ativo && ehErro && (
          <Text style={styles.errorMsg} numberOfLines={2}>⚠️ {displayMensagem || 'Erro na sincronização'}</Text>
        )}
        {!ativo && ehConcluido && (
          <Text style={styles.okMsg}>✓ {displayMensagem || 'Sincronizado'}</Text>
        )}
      </View>
    );
  };

  // ----- Status de conexao (card do topo) -----
  const snap = getConnectionSnapshot() || {};
  const qualityPct = Math.max(0, Math.min(100, Number(snap.qualityPct || 0)));
  const sinalKind = isOffline
    ? 'offline'
    : qualityPct < 40
      ? 'warning'
      : 'ok';
  const sinalLabel = sinalKind === 'offline'
    ? 'Sem internet'
    : sinalKind === 'warning'
      ? 'Sinal fraco — pode falhar'
      : 'Sinal bom — pronto para sincronizar';
  const sinalHint = sinalKind === 'offline'
    ? 'Trabalhe normalmente — sincronize depois'
    : (snap.type === 'wifi' ? 'Wi-Fi' : (snap.type === 'cellular' ? '4G/Móvel' : 'Conectado'));

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 12, paddingBottom: 24 }}>
      {/* Header: título + ícone LIMPAR discreto */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.titulo}>Gerenciador de Sincronização</Text>
          <Text style={styles.subtitulo}>Baixe ou envie dados módulo por módulo</Text>
        </View>
        <TouchableOpacity
          style={[styles.limparIcon, syncBloqueado && { opacity: 0.4 }]}
          disabled={syncBloqueado}
          onPress={limparBancosSQLite}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Limpar banco local"
        >
          <Ionicons name="trash-outline" size={22} color="#c0392b" />
        </TouchableOpacity>
      </View>

      {/* Card de status de conexao */}
      <View style={[styles.statusCard, styles[`statusCard_${sinalKind}`]]}>
        <View style={[styles.statusBolt, styles[`statusBolt_${sinalKind}`]]} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.statusLabel, styles[`statusLabel_${sinalKind}`]]}>{sinalLabel}</Text>
          <Text style={styles.statusHint}>{sinalHint}</Text>
        </View>
        {sinalKind !== 'offline' && (
          <Text style={[styles.statusPct, styles[`statusLabel_${sinalKind}`]]}>{qualityPct.toFixed(0)}%</Text>
        )}
      </View>

      {/* Pendentes */}
      <View style={[styles.pendingCard, totalPendentes === 0 && styles.pendingCard_zero]}>
        <Ionicons name="cloud-upload-outline" size={18} color={totalPendentes === 0 ? '#0a7a52' : '#a3530b'} />
        <Text style={styles.pendingText}>Registros pendentes de envio</Text>
        <View style={[styles.pendingBadge, totalPendentes === 0 && styles.pendingBadge_zero]}>
          <Text style={styles.pendingBadgeText}>{totalPendentes === 0 ? '0 ✓' : totalPendentes}</Text>
        </View>
      </View>

      {/* Dois botões grandes lado a lado */}
      <View style={styles.bigRow}>
        <TouchableOpacity
          style={[styles.bigBtn, styles.bigBtnUp, operacao && operacao !== 'upload' && styles.bigBtnDisabled]}
          disabled={syncBloqueado}
          onPress={() => executarOperacao('upload')}
        >
          {operacao === 'upload' ? (
            <>
              <ActivityIndicator color="#FFF" />
              <Text style={styles.bigBtnText}>ENVIANDO...</Text>
            </>
          ) : (
            <>
              <Ionicons name="cloud-upload" size={26} color="#FFF" />
              <Text style={styles.bigBtnText}>Enviar (Upload)</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.bigBtn, styles.bigBtnDown, operacao && operacao !== 'download' && styles.bigBtnDisabled]}
          disabled={syncBloqueado}
          onPress={() => executarOperacao('download')}
        >
          {operacao === 'download' ? (
            <>
              <ActivityIndicator color="#FFF" />
              <Text style={styles.bigBtnText}>BAIXANDO...</Text>
            </>
          ) : (
            <>
              <Ionicons name="cloud-download" size={26} color="#FFF" />
              <Text style={styles.bigBtnText}>Baixar (Download)</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Seção Upload */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>📤 Tabelas de Upload</Text>
        {operacao === 'upload' && <Text style={styles.sectionTag}>↑ ENVIANDO</Text>}
      </View>
      {tabelasUploadFiltradas.map(t => renderCard(t, 'upload'))}

      {/* Seção Download */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>📥 Tabelas de Download</Text>
        {operacao === 'download' && <Text style={[styles.sectionTag, { color: '#2196F3' }]}>↓ BAIXANDO</Text>}
      </View>
      {tabelasDownloadFiltradas.map(t => renderCard(t, 'download'))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F8' },

  // ----- Header -----
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  titulo: { fontSize: 20, fontWeight: '800', color: '#222' },
  subtitulo: { fontSize: 13, color: '#666', marginTop: 2 },
  limparIcon: {
    width: 38, height: 38, borderRadius: 19,
    borderWidth: 1, borderColor: '#f1c1ba',
    backgroundColor: '#fff5f2',
    alignItems: 'center', justifyContent: 'center',
    marginLeft: 8, marginTop: 2,
  },

  // ----- Card de status de conexão -----
  statusCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 10, padding: 12,
    borderLeftWidth: 4, borderColor: '#eee',
    marginBottom: 10, elevation: 1,
  },
  statusCard_ok: { borderLeftColor: '#22b07d' },
  statusCard_warning: { borderLeftColor: '#f0b900' },
  statusCard_offline: { borderLeftColor: '#ff7639' },
  statusBolt: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  statusBolt_ok: { backgroundColor: '#22b07d' },
  statusBolt_warning: { backgroundColor: '#f0b900' },
  statusBolt_offline: { backgroundColor: '#ff7639' },
  statusLabel: { fontSize: 14, fontWeight: '800', color: '#333' },
  statusLabel_ok: { color: '#0a7a52' },
  statusLabel_warning: { color: '#7a5604' },
  statusLabel_offline: { color: '#a3530b' },
  statusHint: { fontSize: 11.5, color: '#666', marginTop: 2 },
  statusPct: { fontSize: 18, fontWeight: '800', marginLeft: 6 },

  // ----- Pendentes -----
  pendingCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 10,
    padding: 11, marginBottom: 12,
    borderWidth: 1, borderColor: '#eee', elevation: 1,
  },
  pendingCard_zero: { borderColor: '#d7f5e6' },
  pendingText: { flex: 1, fontSize: 13, color: '#333', marginLeft: 6, fontWeight: '600' },
  pendingBadge: {
    backgroundColor: '#ff7639', paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 20, minWidth: 30, alignItems: 'center',
  },
  pendingBadge_zero: { backgroundColor: '#22b07d' },
  pendingBadgeText: { color: '#fff', fontWeight: '800', fontSize: 12.5 },

  // ----- Dois botões grandes -----
  bigRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  bigBtn: {
    flex: 1, height: 78, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    gap: 4, elevation: 2,
  },
  bigBtnUp: { backgroundColor: '#FF7639' },
  bigBtnDown: { backgroundColor: '#1f51fe' },
  bigBtnDisabled: { opacity: 0.45 },
  bigBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  // ----- Seção -----
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 8, marginBottom: 8, paddingHorizontal: 4,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#0057a3' },
  sectionTag: { fontSize: 11, fontWeight: '800', color: '#FF7639' },

  // ----- Card compacto da tabela -----
  card: {
    backgroundColor: '#fff', borderRadius: 10, padding: 10,
    marginBottom: 7, borderWidth: 1, borderColor: '#eee', elevation: 1,
  },
  cardActive: { borderColor: '#cfe0ff', backgroundColor: '#f3f7ff' },
  cardDone: { borderColor: '#cfeed6', backgroundColor: '#f3faf5' },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardLabel: { fontSize: 13.5, fontWeight: '700', color: '#222' },
  cardMeta: { fontSize: 11, color: '#666', marginTop: 1 },
  statusDot: { width: 9, height: 9, borderRadius: 5, marginRight: 4 },
  iconButton: { padding: 4, marginLeft: 4 },

  // Progresso dentro do card
  progressBlock: { marginTop: 8 },
  progressBarBg: { height: 5, backgroundColor: '#eef0f3', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: 5, borderRadius: 4 },
  progressMsg: { fontSize: 11, color: '#555', marginTop: 4 },
  okMsg: { fontSize: 11, color: '#0a7a52', marginTop: 6, fontWeight: '700' },
  errorMsg: { fontSize: 11, color: '#c0392b', marginTop: 6, fontWeight: '700' },

  // Compat legado (não usados no novo render, mas mantidos para outros componentes que importarem)
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  actions: { flexDirection: 'row' },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  statusText: { fontSize: 14, color: '#616161', flex: 1 },
  lastSync: { marginTop: 6, fontSize: 12, color: '#888' },
  botoesContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  botao: { padding: 7, borderRadius: 8, alignItems: 'center', marginHorizontal: 5, flexDirection: 'row', justifyContent: 'center' },
  botaoClear: { backgroundColor: '#f34121ff' },
  botaoDownload: { backgroundColor: '#2196F3' },
  botaoUpload: { backgroundColor: '#2cd60aff' },
  textoBotao: { color: '#FFF', fontWeight: 'bold', marginRight: 5 },
});
