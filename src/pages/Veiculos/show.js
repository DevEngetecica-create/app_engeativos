// src/pages/Veiculos/Show.js
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  RefreshControl,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import styled from 'styled-components/native';
import Toast from 'react-native-root-toast';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import api from '../../config/api';
import Loading from '../../components/Loading';
import ErrorAlert from '../../components/ErrorAlert';
import { initDatabase, db } from '../../config/database/database';
import { useAuth } from '../../contexts/auth';
import { parseApiResponsePayload } from '../../utils/apiResponse';

// =============================
// 🔹 Funções Auxiliares (Preventivas)
// =============================
const formatarData = (isoDate) => {
  if (!isoDate || isoDate === '0000-00-00' || isoDate === '0000-00-00 00:00:00') return '--';
  const [y, m, d] = isoDate.split(' ')[0].split('-');
  if (!y || !m || !d) return '--';
  return `${d}/${m}/${y}`;
};

const processarPreventivas = (veiculo, preventivasItens = [], servicosPreventiva = [], medicaoAtual = 0) => {
  if (!preventivasItens || preventivasItens.length === 0) return [];

  const grouped = preventivasItens.reduce((acc, item) => {
    const p = Number(item.periodo_maq_vei) || 0;
    if (!acc[p]) acc[p] = [];
    acc[p].push(item);
    return acc;
  }, {});

  const periodos = Object.keys(grouped).map(Number).sort((a, b) => a - b);
  const statusDosCiclos = {};
  const ciclosLiberados = [];

  periodos.forEach(periodo => {
    let alvoDesseCiclo = periodo;
    
    const ultimaExec = servicosPreventiva.find(manut => {
      const perDb = veiculo.tipo_hr == 1 ? manut.campo_cal_hr : manut.campo_calc_km;
      return Number(perDb) === periodo;
    });

    let dataUltima = '--';
    let dataVencimento = '--';

    if (ultimaExec) {
      alvoDesseCiclo = veiculo.tipo_hr == 1 ? ultimaExec.horimetro_proximo : ultimaExec.quilometragem_nova;
      if (ultimaExec.data_conclusao) dataUltima = formatarData(ultimaExec.data_conclusao);
      if (ultimaExec.data_de_vencimento) dataVencimento = formatarData(ultimaExec.data_de_vencimento);
    }

    const margem = veiculo.tipo_hr == 1 ? 100 : 1500;
    const distanciaAteAlvo = alvoDesseCiclo - medicaoAtual;
    let liberado = false;

    if (distanciaAteAlvo <= margem) {
      liberado = true;
      ciclosLiberados.push(periodo);
    }

    statusDosCiclos[periodo] = {
      distancia: distanciaAteAlvo,
      liberado,
      ultima: ultimaExec,
      alvo: alvoDesseCiclo,
      dataVencimento,
      dataUltima
    };
  });

  const cicloMestreDoMomento = ciclosLiberados.length > 0 ? Math.max(...ciclosLiberados) : null;

  return periodos.map(periodo => {
    const st = statusDosCiclos[periodo];
    let liberado = st.liberado;
    let textoBloqueio = '';

    if (liberado) {
      if (periodo === cicloMestreDoMomento) {
        textoBloqueio = null;
      } else {
        liberado = false;
        textoBloqueio = `Realize a OS de ${cicloMestreDoMomento.toLocaleString('pt-BR')}`;
      }
    } else {
      const statusExcedido = st.distancia < 0 
        ? `Excedido em ${Math.abs(st.distancia).toLocaleString('pt-BR')}`
        : `Faltam ${st.distancia.toLocaleString('pt-BR')}`;
      textoBloqueio = `${statusExcedido} ${veiculo.tipo_hr == 1 ? 'hr' : 'km'}`;
    }

    let progressoPercentual = 0;
    if (st.ultima) {
      const baseKm = veiculo.tipo_hr == 1 ? Number(st.ultima.horimetro_atual || 0) : Number(st.ultima.quilometragem_atual || 0);
      const totalPercorrer = st.alvo - baseKm;
      const jaPercorrido = medicaoAtual - baseKm;
      if (totalPercorrer > 0) progressoPercentual = (jaPercorrido / totalPercorrer) * 100;
    } else {
      if (periodo > 0) progressoPercentual = (medicaoAtual / periodo) * 100;
    }
    progressoPercentual = Math.min(100, Math.max(0, progressoPercentual));

    let colorClass = '#22c55e'; // verde
    if (progressoPercentual >= 90) colorClass = '#eab308'; // amarelo
    if (progressoPercentual >= 100 || st.distancia <= 0) colorClass = '#ef4444'; // vermelho
    if (liberado) colorClass = '#22c55e';

    return {
      periodo,
      distancia: st.distancia,
      liberado,
      alvo: st.alvo,
      dataUltima: st.dataUltima,
      dataVencimento: st.dataVencimento,
      progressoPercentual,
      textoBloqueio,
      colorClass
    };
  });
};

// =============================
// 🔹 Styled Components
// =============================
const Container = styled.View`
  flex: 1;
  padding: 16px;
  background-color: #f8f9fa;
`;

const Section = styled.View`
  margin-bottom: 24px;
  background: #fff;
  border-radius: 12px;
  padding: 14px;
  elevation: 2;
  shadow-color: #000;
  shadow-opacity: 0.1;
  shadow-radius: 4px;
  shadow-offset: 0px 2px;
`;

const SectionTitle = styled.Text`
  font-weight: bold;
  font-size: 18px;
  margin-bottom: 12px;
  color: #0057a3;
  text-align: center;
`;

const FieldRow = styled.View`
  flex-direction: row;
  margin-bottom: 6px;
`;

const Label = styled.Text`
  font-weight: bold;
  width: 120px;
  color: #333;
`;

const Value = styled.Text`
  flex: 1;
  color: #555;
`;

const CardImage = styled.Image`
  width: 100%;
  height: 220px;
  border-radius: 8px;
  margin-bottom: 12px;
`;

// =============================
// 🔹 Animated Button
// =============================
const AnimatedButton = ({ children, onPress, style }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start(() => onPress && onPress());
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={style}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

// =============================
// 🔹 Principal
// =============================
export default function VeiculoShow() {
  const route = useRoute();
  const navigation = useNavigation();
  const { id } = route.params;
  const { id_veiculo } = id ? { id_veiculo: id } : {};
  const { connectionMode } = useAuth();
  const modoOnline = connectionMode === 'online';

  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [preventivas, setPreventivas] = useState([]); // 🔹 novo state

  useEffect(() => {
    initDatabase();
  }, []);

  const handleChecklistPress = () => {
    navigation.navigate('ChecklistServicos', {
      id_veiculo,
      id_obra: veiculo.obra_id,
      prefixo: veiculo.prefixo,
    });
  };

  const fetchDetailsOffline = useCallback(() => {
    return new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          `SELECT * FROM veiculos WHERE id = ?;`,
          [id],
          (_, { rows }) => {
            if (rows._array.length) {
              const row = rows._array[0];
              resolve({ status: true, veiculo: row, preventivasList: [] });
            } else {
              reject(new Error('Nenhum registro local encontrado.'));
            }
          },
          (_, err) => reject(err)
        );
      });
    });
  }, [id]);

  // A checagem de abastecimento bloqueava a exibição do botão e causava erro 404 na API.
  // Foi removida para garantir que gestores e funcionários locais de 'usuarios_niveis_obra' consigam ver o botão Abastecimento.
  const fetchDetails = useCallback(async (isMounted = { current: true }) => {
    setLoading(true);
    setErrors(null);
    try {
      let result;
      if (modoOnline) {
        try {
          const { data } = await api.get(`admin/ativo/veiculo/show/${id_veiculo}`);
          const responseData = parseApiResponsePayload(data);

          if (responseData && responseData.status) {
            result = responseData;
            
            // Replicar processamento das preventivas via API
            if (result.preventivas_itens && result.servicos_preventiva) {
              const medAtual = result.medicaoAtual ?? (result.veiculo?.tipo_hr == 1 ? result.veiculo?.horimetro_atual : result.veiculo?.quilometragem_atual) ?? 0;
              result.medicaoAtualCalculada = medAtual;
              result.preventivasList = processarPreventivas(
                result.veiculo, 
                result.preventivas_itens, 
                result.servicos_preventiva, 
                medAtual
              );
            } else {
              result.preventivasList = [];
            }
          }
          else {
            throw new Error(typeof data === 'object' ? JSON.stringify(data).substring(0, 300) : String(data).substring(0, 300));
          }
        } catch (error) {
          const apiMsg = error.response?.data?.message;
          const jsMsg = error.message;
          const jsStack = error.stack;
          const finalMsg = apiMsg || jsMsg;
          // Removemos o alerta invasivo, pois agora vamos resolver o parse do JSON
          result = await fetchDetailsOffline();
        }
      } else {
        result = await fetchDetailsOffline();
      }

      if (!isMounted.current) return; // 🔹 PREVINE RACE CONDITION!

      setDetails(result);
      setPreventivas(result?.preventivasList || []);
      
    } catch (err) {
      if (isMounted.current) setErrors([err.message]);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [id, id_veiculo, modoOnline, fetchDetailsOffline]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDetails({ current: true });
    setRefreshing(false);
  }, [fetchDetails]);

  useEffect(() => {
    const isMounted = { current: true };
    fetchDetails(isMounted);
    return () => { isMounted.current = false; };
  }, [fetchDetails]);

  if (loading && !refreshing) return <Loading />;

  if (!details) {
    return (
      <Container>
        <Text>Nenhum detalhe disponível.</Text>
      </Container>
    );
  }

  const veiculo = details.veiculo;
  const icon = veiculo?.tipo == 4 ? '🚜' : '🚛';

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Container>
        <ErrorAlert errors={errors} />

        {/* Foto + Dados */}
        <Section>
          <CardImage
            source={
              veiculo?.imagem
                ? { uri: `https://sga-engeativos.com.br/imagens/veiculos/${id_veiculo}/${veiculo.imagem}` }
                : require('../../../assets/no-photos.png')
            }
            resizeMode="cover"
          />
          <SectionTitle>{`${icon} Dados do Veículo`}</SectionTitle>
          <FieldRow><Label>Prefixo:</Label><Value>{veiculo.prefixo}</Value></FieldRow>
          <FieldRow><Label>Placa / Série:</Label><Value>{veiculo.placa ?? veiculo.nun_serie_chassi ?? '-'}</Value></FieldRow>
          <FieldRow><Label>Marca:</Label><Value>{veiculo.marca ?? '-'}</Value></FieldRow>
          <FieldRow><Label>Modelo:</Label><Value>{veiculo.modelo ?? '-'}</Value></FieldRow>
        </Section>

        {/* Serviços disponíveis */}
        <Section>
          <SectionTitle>Serviços</SectionTitle>

          <View style={styles.servicesRow}>
            <AnimatedButton
              style={[styles.serviceButton, { borderTopColor: '#0057a3' }]}
              onPress={handleChecklistPress}>
              <FontAwesome5 name="clipboard-check" size={28} color="#0057a3" />
              <Text style={styles.serviceText}>Checklist</Text>
            </AnimatedButton>

            <AnimatedButton
              style={[styles.serviceButton, { borderTopColor: '#e67e22' }]}
              onPress={() =>
                navigation.navigate('VeiculoAbastFrota', {
                  id_veiculo,
                  prefixo: veiculo.prefixo,
                  id_obra: veiculo.obra_id,
                })
              }>
              <MaterialIcons name="local-gas-station" size={30} color="#e67e22" />
              <Text style={styles.serviceText}>Abastecimento</Text>
            </AnimatedButton>

            <AnimatedButton
              style={[styles.serviceButton, { borderTopColor: '#2ecc71' }]}
              onPress={() =>
                navigation.navigate('VeiculosDiarioBordo', {
                  id_veiculo: id_veiculo,
                  prefixo: veiculo.prefixo,
                  id_obra: veiculo.obra_id,
                })
              }>
              <FontAwesome5 name="book" size={28} color="#2ecc71" />
              <Text style={styles.serviceText}>Diário</Text>
            </AnimatedButton>
          </View>
        </Section>

        {/* ============================== */}
        {/* 🔹 DASHBOARD DE PREVENTIVAS    */}
        {/* ============================== */}
        <Section>
          <SectionTitle>🔧 Dashboard de Preventivas</SectionTitle>
          {!modoOnline ? (
            <Text style={{ textAlign: 'center', color: '#777', padding: 10 }}>
              Os dados do dashboard de preventivas são exibidos apenas com acesso à internet.
            </Text>
          ) : preventivas.length === 0 ? (
            <Text style={{ textAlign: 'center', color: '#777', padding: 10 }}>
              Nenhuma preventiva cadastrada para este veículo.
            </Text>
          ) : (
            preventivas.map((prev, index) => {
              const isMaquina = veiculo?.tipo_hr == 1;
              const borderColor = prev.colorClass;
              const statusVencido = prev.distancia < 0;
              const statusLiberado = prev.liberado;
              const medAtualNum = details.medicaoAtualCalculada || 0;
              
              return (
                <View key={index} style={[styles.prevCard, { borderTopColor: borderColor }]}>
                   <View style={styles.prevHeader}>
                      <View>
                        <Text style={styles.prevCicloText}>Ciclo {prev.periodo.toLocaleString('pt-BR')} {isMaquina ? 'HR' : 'KM'}</Text>
                        <Text style={[styles.prevTitle, { color: borderColor }]}>
                          {statusVencido ? 'Vencido' : statusLiberado ? 'Próximo!' : `${prev.distancia.toLocaleString('pt-BR')} `}
                          {!statusVencido && !statusLiberado && (
                            <Text style={styles.prevSubtitleFaltantes}>{isMaquina ? 'hrs Faltantes' : 'km Faltantes'}</Text>
                          )}
                        </Text>
                      </View>
                      
                      <View style={[styles.iconCirculo, { backgroundColor: borderColor + '20' }]}>
                        <FontAwesome5 
                          name={statusVencido ? "exclamation-triangle" : (statusLiberado ? "check-double" : "wrench")} 
                          size={18} 
                          color={borderColor} 
                        />
                      </View>
                   </View>
                   
                   <View style={styles.progressBarContainer}>
                      <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${prev.progressoPercentual}%`, backgroundColor: borderColor }]} />
                      </View>
                      <View style={styles.progressLabels}>
                        <Text style={styles.progressText}>Atual: {Number(medAtualNum).toLocaleString('pt-BR')}</Text>
                        <Text style={styles.progressText}>Target: {Number(prev.alvo).toLocaleString('pt-BR')}</Text>
                      </View>
                   </View>

                   <View style={styles.prevFooter}>
                      <View style={styles.footerRow}>
                         <Text style={styles.footerLabel}>Última Exec:</Text>
                         <Text style={styles.footerValue}>{prev.dataUltima}</Text>
                      </View>
                      <View style={styles.footerRow}>
                         <Text style={styles.footerLabel}>Prev. Data:</Text>
                         <Text style={styles.footerValue}>{prev.dataVencimento}</Text>
                      </View>
                   </View>

                   {/* Bloqueador de Status */}
                   {!statusLiberado && prev.textoBloqueio ? (
                      <View style={styles.blockerContainer}>
                        <FontAwesome5 name="lock" size={12} color="#888" style={{marginRight: 6}} />
                        <Text style={styles.blockerText}>{prev.textoBloqueio}</Text>
                      </View>
                   ) : null}
                </View>
              );
            })
          )}
        </Section>

      </Container>
    </ScrollView>
  );
}

// =============================
// 🔹 Estilos
// =============================
const styles = StyleSheet.create({
  servicesRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'stretch',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  serviceButton: {
    width: 105,
    height: 105,
    backgroundColor: '#fff',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginHorizontal: 6,
    marginVertical: 6,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    borderTopWidth: 4,
  },
  serviceText: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  prevCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    borderTopWidth: 4,
    borderColor: '#e2e8f0',
  },
  prevHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  prevCicloText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  prevTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  prevSubtitleFaltantes: {
    fontSize: 12,
    fontWeight: 'normal',
    color: '#64748b',
  },
  iconCirculo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBarContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  progressText: {
    fontSize: 12,
    color: '#64748b',
  },
  prevFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
    marginBottom: 12,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  footerLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  footerValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#334155',
  },
  blockerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingVertical: 10,
  },
  blockerText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  }
});
