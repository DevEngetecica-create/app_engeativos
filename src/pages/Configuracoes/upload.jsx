// src/pages/Configuracoes/upload.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { useNetwork } from '../../contexts/network';
import { useAuth } from '../../contexts/auth';
import api from '../../config/api';
import {
  TABELAS_DOWNLOAD,
  TABELAS_UPLOAD,
  downloadDados,
  uploadDados
} from '../../config/database/syncService';
import { executeSql } from '../../config/database/database';
import { getConnectionSnapshot } from '../../config/net/connectionSnapshot';

import { showToast } from "../../utils/toast";
import { getGlobalNetworkStatus } from "../../contexts/network";// 👈 sempre certifique-se que este import está presente

const SQLITE_DIR = `${FileSystem.documentDirectory}SQLite/`;

export default function SyncManager() {
  const [status, setStatus] = useState({});
  const [operacao, setOperacao] = useState(null);
  const [totalPendentes, setTotalPendentes] = useState(0); // soma sync_status=0 das tabelas de upload
  const executando = useRef(false);
  const { isOffline } = useNetwork();
  const { user } = useAuth();
  const userCtx = { user_id: user?.id, user_create: user?.email };
  const syncBloqueado = operacao !== null;

  // Atualiza o status visual
  const updateStatus = (tabela, novoStatus, mensagem, progresso = 0) => {
    setStatus(prev => ({
      ...prev,
      [tabela]: {
        ...prev[tabela],
        status: novoStatus,
        mensagem,
        progresso,
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
    if (executando.current) {
      Alert.alert('Atenção', 'Uma sincronização já está em andamento.');
      return;
    }
    if (isOffline) {
      Alert.alert('Sem Conexão', `Não é possível ${tipo} sem internet.`);
      return;
    }

    executando.current = true;
    setOperacao(`${tipo}_${tabela}`);
    updateStatus(tabela, tipo === 'download' ? 'baixando' : 'enviando', 'Iniciando...');

    try {
      if (tipo === 'download') {
        await downloadDados((nome, s, msg, prog) => {
          if (nome === tabela) updateStatus(nome, s, msg, prog);
        }, false, tabela, userCtx);
      } else {
        await uploadDados((nome, s, msg, prog) => {
          if (nome === tabela) updateStatus(nome, s, msg, prog);
        }, false, tabela, userCtx);
      }

      updateStatus(tabela, 'concluido', 'Sincronização concluída', 100);
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

    if (executando.current) {
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
    const lista = tipo === "download" ? TABELAS_DOWNLOAD : TABELAS_UPLOAD;

    try {
      for (const tab of lista) {
        updateStatus(
          tab.nome,
          tipo === "download" ? "baixando" : "enviando",
          "Processando..."
        );

        if (tipo === "download") {
          await downloadDados(updateStatus, false, tab.nome, userCtx);
        } else {
          await uploadDados(updateStatus, false, tab.nome, userCtx);
        }
      }

      showToast(`✅ Todos os módulos (${tipo}) foram sincronizados.`, "success");
      carregarUltimasSyncs();
    } catch (e) {
      console.error(`Erro ao ${tipo}:`, e);
      showToast(`❌ Falha ao ${tipo} dados: ${e.message}`, "error");
    } finally {
      executando.current = false;
      setOperacao(null);
    }
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
              const arquivos = await FileSystem.readDirectoryAsync(SQLITE_DIR);
              const dbs = arquivos.filter(n => n.endsWith('.db'));
              for (const nome of dbs) {
                await FileSystem.deleteAsync(SQLITE_DIR + nome, { idempotent: true });
              }
              Alert.alert('Sucesso', 'Todos os bancos locais foram removidos.');
            } catch (err) {
              Alert.alert('Erro', `Falha ao limpar bancos: ${err.message}`);
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

    const displayStatus = st.status;
    const displayMensagem = st.mensagem;
    const displayProgresso = st.progresso ?? 0;

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
      {TABELAS_UPLOAD.map(t => renderCard(t, 'upload'))}

      {/* Seção Download */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>📥 Tabelas de Download</Text>
        {operacao === 'download' && <Text style={[styles.sectionTag, { color: '#2196F3' }]}>↓ BAIXANDO</Text>}
      </View>
      {TABELAS_DOWNLOAD.map(t => renderCard(t, 'download'))}
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
