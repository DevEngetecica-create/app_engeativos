import Toast from "react-native-root-toast";

export function showToast(message, type = "info") {
  let backgroundColor = "#333";
  let textColor = "#fff";

  switch (type) {
    case "success":
      backgroundColor = "#2e7d32"; // verde
      break;
    case "error":
      backgroundColor = "#d32f2f"; // vermelho
      break;
    case "warning":
      backgroundColor = "#f9a825"; // amarelo
      textColor = "#000";
      break;
    case "offline":
      backgroundColor = "#ff7043"; // laranja Engeativos
      break;
  }

  Toast.show(message, {
    duration: Toast.durations.LONG,
    position: Toast.positions.BOTTOM - 80,
    shadow: true,
    animation: true,
    hideOnPress: true,
    delay: 0,
    backgroundColor,
    textColor,
    opacity: 0.95,
    containerStyle: {
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 16,
      marginHorizontal: 15,
    },
  });
}
