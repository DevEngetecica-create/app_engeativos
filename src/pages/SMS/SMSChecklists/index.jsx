// src/pages/Checklists/index.js
import React, { useCallback, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRoute } from "@react-navigation/native";

import Toast from "react-native-root-toast";
import { useAuth } from "@/contexts/auth";
import styles from "./checklists.styles";
import { fetchOnline, fetchOffline } from "./checklists.functions";

export default function SMSChecklists() {
  const navigation = useNavigation();
  const { connectionMode } = useAuth();
  const modoOnline = connectionMode === "online";
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
  // 🔹 Carregar lista
  // ===============================
  const loadChecklists = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      let result;
      if (modoOnline && false) {
        try {
          Toast.show("🟢 Carregando checklists online...", { duration: 500 });
          result = await fetchOnline();
        } catch (err) {
          console.warn("⚠️ Falha online, fallback para SQLite:", err.message);
          Toast.show("🔴 Carregando checklists offline...", { duration: 1500 });
          result = await fetchOffline(idObra);
        }
      } else {
        // Toast.show("🔴 Carregando checklists offline...", { duration: 500 });
        result = await fetchOffline(idObra);
      }
      setState({ loading: false, error: null, ...result });
    } catch (error) {
      setState((s) => ({ ...s, loading: false, error }));
    }
  }, [modoOnline]);

  useFocusEffect(
    useCallback(() => {
      loadChecklists();
    }, [modoOnline])
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

