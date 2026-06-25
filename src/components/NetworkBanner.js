import React from "react";
import { View, Text, StyleSheet, Switch, Alert, TouchableOpacity } from "react-native";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "../contexts/auth";
import { getConnectionSnapshot, isGoodSignal } from "../config/net/connectionSnapshot";
import { forceGlobalOfflineMode } from "../contexts/network";
import { useNavigation } from "@react-navigation/native";

const NetworkBanner = () => {
  const { signOut, connectionMode, switchConnectionMode } = useAuth();
  const isOffline = connectionMode === "offline";
  const navigation = useNavigation();

  const snapshot = getConnectionSnapshot();
  const quality = snapshot?.qualityPct ?? 0;
  const good = isGoodSignal(quality);

  let bgColor = "#caf3a8ff";
  let text = "Modo ONLINE";

  if (isOffline) {
    bgColor = "#FF7043";
    text = "Modo OFFLINE";
  } else if (!good) {
    bgColor = "#FFA000";
    text = `⚠️ Sinal fraco (${quality.toFixed(0)}%)`;
  }

  const handleSwitch = (val) => {
    if (val) {
      const { qualityPct } = getConnectionSnapshot();
      if (!isGoodSignal(qualityPct)) {
        Alert.alert(
          "Sinal fraco",
          `Intensidade atual ≈ ${qualityPct}%. Recomendado permanecer OFFLINE.`
        );
        return;
      }
    }

    const newMode = val ? "online" : "offline";
    switchConnectionMode(newMode);
    forceGlobalOfflineMode(!val);
  };

  return (
    <View style={[styles.banner, { backgroundColor: bgColor }]}>
      <MaterialIcons
        name={isOffline ? "wifi-off" : "wifi"}
        size={20}
        color="#333"
        style={{ marginTop: 12 }}
      />
      <Text style={styles.text}>{text}</Text>

      <Switch
        value={!isOffline}
        onValueChange={handleSwitch}
        thumbColor={isOffline ? "#f44336" : "#81C784"}
        trackColor={{ false: "#ccc", true: "#81C784" }}
        style={styles.switch}
      />

      <TouchableOpacity onPress={() => navigation.navigate("Home")} style={styles.homeButton}>
        <MaterialCommunityIcons name="home" size={24} color="#333" />
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("Upload")} style={styles.homeButton}>
        <MaterialCommunityIcons name="auto-upload" size={24} color="#333" />
      </TouchableOpacity>

      <TouchableOpacity onPress={signOut} style={styles.logoutButton}>
        <MaterialCommunityIcons name="logout" size={24} color="#333" />
      </TouchableOpacity>
    </View>
  );
};

export default NetworkBanner;

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    backgroundColor: "#4CAF50",
  },
  switch: {
    right: 0,
    marginTop: 25,
    marginRight: 12,
  },
  text: {
    color: "#333",
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 15,
    marginRight: 12,
  },
  homeButton: {
    marginHorizontal: 12,
    marginTop: 25,
  },
  logoutButton: {
    marginTop: 23,
    marginHorizontal: 18,
  },
});
