import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import { tokens } from "@tilemo/design-tokens";
import { TILEMO_CORE_VERSION } from "@tilemo/core";

/** P0 shell — proves the Expo app resolves the workspace packages and bundles. */
export default function App() {
  const c = tokens.light.color;
  return (
    <View style={[styles.container, { backgroundColor: c.paper }]}>
      <Text style={{ color: c.accent, fontSize: 28, fontWeight: "600" }}>今天提了么</Text>
      <Text style={{ color: c.ink, marginTop: 8 }}>mobile P0 · core {TILEMO_CORE_VERSION}</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
});
