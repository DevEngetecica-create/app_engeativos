import { StyleSheet } from 'react-native';
import styled from "styled-components/native";

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC', // azul-neve leve
    padding: 20,
  },

  btnNovaAssinatura:{
    width: "60%",
    align: "center",
    margin:"auto",

  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 10,
    color: "#64748B", // cinza-azulado suave
    fontSize: 15,
  },

  naoConformeBox: {
    marginTop: 12,
  },

  imageText: {
    color: "#007AFF",
    fontWeight: "600",
    fontSize: 15,
  },

  selectBox: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    height: 50,
    justifyContent: "center",
    paddingHorizontal: 10,
  },

  assinaturaPlace: {
    width: "100%",
    height: 220,
    overflow: "hidden",
    justifyContent: "flex-start",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  assinaturaRotacionada: {
    width: 200,
    height: 250,
    justifyContent: "flex-start",
    transform: [{ rotate: "90deg" }],
  },

  assinaturaImagem: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },

  btnSalvarText: {
    color: "#FFFFFF",
    textAlign: "center",
    fontWeight: "600",
    fontSize: 16,
    letterSpacing: 0.3,
  },

  btnAssinarText: {
    color: "#FFFFFF",
    fontWeight: "600",
    textAlign: "center",
    fontSize: 16,
  },
  imagensContainer: {
    marginTop: 12,
    padding: 10,
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DDD",
  },
  imagensHeader: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  imagemWrapper: {
    width: "30%",
    aspectRatio: 1,
    position: "relative",
    marginBottom: 10,
  },
  imagem: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
    backgroundColor: "#E0E0E0",
  },
  botaoRemover: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "red",
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },
  botaoRemoverTexto: {
    color: "#FFF",
    fontWeight: "bold",
  },
});

//
// --- STYLED COMPONENTS ---
//
export const SectionWrapper = styled.View`
  margin-top: 16px;
  flex-direction: row;
  width: 100%;
`;

/* Linha azul lateral */
export const SectionAccent = styled.View`
  left: 0;
  top: 0;
  bottom: 0;

  width: 7px;
  background-color: ${(props) => props.color || "#4d8ef0ff"};
  border-top-left-radius: 14px;
  border-bottom-left-radius: 14px;
  z-index: 1;
`;
export const Container = styled.View`
  flex: 1;
  background-color: #ffffff;
  border-top-right-radius: 14px;
  border-bottom-right-radius: 14px;
  border-width: 1px;
  border-color: #e2e8f0;
  padding: 20px 16px;

  shadow-color: #000;
  shadow-opacity: 0.05;
  shadow-offset: 0px 2px;
  shadow-radius: 5px;
  elevation: 2;
`;

export const Label = styled.Text`
  font-weight: 600;
  margin-top:6px;
  margin-bottom: 4px;
  color: #1e293b;
  font-size: 15px;
`;

export const Input = styled.TextInput`
  background-color: #f3f6fc;
  border-width: 1px;
  border-color: #c4d4ef;
  border-radius: 10px;
  padding: 12px;
  font-size: 15px;
  color: #0f172a;

  shadow-color: #3b82f6;
  shadow-opacity: 0.06;
  shadow-radius: 3px;
`;

export const ButtonRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
  margin-top: 6px;
`;

export const OptionButton = styled.TouchableOpacity`
  flex: 1;
  background-color: ${(props) => (props.selected ? "#007AFF" : "#F1F5F9")};
  padding-vertical: 12px;
  padding-horizontal:6px;
  border-radius: 8px;
  margin-right: 8px;
  border-width: 1px;
  border-color: ${(props) => (props.selected ? "#005BBB" : "#CBD5E1")};
  align-items: center;
  justify-content: center;
  shadow-color: #000;
  shadow-opacity: 0.05;
  shadow-offset: 0px 1px;
  shadow-radius: 3px;
  elevation: 2;
`;

export const OptionText = styled.Text`
  text-align: center;
  color: ${(props) => (props.selected ? "#FFFFFF" : "#1E293B")};
  font-weight: ${(props) => (props.selected ? "600" : "400")};
  font-size: 13px;
`;

export const ImageButton = styled.TouchableOpacity`
  margin-top: 12px;
  margin-bottom:8px;
  padding-vertical: 12px;
  align-items: center;
  border-width: 1px;
  border-color: #007aff;
  border-radius: 8px;
  background-color: #ffffff;
`;

export const BtnAssinar = styled.TouchableOpacity`
  background-color: #007aff;
  padding-vertical: 14px;
  border-radius: 10px;
  align-items: center;
  margin-top: 12px;
  shadow-color: #007aff;
  shadow-opacity: 0.2;
  shadow-offset: 0px 2px;
  shadow-radius: 4px;
  elevation: 3;
`;

export const BtnSalvar = styled.TouchableOpacity`
  background-color: #0cb458ff;
  padding-vertical: 18px;
  border-radius: 10px;
  margin-top:25px;
  margin-bottom: 30px;
  align-items: center;
  shadow-color: #014e31ff;
  shadow-opacity: 0.25;
  shadow-offset: 0px 3px;
  shadow-radius: 5px;
  elevation: 4;
`;

export const AssinaturaContainer = styled.View`
  margin-top: 11px;
  background-color: #ffffff;
  padding: 20px;
  border-radius: 10px;
  border-width: 1px;
  border-color: #e2e8f0;
  shadow-color: #000000ff;
  shadow-opacity: 0.25;
  shadow-offset: 0px 3px;
  shadow-radius: 5px;
  elevation: 1;
`;

export const ObservacaoContainer = styled.View`
  margin-top: 12px;
  background-color: #ffffff;
  padding: 20px;
  border-radius: 10px;
  border-width: 1px;
  border-color: #e2e8f0;
`;

export const ObservacaoInput = styled.TextInput`
  background-color: #f9fafb;
  border-width: 1px;
  border-color: #cbd5e1;
  border-radius: 6px;
  padding: 10px;
  height: 100px;
  text-align-vertical: top;
  color: #0f172a;
  font-size: 15px;
`;

export const TextoPadrao = styled.Text`
  color: #1e293b;
  font-size: 15px;
`;

export const TextoTitulo = styled.Text`
  font-weight: 700;
  font-size: 25px;
  text-align: center;
  margin-bottom: 6px;
  margin-top: 30px;
  color: #0f172a;
`;



// INFORMAÇOES

/* Título da seção */
export const InformacoesTitulo = styled.Text`
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 16px;
`;

/* Cada campo */
export const InformacaoContainer = styled.View`
  margin-bottom: 16px;
`;



export const InfoDivider = styled.View`
  height: 1px;
  background-color: #d4d6d8ff;
  margin-vertical: 10px;
  opacity: 0.6;
`;

export const CabecalhoBox = styled.View`
  margin-bottom: 6px;
  background-color: #f1f1f1ff;   /* azul claro suave */
  padding: 16px;
  border-radius: 10px;
  border-width: 1px;
  border-color: #a1a1a1ff; 
`;