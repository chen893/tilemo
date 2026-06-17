import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import { color } from "@tilemo/design-tokens";
import { TILEMO_CORE_VERSION } from "@tilemo/core";

/** P1 mobile shell — stub, will be replaced with the real mobile app in P4. */
export default function App() {
  const c = color.light;
  return (
    <View style={[styles.container, { backgroundColor: c.paper }]}>
      <Text style={{ color: c.accent, fontSize: 28, fontWeight: "600" }}>今天提了么</Text>
      <Text style={{ color: c.ink, marginTop: 8 }}>mobile P1 · core {TILEMO_CORE_VERSION}</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
});
