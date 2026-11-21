// @tilemo/mobile — app root.
//
// Bootstraps the AsyncStorage→MemoryAdapter→Store pipeline (src/data.ts), then
// renders a 4-tab bottom bar (今日/训练/记录/设置) over a state-based switch
// (no react-navigation — keeps native deps light for EAS). The shared
// @tilemo/core Metro drives the metronome overlay (src/Metronome.tsx).

import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import type { Plan } from "@tilemo/data";
import { bootstrapStore } from "./src/data";
import { useTheme, type ThemeMode } from "./src/theme";
import { fs, sp } from "./src/ui/primitives";
import { HomeScreen } from "./src/screens/HomeScreen";
import { TrainScreen } from "./src/screens/TrainScreen";
import { HistoryScreen } from "./src/screens/HistoryScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { Metronome } from "./src/Metronome";
import { ShareProvider } from "./src/share/ShareContext";

type Tab = "home" | "train" | "history" | "settings";

const TAB_ICONS: Record<Tab, { light: ImageSourcePropType; lightOn: ImageSourcePropType; dark: ImageSourcePropType; darkOn: ImageSourcePropType }> = {
  home: {
    light: require("./assets/icons/home.png"),
    lightOn: require("./assets/icons/home-on.png"),
    dark: require("./assets/icons/home-d.png"),
    darkOn: require("./assets/icons/home-d-on.png"),
  },
  train: {
    light: require("./assets/icons/train.png"),
    lightOn: require("./assets/icons/train-on.png"),
    dark: require("./assets/icons/train-d.png"),
    darkOn: require("./assets/icons/train-d-on.png"),
  },
  history: {
    light: require("./assets/icons/history.png"),
    lightOn: require("./assets/icons/history-on.png"),
    dark: require("./assets/icons/history-d.png"),
    darkOn: require("./assets/icons/history-d-on.png"),
  },
  settings: {
    light: require("./assets/icons/settings.png"),
    lightOn: require("./assets/icons/settings-on.png"),
    dark: require("./assets/icons/settings-d.png"),
    darkOn: require("./assets/icons/settings-d-on.png"),
  },
};

const TABS: { id: Tab; label: string }[] = [
  { id: "home", label: "今日" },
  { id: "train", label: "训练" },
  { id: "history", label: "记录" },
  { id: "settings", label: "设置" },
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
        <Shell colors={colors} mode={mode} />
        <StatusBar style={mode === "dark" ? "light" : "dark"} />
      </View>
    </ShareProvider>
  );
}

function Shell({
  colors,
  mode,
}: {
  colors: import("@tilemo/design-tokens").ColorSet;
  mode: ThemeMode;
}) {
  const [tab, setTab] = useState<Tab>("home");
  const [metroPlan, setMetroPlan] = useState<Plan | null>(null);
  const insets = useSafeAreaInsets();

  const openMetro = (plan: Plan) => setMetroPlan(plan);
  const closeMetro = () => setMetroPlan(null);

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, paddingTop: insets.top }}>
        {tab === "home" && <HomeScreen onStart={openMetro} onSwitchPlan={() => setTab("train")} />}
        {tab === "train" && <TrainScreen onStart={openMetro} />}
        {tab === "history" && <HistoryScreen onStart={openMetro} />}
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
          const set = TAB_ICONS[t.id];
          const src = mode === "dark" ? (active ? set.darkOn : set.dark) : active ? set.lightOn : set.light;
          return (
            <Pressable
              key={t.id}
              onPress={() => setTab(t.id)}
              style={({ pressed }) => [styles.tab, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Image source={src} style={{ width: 24, height: 24 }} resizeMode="contain" />
              <Text
                style={{
                  color: active ? colors.accentBtn : colors.text3,
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
