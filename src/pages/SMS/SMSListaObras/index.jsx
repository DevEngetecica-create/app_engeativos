// ObrasSMS.jsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import styles from './ObrasSMS.styles'; // -> seu arquivo de styles compartilhado
import { useNavigation } from '@react-navigation/native';
import { db } from '@/config/database/database';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AntDesign from '@expo/vector-icons/AntDesign';

export default function ObrasSMS() {
  const navigation = useNavigation();
  const [obras, setObras] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOfflineObras();
  }, []);

  const fetchOfflineObras = () => {
    db.transaction((tx) => {
      tx.executeSql(
        'SELECT * FROM sms_obras_permitidas;',
        [],
        (_, { rows }) => {
          setObras(rows._array || []);
          setLoading(false);
        },
        (txObj, error) => {
          console.error('Erro ao buscar obras:', error);
          setLoading(false);
        }
      );
    });
  };

  const handlePressObra = (item) => {
    // navegando para a tela de checklists passando id da obra
    navigation.navigate('SMSChecklists', { obra: item.id , nome_obra: item.codigo_obra });
  };

  const renderObra = ({ item }) => {
    const title = item.codigo_obra || item.razao_social || 'Sem nome';

    return (
      <TouchableOpacity style={styles.card} onPress={() => handlePressObra(item)}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={styles.cardLeft}>
            <View style={styles.iconContainer}>
              {/* usei uma letra como "ícone" para combinar com iconText style */}
              <MaterialIcons name="location-city" size={28} color="#497decc2" />
            </View>
          </View>

          <View style={styles.cardContent}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {title}
            </Text>

            <View style={{ marginTop: 6 }}>
              <Text style={styles.textoInfo}>
                <AntDesign name="barcode" size={14} color="#94A3B8" />{' '}
                {item.razao_social || 'N/D'}
              </Text>
              <Text style={styles.textoInfo}>
                <AntDesign name="idcard" size={14} color="#94A3B8" /> CNPJ:{' '}
                {item.cnpj || 'N/D'}
              </Text>
            </View>
          </View>

          <View style={styles.cardRight}>
            <View style={styles.arrowContainer}>
              <Text style={styles.arrowText}>›</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Carregando obras...</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header simples com título e badge de quantidade */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Total Obras</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{obras.length}</Text>
          </View>
        </View>
        <View style={styles.divider} />
      </View>

      <View style={styles.listContainer}>
        {obras.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Text style={styles.emptyIconText}>🏗</Text>
            </View>
            <Text style={styles.emptyTitle}>Nenhuma obra encontrada</Text>
            <Text style={styles.emptySubtitle}>
              Não há obras permitidas salvas localmente. Verifique sua conexão ou sincronize os dados.
            </Text>
          </View>
        ) : (
          <FlatList
            data={obras}
            keyExtractor={(item, index) => (item.id ? String(item.id) : String(index))}
            renderItem={renderObra}
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
            removeClippedSubviews={true}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
