// ./src/pages/DadosAcesso/Index.js
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import styled from 'styled-components/native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../../contexts/auth';
import api from '../../../config/api';
import * as Crypto from 'expo-crypto';
import { executeSql } from '../../../config/database/database';

const Index = () => {
  const { user, connectionMode, signOut } = useAuth();
  const navigation = useNavigation();

  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConf, setShowConf] = useState(false);

  // ✅ modal de sucesso + countdown
  const [successVisible, setSuccessVisible] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const timerRef = useRef(null);

  const isOnline = connectionMode === 'online';

  // ===== Helpers de validação de senha =====
  const hasUpper  = (s) => /[A-Z]/.test(s);
  const hasLower  = (s) => /[a-z]/.test(s);
  const hasDigit  = (s) => /\d/.test(s);
  const hasSymbol = (s) => /[^\w\s]/.test(s);

  // Detecta sequências numéricas contíguas (asc/desc). Ex.: 1234, 9876
  const isSequentialDigits = (s, minRun = 4) => {
    let runAsc = 1, runDesc = 1;
    for (let i = 1; i < s.length; i++) {
      const prev = s[i - 1];
      const curr = s[i];
      if (/\d/.test(prev) && /\d/.test(curr)) {
        const p = prev.charCodeAt(0) - 48;
        const c = curr.charCodeAt(0) - 48;
        if (c - p === 1) { runAsc++; if (runAsc >= minRun) return true; } else { runAsc = 1; }
        if (c - p === -1){ runDesc++; if (runDesc >= minRun) return true; } else { runDesc = 1; }
      } else {
        runAsc = 1; runDesc = 1; // quebrou a sequência
      }
    }
    return false;
  };

  // Força simples (feedback visual rápido 0..4), penalizando sequência
  const strength = useMemo(() => {
    if (!newPass) return 0;
    const seq = isSequentialDigits(newPass);
    const conds = [
      newPass.length >= 8,
      hasUpper(newPass),
      hasLower(newPass),
      hasDigit(newPass),
      hasSymbol(newPass),
    ];
    let score = 0;
    conds.forEach(c => { if (c) score++; });
    if (score > 4) score = 4;
    if (seq) score = Math.min(score, 1); // penaliza forte se tiver sequência
    return score;
  }, [newPass]);

  const isValid =
    isOnline &&
    oldPass.length > 0 &&
    newPass.length >= 8 &&
    hasUpper(newPass) &&
    !isSequentialDigits(newPass) &&
    confirm.length > 0 &&
    newPass === confirm;

  // ⏱ controla o countdown e faz logout no final
  useEffect(() => {
    if (!successVisible) return;
    timerRef.current = setInterval(async () => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timerRef.current);
          // logout definitivo
          signOut();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [successVisible, signOut]);

  const handleSubmit = async () => {
    if (!isOnline) {
      alert('Disponível apenas ONLINE. Ative o modo ONLINE para continuar.');
      return;
    }
    if (!isValid) {
      if (!hasUpper(newPass)) {
        alert('Inclua pelo menos UMA letra maiúscula.');
        return;
      }
      if (isSequentialDigits(newPass)) {
        alert('Evite números sequenciais contíguos como 1234 ou 9876.');
        return;
      }
      alert('Preencha corretamente os dados antes de continuar.');
      return;
    }

    try {
      setLoading(true);

      await api.put(`/users-password/${user.id}`, {
        current_password: oldPass,
        password: newPass,
        password_confirmation: confirm,
      });

      // 🔐 Atualiza password_app no SQLite local (para login offline futuro)
      const sha = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, newPass);
      try {
        await executeSql('UPDATE users SET password_app=? WHERE id=?', [sha, user.id]);
      } catch (e) {
        console.warn('Falha ao atualizar password_app local:', e?.message);
      }

      // ✅ Mostra modal de sucesso + inicia countdown para logout
      setCountdown(5);
      setSuccessVisible(true);

    } catch (e) {
      const status = e?.response?.status;
      const data = e?.response?.data;

      if (status === 422) {
        const raw = data?.errors
          ? Object.values(data.errors)[0]?.[0]
          : data?.message || 'Dados inválidos.';
        const msg = /data leak/i.test(raw)
          ? 'Esta senha já apareceu em vazamentos de dados. Escolha outra senha.'
          : raw;
        alert(msg);
        return;
      } else if (status === 403) {
        alert('Você não tem permissão para alterar esta senha.');
        return;
      } else if (status === 401) {
        alert('Sessão expirada. Faça login novamente.');
        return;
      } else {
        alert(data?.message ?? 'Não foi possível alterar a senha.');
        return;
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Container>
        <Title>Alterar senha</Title>
        <Hint>{isOnline ? 'Você está ONLINE.' : 'Disponível apenas no modo ONLINE.'}</Hint>

        {/* Senha atual */}
        <Field>
          <MaterialIcons name="lock" size={20} color="#888" />
          <Input
            placeholder="Senha atual"
            secureTextEntry={!showOld}
            value={oldPass}
            onChangeText={setOldPass}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <IconBtn onPress={() => setShowOld(v => !v)}>
            <MaterialIcons name={showOld ? 'visibility' : 'visibility-off'} size={20} color="#888" />
          </IconBtn>
        </Field>

        {/* Nova senha */}
        <Field>
          <MaterialIcons name="vpn-key" size={20} color="#888" />
          <Input
            placeholder="Nova senha (mínimo 8)"
            secureTextEntry={!showNew}
            value={newPass}
            onChangeText={setNewPass}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <IconBtn onPress={() => setShowNew(v => !v)}>
            <MaterialIcons name={showNew ? 'visibility' : 'visibility-off'} size={20} color="#888" />
          </IconBtn>
        </Field>

        {/* Barra de força */}
        <StrengthBar>
          {[0, 1, 2, 3].map(i => (
            <StrengthBlock
              key={i}
              level={
                isSequentialDigits(newPass) || !hasUpper(newPass)
                  ? 'bad'
                  : (strength >= i + 1 ? 'ok' : 'off')
              }
              style={{ marginRight: i < 3 ? 6 : 0 }} // espaçamento sem 'gap'
            />
          ))}
        </StrengthBar>

        {/* Confirmar senha */}
        <Field>
          <MaterialIcons name="vpn-key" size={20} color="#888" />
          <Input
            placeholder="Confirmar nova senha"
            secureTextEntry={!showConf}
            value={confirm}
            onChangeText={setConfirm}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <IconBtn onPress={() => setShowConf(v => !v)}>
            <MaterialIcons name={showConf ? 'visibility' : 'visibility-off'} size={20} color="#888" />
          </IconBtn>
        </Field>

        <PrimaryButton onPress={handleSubmit} disabled={!isValid || loading}>
          <PrimaryText>{loading ? 'Salvando...' : 'Salvar nova senha'}</PrimaryText>
        </PrimaryButton>

        {/* 🔔 Modal de sucesso + countdown */}
        {successVisible && (
          <ModalOverlay>
            <ModalCard>
              <ModalTitle>Alteração realizada com sucesso</ModalTitle>
              <ModalText>Faremos logout em <TextCountdown>{countdown}s</TextCountdown> para sua segurança.</ModalText>
              
              <SecondaryButton
                onPress={() => {
                  clearInterval(timerRef.current);
                  signOut();
                }}
              >
                <SecondaryText>Sair agora</SecondaryText>
              </SecondaryButton>
            </ModalCard>
          </ModalOverlay>
        )}
      </Container>
    </KeyboardAvoidingView>
  );
};

export default Index;

/* =============== styles =============== https://sga-engeativos.com.br/build/engeativos-v.0.0.1.apk*/

const Container = styled.View`
  flex: 1;
  padding: 20px 16px;
  background: #f7f8fa;
`;

const Title = styled.Text`
  font-size: 22px;
  font-weight: 800;
  color: #222;
`;

const Hint = styled.Text`
  color: #777;
  margin-top: 4px;
  margin-bottom: 16px;
`;

const Field = styled.View`
  flex-direction: row;
  align-items: center;
  border-width: 1px;
  border-color: #e9ecef;
  background: #fff;
  border-radius: 10px;
  padding: 12px 12px;
  margin-bottom: 12px;
`;

const Input = styled.TextInput`
  flex: 1;
  margin-left: 10px;
  font-size: 16px;
  color: #333;
`;

const IconBtn = styled.TouchableOpacity`
  padding: 4px;
  margin-left: 6px;
`;

const StrengthBar = styled.View`
  flex-direction: row;
  margin: -4px 0 10px 0;
`;

const StrengthBlock = styled.View`
  height: 6px;
  flex: 1;
  border-radius: 4px;
  background: ${({ level }) =>
    level === 'ok'  ? '#4CAF50' :
    level === 'bad' ? '#f44336' :
                      '#e0e0e0'};
`;

const PrimaryButton = styled.TouchableOpacity`
  background-color: ${({ disabled }) => (disabled ? '#c1c1c1' : '#e67e22')};
  padding: 14px;
  border-radius: 10px;
  align-items: center;
  margin-top: 6px;
`;

const PrimaryText = styled.Text`
  color: #fff;
  font-weight: 800;
`;

const TextCountdown = styled.Text`
  color: #0af116ff;
  font-weight: 800;
  font-size: 24px;

`;

/* ===== Modal simples ===== */
const ModalOverlay = styled.View`
  position: absolute;
  left: 0; right: 0; top: 0; bottom: 0;
  background: rgba(0,0,0,0.35);
  align-items: center;
  justify-content: center;
`;

const ModalCard = styled.View`
  width: 88%;
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  align-items: center;
`;

const ModalTitle = styled.Text`
  font-size: 18px;
  font-weight: 800;
  color: #222;
  margin-bottom: 6px;
`;

const ModalText = styled.Text`
  font-size: 14px;
  color: #444;
  margin-bottom: 16px;
  text-align: center;
`;

const SecondaryButton = styled.TouchableOpacity`
  background: #e0e0e0;
  padding: 10px 14px;
  border-radius: 10px;
`;

const SecondaryText = styled.Text`
  color: #333;
  font-weight: 700;
`;
