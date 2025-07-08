import React, { useState, useEffect } from 'react';
import { 
  ScrollView, 
  StyleSheet, 
  Text, 
  TextInput, 
  Alert, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator 
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { TextInputMask } from 'react-native-masked-text';
import NetInfo from '@react-native-community/netinfo';
import * as ImagePicker from 'expo-image-picker';
import styled from 'styled-components/native';
import * as SQLite from 'expo-sqlite/legacy';

const db = SQLite.openDatabase('app.db');
import api from '../../../config/api';

// Criar tabela se não existir
db.transaction(tx => {
  tx.executeSql(
    `CREATE TABLE IF NOT EXISTS veiculos_diario_bordo (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_obra INTEGER,
      id_veiculo INTEGER,
      id_funcionario INTEGER,
      data_cadastro TEXT,
      horario_inicial TEXT,
      horimetro_inicial TEXT,
      hodometro_inicial TEXT,
      horario_final TEXT,
      horimetro_final TEXT,
      hodometro_final TEXT,
      descricao_atividade TEXT,
      arquivo TEXT,
      sync_status INTEGER DEFAULT 0
    )`
  );
});

// Componentes estilizados
const Container = styled.View` padding: 20px; `;
const Input = styled.TextInput`
  border: 1px solid #ccc;
  border-radius: 6px;
  padding: 8px;
  margin-bottom: 12px;
  text-align-vertical: top;
`;
const Btn = styled.TouchableOpacity`
  background-color: #1f51fe;
  padding: 12px;
  border-radius: 6px;
  align-items: center;
  margin-bottom: 12px;
`;
const BtnText = styled.Text`
  color: #fff;
  font-weight: bold;
`;
const BtnSalvar = styled.TouchableOpacity`
  background-color: green;
  padding: 12px;
  border-radius: 6px;
  align-items: center;
  margin-bottom: 12px;
`;
const Label = styled.Text`
  font-weight: bold;
  margin-bottom: 4px;
  color: #333;
`;
const Linha = styled.View`
  width: 100%;
  background-color: green;
  height: 1px;
  margin-bottom: 25px;
`;

const TextArea = styled.TextInput`border: 1px solid #ccc; border-radius: 6px; padding: 8px; margin-bottom: 12px; height: 150px; text-align-vertical: top;`;


export default function DiarioCadastro() {
  const { id_veiculo } = useRoute().params;
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [codigoObra, setCodigoObra] = useState('');

  const [form, setForm] = useState({
    id_obra: '',
    id_funcionario: '',
    horario_inicial: '',
    horimetro_inicial: '',
    hodometro_inicial: '',
    horario_final: '',
    horimetro_final: '',
    hodometro_final: '',
    descricao_atividade: '',
    arquivo: null
  });

  // Carregar imagem da galeria
  const handlePickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7
    });

    if (!res.canceled) {
      setForm({ ...form, arquivo: res.assets[0] });
    }
  };

  // Buscar dados do veículo
  const fetchItems = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`admin/ativo/veiculo/show/${id_veiculo}`);
      if(data.veiculo) {
        setItems(data.veiculo);
        setCodigoObra(data.veiculo.obra?.codigo_obra || '');
        setForm(prev => ({
          ...prev,
          id_obra: data.veiculo.obra?.id.toString() || ''
        }));
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  // Salvar localmente no SQLite
  const salvarLocalmente = async () => {
    return new Promise((resolve, reject) => {
      const data_cadastro = new Date().toISOString().slice(0, 10);
      
      db.transaction(tx => {
        tx.executeSql(
          `INSERT INTO veiculos_diario_bordo (
            id_obra, id_veiculo, id_funcionario, data_cadastro,
            horario_inicial, horimetro_inicial, hodometro_inicial,
            horario_final, horimetro_final, hodometro_final,
            descricao_atividade, arquivo, sync_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            form.id_obra,
            id_veiculo,
            form.id_funcionario,
            data_cadastro,
            form.horario_inicial,
            form.horimetro_inicial || '',
            form.hodometro_inicial || '',
            form.horario_final,
            form.horimetro_final || '',
            form.hodometro_final || '',
            form.descricao_atividade,
            form.arquivo?.uri || '',
            0 // Não sincronizado
          ],
          (_, result) => resolve(result),
          (_, error) => reject(error)
        );
      });
    });
  };

  // Sincronizar dados locais
  const sincronizarDiariosLocais = async () => {
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) return;

    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM veiculos_diario_bordo WHERE sync_status = 0',
        [],
        async (_, { rows }) => {
          for (let i = 0; i < rows.length; i++) {
            const registro = rows.item(i);
            try {
              const formData = criarFormData(registro);
              await api.post('admin/ativo/veiculo/diario_bordo/store', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
              });

              // Atualizar status
              db.transaction(tx2 => {
                tx2.executeSql(
                  'UPDATE veiculos_diario_bordo SET sync_status = 1 WHERE id = ?',
                  [registro.id]
                );
              });
            } catch (error) {
              console.error('Erro na sincronização:', error);
            }
          }
        }
      );
    });
  };

  // Criar FormData para envio
  const criarFormData = (registro) => {
    const formData = new FormData();
    Object.entries(registro).forEach(([key, value]) => {
      if(key === 'arquivo' && value) {
        formData.append(key, {
          uri: value,
          name: value.split('/').pop(),
          type: 'image/jpeg'
        });
      } else if(key !== 'sync_status' && key !== 'id') {
        formData.append(key, value);
      }
    });
    return formData;
  };

  // Submissão do formulário
  const handleSubmit = async () => {
    setLoading(true);
    try {
      const netState = await NetInfo.fetch();
      
      if(netState.isConnected) {
        const formData = criarFormData({
          ...form,
          id_veiculo,
          data_cadastro: new Date().toISOString().slice(0, 10)
        });
        
        await api.post('admin/ativo/veiculo/diario_bordo/store', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        Alert.alert('Sucesso', 'Dados salvos no servidor!');
        navigation.goBack();
      } else {
        await salvarLocalmente();
        Alert.alert(
          'Modo Offline', 
          'Dados salvos localmente! ✅\nEles serão sincronizados automaticamente quando a conexão for restabelecida.'
        );
        navigation.goBack();
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      Alert.alert('Erro', 'Falha ao salvar os dados');
    } finally {
      setLoading(false);
    }
  };

  // Efeitos
  useEffect(() => {
    fetchItems();
    
    const unsubscribe = NetInfo.addEventListener(sincronizarDiariosLocais);
    const syncInterval = setInterval(sincronizarDiariosLocais, 30000); // Sincronizar a cada 30s
    
    return () => {
      unsubscribe();
      clearInterval(syncInterval);
    };
  }, []);

  if(loading) {
    return (
      <Container>
        <ActivityIndicator size="large" color="#0000ff" />
      </Container>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <Container>
        <Text style={{ fontWeight: 'bold', marginBottom: 12 }}>
          Veículo: {items.prefixo}   Obra: {codigoObra.codigo_obra}
        </Text>

        <Linha></Linha>

        {items[0]?.veiculo?.tipo == 4 ? (
          <>
            <Text>Horímetro Inicial:</Text>
            <Input
              value={form.horimetro_inicial}
              onChangeText={v => setForm({ ...form, horimetro_inicial: v })}
            />
          </>
        ) : (
          <>
            <Text>Hodômetro inicial:</Text>
            <Input
              value={form.hodometro_inicial}
              onChangeText={v => setForm({ ...form, hodometro_inicial: v })}
            />
          </>
        )}

        <Text style={{ color: 'red' }}>Horário inicial:</Text>
        <TextInputMask
          type={'custom'}
          options={{ mask: '99:99' }}
          value={form.horario_inicial}
          onChangeText={v => setForm({ ...form, horario_inicial: v })}
          style={{
            borderWidth: 1,
            borderColor: '#ccc',
            borderRadius: 6,
            padding: 8,
            marginBottom: 12
          }}
          keyboardType="numeric"
        />


        <Text>Descrição da Atividade:</Text>
        <TextArea value={form.descricao_atividade} onChangeText={v => setForm({ ...form, descricao_atividade: v })} />

        <Text style={{ color: 'red' }} >Horário Final:</Text>
        <TextInputMask
          type={'custom'}
          options={{ mask: '99:99' }}
          value={form.horario_final}
          onChangeText={v => setForm({ ...form, horario_final: v })}
          style={{
            borderWidth: 1,
            borderColor: '#ccc',
            borderRadius: 6,
            padding: 8,
            marginBottom: 12
          }}
          keyboardType="numeric"
        />

        {items.tipo == 4 ? (
          <>
            <Text>Horímetro final:</Text>
            <Input
              value={form.horimetro_final}
              onChangeText={v => setForm({ ...form, horimetro_final: v })}
            />
          </>
        ) : (
          <>
            <Text>Hodômetro final:</Text>
            <Input
              value={form.hodometro_final}
              onChangeText={v => setForm({ ...form, hodometro_final: v })}
            />
          </>
        )}

        <Label>Imagem</Label>
        {form.arquivo && <Image source={{ uri: form.arquivo.uri }} style={{ width: 100, height: 100, marginVertical: 10 }} />}
        <Btn onPress={() => handlePickImage()}>
          <BtnText>
            {form.arquivo ? 'Trocar imagem' : 'Selecionar imagem'}
          </BtnText>
        </Btn>

        <BtnSalvar onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <BtnText>Salvar tudo</BtnText>}
        </BtnSalvar>
      </Container>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  inputMask: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 8,
    marginBottom: 12
  },
  imagePreview: {
    width: 100,
    height: 100,
    marginVertical: 10,
    borderRadius: 6
  }
});