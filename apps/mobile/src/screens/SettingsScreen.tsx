// @tilemo/mobile — 设置 / Settings screen.
//
// daily-goal stepper, default-plan picker, sound/haptics/daily-quote toggles,
// theme segmented control, and a 数据 section with JSON export via expo-sharing.

import { useState } from "react";
import { Alert, Linking, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import * as Sharing from "expo-sharing";
import { clamp, todayKey } from "@tilemo/core";
import type { Plan, Settings as SettingsT, ThemeSetting } from "@tilemo/data";
import { useDataStore } from "../data";
import { useTheme } from "../theme";
import { Button, fs, rd, sp, Stepper } from "../ui/primitives";
import { GITHUB_URL } from "@tilemo/share-card";

export function SettingsScreen() {
  const { colors } = useTheme();
  const store = useDataStore((s) => s.store);
  const refresh = useDataStore((s) => s.refresh);
  const settings = useDataStore((s) => s.settings);
  const plans = useDataStore((s) => s.plans);

  const [exporting, setExporting] = useState(false);

  const update = (patch: Partial<SettingsT>) => {
    if (!store || !settings) return;
    const next = { ...settings, ...patch };
    store.setSettings(next);
    refresh();
  };

  const setPlan = (p: Plan) => update({ defaultPlanId: p.id });

  const exportData = async () => {
    if (!store || exporting) return;
    setExporting(true);
    try {
      const bundle = store.exportAll();
      const json = JSON.stringify(bundle, null, 2);
      const fname = `tgm-data-${todayKey()}.json`;
      if (Sharing.isAvailableAsync && (await Sharing.isAvailableAsync())) {
        // Write to a temp file the FS module expects; but we can also just use
        // Share.share with the JSON as the message when FS isn't desired.
        // Use Share as a portable fallback path (works on both platforms without
        // a file write dependency).
        await Share.share({ message: json, title: fname });
      } else {
        await Share.share({ message: json, title: fname });
      }
    } catch (e) {
      Alert.alert("导出失败", String(e instanceof Error ? e.message : e));
    } finally {
      setExporting(false);
    }
  };

  if (!settings) return null;

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: colors.paper }]}
      alwaysBounceVertical
    >
      <Text style={[styles.title, { color: colors.text }]}>设置</Text>

      {/* Daily goal */}
      <Section colors={colors} label="每日目标">
        <View style={[styles.rowBetween, { paddingVertical: sp.s4 }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: fs.base, fontWeight: "600" }}>
              每天几组
            </Text>
            <Text style={{ color: colors.text3, fontSize: fs.sm, marginTop: sp.s1 }}>
              连续达标即计入连续天数
            </Text>
          </View>
          <Stepper
            colors={colors}
            value={settings.dailyGoalGroups}
            min={1}
            max={8}
            onDec={() => update({ dailyGoalGroups: clamp(settings.dailyGoalGroups - 1, 1, 8) })}
            onInc={() => update({ dailyGoalGroups: clamp(settings.dailyGoalGroups + 1, 1, 8) })}
          />
        </View>
      </Section>

      {/* Default plan */}
      <Section colors={colors} label="默认方案">
        <View style={styles.planList}>
          {plans.map((p) => {
            const active = p.id === settings.defaultPlanId;
            return (
              <Pressable
                key={p.id}
                onPress={() => setPlan(p)}
                style={({ pressed }) => [
                  styles.planChip,
                  {
                    backgroundColor: active ? colors.accent : colors.paperDeep,
                    borderColor: active ? colors.accent : colors.rule,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text
                  style={{
                    color: active ? "#FFFFFF" : colors.text,
                    fontSize: fs.base,
                    fontWeight: "600",
                  }}
                >
                  {p.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Section>

      {/* Toggles */}
      <Section colors={colors} label="体验">
        <ToggleRow colors={colors} label="声音" hint="收 / 放 切换时播放轻提示音" value={settings.sound} onToggle={() => update({ sound: !settings.sound })} />
        <ToggleRow
          colors={colors}
          label="触感反馈"
          hint="阶段切换时轻震"
          value={settings.haptics}
          onToggle={() => update({ haptics: !settings.haptics })}
        />
        <ToggleRow
          colors={colors}
          label="每日一句"
          hint="首页显示一句鼓励"
          value={settings.dailyQuote}
          onToggle={() => update({ dailyQuote: !settings.dailyQuote })}
        />
      </Section>

      {/* Theme */}
      <Section colors={colors} label="外观">
        <ThemeSeg colors={colors} value={settings.theme} onChange={(t) => update({ theme: t })} />
      </Section>

      {/* Data */}
      <Section colors={colors} label="数据">
        <Button
          colors={colors}
          variant="deep"
          full
          disabled={exporting}
          onPress={exportData}
          style={{ marginVertical: sp.s4 }}
        >
          {exporting ? "导出中…" : "导出我的数据"}
        </Button>
        <Text style={{ color: colors.text3, fontSize: fs.sm, marginTop: sp.s2 }}>
          {Platform.OS === "ios" ? "通过系统分享面板保存。" : "通过系统分享。"}
        </Text>
      </Section>

      {/* 开源 */}
      <Section colors={colors} label="开源">
        <Pressable
          onPress={() => Linking.openURL(GITHUB_URL)}
          style={({ pressed }) => ({ paddingVertical: sp.s4, opacity: pressed ? 0.6 : 1 })}
        >
          <Text style={{ color: colors.text, fontSize: fs.base, fontWeight: "600" }}>
            GitHub · 欢迎 Star ↗
          </Text>
          <Text style={{ color: colors.text3, fontSize: fs.sm, marginTop: sp.s1 }}>
            {GITHUB_URL.replace("https://", "")}
          </Text>
        </Pressable>
      </Section>

      <View style={{ height: sp.s8 }} />
    </ScrollView>
  );
}

function Section({
  colors,
  label,
  children,
}: {
  colors: import("@tilemo/design-tokens").ColorSet;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ marginTop: sp.s5 }}>
      <Text style={[styles.sectionLabel, { color: colors.text3 }]}>{label}</Text>
      <View style={[styles.sectionBody, { backgroundColor: colors.paperSoft, borderColor: colors.rule }]}>
        {children}
      </View>
    </View>
  );
}

function ToggleRow({
  colors,
  label,
  hint,
  value,
  onToggle,
  disabled,
}: {
  colors: import("@tilemo/design-tokens").ColorSet;
  label: string;
  hint?: string;
  value: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onToggle}
      style={({ pressed }) => [
        styles.rowBetween,
        styles.toggleRow,
        { opacity: disabled ? 0.45 : pressed ? 0.7 : 1 },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: fs.base, fontWeight: "600" }}>{label}</Text>
        {hint && <Text style={{ color: colors.text3, fontSize: fs.sm, marginTop: sp.s1 }}>{hint}</Text>}
      </View>
      <View
        style={[
          styles.switch,
          {
            backgroundColor: value ? colors.accent : colors.paperDeep,
            borderColor: value ? colors.accent : colors.ruleStrong,
          },
        ]}
      >
        <View
          style={[
            styles.switchKnob,
            { backgroundColor: "#FFFFFF", transform: [{ translateX: value ? 22 : 2 }] },
          ]}
        />
      </View>
    </Pressable>
  );
}

function ThemeSeg({
  colors,
  value,
  onChange,
}: {
  colors: import("@tilemo/design-tokens").ColorSet;
  value: ThemeSetting;
  onChange: (t: ThemeSetting) => void;
}) {
  const opts: { v: ThemeSetting; label: string }[] = [
    { v: "light", label: "浅色" },
    { v: "dark", label: "深色" },
    { v: "system", label: "跟随系统" },
  ];
  return (
    <View style={[styles.seg, { borderColor: colors.ruleStrong }]}>
      {opts.map((o) => {
        const active = o.v === value;
        return (
          <Pressable
            key={o.v}
            onPress={() => onChange(o.v)}
            style={[
              styles.segItem,
              { backgroundColor: active ? colors.accent : "transparent" },
            ]}
          >
            <Text
              style={{
                color: active ? "#FFFFFF" : colors.text,
                fontSize: fs.sm,
                fontWeight: "600",
              }}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: sp.gutter, paddingTop: sp.s6 },
  title: { fontSize: 28, fontWeight: "700", marginBottom: sp.s4 },
  sectionLabel: { fontSize: fs.xs, fontWeight: "600", marginBottom: sp.s2 },
  sectionBody: { borderRadius: rd.md, borderWidth: 1, paddingHorizontal: sp.s4 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  toggleRow: { paddingVertical: sp.s4 },
  switch: { width: 48, height: 28, borderRadius: rd.pill, borderWidth: 1, justifyContent: "center" },
  switchKnob: { width: 22, height: 22, borderRadius: rd.pill },
  planList: { flexDirection: "row", flexWrap: "wrap", gap: sp.s2, paddingVertical: sp.s4 },
  planChip: {
    paddingHorizontal: sp.s4,
    paddingVertical: sp.s3,
    borderRadius: rd.pill,
    borderWidth: 1,
  },
  seg: { flexDirection: "row", borderWidth: 1, borderRadius: rd.pill, padding: sp.s1, marginVertical: sp.s4 },
  segItem: { flex: 1, paddingVertical: sp.s3, borderRadius: rd.pill, alignItems: "center" },
});
