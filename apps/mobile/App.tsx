// @tilemo/mobile — app root.
//
// Bootstraps the AsyncStorage→MemoryAdapter→Store pipeline (src/data.ts), then
// renders a 4-tab bottom bar (今日/训练/记录/设置) over a state-based switch
// (no react-navigation — keeps native deps light for EAS). The shared
// @tilemo/core Metro drives the metronome overlay (src/Metronome.tsx).

import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { Plan } from "@tilemo/data";
import { bootstrapStore, useDataStore } from "./src/data";
import { useTheme } from "./src/theme";
import { fs, sp } from "./src/ui/primitives";
import { HomeScreen } from "./src/screens/HomeScreen";
import { TrainScreen } from "./src/screens/TrainScreen";
import { HistoryScreen } from "./src/screens/HistoryScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { Metronome } from "./src/Metronome";
import { ShareProvider } from "./src/share/ShareContext";

type Tab = "home" | "train" | "history" | "settings";

const TABS: { id: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: "home", label: "今日", icon: "home-outline" },
  { id: "train", label: "训练", icon: "fitness-outline" },
  { id: "history", label: "记录", icon: "calendar-outline" },
  { id: "settings", label: "设置", icon: "settings-outline" },
];

export default function App() {
  return (
    <SafeAreaProvider>
      <Root />
    </SafeAreaProvider>
  );
}

function Root() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    bootstrapStore()
      .catch(() => {
        /* bootstrap falls back to empty MemoryAdapter on failure */
      })
      .finally(() => {
        if (mounted) setReady(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const { mode, colors } = useTheme();

  if (!ready) {
    return (
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.paper, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={colors.accent} />
        <StatusBar style={mode === "dark" ? "light" : "dark"} />
      </View>
    );
  }

  return (
    <ShareProvider>
      <View style={{ flex: 1, backgroundColor: colors.paper }}>
        <Shell colors={colors} />
        <StatusBar style={mode === "dark" ? "light" : "dark"} />
      </View>
    </ShareProvider>
  );
}

function Shell({
  colors,
}: {
  colors: import("@tilemo/design-tokens").ColorSet;
}) {
  const [tab, setTab] = useState<Tab>("home");
  const [metroPlan, setMetroPlan] = useState<Plan | null>(null);
  const insets = useSafeAreaInsets();

  const openMetro = (plan: Plan) => setMetroPlan(plan);
  const closeMetro = () => setMetroPlan(null);

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, paddingTop: insets.top }}>
        {tab === "home" && <HomeScreen onStart={openMetro} />}
        {tab === "train" && <TrainScreen onStart={openMetro} />}
        {tab === "history" && <HistoryScreen />}
        {tab === "settings" && <SettingsScreen />}
      </View>

      {/* Bottom tab bar */}
      <View
        style={[
          styles.tabbar,
          {
            backgroundColor: colors.paperSoft,
            borderTopColor: colors.rule,
            paddingBottom: Math.max(insets.bottom, sp.s2),
          },
        ]}
      >
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <Pressable
              key={t.id}
              onPress={() => setTab(t.id)}
              style={({ pressed }) => [styles.tab, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Ionicons
                name={active ? (t.icon.replace("-outline", "") as typeof t.icon) : t.icon}
                size={24}
                color={active ? colors.accent : colors.text3}
              />
              <Text
                style={{
                  color: active ? colors.accent : colors.text3,
                  fontSize: fs.xs,
                  marginTop: sp.s1,
                  fontWeight: active ? "600" : "400",
                }}
              >
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Metronome overlay */}
      {metroPlan && <Metronome plan={metroPlan} onClose={closeMetro} />}
    </View>
  );
}

const styles = StyleSheet.create({
  tabbar: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingHorizontal: sp.s3,
    paddingTop: sp.s2,
  },
  tab: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: sp.s2 },
});
