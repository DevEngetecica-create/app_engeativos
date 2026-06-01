// src/pages/Configuracoes/upload.js
import React, { useState, useEffect, useRef } from 'react';
import { Platform, ToastAndroid } from "react-native";
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

import { showToast } from "../../utils/toast";
import { getGlobalNetworkStatus } from "../../contexts/network";// 👈 sempre certifique-se que este import está presente

const SQLITE_DIR = `${FileSystem.documentDirectory}SQLite/`;

export default function SyncManager() {
  const [status, setStatus] = useState({});
  const [operacao, setOperacao] = useState(null);
  const executando = useRef(false);
  const { isOffline } = useNetwork();
  const { user } = useAuth();
  const userCtx = { user_id: user?.id, user_create: user?.email };

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

  useEffect(() => {
    carregarUltimasSyncs();
  }, []);

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

  const renderCard = (t, tipo) => {
    const st = status[t.nome] || {};
    const ativo = operacao === `${tipo}_${t.nome}` || operacao === tipo;

    return (
      <View key={t.nome} style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>{t.label}</Text>
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.iconButton, ativo && { opacity: 0.5 }]}
              disabled={ativo}
              onPress={() => executar(tipo, t.nome)}
            >
              <Ionicons
                name={tipo === 'download' ? 'cloud-download' : 'cloud-upload'}
                size={22}
                color={tipo === 'download' ? '#2196F3' : '#FF9800'}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: getCorStatus(st.status) }]} />
          <Text style={styles.statusText}>
            {st.mensagem || 'Aguardando...'}
          </Text>
          {ativo && <ActivityIndicator size="small" color="#666" style={{ marginLeft: 10 }} />}
        </View>

        {st.ultimaDownload && (
          <Text style={styles.lastSync}>Último Download: {st.ultimaDownload}</Text>
        )}
        {st.ultimaUpload && (
          <Text style={styles.lastSync}>Último Upload: {st.ultimaUpload}</Text>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.titulo}>Gerenciador de Sincronização</Text>
      <Text style={styles.subtitulo}>Baixe ou envie dados módulo por módulo</Text>

      <View style={styles.botoesContainer}>
        <TouchableOpacity
          style={[styles.botao, styles.botaoDownload, operacao && { opacity: 0.5 }]}
          disabled={operacao !== null}
          onPress={() => executarOperacao('download')}
        >
          {operacao === 'download' ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Text style={styles.textoBotao}>BAIXAR TODOS</Text>
              <Ionicons name="cloud-download" size={20} color="#FFF" />
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.botao, styles.botaoUpload, operacao && { opacity: 0.5 }]}
          disabled={operacao !== null}
          onPress={() => executarOperacao('upload')}
        >
          {operacao === 'upload' ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Text style={styles.textoBotao}>ENVIAR TODOS</Text>
              <Ionicons name="cloud-upload" size={20} color="#FFF" />
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={[styles.botao, styles.botaoClear]} onPress={limparBancosSQLite}>
          <Text style={styles.textoBotao}>LIMPAR</Text>
          <Ionicons name="trash" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>📤 Tabelas de Upload</Text>
      {TABELAS_UPLOAD.map(t => renderCard(t, 'upload'))}

      <Text style={styles.sectionTitle}>📥 Tabelas de Download</Text>
      {TABELAS_DOWNLOAD.map(t => renderCard(t, 'download'))}


    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 7, backgroundColor: '#F5F5F5' },
  titulo: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 3, color: '#333' },
  subtitulo: { fontSize: 15, textAlign: 'center', marginBottom: 10, color: '#666' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginVertical: 12, color: '#0057a3' },
  card: { backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 12, elevation: 3 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  actions: { flexDirection: 'row' },
  iconButton: { marginHorizontal: 5 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  statusText: { fontSize: 14, color: '#616161', flex: 1 },
  lastSync: { marginTop: 6, fontSize: 12, color: '#888' },
  botoesContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  botao: {
    padding: 7,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  botaoClear: { backgroundColor: '#f34121ff' },
  botaoDownload: { backgroundColor: '#2196F3' },
  botaoUpload: { backgroundColor: '#2cd60aff' },
  textoBotao: { color: '#FFF', fontWeight: 'bold', marginRight: 5 },
});
