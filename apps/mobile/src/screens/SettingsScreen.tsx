// @tilemo/mobile — 设置 / Settings screen.

import { useMemo, useState } from "react";
import { Alert, Linking, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import * as Sharing from "expo-sharing";
import { aggregateStats, clamp, todayKey } from "@tilemo/core";
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
  const today = useDataStore((s) => s.today);

  const [exporting, setExporting] = useState(false);

  const stats = useMemo(() => (store ? aggregateStats(store) : null), [store, today]);
  const hasLogs = (stats?.totalSessions ?? 0) > 0;

  const update = (patch: Partial<SettingsT>) => {
    if (!store || !settings) return;
    const next = { ...settings, ...patch };
    store.setSettings(next);
    refresh();
  };

  const setPlan = (p: Plan) => update({ defaultPlanId: p.id });

  const exportData = async () => {
    if (!store || exporting || !hasLogs) return;
    setExporting(true);
    try {
      const bundle = store.exportAll();
      const json = JSON.stringify(bundle, null, 2);
      const fname = `tgm-data-${todayKey()}.json`;
      if (Sharing.isAvailableAsync && (await Sharing.isAvailableAsync())) {
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

  const onClearAll = () => {
    if (!store) return;
    Alert.alert(
      "清空记录与设置？",
      "训练记录、连续天数与偏好设置都会被清除，且无法恢复。建议先导出备份。",
      [
        { text: "取消", style: "cancel" },
        {
          text: "确认清空",
          style: "destructive",
          onPress: () => {
            store.clearAll();
            refresh();
          },
        },
      ],
    );
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
            <Text style={{ color: colors.text2, fontSize: fs.sm, marginTop: sp.s1 }}>
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

      {/* Default plan — 2×2 等宽网格，消灭 3+1 落单 */}
      <Section colors={colors} label="默认方案">
        <View style={styles.planGrid}>
          {plans.map((p) => {
            const active = p.id === settings.defaultPlanId;
            return (
              <Pressable
                key={p.id}
                onPress={() => setPlan(p)}
                style={({ pressed }) => [
                  styles.planChip,
                  {
                    backgroundColor: active ? colors.accentBtn : colors.paperDeep,
                    borderColor: active ? colors.accentBtn : colors.rule,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text
                  style={{
                    color: active ? colors.onAccentBtn : colors.text,
                    fontSize: fs.sm,
                    fontWeight: "700",
                  }}
                >
                  {p.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={{ color: colors.text3, fontSize: fs.xs, paddingBottom: sp.s4 }}>
          用于今日页一键开练
        </Text>
      </Section>

      {/* Toggles */}
      <Section colors={colors} label="体验">
        <ToggleRow
          colors={colors}
          label="声音"
          hint="收 / 放 切换时播放轻提示音"
          value={settings.sound}
          onToggle={() => update({ sound: !settings.sound })}
        />
        <ToggleRow
          colors={colors}
          label="触感反馈"
          hint="阶段切换时轻震一下"
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

      {/* Theme — 去掉嵌套外框 */}
      <View style={{ marginTop: sp.s5 }}>
        <Text style={[styles.sectionLabel, { color: colors.text2 }]}>外观</Text>
        <ThemeSeg colors={colors} value={settings.theme} onChange={(t) => update({ theme: t })} />
      </View>

      {/* Data */}
      <Section colors={colors} label="数据">
        <Button
          colors={colors}
          variant="deep"
          full
          disabled={exporting || !hasLogs}
          onPress={exportData}
          style={{ marginTop: sp.s4, marginBottom: sp.s2 }}
        >
          {exporting ? "导出中…" : "导出我的数据"}
        </Button>
        <Text style={{ color: colors.text3, fontSize: fs.xs, marginBottom: sp.s4 }}>
          {hasLogs
            ? Platform.OS === "ios"
              ? `共 ${stats?.totalDays ?? 0} 天记录，通过系统分享保存备份文本。`
              : `共 ${stats?.totalDays ?? 0} 天记录，通过系统分享保存备份文本。`
            : "本机还没有训练记录，完成一次训练后即可导出备份。"}
        </Text>

        <View style={[styles.divider, { backgroundColor: colors.rule }]} />

        <Pressable
          onPress={onClearAll}
          style={({ pressed }) => [
            styles.rowBetween,
            { paddingVertical: sp.s4, opacity: pressed ? 0.65 : 1 },
          ]}
        >
          <View style={{ flex: 1, paddingRight: sp.s3 }}>
            <Text style={{ color: colors.text, fontSize: fs.base, fontWeight: "600" }}>
              清空记录与设置
            </Text>
            <Text style={{ color: colors.text3, fontSize: fs.xs, marginTop: sp.s1 }}>
              删除后无法恢复，建议先导出备份
            </Text>
          </View>
          <Text style={{ color: colors.danger, fontSize: fs.sm, fontWeight: "700" }}>清空</Text>
        </Pressable>
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
      <Text style={[styles.sectionLabel, { color: colors.text2 }]}>{label}</Text>
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
            backgroundColor: value ? colors.accentBtn : colors.paperDeep,
            borderColor: value ? colors.accentBtn : colors.ruleStrong,
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
    <View style={[styles.seg, { backgroundColor: colors.paperSoft, borderColor: colors.rule }]}>
      {opts.map((o) => {
        const active = o.v === value;
        return (
          <Pressable
            key={o.v}
            onPress={() => onChange(o.v)}
            style={[
              styles.segItem,
              { backgroundColor: active ? colors.accentBtn : "transparent" },
            ]}
          >
            <Text
              style={{
                color: active ? colors.onAccentBtn : colors.text,
                fontSize: fs.sm,
                fontWeight: "700",
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
  container: { padding: sp.gutter, paddingTop: sp.s5 },
  title: { fontSize: 28, fontWeight: "700", marginBottom: sp.s4 },
  sectionLabel: { fontSize: fs.xs, fontWeight: "600", marginBottom: sp.s2 },
  sectionBody: { borderRadius: rd.md, borderWidth: 1, paddingHorizontal: sp.s4 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  toggleRow: { paddingVertical: sp.s4 },
  switch: { width: 48, height: 28, borderRadius: rd.pill, borderWidth: 1, justifyContent: "center" },
  switchKnob: { width: 22, height: 22, borderRadius: rd.pill },
  planGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: sp.s2,
    paddingTop: sp.s4,
    paddingBottom: sp.s2,
  },
  planChip: {
    width: "48.5%",
    paddingVertical: sp.s3,
    borderRadius: rd.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  seg: { flexDirection: "row", borderWidth: 1, borderRadius: rd.pill, padding: sp.s1 },
  segItem: { flex: 1, paddingVertical: sp.s3, borderRadius: rd.pill, alignItems: "center" },
  divider: { height: 1 },
});
