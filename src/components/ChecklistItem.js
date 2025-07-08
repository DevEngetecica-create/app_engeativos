import React from "react";
import { Image, StyleSheet, Text, View, TouchableOpacity } from "react-native";
import Font from "../constants/Font";
import Colors from "../constants/Colors";
import FontSize from "../constants/FontSize";

const ChecklistItem = ({ modelo, data, km, onPress }) => {
  return (
    <TouchableOpacity onPress={onPress} style={styles.touchable}>
      <View style={styles.contentContainer}>
        <Image
          source={require("../../assets/icon.png")}
          style={styles.contentImage}
          resizeMode="contain"
        />
        <View style={styles.textBox}>
          <Text>
            <Text style={{ color: Colors.orange }}>Modelo: </Text>{modelo}
          </Text>
          <Text>
            <Text style={{ color: Colors.orange }}>Data: </Text>{data}
          </Text>
          <Text>
            <Text style={{ color: Colors.orange }}>KM: </Text>{km}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default ChecklistItem;

const styles = StyleSheet.create({
  touchable: {
    alignItems: "center",
  },
  contentContainer: {
    flexDirection: "row",
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginVertical: 8,
    width: "100%",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  contentImage: {
    width: 80,
    height: 80,
  },
  textBox: {
    marginLeft: 30,
    justifyContent: "space-between",
    flex: 1,
  },
  text: {
    fontSize: FontSize.small,
    color: Colors.black,
    fontFamily: Font["poppins-bold"],
    flexWrap: "wrap",
  }
});
