import React, { useCallback, useState } from 'react';
import {
  ScrollView,
  View,
  StyleSheet,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl
} from 'react-native';
import { useRoute, useFocusEffect, useNavigation } from '@react-navigation/native';
import styled from 'styled-components/native';
import { db } from '../../../../config/database/database';
import { useAuth } from '../../../../contexts/auth';
import ErrorAlert from '../../../../components/ErrorAlert';

// =============================
// 🔹 Styled Components
// =============================
const Container = styled.View`
  flex: 1;
  padding: 8px;
  background-color: #f5f5f5;
`;
const Card = styled.View`
  background: #fff;
  border-radius: 8px;
  padding: 10px;
  margin-bottom: 10px;
  border-left-width: 6px;
  border-left-color: ${props => (props.synced ? '#2ecc71' : '#e67e22')};
  background-color: ${props => (props.synced ? '#f2fff6' : '#fff9f2')};
`;
const Label = styled.Text`
  font-weight: bold;
  color: #333;
`;
const Value = styled.Text`
  color: #000;
  margin-bottom: 4px;
`;
const SyncText = styled.Text`
  font-weight: bold;
  color: ${props => (props.synced ? 'green' : 'red')};
  margin-top: 6px;
`;
const CreateButton = styled.TouchableOpacity`
  background-color: #3cb371;
  padding: 10px;
  border-radius: 6px;
  align-items: center;
  margin-bottom: 12px;
`;
const CreateText = styled.Text`
  color: #fff;
  font-weight: bold;
  font-size: 16px;
`;
const SectionTitle = styled.Text`
  font-size: 18px;
  font-weight: bold;
  color: #1f51fe;
  margin-bottom: 8px;
`;

// =============================
// 🔹 Função para formatar data
// =============================
const formatarData = dataISO => {
  if (!dataISO) return '–';
  try {
    const data = new Date(dataISO);
    if (isNaN(data)) return dataISO;

    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const ano = data.getFullYear();
    const hora = String(data.getHours()).padStart(2, '0');
    const min = String(data.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${ano} ${hora}:${min}`;
  } catch {
    return dataISO;
  }
};

// =============================
// 🔹 Filtro da semana atual
// =============================
const getWeekRange = () => {
  const hoje = new Date();
  const primeiroDia = new Date(hoje);
  const ultimoDia = new Date(hoje);

  // Domingo → primeiro dia da semana (ajuste se preferir segunda)
  primeiroDia.setDate(hoje.getDate() - hoje.getDay());
  ultimoDia.setDate(primeiroDia.getDate() + 6);

  primeiroDia.setHours(0, 0, 0, 0);
  ultimoDia.setHours(23, 59, 59, 999);

  return {
    start: primeiroDia.toISOString().slice(0, 19).replace('T', ' '),
    end: ultimoDia.toISOString().slice(0, 19).replace('T', ' ')
  };
};

// =============================
// 🔹 Principal
// =============================
export default function ChecklistServicosIndex() {
  const navigation = useNavigation();
  const route = useRoute();
  const { id_veiculo, id_obra, prefixo } = route.params || {};
  const { connectionMode, id_nivel, user } = useAuth();

  const modoOnline = connectionMode === 'online';
  const currentLevel = Number(id_nivel) || Number(user?.id_nivel) || 0;
  const [servicos, setServicos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // =============================
  // 🔹 Buscar dados do SQLite
  // =============================
  const loadServicosOffline = async () => {
    const { start, end } = getWeekRange();

    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `
          SELECT 
            s.id,
            s.id_veiculo,
            s.id_obra,
            s.status,
            s.status_ciclo,
            s.id_local,
            s.data_cadastro,
            s.sync_status,
            (
              SELECT COUNT(1)
              FROM veiculo_checklist_evidencias ev
              WHERE ev.sync_status IN (0, 2, 3, 99)
                AND (
                  (ev.parent_tabela = 'veiculo_checklist_itens_servicos' AND ev.parent_id_local = s.id_local)
                  OR (
                    ev.parent_tabela = 'veiculo_checklist_itens_realizados'
                    AND ev.parent_id_local IN (
                      SELECT r.id_local
                      FROM veiculo_checklist_itens_realizados r
                      WHERE r.id_checklist_realizado = s.id_local
                    )
                  )
                )
            ) AS evidencias_pendentes,
            o.codigo_obra,
            v.prefixo
          FROM veiculo_checklist_itens_servicos s
          LEFT JOIN obras o ON o.id = s.id_obra
          LEFT JOIN veiculos v ON v.id = s.id_veiculo
          WHERE (? IS NULL OR s.id_veiculo = ?)
            AND (s.data_cadastro BETWEEN ? AND ? OR s.status_ciclo = 'ABERTO')
          ORDER BY CASE WHEN s.status_ciclo = 'ABERTO' THEN 0 ELSE 1 END, s.id DESC
          `,
          [id_veiculo || null, id_veiculo || null, start, end],
          (_, { rows }) => resolve(rows._array),
          (_, err) => reject(err)
        );
      });
    });
  };

  const fetchServicos = useCallback(async () => {
    setLoading(true);
    setErrors(null);
    try {
      const list = await loadServicosOffline();
      setServicos(list);
    } catch (err) {
      setErrors([err.message]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchServicos();
    }, [fetchServicos])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchServicos();
  }, [fetchServicos]);

  const buscarChecklistAberto = () =>
    new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `
          SELECT
            s.id,
            s.id_veiculo,
            s.id_obra,
            s.id_local,
            s.data_cadastro,
            o.codigo_obra,
            v.prefixo
          FROM veiculo_checklist_itens_servicos s
          LEFT JOIN obras o ON o.id = s.id_obra
          LEFT JOIN veiculos v ON v.id = s.id_veiculo
          WHERE s.status_ciclo = 'ABERTO'
          ORDER BY s.id DESC
          LIMIT 1;
          `,
          [],
          (_, { rows }) => resolve(rows._array[0] || null),
          (_, err) => reject(err)
        );
      });
    });

  const buscarUltimoFechado = () =>
    new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT s.data_fechamento, v.prefixo FROM veiculo_checklist_itens_servicos s LEFT JOIN veiculos v ON v.id = s.id_veiculo WHERE s.status_ciclo = 'CONCLUIDO' ORDER BY s.id DESC LIMIT 1;`,
          [],
          (_, { rows }) => resolve(rows._array[0] || null),
          (_, err) => reject(err)
        );
      });
    });

  const navegarParaCriacao = () => {
    navigation.navigate('CreateChecklistServicos', {
      id_veiculo,
      id_obra,
      prefixo
    });
  };

  const handleCreateChecklistPress = async () => {
    if (currentLevel !== 25) {
      navegarParaCriacao();
      return;
    }

    const basePrefixNovo = (prefixo || '').split(' > ')[0].trim();

    try {
      const aberto = await buscarChecklistAberto();

      if (aberto) {
        if (String(aberto.id_veiculo) === String(id_veiculo)) {
          Alert.alert(
            'Checklist aberto',
            `Este veículo já possui um checklist ABERTO.\n\nVeículo: ${aberto.prefixo || prefixo}\n\nFeche o ciclo atual antes de iniciar outro.`,
            [
              { text: 'OK', style: 'cancel' },
              {
                text: 'Ver detalhes',
                onPress: () => navigation.navigate('ShowChecklistServicos', {
                  id_checklist: aberto.id_local,
                  prefixo: aberto.prefixo || prefixo || `ID ${aberto.id_veiculo}`,
                  codigoObra: aberto.codigo_obra,
                }),
              },
            ]
          );
          return;
        }

        const basePrefixAberto = (aberto.prefixo || '').split(' > ')[0].trim();
        if (basePrefixAberto !== basePrefixNovo) {
          Alert.alert(
            'Acesso bloqueado',
            `Você possui um checklist ABERTO em outro veículo.\n\nVeículo: ${aberto.prefixo}\n\nConclua-o antes de iniciar um novo.`,
            [
              { text: 'OK', style: 'cancel' },
              {
                text: 'Ver checklist',
                onPress: () => navigation.navigate('ChecklistServicos', {
                  id_veiculo: aberto.id_veiculo,
                  id_obra: aberto.id_obra,
                  prefixo: aberto.prefixo || `ID ${aberto.id_veiculo}`,
                }),
              },
            ]
          );
          return;
        }
      }

      const ultimoFechado = await buscarUltimoFechado();
      if (ultimoFechado?.data_fechamento) {
        const basePrefixFechado = (ultimoFechado.prefixo || '').split(' > ')[0].trim();
        if (basePrefixFechado !== basePrefixNovo) {
          const dtFechamento = new Date(ultimoFechado.data_fechamento.replace(' ', 'T'));
          const diffMs = new Date() - dtFechamento;
          const diffHours = diffMs / (1000 * 60 * 60);
          if (!isNaN(diffHours) && diffHours < 1) {
            const minutosRestantes = Math.ceil(60 - (diffMs / (1000 * 60)));
            Alert.alert(
              'Bloqueio de tempo',
              `Você concluiu um checklist de outro equipamento recentemente. Aguarde mais ${minutosRestantes} minuto(s) antes de iniciar neste.`
            );
            return;
          }
        }
      }

      navegarParaCriacao();
    } catch (error) {
      console.error("Erro ao checar checklist:", error);
    }
  };

  const fecharCiclo = async (idLocal) => {
    navigation.navigate('CreateChecklistServicos', {
      id_veiculo,
      id_obra,
      prefixo,
      isFechamento: true,
      id_aberto_ref: idLocal
    });
  };

  // =============================
  // 🔹 Interface
  // =============================
  return (
    <ScrollView
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      contentContainerStyle={{ flexGrow: 1 }}
    >
      <Container>
        <ErrorAlert errors={errors} />

        <SectionTitle>🧰 Checklist de Serviços</SectionTitle>

        <CreateButton onPress={handleCreateChecklistPress}>
          <CreateText>Fazer Checklist</CreateText>
        </CreateButton>

        {loading && <ActivityIndicator size="large" color="green" style={{ marginVertical: 20 }} />}

        {!loading && !servicos.length && (
          <Text style={{ textAlign: 'center', color: '#555' }}>
            Nenhum checklist encontrado nesta semana.
          </Text>
        )}

        {!loading &&
          servicos.map(s => {
            const evidenciasPendentes = Number(s.evidencias_pendentes || 0);
            const sincronizadoCompleto = s.sync_status === 1 && evidenciasPendentes === 0;

            return (
            <Card key={s.id} synced={sincronizadoCompleto}>
              <Label>Serviço #{s.id}</Label>
              <Value>Veículo: {s.prefixo || prefixo || `ID ${s.id_veiculo}`}</Value>
              <Value>Obra: {s.codigo_obra || s.nome_obra || '–'}</Value>
              <Value>Data Cadastro: {formatarData(s.data_cadastro)}</Value>
              <Value>Status: {s.status || '–'}</Value>
              <Value>Ciclo: {s.status_ciclo || '–'}</Value>
            

              <SyncText synced={sincronizadoCompleto}>
                {sincronizadoCompleto
                  ? '✅ Checklist sincronizado'
                  : '⛔ Checklist salvo localmente' }
              </SyncText>
              {evidenciasPendentes > 0 && (
                <Value>Evidencias pendentes: {evidenciasPendentes}</Value>
              )}

              <View style={styles.actionRow}>
                {s.status_ciclo === 'ABERTO' && (
                  <TouchableOpacity
                    style={[styles.btnAction, { backgroundColor: '#e74c3c' }]}
                    onPress={() => fecharCiclo(s.id_local)}
                  >
                    <Text style={styles.btnText}>Fechar Ciclo</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.btnAction}
                  onPress={() =>
                    navigation.navigate('ShowChecklistServicos', {
                      id_checklist: s.id_local,
                      prefixo: s.prefixo || prefixo,
                      codigoObra: s.codigo_obra || s.nome_obra
                    })
                  }
                >
                  <Text style={styles.btnText}>Detalhes</Text>
                </TouchableOpacity>
              </View>
            </Card>
          );})}
      </Container>
    </ScrollView>
  );
}

// =============================
// 🔹 Estilos adicionais
// =============================
const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8
  },
  btnAction: {
    backgroundColor: '#007bff',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginLeft: 8
  },
  btnEdit: {
    backgroundColor: 'orange',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginLeft: 8
  },
  btnText: {
    color: '#fff',
    fontWeight: 'bold'
  }
});
