// src/pages/Checklists/index.js
import React, { useCallback, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";

import styles from "./checklists.styles";
import { fetchOffline } from "./checklists.functions";

export default function SMSChecklists() {
  const navigation = useNavigation();
  const route = useRoute();
  const idObra = route.params.obra;
  const nome_obra = route.params.nome_obra;

  const [state, setState] = useState({
    loading: true,
    error: null,
    checklists: [],
    count: 0,
  });

  // ===============================
  // 🔹 Carregar lista (offline-first: SQLite e o download oficial atualiza o cache)
  // ===============================
  const loadChecklists = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const result = await fetchOffline(idObra);
      setState({ loading: false, error: null, ...result });
    } catch (error) {
      setState((s) => ({ ...s, loading: false, error }));
    }
  }, [idObra]);

  useFocusEffect(
    useCallback(() => {
      loadChecklists();
    }, [loadChecklists])
  );

  // ===============================
  // 🔹 Abrir checklist
  // ===============================
  const abrirChecklist = (item) => {
    navigation.navigate("SMSChecklistGerenciar", { 
      checklist: item.id, 
      checklist_nome: item.nome_checklist, 
      id_obra: idObra 
    });
  };

  // ===============================
  // 🔹 Renderização
  // ===============================
  if (state.loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Carregando checklists...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header com contador */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{nome_obra}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{state.count}</Text>
          </View>
        </View>
        <View style={styles.divider} />
      </View>

      {state.checklists.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Text style={styles.emptyIconText}>📋</Text>
          </View>
          <Text style={styles.emptyTitle}>Nenhum checklist disponível</Text>
          <Text style={styles.emptySubtitle}>
            Os checklists aparecerão aqui quando estiverem disponíveis
          </Text>
        </View>
      ) : (
        <FlatList
          data={state.checklists}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.card} 
              onPress={() => abrirChecklist(item)}
              activeOpacity={0.7}
            >
              <View style={styles.cardLeft}>
                <View style={styles.iconContainer}>
                  <Text style={styles.iconText}>✓</Text>
                </View>
              </View>
              
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {item.nome_checklist}
                </Text>
              </View>

              <View style={styles.cardRight}>
                <View style={styles.arrowContainer}>
                  <Text style={styles.arrowText}>›</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

