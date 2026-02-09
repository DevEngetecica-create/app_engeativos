import React from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import styles, { 
  Container, 
  ButtonRow, 
  OptionButton, 
  OptionText, 
  Input, 
  Label, 
  ImageButton,
  SectionAccent,
  SectionWrapper
} from "../styles";
import { handlePickImage, excluirImagemDoDispositivo } from "./campos.functions";

// Componente principal que renderiza todos os campos
export default function CampoItem({ campos = [], respostas = {}, handleChange }) {
  if (!campos.length) return null;

  return (
    <>
        {campos.map((campo, index) => {
          // inicializa obrigatorio se não existir
          // console.log(respostas[campo.id]);
          respostas[campo.id] = {
            ...respostas[campo.id],
            obrigatorio: campo.obrigatorio
          };

          return (
            <SectionWrapper key={campo.id}>
              <SectionAccent  color="#0ebb78ff" />
              <Item
                campo={campo}
                resposta={respostas[campo.id]}
                handleChange={handleChange}
              />
            </SectionWrapper>
          );
        })}
    </>
  );
}

// Componente que representa cada item individual
function Item({ campo, resposta = {}, handleChange }) {
  const isNaoConforme = resposta.conforme == 0;

  return (
    <Container>
      <Label style={{ fontSize: 15 }}>
        {campo.campos} {campo.obrigatorio === 1 && <Label style={{ color: "red" }}>*</Label>}
      </Label>

      <ButtonRow>
        <OptionButton selected={resposta.conforme == 1} onPress={() => handleChange(campo.id, { ...resposta, conforme: 1 })}>
          <OptionText selected={resposta.conforme == 1}>Conforme</OptionText>
        </OptionButton>

        <OptionButton selected={resposta.conforme == 0} onPress={() => handleChange(campo.id, { ...resposta, conforme: 0 })}>
          <OptionText selected={resposta.conforme == 0}>Não Conforme</OptionText>
        </OptionButton>

        <OptionButton selected={resposta.conforme == 2} onPress={() => handleChange(campo.id, { ...resposta, conforme: 2 })}>
          <OptionText selected={resposta.conforme == 2}>N/A</OptionText>
        </OptionButton>
      </ButtonRow>

      {isNaoConforme && (
        <View style={styles.naoConformeBox}>
          <Label>Descrição da Não Conformidade:</Label>
          <Input
            placeholder="Descreva a não conformidade..."
            value={resposta.descricao || ""}
            onChangeText={(text) => handleChange(campo.id, { ...resposta, descricao: text })}
          />

          <ImageButton onPress={() => handlePickImage(campo.id, resposta, handleChange)}>
            <Text style={styles.imageText}>+ Adicionar Imagem</Text>
          </ImageButton>

          {resposta.imagens?.length > 0 && (
            <View style={styles.imagensContainer}>
              <Text style={styles.imagensHeader}>
                {resposta.imagens.length > 1
                  ? `${resposta.imagens.length} Fotos Anexadas`
                  : `${resposta.imagens.length} Foto Anexada`}
              </Text>

              <View style={styles.grid}>
                {resposta.imagens.map((img, index) => (
                  <View key={index} style={styles.imagemWrapper}>
                    <Image source={{ uri: img.uri }} style={styles.imagem} />
                    {!img.saved && (
                      <TouchableOpacity
                        style={styles.botaoRemover}
                        onPress={() => {
                          const novasImagens = resposta.imagens.filter((_, i) => i !== index);
                          excluirImagemDoDispositivo(resposta.imagens[index].uri);
                          handleChange(campo.id, { ...resposta, imagens: novasImagens });
                        }}
                      >
                        <Text style={styles.botaoRemoverTexto}>×</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}

          <Label>Ação / Sugestão:</Label>
          <Input
            placeholder="Descreva a ação corretiva..."
            value={resposta.acao_sugestao || ""}
            onChangeText={(text) => handleChange(campo.id, { ...resposta, acao_sugestao: text })}
          />

          <Label>Responsável pela Ação:</Label>
          <Input
            placeholder="Responsável pela ação ou solução..."
            value={resposta.responsavel_acao || ""}
            onChangeText={(text) => handleChange(campo.id, { ...resposta, responsavel_acao: text })}
          />
        </View>
      )}
    </Container>
  );
}
