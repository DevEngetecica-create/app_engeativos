import React from "react";
import { Modal, TouchableOpacity, Text, StyleSheet } from "react-native";
import SignatureScreen from "react-native-signature-canvas";
import Toast from "react-native-root-toast";

export default function Signature({
  visible,
  onClose,
  onSave,
  userName = "Assine Aqui",
}) {
  const handleSignature = (signature) => {
    onSave(signature);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide">
      <SignatureScreen
        onOK={handleSignature}
        onEmpty={() => Toast.show("Assinatura vazia!", { duration: 1500 })}
        userName={userName}
        clearText="Limpar"
        confirmText="Salvar"
        webStyle={customWebStyle(userName)}
      />

      <TouchableOpacity onPress={onClose} style={styles.closeButton}>
        <Text style={styles.closeButtonText}>Fechar</Text>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  closeButton: {
    padding: 15,
    backgroundColor: "#007AFF",
    alignItems: "center",
  },
  closeButtonText: {
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
  },
});

// ============================
// 🎨 CSS personalizado com linha e texto
// ============================
const customWebStyle = (userName) =>  `
  html, body {
    height: 100%;
    margin: 0;
    background: #fff;
    overflow: hidden;
  }

  .m-signature-pad {
    position: relative;
    width: 100% !important;
    height: 100vh !important;
    background-color: #fff;
  }

  /* Mantém a área do rodapé visível */
  .m-signature-pad--footer {
    position: absolute;
    bottom: 0;
    width: 100%;
    display: flex !important;
    justify-content: space-between !important;
    align-items: center !important;
    background: #ffffff;
    border-top: 1px solid #ccc;
    padding: 10px 20px !important;
    box-sizing: border-box;
    z-index: 10;
  }

  .button {
    background: #007AFF;
    color: #fff;
    border: none;
    border-radius: 6px;
    padding: 10px 16px;
    font-size: 15px;
    font-weight: bold;
  }

  /* Linha vertical no centro */
  .m-signature-pad::before {
    content: "";
    position: absolute;
    left: 50%;
    top: 5%;
    height: 85%;
    width: 2px;
    background-color: rgba(0, 0, 0, 0.2);
    z-index: 0;
  }

  /* Texto “Assine aqui” rotacionado verticalmente */
  .m-signature-pad::after {
    content: "${userName}";
    position: absolute;
    top:35%;
    left: 37%;
    transform: rotate(-90deg) translate(-50%, -50%);
    transform-origin: center;
    font-size: 18px;
    color: rgba(0,0,0,0.4);
    font-weight: bold;
    z-index: 0;
  }

  /* Mantém o texto de descrição no topo */
  .m-signature-pad--body {
    height: calc(100vh - 20px);
    position: relative;
  }

  .m-signature-pad--footer .description {
    display: none !important; /* Esconde o texto duplicado “Assine acima” se quiser */
  }
`;
