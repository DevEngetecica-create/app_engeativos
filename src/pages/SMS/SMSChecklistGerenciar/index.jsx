// RealizarChecklist/index.js
import React, { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from "react-native";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import styles from "./RealizarChecklist.styles";
import {
  fetchChecklistsFeitos,
  criarNovoChecklist,
  editarChecklist,
} from "./RealizarChecklist.functions";

export default function ChecklistsMenu() {
  const navigation = useNavigation();
  const route = useRoute();
  const { checklist, checklist_nome, id_obra } = route.params;

  const [checklistsFeitos, setChecklistsFeitos] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔹 Buscar checklists feitos
  const carregarChecklistsFeitos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchChecklistsFeitos(checklist, id_obra);
      setChecklistsFeitos(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [checklist]);

  useFocusEffect(
    useCallback(() => {
      carregarChecklistsFeitos();
    }, [carregarChecklistsFeitos])
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Carregando checklists realizados...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header com título do checklist
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerIconContainer}>
            <Text style={styles.headerIcon}>📋</Text>
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerLabel}>Checklist</Text>
            <Text style={styles.headerTitle} numberOfLines={2}>
              {checklist_nome}
            </Text>
          </View>
        </View>
      </View> */}

      {/* Botão novo checklist */}
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={styles.botaoNovo}
          onPress={() => criarNovoChecklist(navigation, checklist, checklist_nome, id_obra)}
          activeOpacity={0.8}
        >
          <View style={styles.botaoNovoIcon}>
            <Text style={styles.botaoNovoIconText}>+</Text>
          </View>
          <Text style={styles.textoBotaoNovo}>Fazer Novo Checklist</Text>
        </TouchableOpacity>
      </View>

      {/* Lista de checklists realizados */}
      <View style={styles.listSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Realizados</Text>
          <View style={styles.sectionBadge}>
            <Text style={styles.sectionBadgeText}>{checklistsFeitos.length}</Text>
          </View>
        </View>

        {checklistsFeitos.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Text style={styles.emptyIconText}>✓</Text>
            </View>
            <Text style={styles.emptyTitle}>Nenhum checklist realizado</Text>
            <Text style={styles.emptySubtitle}>
              Comece criando um novo checklist acima
            </Text>
          </View>
        ) : (
          <FlatList
            data={checklistsFeitos}
            keyExtractor={(item) => item.id_local.toString()}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.card}
                onPress={() => editarChecklist(navigation, checklist, checklist_nome, item)}
                activeOpacity={0.7}
              >
                <View style={styles.cardLeft}>
                  <View style={styles.cardIconContainer}>
                    <Text style={styles.cardIcon}>✓</Text>
                  </View>
                </View>

                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {checklist_nome}
                  </Text>
                  <View style={styles.cardFooter}>
                    <View style={styles.dateContainer}>
                      <Text style={styles.dateIcon}>📅</Text>
                      <Text style={styles.dateText}>
                        {new Date(item.created_at).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </Text>
                    </View>
                  </View>
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
    </View>
  );
}
