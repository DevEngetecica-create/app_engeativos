import React, { useCallback, useState, useEffect } from "react";
import { View, Text, ActivityIndicator, ScrollView } from "react-native";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import Toast from "react-native-root-toast";
import { useAuth } from "@/contexts/auth";

import { loadChecklist, salvarRespostas } from "./checklistResponder.functions";
import { loadCamposPreenchidos } from './Campos/campos.functions';
import { loadInformacoesPreenchidos } from "./Informacoes/informacao.functions";
import CampoItem from "./Campos";
import InformacaoItem from "./Informacoes";
import Assinatura from "./Assinaturas";
import styles, { ObservacaoContainer, ObservacaoInput, Label, BtnSalvar, TextoTitulo, TextoPadrao, CabecalhoBox, SectionWrapper,SectionAccent,Container } from "./styles";

export default function ChecklistRespostas() {
  const navigation = useNavigation();
  const route = useRoute();
  const { checklist, checklist_nome } = route.params;
  const { user } = useAuth();
  const { name } = user;
  console.log("Checklist Nome:", user);

  const [state, setState] = useState({
    loading: true,
    cabecalho: [],
    campos: [],
    respostas_campos: {},
    informacoes: [],
    respostas_informacoes: {},
    observacoes:{},
    saving: false,
  });

  const realizado_id = route.params.realizado_id;

  const [assinaturas, setAssinaturas] = useState([]);

  const salvarAssinaturas = (index, assinatura) => {
    setAssinaturas(prev => {
      const updated = [...prev];
      updated[index] = assinatura;
      return updated;
    });
  };

  const handleChange_campos = (campoId, valor) => {
    setState((s) => ({
      ...s,
      respostas_campos: { ...s.respostas_campos, [campoId]: valor },
    }));

  };
  const handleChange_informacoes = (infoId, valor) => {
    setState((s) => ({
      ...s,
      respostas_informacoes: { ...s.respostas_informacoes, [infoId]: valor },
    }));

  };

  const handleChange_observacoes = (valor) => {
    setState((s) => ({
      ...s,
      observacoes: valor ,
    }));
  };



  useFocusEffect(
    useCallback(() => {
      loadChecklist({ checklist, setState });
      loadCamposPreenchidos({ realizado_id: realizado_id, setState });
      loadInformacoesPreenchidos({ realizado_id: realizado_id, setState });
    }, [checklist])
  );



  const handleSalvar = async () => {
    try {
      setState((s) => ({ ...s, saving: true }));
      Toast.show("💾 Salvando respostas...", { duration: 1500 });

      const resultado = await salvarRespostas({
        checklist_id: checklist,
        idObra: route.params.id_obra,
        realizado_id: realizado_id,
        respostas_informacoes: state.respostas_informacoes,
        respostas_campos: state.respostas_campos,
        assinaturas: assinaturas,
        observacoes: state.observacoes,
        userName: name,
      });


      if (!resultado.ok) {
        Toast.show(`⚠️ ${resultado.mensagem}`, { duration: 2500 });
        return;
      }
      if (resultado.ok) {
        Toast.show(
          "✅ Salvo no dispositivo. Sincronize quando tiver internet.",
          { duration: 2500 }
        );
        navigation.goBack();
      }
    } catch (error) {
      console.error(error);
      Toast.show("❌ Erro ao salvar respostas.", { duration: 2000 });
    } finally {
      setState((s) => ({ ...s, saving: false }));
    }
  };


  // console.log(state.observacoes);
  if (state.loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Carregando campos...</Text>
      </View>
    );
  }
  return (
    <ScrollView style={styles.container}>
      <TextoTitulo>   Cabeçalho do Checklist   </TextoTitulo>
      <SectionWrapper>
        <SectionAccent  color="#ff5c3fff" />
        <Container>
          <Label>Código do Checklist:</Label>
          <CabecalhoBox>
            <TextoPadrao>{state.cabecalho?.codigo_checklist}</TextoPadrao>
          </CabecalhoBox>
          <Label>Data de Criação:</Label>
          <CabecalhoBox>
            <TextoPadrao>{state.cabecalho?.data_criacao_checklist}</TextoPadrao>
          </CabecalhoBox>
          <Label>Versão:</Label>
          <CabecalhoBox>
            <TextoPadrao>{state.cabecalho?.numero_revisao_checklist}</TextoPadrao>
          </CabecalhoBox>
          <Label>Empresa Responsável:</Label>
          <CabecalhoBox>
            <TextoPadrao>
              {state.cabecalho?.nome_empresa || "Não informado"}
            </TextoPadrao>
          </CabecalhoBox>
          <Label>Descrição:</Label>
          <CabecalhoBox>
            <TextoPadrao>{state.cabecalho?.descricao_checklist}</TextoPadrao>
          </CabecalhoBox>
        </Container>
      </SectionWrapper>

      <InformacaoItem
        informacoes={state.informacoes}
        respostas={state.respostas_informacoes}
        handleChange={handleChange_informacoes}
      />


      <TextoTitulo>   Itens do Checklist   </TextoTitulo>
      <CampoItem
        campos={state.campos}
        respostas={state.respostas_campos}
        handleChange={handleChange_campos}
      />


      <ObservacaoContainer>
        <Label>Observações:</Label>
        <ObservacaoInput
          placeholder="Descreva a observação..."
          multiline
          onChangeText={(text) => handleChange_observacoes(text)}
          value={state.observacoes}
        />
      </ObservacaoContainer>

      <TextoTitulo>   Assinaturas   </TextoTitulo>
      <ObservacaoContainer>
        <Assinatura
          salvarAssinaturas={salvarAssinaturas}
          userName={name}
          realizado_id={realizado_id}
        />
      </ObservacaoContainer>


      <BtnSalvar onPress={handleSalvar}>
        <Text style={styles.btnSalvarText}>
          {state.saving ? "Salvando..." : "Salvar Respostas"}
        </Text>
      </BtnSalvar>
    </ScrollView>
  );
}
