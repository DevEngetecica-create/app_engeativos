import React from "react";
import styles, { 
  SectionWrapper, 
  SectionAccent, 
  InformacoesTitulo, 
  InformacaoContainer, 
  Label, 
  Input, 
  Container, 
  InfoDivider 
} from "../styles";



// Componente que renderiza a seção de informações
export default function InformacaoItem({ informacoes = [], respostas = {}, handleChange }) {
  if (!informacoes.length) return null;

  return (
    <SectionWrapper>
      <SectionAccent />

      <Container>
        <InformacoesTitulo>Informações Preliminares</InformacoesTitulo>

        {informacoes.map((info, index) => {

          respostas[info.id] = {
            ...respostas[info.id],
            obrigatorio: info.obrigatorio
          };

          return (
            <React.Fragment key={info.id}>
              {/* Cada item individual */}
              <Item
                info={info}
                resposta={respostas[info.id]}
                handleChange={handleChange}
              />

              {/* Divider entre os campos */}
              {index < informacoes.length - 1 && <InfoDivider />}
            </React.Fragment>
          );
        })}
      </Container>
    </SectionWrapper>
  );
}


// Componente que representa cada item individual
function Item({ info, resposta, handleChange }) {
  return (
    <InformacaoContainer>
      <Label>
        {info.informacao}{" "}
        {info.obrigatorio===1 && <Label style={{ color: 'red' }}>*</Label>}
      </Label>

      <Input
        placeholder=""
        value={resposta?.resposta || ""}
        onChangeText={(text) =>
          handleChange(info.id, {
            ...resposta,
            resposta: text,
          })
        }
      />
    </InformacaoContainer>
  );
}