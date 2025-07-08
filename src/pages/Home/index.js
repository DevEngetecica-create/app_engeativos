import React, { useState, useCallback, useContext } from 'react';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { View, Button, Alert, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, ImageBackground } from 'react-native';



import ErrorAlert from '../../components/ErrorAlert';
import Loading from '../../components/Loading';
import NetworkBanner from '../../components/NetworkBanner';
import api from '../../config/api';
import { AuthContext } from '../../contexts/auth';
import { Image } from 'react-native';
import styled from 'styled-components/native';

import { FontAwesome, MaterialIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const HEADER_HEIGHT = 78;
const FOOTER_HEIGHT = 78;

export default function Home() {
  const navigation = useNavigation();
  const [errors, setErrors] = useState(null);
  const { user } = useContext(AuthContext);
  const [veiculos, setVeiculos] = useState([]);
  const [countVeiculos, setCountVeiculos] = useState(0);
  const [loading, setLoading] = useState(false);
  const [funcionario, setFuncionario] = useState(null);
  const [nivel_acesso, setNivelAcesso] = useState(null);

  const getVeiculos = async () => {

    setLoading(true);
    setErrors(null);

    /* try {
      const { data } = await api.get('admin/ativo/veiculo');
      const lista = Array.isArray(data.veiculos) ? data.veiculos : data.veiculos ? [data.veiculos] : [];
      setVeiculos(lista);
      setCountVeiculos(data.count_veiculos_list ?? 0);
    } catch (err) {
      const apiErrs = err.response?.data?.erros || err.response?.data?.errors;
      if (apiErrs) {
        setErrors(apiErrs);
      } else {
        Alert.alert('Ops', err.message || 'Tente novamente!');
      }
    } finally {
      setLoading(false);
    } */


    try {
      const { data } = await api.get(`/users/show/${user.id}`);
      const list = data.dados_func;
      console.log(data.nivel_acesso)

      setFuncionario(list);
      setNivelAcesso(data.nivel_acesso.id_nivel)

    } catch (err) {
      const apiErrs = err.response?.data?.erros || err.response?.data?.errors;
      if (apiErrs) setErrors(apiErrs);
      else Alert.alert('Ops', err.message || 'Não foi possível carregar.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      getVeiculos(user.id);
    }, [user.id])
  );

  // Funções de conversão de cores
  const hexToHSL = (hex) => {
    let r = parseInt(hex.slice(1, 3), 16) / 255;
    let g = parseInt(hex.slice(3, 5), 16) / 255;
    let b = parseInt(hex.slice(5, 7), 16) / 255;

    let max = Math.max(r, g, b);
    let min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      let d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    return [h * 360, s * 100, l * 100];
  };

  const HSLToHex = (h, s, l) => {
    h /= 360;
    s /= 100;
    l /= 100;

    let c = (1 - Math.abs(2 * l - 1)) * s;
    let x = c * (1 - Math.abs((h * 6) % 2 - 1));
    let m = l - c / 2;
    let r, g, b;

    if (0 <= h && h < 1 / 6) {
      [r, g, b] = [c, x, 0];
    } else if (1 / 6 <= h && h < 2 / 6) {
      [r, g, b] = [x, c, 0];
    } else if (2 / 6 <= h && h < 3 / 6) {
      [r, g, b] = [0, c, x];
    } else if (3 / 6 <= h && h < 4 / 6) {
      [r, g, b] = [0, x, c];
    } else if (4 / 6 <= h && h < 5 / 6) {
      [r, g, b] = [x, 0, c];
    } else {
      [r, g, b] = [c, 0, x];
    }

    r = Math.round((r + m) * 255).toString(16).padStart(2, '0');
    g = Math.round((g + m) * 255).toString(16).padStart(2, '0');
    b = Math.round((b + m) * 255).toString(16).padStart(2, '0');

    return `#${r}${g}${b}`;
  };

  // Função para escurecer cores
  const darkenColor = (hex, percent) => {
    let [h, s, l] = hexToHSL(hex);
    l = Math.max(0, l - percent);
    return HSLToHex(h, s, l);
  };

  // Dados com cores escurecidas em 30%
  const getData = () => {
    const baseItems = [
      { id: '1', label: 'Perfil', icon: 'user', color: '#ffff', bgColor: darkenColor('#FFFFFF', 10), screen: 'Perfil' },
      { id: '2', label: 'Sincronização', icon: 'code', bgColor: darkenColor('#FFFFFF', 10), screen: 'Upload' },
      { id: '3', label: 'Segurança do Trabalho', icon: 'code', bgColor: darkenColor('#FFFFFF', 10), screen: 'Construction' },
      { id: '4', label: 'Meio Ambiente', icon: 'tree', bgColor: darkenColor('#FFFFFF', 10), screen: 'Construction' },
      { id: '5', label: 'Veículos da Frota', icon: 'truck', bgColor: darkenColor('#FFFFFF', 10), screen: 'Veiculos' },
      { id: '6', label: 'Veículo Alugados', icon: 'car', bgColor: darkenColor('#FFFFFF', 10), screen: 'ChecklistAlugados' },
      { id: '7', label: 'Qualidade', icon: 'bar-chart-o', bgColor: darkenColor('#FFFFFF', 10), screen: 'Construction' },
      { id: '8', label: 'Obras', icon: 'handshake-o', bgColor: darkenColor('#FFFFFF', 10), screen: 'Construction' },
    ];

    /*  if (nivel_acesso === 1) { 
       baseItems.splice(1, 0, <i class="fas fa-hard-hat"></i> handshake-o
         id: '2',
         label: 'Configurações',
         icon: 'code',
         bgColor: darkenColor('#FFFFFF', 10),
         screen: 'Upload',
       });
     } */

    return baseItems;
  };

  return (
    <View style={styles.container}>
      {/* Header fixo */}
      <Image
        source={require('../../../assets/header.png')}
        style={styles.header}
        resizeMode="cover"
      />

      {/* Footer fixo */}
      <Image
        source={require('../../../assets/footer.png')}
        style={styles.footer}
        resizeMode="cover"
      />

      {/* Conteúdo com rolagem */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Container>
          <ErrorAlert errors={errors} />

          <Card>           
            <Text style={{ fontSize: 14, color: '#555' }}>Olá,</Text>
            <Name>{funcionario?.nome || 'Nome não disponível'}</Name>
            <Role>Engeativos</Role>
          </Card>



          <IconInput />

          {/* Grade de ícones */}
          <View style={styles.grid}>
            {getData().map(item => (
              <TouchableOpacity
                key={item.id}
                style={[styles.item, { backgroundColor: item.bgColor }]}
                onPress={() => {
                  if (item.screen) navigation.navigate(item.screen);
                }}
              >
                <FontAwesome name={item.icon} size={24} color="#333" />
                <Text style={styles.label}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {loading && <Loading />}
        </Container>
      </ScrollView>
    </View>
  );
}

// Styled Components
const Container = styled.View`
  flex: 1;
  padding: 0px;
`;

const InputWrapper = styled.View`
  margin-bottom: 10px;
`;

const Label = styled.Text`
  color: #696969;
  font-size: 14px;
  margin-bottom: 4px;
`;

const IconInput = styled.View`
  flex-direction: row;
  align-items: center;
  border-bottom-width: 1px;
  border-bottom-color: #ccc;
  margin-bottom: 21px;
  
`;

const StyledInput = styled.TextInput`
  flex: 1;
  margin-left: 10px;
  font-size: 16px;
  color: #333;
`;

const Card = styled(View)`
  background-color: white;
  padding: 12px 16px;
  border-radius: 12px;
  margin: 0 7px;
  margin-bottom: 7px;
  elevation: 5;
  shadow-color: #000;
  shadow-opacity: 0.2;
  shadow-offset: 0px 2px;
`;

const Title = styled(Text)`
  font-size: 16px;
  color: #888;
`;

const Name = styled(Text)`
  font-size: 18px;
  font-weight: bold;
  color: #333;
`;

const Role = styled(Text)`
  background-color: #0057a3;
  padding: 2px 8px;
  color: white;
  font-size: 12px;
  border-radius: 8px;
  align-self: flex-start;
  margin-top: 4px;
`;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffff', // cor uniforme de fundo
  },
  header: {
    position: 'absolute',
    top: 0,
    width: width,
    height: HEADER_HEIGHT,
    zIndex: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    width: width,
    height: FOOTER_HEIGHT,
    zIndex: 10,
  },
  scrollContent: {
    paddingTop: HEADER_HEIGHT + 16,
    paddingBottom: FOOTER_HEIGHT + 16,
    paddingHorizontal: 16,
  },
  innerContainer: {
    backgroundColor: '#F5F5F5', // garante fundo igual ao pai
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  item: {
    width: '48%',
    height: 100,
    borderRadius: 8,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    marginTop: 8,
    fontWeight: 'bold',
    color: '#333',
  },
});

