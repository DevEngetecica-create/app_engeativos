import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Octicons from '@expo/vector-icons/Octicons';
import Fontisto from '@expo/vector-icons/Fontisto';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import styles from './SMS.styles';
import criarPasta from './criaPastaSMS.function';

export default function SMS() {
  const navigation = useNavigation();
  useEffect(() => {
    criarPasta(); // Aqui você só importa e chama
  }, []);
  const ActionButton = ({ onPress, Icon, title, subtitle }) => (
    <TouchableOpacity
      style={[styles.button, styles.fullWidth]}
      activeOpacity={0.75}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={styles.iconWrapper}>
        {/* Icon recebe o tamanho e cor por prop */}
        <Icon size={30} color="#3382f8ff" />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      <View style={styles.chevronWrapper}>
        <MaterialCommunityIcons name="chevron-right" size={26} color="#94A3B8" />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header opcional
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Segurança do Trabalho</Text>
      </View> */}

      <View style={styles.actionsWrap}>
        <ActionButton
          onPress={() => navigation.navigate('SMSListaObras')}
          Icon={(props) => <Octicons name="checklist" {...props} />}
          title="Checklists"
          subtitle="Inspeções e conferências por obra"
        />

        <ActionButton
          // onPress={() => navigation.navigate('PlanoDeAcao_SegurancaDoTrabalho')}
          Icon={(props) => <Fontisto name="radio-btn-active" {...props} />}
          title="Ver e Agir"
          subtitle="Identifique riscos e registre ocorrências"
        />

        <ActionButton
          // onPress={() => navigation.navigate('PlanoDeAcao_SegurancaDoTrabalho')}
          Icon={(props) => <MaterialIcons name="pending-actions" {...props} />}
          title="Plano de Ação"
          subtitle="Acompanhe medidas e responsáveis"
        />
      </View>
    </View>
  );
}
