import React from "react";
import { View, StyleSheet } from "react-native";
import ImageCard from "../../components/ImageCard";

const HomeAlugados = ({ navigation }) => {
  const countVeiculos = 10; 

  return (
    <View style={styles.container}>
      <ImageCard
        imageSource={require("../../../assets/car-wash.png")}
        title="Checklist de Veículos Alugados"
        subtitle={countVeiculos}
        onPress={() => navigation.navigate("ChecklistAlugados")}
      />
    </View>
  );
};

export default HomeAlugados;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    marginTop: 60,         
  },
});
