// ./src/pages/Usuarios/Perfil.js
import React, { useCallback, useState } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { ScrollView, Text, Dimensions, StyleSheet, View, Alert, Switch, TouchableOpacity, Image as RNImage, Linking } from 'react-native';
import styled from 'styled-components/native';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from "@react-native-async-storage/async-storage";
import ErrorAlert from '../../../components/ErrorAlert';
import api from '../../../config/api';
import QRCode from 'react-native-qrcode-svg';
import { db } from '../../../config/database/database';
import { useAuth } from '../../../contexts/auth';
import { getConnectionSnapshot, isGoodSignal } from '../../../config/net/connectionSnapshot';

const { width } = Dimensions.get('window');
const HEADER_HEIGHT = 55;
const FOOTER_HEIGHT = 65;

const PerfilScreen = () => {
  const { user, connectionMode, authData, setAuthData } = useAuth();
  const navigation = useNavigation();

  const [modoOffline, setModoOffline] = useState(connectionMode === 'offline');
  const [errors, setErrors] = useState(null);
  const [loading, setLoading] = useState(false);
  const [funcionario, setFuncionario] = useState(null);
  const [obra, setObra] = useState(null);
  const [funcao, setFuncao] = useState(null);
  const [imageError, setImageError] = useState(false);

  const [biometriaAtiva, setBiometriaAtiva] = useState(false);
  const [geolocalizacaoAtiva, setGeolocalizacaoAtiva] = useState(false);

  // snapshot da rede
  const snapshot = getConnectionSnapshot();
  const quality = snapshot?.qualityPct ?? 0;
  const isGood = isGoodSignal(quality);

  const canChangePassword = !modoOffline; // ✅ somente ONLINE

  // ===============================
  // 🔹 Utilidades SQLite
  // ===============================
  const getPreferenciasLocal = () => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT biometria, geolocalizacao FROM users WHERE id = ?',
        [user.id],
        (_, { rows }) => {
          if (rows.length > 0) {
            const prefs = rows.item(0);
            setBiometriaAtiva(!!prefs.biometria);
            setGeolocalizacaoAtiva(!!prefs.geolocalizacao);
          }
        }
      );
    });
  };

  // ===============================
  // 🔹 Carregar dados do usuário
  // ===============================
  const getFuncionario = async () => {
    setLoading(true);
    setErrors(null);

    try {
      if (!modoOffline) {
        const { data } = await api.get(`/users/show/${user.id}`);
        setFuncionario(data.dados_func);
        setObra(data.obra_acesso);
        setFuncao(data.funcao);

        setBiometriaAtiva(!!data.user?.biometria);
        setGeolocalizacaoAtiva(!!data.user?.geolocalizacao);

        db.transaction(tx => {
          tx.executeSql(
            'UPDATE users SET biometria=?, geolocalizacao=?, sync_status=1 WHERE id=?',
            [data.user?.biometria ? 1 : 0, data.user?.geolocalizacao ? 1 : 0, user.id]
          );
        });
      } else {
        getPreferenciasLocal();
        if (authData?.dados_func) {
          setFuncionario(authData.dados_func);
          setObra(authData.obra_acesso);
          setFuncao(authData.funcao);
        } else {
          // Fallback legacy (caso authData não tenha o perfil completo salvo)
          db.transaction(tx => {
            tx.executeSql(
              'SELECT * FROM funcionarios LIMIT 1',
              [],
              (_, { rows }) => rows.length > 0 && setFuncionario(rows.item(0))
            );
          });
        }
      }
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível carregar os dados.');
      getPreferenciasLocal();
    } finally {
      setLoading(false);
    }
  };

  // ===============================
  // 🔹 Alterar preferências
  // ===============================
  const toggleBiometria = value => {
    setBiometriaAtiva(value);
    db.transaction(tx => {
      tx.executeSql('UPDATE users SET biometria=?, sync_status=0 WHERE id=?', [
        value ? 1 : 0,
        user.id,
      ]);
    });

    if (!modoOffline) {
      api.post('/users/preferences', { biometria: value }).catch(() => {
        Alert.alert('Erro', 'Falha ao atualizar biometria no servidor.');
      });
    }
  };

  const toggleGeolocalizacao = value => {
    setGeolocalizacaoAtiva(value);
    db.transaction(tx => {
      tx.executeSql('UPDATE users SET geolocalizacao=?, sync_status=0 WHERE id=?', [
        value ? 1 : 0,
        user.id,
      ]);
    });

    if (!modoOffline) {
      api.post('/users/preferences', { geolocalizacao: value }).catch(() => {
        Alert.alert('Erro', 'Falha ao atualizar geolocalização no servidor.');
      });
    }
  };

  const toggleConnectionMode = (value) => {
    const newMode = value ? "online" : "offline";

    if (newMode === "online") {
      const { qualityPct } = getConnectionSnapshot();
      if (!isGoodSignal(qualityPct)) {
        Alert.alert(
          "Sinal fraco",
          `Intensidade atual ≈ ${qualityPct}%. Recomendado permanecer OFFLINE.`
        );
        return;
      }
    }

    setModoOffline(!value);

    const updatedAuth = { ...authData, connectionMode: newMode };
    setAuthData(updatedAuth);
    AsyncStorage.setItem("userProfile", JSON.stringify(updatedAuth));
  };

  useFocusEffect(
    useCallback(() => {
      getFuncionario();
    }, [user.id, modoOffline])
  );

  const imagePadrao = require('../../../../assets/do-utilizador.png');
  const baseFuncionarioImageUrl = 'https://sga-engeativos.com.br/build/images/users/';

  const goToChangePassword = () => {
    if (!canChangePassword) {
      Alert.alert(
        'Disponível apenas ONLINE',
        'Para alterar a senha, ative o modo ONLINE (sinal adequado).'
      );
      return;
    }
    navigation.navigate('DadosAcessoIndex', { returnTo: 'Perfil' });
  };

  return (
    <Container>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <RNImage source={require('../../../../assets/header.png')} style={styles.header} resizeMode="cover" />
        <RNImage source={require('../../../../assets/footer.png')} style={styles.footer} resizeMode="cover" />

        {/* ======== Hero / Card UX ======== */}
        <Hero>
          <Avatar>
            <ProfileImage
              source={
                funcionario?.imagem_usuario && !imageError
                  ? { uri: baseFuncionarioImageUrl + funcionario.id + '/' + funcionario.imagem_usuario }
                  : imagePadrao
              }
              onError={() => setImageError(true)}
            />
          </Avatar>

          <UserInfo>
            <Name numberOfLines={1}>{funcionario?.nome || user?.name || 'Usuário'}</Name>
            <Row inline>
              <MaterialIcons
                name={modoOffline ? 'wifi-off' : 'wifi'}
                size={18}
                color={modoOffline ? '#f44336' : (isGood ? '#4CAF50' : '#FFA000')}
              />
              <StatusText mode={modoOffline ? 'offline' : (isGood ? 'online' : 'weak')}>
                {modoOffline ? 'OFFLINE' : (isGood ? 'ONLINE' : `Sinal fraco (${quality.toFixed(0)}%)`)}
              </StatusText>
              <Switch
                style={{ marginLeft: 8 }}
                value={!modoOffline}
                onValueChange={toggleConnectionMode}
                thumbColor={modoOffline ? '#f44336' : '#4CAF50'}
                trackColor={{ false: '#ccc', true: '#81C784' }}
              />
            </Row>
            <EmailText numberOfLines={1}>{user?.email || 'email@example.com'}</EmailText>

            {/* Botões de ação */}
            <ActionsRow>
              <PrimaryButton onPress={goToChangePassword} disabled={!canChangePassword}>
                <MaterialIcons name="lock" size={18} color="#fff" />
                <PrimaryLabel>Alterar senha</PrimaryLabel>
              </PrimaryButton>

              <GhostButton
                onPress={() => Alert.alert('Em breve', 'Edição de perfil em desenvolvimento.')}
              >
                <MaterialIcons name="edit" size={18} color="#e67e22" />
                <GhostLabel>Editar perfil</GhostLabel>
              </GhostButton>
            </ActionsRow>
          </UserInfo>
        </Hero>

        <ErrorAlert errors={errors} />
        {!loading && funcionario === '' && <Text>Não foi encontrado.</Text>}

        <ContainerDados>
          {/* 🔐 Biometria */}
          <InputWrapper>
            <Label>Biometria</Label>
            <IconInput>
              <MaterialIcons name="fingerprint" size={20} color={biometriaAtiva ? 'green' : 'gray'} />
              <Text style={{ marginLeft: 10, flex: 1 }}>
                {biometriaAtiva ? 'Ativada' : 'Desativada'}
              </Text>
              <Switch
                value={biometriaAtiva}
                onValueChange={toggleBiometria}
                thumbColor={biometriaAtiva ? '#4CAF50' : '#f44336'}
                trackColor={{ false: '#ccc', true: '#81C784' }}
              />
            </IconInput>
          </InputWrapper>

          {/* 📍 Geolocalização */}
          <InputWrapper>
            <Label>Geolocalização</Label>
            <IconInput>
              <MaterialIcons name="location-on" size={20} color={geolocalizacaoAtiva ? 'green' : 'gray'} />
              <Text style={{ marginLeft: 10, flex: 1 }}>
                {geolocalizacaoAtiva ? 'Ativada' : 'Desativada'}
              </Text>
              <Switch
                value={geolocalizacaoAtiva}
                onValueChange={toggleGeolocalizacao}
                thumbColor={geolocalizacaoAtiva ? '#4CAF50' : '#f44336'}
                trackColor={{ false: '#ccc', true: '#81C784' }}
              />
            </IconInput>
          </InputWrapper>

          {/* Dados */}
          <InputWrapper>
            <Label>Unidade de trabalho</Label>
            <IconInput>
              <MaterialIcons name="home-work" size={20} color="darkorange" />
              <StyledInput editable={false} value={obra?.codigo_obra || 'Nome não disponível'} />
            </IconInput>
          </InputWrapper>

          <InputWrapper>
            <Label>Nome completo</Label>
            <IconInput>
              <FontAwesome name="user" size={20} color="darkorange" />
              <StyledInput editable={false} value={funcionario?.nome || 'Nome não disponível'} />
            </IconInput>
          </InputWrapper>

          <InputWrapper>
            <Label>Email</Label>
            <IconInput>
              <MaterialIcons name="email" size={20} color="darkorange" />
              <StyledInput editable={false} value={user?.email || 'email@example.com'} />
            </IconInput>
          </InputWrapper>

          <InputWrapper>
            <Label>Função</Label>
            <IconInput>
              <MaterialIcons name="lan" size={20} color="darkorange" />
              <StyledInput editable={false} value={funcao?.funcao || 'Não disponível'} />
            </IconInput>
          </InputWrapper>

          <InputWrapper>
            <Label>Contato</Label>
            <IconInput>
              <MaterialIcons name="phone" size={20} color="darkorange" />
              <StyledInput editable={false} value={funcionario?.celular || 'Não disponível'} />
            </IconInput>
          </InputWrapper>

          {/* QRCode */}
          <View style={styles.qrContainer}>
            <QRCode
              value={funcionario?.matricula ?? 'Número da minha matrícula'}
              size={160}
              logo={require('../../../../assets/logo_processed.png')}
              logoSize={40}
              logoBackgroundColor="transparent"
            />
            <Text style={styles.qrText}>
              Minha matrícula: {funcionario?.matricula || 'Não disponível'}
            </Text>
          </View>

          {/* Links legais (LGPD) */}
          <View style={styles.legalLinks}>
            <TouchableOpacity
              onPress={() => Linking.openURL('https://sga-engeativos.com.br/privacidade')}
            >
              <Text style={styles.legalLink}>Politica de Privacidade</Text>
            </TouchableOpacity>
            <Text style={styles.legalSep}>  •  </Text>
            <TouchableOpacity
              onPress={() => Linking.openURL('https://sga-engeativos.com.br/suporte')}
            >
              <Text style={styles.legalLink}>Termos e Suporte</Text>
            </TouchableOpacity>
          </View>
        </ContainerDados>
      </ScrollView>
    </Container>
  );
};

export default PerfilScreen;

/* ==================== Styled Components ==================== */
const Container = styled.View`
  flex: 1;
  background-color: #f7f8fa;
`;

const Hero = styled.View`
  margin-top: ${HEADER_HEIGHT + 20}px;
  margin-bottom: 12px;
  padding: 16px;
  background-color: #ffffff;
  border-radius: 16px;
  margin-horizontal: 16px;
  flex-direction: row;
  elevation: 2;
`;

const Avatar = styled.View`
  margin-right: 14px;
`;

const ProfileImage = styled.Image`
  width: 86px;
  height: 86px;
  border-radius: 43px;
`;

const UserInfo = styled.View`
  flex: 1;
`;

const Name = styled.Text`
  font-size: 20px;
  font-weight: 700;
  color: #222;
`;

const Row = styled.View`
  flex-direction: row;
  align-items: center;
  margin-top: 6px;
`;

const StatusText = styled.Text`
  margin-left: 6px;
  font-weight: 600;
  color: ${({ mode }) =>
    mode === 'offline' ? '#f44336' : (mode === 'online' ? '#4CAF50' : '#FFA000')};
`;

const EmailText = styled.Text`
  margin-top: 4px;
  color: #666;
`;

const ActionsRow = styled.View`
  margin-top: 30px;
  flex-direction: row;
  left: -50px;
`;

const PrimaryButton = styled(TouchableOpacity)`
  flex-direction: row;
  align-items: center;
  background-color: ${({ disabled }) => (disabled ? '#c1c1c1' : '#e67e22')};
  padding: 10px 14px;
  border-radius: 10px;
  margin-right: 10px;
`;

const PrimaryLabel = styled.Text`
  color: #fff;
  font-weight: 700;
  margin-left: 8px;
`;

const GhostButton = styled(TouchableOpacity)`
  flex-direction: row;
  align-items: center;
  background-color: rgba(230, 126, 34, 0.12);
  padding: 10px 14px;
  border-radius: 10px;
`;

const GhostLabel = styled.Text`
  color: #e67e22;
  font-weight: 700;
  margin-left: 8px;
`;

const ContainerDados = styled.View`
  padding: 20px 16px 30px 16px;
`;

const ImageContainer = styled.View`
  align-items: center;
  margin-bottom: 20px;
  margin-top: 50px;
`;

const InputWrapper = styled.View`
  margin-bottom: 14px;
`;

const Label = styled.Text`
  color: #696969;
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 6px;
`;

const IconInput = styled.View`
  flex-direction: row;
  align-items: center;
  border-width: 1px;
  border-color: #e9ecef;
  background: #fff;
  border-radius: 10px;
  padding: 10px 12px;
`;

const StyledInput = styled.TextInput`
  flex: 1;
  margin-left: 10px;
  font-size: 16px;
  color: #333;
`;

const styles = StyleSheet.create({
  header: { position: 'absolute', top: 0, width: width, height: HEADER_HEIGHT, zIndex: 10 },
  footer: { position: 'absolute', bottom: 0, width: width, height: FOOTER_HEIGHT, zIndex: 10 },
  qrContainer: { marginTop: 26, alignItems: 'center', justifyContent: 'center' },
  qrText: { marginTop: 8, fontSize: 14, color: '#333', fontWeight: 'bold' },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
    paddingHorizontal: 16,
    flexWrap: 'wrap',
  },
  legalLink: {
    color: '#1f51fe',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  legalSep: {
    color: '#888',
    fontSize: 13,
  },
});
