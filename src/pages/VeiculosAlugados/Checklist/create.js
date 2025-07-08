import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  SafeAreaView,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import api from '../../../config/api';

import { Alert } from 'react-native';

import { useNavigation } from '@react-navigation/native';

import { createTable, insertChecklist} from './useChecklist'

import Spacing from '../../../constants/Spacing';
import Colors from '../../../constants/Colors';
import Font from '../../../constants/Font';
import FontSize from '../../../constants/FontSize';

const ChecklistCreate = () => {
  const navigation = useNavigation();

  const [placaValida, setPlacaValida] = useState(null);

  const [dataAtual, setDataAtual] = useState('');
  const [fotoInicial, setFotoInicial] = useState(null);
  const [fotoFinal, setFotoEncerramento] = useState(null);

  const [oleoInicialChecked, setOleoInicialChecked] = useState(false);
  const [aguaInicialChecked, setAguaInicialChecked] = useState(false);

  const [oleoEncerramentoChecked, setOleoEncerramentoChecked] = useState(false);
  const [aguaEncerramentoChecked, setAguaEncerramentoChecked] = useState(false);

  const [imgFrente, setImgFrente] = useState(null);
  const [imgTraseira, setImgTraseira] = useState(null);
  const [imgLateralEsq, setImgLateralEsq] = useState(null);
  const [imgLateralDir, setImgLateralDir] = useState(null);

  const [modelo, setModelo] = useState('');
  const [placa, setPlaca] = useState('');
  const [horario, setHorario] = useState('');
  const [km, setKm] = useState('');
  const [observacoes, setObservacoes] = useState('');

  const [imgAvaria1, setImgAvaria1] = useState(null);
  const [imgAvaria2, setImgAvaria2] = useState(null);

  const [modoChecklist, setModoChecklist] = useState(null)

  const validarPlaca = async (placaParaValidar) => {
  try {
    const formData = new FormData();
    formData.append('placa', placaParaValidar);

    const response = await api.post(
      'admin/ativo/veiculoAlugados/checklist/store',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    if (response.status === 422 || response.data.error) {
      Alert.alert('Placa inválida', response.data.message || 'Essa placa não está registrada.');
      setPlacaValida(false);
      return false;
    }

    setPlacaValida(true);
    return true;

  } catch (error) {
    console.error('❌ Erro ao validar placa:', error);
    Alert.alert('Erro', 'Não foi possível validar a placa.');
    setPlacaValida(false);
    return false;
  }
};


const [form, setForm] = useState({
  modelo: '',
  placa: '',
  horario: '',
  km: '',
  nivel_oleo: false,
  nivel_agua: false,
  observacoes: '',
  foto_hodometro: null,
  foto_carro_frente: null,
  foto_carro_traseira: null,
  foto_carro_esquerda: null,
  foto_carro_direita: null,
  foto_avaria_1: null,
  foto_avaria_2: null,
  data: new Date().toISOString().slice(0, 10)
});

  const handleSalvar = () => {
  if (placaValida === false) {
    Alert.alert('Atenção', 'A placa digitada não é válida. Corrija antes de salvar.');
    return;
  }

  // opcional: validação caso a pessoa nem saiu do campo ainda
  if (placaValida === null) {
    Alert.alert('Aviso', 'Valide a placa antes de continuar.');
    return;
  }

  const dados = {
    modelo,
    placa,
    horario,
    km,
    nivel_oleo: oleoInicialChecked,
    nivel_agua: aguaInicialChecked,
    observacoes: form.observacoes,
    foto_hodometro: fotoInicial,
    foto_carro_frente: imgFrente,
    foto_carro_traseira: imgTraseira,
    foto_carro_esquerda: imgLateralEsq,
    foto_carro_direita: imgLateralDir,
    foto_avaria_1: imgAvaria1,
    foto_avaria_2: imgAvaria2,
    data: dataAtual,
  };

  console.log('DADOS A SALVAR:', dados);

  insertChecklist(dados, sucesso => {
    if (sucesso) {
      Alert.alert('Sucesso', 'Checklist salvo localmente.', [
        {
          text: 'OK',
          onPress: () => navigation.goBack()
        }
      ]);
    } else {
      Alert.alert('Atenção', 'Erro ao salvar checklist.');
    }
  });
};


  useEffect(() => {
    const now = new Date();
    const dia = String(now.getDate()).padStart(2, '0');
    const mes = String(now.getMonth() + 1).padStart(2, '0');
    const ano = now.getFullYear();
    setDataAtual(`${dia}/${mes}/${ano}`);
  }, []);
  
  const pickImage = async setter => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) {
      alert('Permissão para acessar a galeria é necessária.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });
    if (!result.canceled) {
      setter(result.assets[0].uri);
    }
  };

  const renderCheckbox = (label, checked, setChecked) => (
    <TouchableOpacity
      style={styles.checkboxContainer}
      onPress={() => setChecked(!checked)}
    >
      <View style={[styles.checkbox, checked && styles.checkboxChecked]} />
      <Text style={styles.checkboxLabel}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ marginBottom: Spacing * 2 }}>
          <Text style={styles.label}>Data</Text>
          <TextInput
            value={dataAtual}
            editable={false}
            style={styles.input}
            placeholderTextColor="#BFBFBF"
          />
        </View>

           <View style={styles.row}>
          <TouchableOpacity
            style={[
              styles.button,
              modoChecklist === 'abertura' && styles.activeButton,
              modoChecklist === 'encerramento' && styles.inactiveButton
            ]}
            onPress={() => setModoChecklist('abertura')}
          >
            <Text
              style={[
                styles.buttonText,
                modoChecklist === 'abertura' && styles.activeButtonText
              ]}
            >
              Abertura
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.endingButton,
              modoChecklist === 'encerramento' && styles.activeButton,
              modoChecklist === 'abertura' && styles.inactiveButton
            ]}
            onPress={() => setModoChecklist('encerramento')}
          >
            <Text
              style={[
                styles.buttonText,
                modoChecklist === 'encerramento' && styles.activeButtonText
              ]}
            >
              Encerramento
            </Text>
          </TouchableOpacity>
        </View>

      {modoChecklist === 'abertura' && (
        <>
          <View style={styles.row}>
            <View style={styles.section}>
              <Text style={styles.label}>Modelo</Text>
              <TextInput style={styles.input} placeholder="Digite o modelo" 
              value={modelo} onChangeText={setModelo}/>
            </View>
            <View style={styles.section}>
              <Text style={styles.label}>Placa</Text>
              <TextInput
                style={styles.input}
                placeholder="Placa do veículo"
                value={placa}
                onChangeText={setPlaca}
                onBlur={() => validarPlaca(placa)} // valida ao sair do campo
                placeholderTextColor="#BFBFBF"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.section}>
              <Text style={styles.label}>Horário Inicial</Text>
              <TextInput style={styles.input} placeholder="00:00" 
              value={horario} onChangeText={setHorario}/>
            </View>
            <View style={styles.section}>
              <Text style={styles.label}>Km Inicial</Text>
              <TextInput style={styles.input} placeholder="000000" 
              value={km} onChangeText={setKm}/>
            </View>
          </View>

          <View style={styles.row}>
            {renderCheckbox('Nível de Óleo Inicial', oleoInicialChecked, setOleoInicialChecked)}
            {renderCheckbox('Nível da Água Inicial', aguaInicialChecked, setAguaInicialChecked)}
          </View>

          <View style={styles.section}>
            <Text style={styles.labelCenterH}>Foto Hodômetro e Combustível Inicial</Text>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={() => pickImage(setFotoInicial)}
            >
              <Text style={styles.uploadButtonText}>Selecionar Imagem</Text>
            </TouchableOpacity>
            {fotoInicial && (
              <Image source={{ uri: fotoInicial }} style={styles.imagePreview} />
            )}
          </View>

          <Text style={[styles.labelCenter, { marginBottom: Spacing * 1.5 }]}>
            Adicionar Fotos Iniciais
          </Text>

          {[
            { label: 'Frente', uri: imgFrente, setter: setImgFrente, asset: require('../../../../assets/veiculo_frente.png') },
            { label: 'Lado Esquerdo', uri: imgLateralEsq, setter: setImgLateralEsq, asset: require('../../../../assets/veiculo_lado_esq.png') },
            { label: 'Lado Direito', uri: imgLateralDir, setter: setImgLateralDir, asset: require('../../../../assets/veiculo_lado_dir.png') },
            { label: 'Traseira', uri: imgTraseira, setter: setImgTraseira, asset: require('../../../../assets/veiculo_traseira.png') },
          ].map(({ label, uri, setter, asset }, i) => (
            <View key={i} style={styles.compactImageSection}>
              <Text style={styles.label}>{label}</Text>
              <TouchableOpacity onPress={() => pickImage(setter)}>
                <View style={styles.compactContainer}>
                  <Image
                    source={uri ? { uri } : asset}
                    style={styles.compactImage}
                    resizeMode="contain"
                  />
                </View>
              </TouchableOpacity>
            </View>
          ))}

          <Text style={[styles.labelCenter, { marginBottom: Spacing * 1.5 }]}>
            Fotos de Avarias Iniciais (opcional)
          </Text>

              {[
              { label: 'Avaria 1', uri: imgAvaria1, setter: setImgAvaria1 },
              { label: 'Avaria 2', uri: imgAvaria2, setter: setImgAvaria2 }
            ].map(({ label, uri, setter }, i) => (
              <View key={i} style={styles.compactImageSection}>
                <Text style={styles.label}>{label}</Text>
                <TouchableOpacity onPress={() => pickImage(setter)}>
                  <View style={styles.compactContainer}>
                    <Image
                      source={uri ? { uri } : require('../../../../assets/placeholder_avaria.png')}
                      style={styles.compactImage}
                      resizeMode="contain"
                    />
                  </View>
                </TouchableOpacity>
              </View>
            ))}

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Observações Iniciais</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Digite aqui as observações..."
                placeholderTextColor="#BFBFBF"
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                value={form.observacoes}
                onChangeText={(text) => setForm({ ...form, observacoes: text })}
              />
            </View>
        </>
        )}

        {modoChecklist === 'encerramento' && (
        <>
          <View style={styles.row}>
            <View style={styles.section}>
              <Text style={styles.label}>Modelo Encerramento</Text>
              <TextInput style={styles.input} placeholder="Digite o modelo" 
              value={modelo} onChangeText={setModelo}/>
            </View>
            <View style={styles.section}>
              <Text style={styles.label}>Placa Encerramento</Text>
              <TextInput
                style={styles.input}
                placeholder="Placa do veículo"
                value={placa}
                onChangeText={setPlaca}
                onBlur={() => validarPlaca(placa)} // valida ao sair do campo
                placeholderTextColor="#BFBFBF"
              />
            </View>
          </View>
              
          <View style={styles.row}>
            <View style={styles.section}>
              <Text style={styles.label}>Horário Encerramento</Text>
              <TextInput style={styles.input} placeholder="00:00" 
              value={horario} onChangeText={setHorario}/>
            </View>
            <View style={styles.section}>
              <Text style={styles.label}>Km Encerramento</Text>
              <TextInput style={styles.input} placeholder="000000" 
              value={km} onChangeText={setKm}/>
            </View>
          </View>

          <View style={styles.row}>
            {renderCheckbox('Nível de Óleo Encerramento', oleoEncerramentoChecked, setOleoEncerramentoChecked)}
            {renderCheckbox('Nível da Água Encerramento', aguaEncerramentoChecked, setAguaEncerramentoChecked)}
          </View>

          <View style={styles.section}>
            <Text style={styles.labelCenterH}>Foto Hodômetro e Combustível Encerramento</Text>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={() => pickImage(setFotoEncerramento)}
            >
              <Text style={styles.uploadButtonText}>Selecionar Imagem</Text>
            </TouchableOpacity>
            {fotoFinal && (
              <Image source={{ uri: fotoFinal }} style={styles.imagePreview} />
            )}
          </View>

           <Text style={[styles.labelCenter, { marginBottom: Spacing * 1.5 }]}>
              Adicionar Fotos Encerramento
            </Text>

            {[
              { label: 'Frente Encerramento', uri: imgFrente, setter: setImgFrente, asset: require('../../../../assets/veiculo_frente.png') },
              { label: 'Lado Esquerdo Encerramento', uri: imgLateralEsq, setter: setImgLateralEsq, asset: require('../../../../assets/veiculo_lado_esq.png') },
              { label: 'Lado Direito Encerramento', uri: imgLateralDir, setter: setImgLateralDir, asset: require('../../../../assets/veiculo_lado_dir.png') },
              { label: 'Traseira Encerramento', uri: imgTraseira, setter: setImgTraseira, asset: require('../../../../assets/veiculo_traseira.png') },
            ].map(({ label, uri, setter, asset }, i) => (
              <View key={i} style={styles.compactImageSection}>
                <Text style={styles.label}>{label}</Text>
                <TouchableOpacity onPress={() => pickImage(setter)}>
                  <View style={styles.compactContainer}>
                    <Image
                      source={uri ? { uri } : asset}
                      style={styles.compactImage}
                      resizeMode="contain"
                    />
                  </View>
                </TouchableOpacity>
              </View>
            ))}

            <Text style={[styles.labelCenter, { marginBottom: Spacing * 1.5 }]}>
              Fotos de Avarias Encerramento (opcional)
            </Text>
                  
            
        {[
          { label: 'Avaria 1', uri: imgAvaria1, setter: setImgAvaria1 },
          { label: 'Avaria 2', uri: imgAvaria2, setter: setImgAvaria2 }
        ].map(({ label, uri, setter }, i) => (
          <View key={i} style={styles.compactImageSection}>
            <Text style={styles.label}>{label}</Text>
            <TouchableOpacity onPress={() => pickImage(setter)}>
              <View style={styles.compactContainer}>
                <Image
                  source={uri ? { uri } : require('../../../../assets/placeholder_avaria.png')}
                  style={styles.compactImage}
                  resizeMode="contain"
                />
              </View>
            </TouchableOpacity>
          </View>
        ))}

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Observações Encerramento</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Digite aqui as observações..."
            placeholderTextColor="#BFBFBF"
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>

        </>
        )}

         <TouchableOpacity
            style={styles.saveButton}
            onPress={() => {
              handleSalvar();
            }}
          >
            <Text style={styles.saveButtonText}>Salvar</Text>
         </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ChecklistCreate;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing * 2,
    backgroundColor: Colors.background,
  },
  section: {
    marginBottom: Spacing * 2,
    flex: 1,
  },
  label: {
    fontFamily: Font['poppins-bold'],
    color: Colors.text,
    fontSize: FontSize.medium,
    marginBottom: Spacing,
  },
  input: {
    backgroundColor: '#f2f4ff',
    borderRadius: 8,
    paddingHorizontal: Spacing,
    paddingVertical: Spacing / 1.5,
    fontFamily: Font['poppins-regular'],
    fontSize: FontSize.small,
    color: Colors.black,
    borderWidth: 0,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing,
    marginBottom: Spacing * 2,
  },
  button: {
    flex: 1,
    backgroundColor: '#28a745',
    borderRadius: 8,
    paddingVertical: Spacing,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  endingButton: {
    flex: 1,
    backgroundColor: Colors.orange,
    borderRadius: 8,
    paddingVertical: Spacing,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  buttonText: {
    color: Colors.onPrimary,
    fontFamily: Font['poppins-semiBold'],
    fontSize: FontSize.medium,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 28,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.primary,
    marginRight: Spacing,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
  },
  checkboxLabel: {
    fontFamily: Font['poppins-regular'],
    fontSize: FontSize.medium,
    color: Colors.black,
  },
  uploadButton: {
    backgroundColor: Colors.primary,
    padding: Spacing,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: Spacing / 2,
  },
  uploadButtonText: {
    color: Colors.onPrimary,
    fontFamily: Font['poppins-regular'],
    fontSize: FontSize.small,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    marginTop: Spacing,
    borderRadius: 8,
  },
  labelCenter: {
    fontFamily: Font['poppins-bold'],
    color: Colors.text,
    fontSize: FontSize.large, // Aumenta levemente o tamanho
    textAlign: 'center',
    fontWeight: 'bold', // deixa em negrito
    marginBottom: Spacing,
  },
  labelCenterH: {
    fontFamily: Font['poppins-bold'],
    fontSize: FontSize.medium,
    color: Colors.black,
    textAlign: 'center',
    marginBottom: Spacing / 2,
  },
   compactImageSection: {
    marginBottom: Spacing * 2,
    alignItems: 'center',
  },
  compactContainer: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.black,
    shadowOffset: 2,
    padding: Spacing,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2, // para Android
    backgroundColor: '#fff', // necessário para sombra funcionar no iOS
  },
    compactImage: {
    width: 220, // aumente conforme necessário
    height: 120, // aumente conforme necessário
    borderRadius: 12,
    backgroundColor: 'transparent', // remove o fundo azul
  },
  fieldContainer: {
    marginBottom: Spacing * 2,
  },
  textArea: {
    minHeight: 120,
  },
  activeButton: {
  borderColor: Colors.black,
  borderWidth: 2,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.25,
  shadowRadius: 3.84,
  elevation: 5,
},

activeButtonText: {
  color: '#fff',
  fontWeight: 'bold',
},

inactiveButton: {
  opacity: 0.7,
},
saveButton: {
  backgroundColor: '#28a745', // verde
  paddingVertical: Spacing * 1.2,
  borderRadius: 12,
  alignItems: 'center',
  justifyContent: 'center',
  marginVertical: Spacing * 2,
  marginHorizontal: Spacing * 2,
},

saveButtonText: {
  color: Colors.onPrimary, // texto branco, se Colors.onPrimary for branco
  fontFamily: Font['poppins-bold'],
  fontSize: FontSize.large,
},
});
