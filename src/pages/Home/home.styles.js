import { StyleSheet, Dimensions } from "react-native";

const { width } = Dimensions.get("window");
const HEADER_HEIGHT = 70;
const FOOTER_HEIGHT = 70;

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  header: {
    position: "absolute",
    top: 0,
    width,
    height: HEADER_HEIGHT,
    zIndex: 10,
  },

  footer: {
    position: "absolute",
    bottom: 0,
    width,
    height: FOOTER_HEIGHT,
    zIndex: 10,
  },

  scrollContent: {
    paddingTop: HEADER_HEIGHT + 16,
    paddingBottom: FOOTER_HEIGHT + 16,
    paddingHorizontal: 16,
  },

  greeting: {
    fontSize: 15,
    color: "#64748B",
    marginBottom: 2,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 10,
  },

  item: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    height: 110,
    borderRadius: 16,
    marginBottom: 10,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },

  label: {
    marginTop: 2,
    fontWeight: "600",
    color: "#1E293B",
    fontSize: 15,
    textAlign: "center",
  },
});
