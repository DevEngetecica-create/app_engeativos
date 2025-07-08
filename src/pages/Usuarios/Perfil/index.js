// ./src/pages/Usuarios/Perfil.js

import React, { useCallback, useState, useContext } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { ScrollView, Text, Dimensions, StyleSheet, View, Alert } from 'react-native';
import styled from 'styled-components/native';
import { AuthContext } from '../../../contexts/auth';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import Loading from '../../../components/Loading';
import ErrorAlert from '../../../components/ErrorAlert';
import api from '../../../config/api';
import QRCode from 'react-native-qrcode-svg'; // ✅ QRCode com suporte a logo
import { Image } from 'react-native';

const { width } = Dimensions.get('window');

const HEADER_HEIGHT = 78;
const FOOTER_HEIGHT = 78;
const PerfilScreen = () => {
    const { user } = useContext(AuthContext);
    const navigation = useNavigation();
    const [errors, setErrors] = useState(null);
    const [loading, setLoading] = useState(false);
    const [funcionario, setFuncionario] = useState(null);
    const [obra, setObra] = useState(null);
    const [funcao, setFuncao] = useState(null);
    const [imageError, setImageError] = useState(false);

    const getFuncionario = async () => {
        setLoading(true);
        setErrors(null);
        try {
            const { data } = await api.get(`/users/show/${user.id}`);
            const list = data.dados_func;
            setFuncionario(list);
            setObra(data.obra_acesso);
            setFuncao(data.funcao);
        } catch (err) {
            const apiErrs = err.response?.data?.erros || err.response?.data?.errors;
            if (apiErrs) {
                setErrors(apiErrs);
            } else {
                Alert.alert('Ops', err.message || 'Não foi possível carregar.');
            }
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            getFuncionario(user.id);
        }, [user.id])
    );

    const imagePadrao = require('../../../../assets/do-utilizador.png');
    const baseFuncionarioImageUrl = 'https://sga-engeativos.com.br/build/images/users/';

    return (
        <Container>
            <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                <Image
                    source={require('../../../../assets/header.png')}
                    style={styles.header}
                    resizeMode="cover"
                />

                <Image
                    source={require('../../../../assets/footer.png')}
                    style={styles.footer}
                    resizeMode="cover"
                />

                <ImageContainer>
                    <ProfileImage
                        source={
                            funcionario?.imagem_usuario && !imageError
                                ? { uri: baseFuncionarioImageUrl + funcionario.id + '/' + funcionario.imagem_usuario }
                                : imagePadrao
                        }
                        onError={() => setImageError(true)}
                    />
                </ImageContainer>

                <ErrorAlert errors={errors} />

                {!loading && funcionario === "" && (
                    <Text>Não foi encontrado.</Text>
                )}

                <ContainerDados>

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
                            <StyledInput editable={false} value={funcionario?.email || 'email@example.com'} />
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

                    <InputWrapper>
                        <Label>Senha</Label>
                        <IconInput>
                            <FontAwesome name="lock" size={20} color="darkorange" />
                            <StyledInput editable={false} secureTextEntry value="example234XXX" />
                        </IconInput>
                    </InputWrapper>

                    {/* ✅ QRCode abaixo dos campos */}
                    <View style={styles.qrContainer}>
                        <QRCode
                            value={funcionario?.matricula ?? 'Número da minha matrícula'}
                            size={160}
                            logo={require('../../../../assets/logo_processed.png')}
                            logoSize={40}
                            logoBackgroundColor="transparent"
                        />
                        <Text style={styles.qrText}>Minha matrícula: {funcionario?.matricula || 'Não disponível'}</Text>
                    </View>
                </ContainerDados>
            </ScrollView>
        </Container>
    );
};

export default PerfilScreen;

// Styled Components
const Container = styled.View`
  flex: 1;
  background-color: #fff;
  padding: 0px;
`;

const ContainerDados = styled.View`
  padding: 20px;
`;

const ImageContainer = styled.View`
  align-items: center;
  margin-bottom: 20px;
  margin-top: 50px;
`;

const ProfileImage = styled.Image`
  width: 160px;
  height: 240px;
  border-radius: 6px;
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
  padding-bottom: 4px;
`;

const StyledInput = styled.TextInput`
  flex: 1;
  margin-left: 10px;
  font-size: 16px;
  color: #333;
`;

// Stylesheet
const styles = StyleSheet.create({
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
    qrContainer: {
        marginTop: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    qrText: {
        marginTop: 8,
        fontSize: 14,
        color: '#333',
        fontWeight: 'bold',
    },
});
