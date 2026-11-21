// @tilemo/mobile — 今日 / Home screen.

import { useMemo } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { completedCountOfDay, formatPlanDuration, levelOfDay, pad2, todayKey, ymd, QUOTES } from "@tilemo/core";
import { useDataStore } from "../data";
import { useOpenShare } from "../share/ShareContext";
import { useTheme } from "../theme";
import { Button, fs, rd, sp } from "../ui/primitives";
import type { Plan } from "@tilemo/data";

const SHARE_ICON = {
  light: require("../../assets/icons/share.png"),
  dark: require("../../assets/icons/share-d.png"),
};

const WD = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

export function HomeScreen({
  onStart,
  onSwitchPlan,
}: {
  onStart: (plan: Plan) => void;
  onSwitchPlan?: () => void;
}) {
  const { colors, mode } = useTheme();
  const openShare = useOpenShare();
  const settings = useDataStore((s) => s.settings);
  const plans = useDataStore((s) => s.plans);
  const today = useDataStore((s) => s.today);
  const streak = useDataStore((s) => s.streak);
  const store = useDataStore((s) => s.store);

  const now = new Date();
  const dateLabel = `${now.getMonth() + 1}.${pad2(now.getDate())} ${WD[now.getDay()]}`;

  const done = completedCountOfDay(today);
  const goal = settings?.dailyGoalGroups ?? 3;
  const isDone = done >= goal && done > 0;

  const quote = useMemo(() => {
    const seed = now.getDate() + now.getMonth() * 31;
    return QUOTES[seed % QUOTES.length];
  }, []);

  const defaultPlan =
    plans.find((p) => p.id === settings?.defaultPlanId) ?? plans[0] ?? null;

  const s = streak;
  const week = useMemo(() => buildWeek(), []);

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: colors.paper }]}
      alwaysBounceVertical
    >
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={{ color: colors.text2, fontSize: fs.sm, fontWeight: "500" }}>{dateLabel}</Text>
          <Pressable
            onPress={() => openShare({ type: "review" })}
            hitSlop={12}
            style={({ pressed }) => [styles.shareBtn, { opacity: pressed ? 0.6 : 1 }]}
            accessibilityLabel="分享回顾"
          >
            <Image source={mode === "dark" ? SHARE_ICON.dark : SHARE_ICON.light} style={{ width: 22, height: 22 }} resizeMode="contain" />
          </Pressable>
        </View>
        <Text style={[styles.question, { color: colors.text }]}>
          {isDone ? "今天，提了。" : "今天，提了么？"}
        </Text>
        {settings?.dailyQuote && (
          <Text style={[styles.quote, { color: colors.text2 }]}>
            {isDone ? "今日目标已达成，想加练随时再来一组。" : quote}
          </Text>
        )}
      </View>

      {/* Progress big numerals */}
      <View style={[styles.progressRow, { borderBottomColor: colors.rule }]}>
        <View style={styles.numCol}>
          <Text style={[styles.big, { color: isDone ? colors.relax : colors.accent }]}>
            {done}
          </Text>
          <Text style={{ color: colors.text3, fontSize: fs.sm, marginTop: sp.s1 }}>已完成组</Text>
        </View>
        <Text style={[styles.slash, { color: colors.text3 }]}>/</Text>
        <View style={styles.numCol}>
          <Text style={[styles.big, { color: colors.text2 }]}>{goal}</Text>
          <Text style={{ color: colors.text3, fontSize: fs.sm, marginTop: sp.s1 }}>今日目标</Text>
        </View>
      </View>

      {/* Streak — 全宽双列对称卡片 */}
      {(s?.current ?? 0) > 0 && (
        <View style={[styles.streakCard, { backgroundColor: colors.paperSoft, borderColor: colors.rule }]}>
          <View style={styles.streakCol}>
            <Text style={{ color: colors.text3, fontSize: fs.xs }}>当前连续</Text>
            <Text style={{ color: colors.accent, fontSize: fs.xl, fontWeight: "700", marginTop: sp.s1 }}>
              {s?.current} 天
            </Text>
          </View>
          <View style={[styles.streakDivider, { backgroundColor: colors.rule }]} />
          <View style={styles.streakCol}>
            <Text style={{ color: colors.text3, fontSize: fs.xs }}>历史最长</Text>
            <Text style={{ color: colors.text, fontSize: fs.xl, fontWeight: "700", marginTop: sp.s1 }}>
              {s?.longest ?? s?.current} 天
            </Text>
          </View>
        </View>
      )}

      {/* Week heatmap */}
      <View style={styles.weekRow}>
        {week.map((d) => {
          const entry = store?.getDay(d.key) ?? null;
          const lvl = levelOfDay(entry);
          return (
            <View key={d.key} style={styles.weekCell}>
              <View
                style={[
                  styles.weekDot,
                  {
                    backgroundColor:
                      lvl === 0
                        ? "transparent"
                        : lvl === 1
                          ? colors.heat1
                          : lvl === 2
                            ? colors.heat2
                            : colors.heat3,
                    borderColor: d.isToday ? colors.accent : colors.ruleStrong,
                  },
                ]}
              />
              <Text
                style={{
                  color: d.isToday ? colors.accent : colors.text2,
                  fontSize: fs.xs,
                  fontWeight: d.isToday ? "700" : "500",
                  marginTop: sp.s1,
                }}
              >
                {d.label}
              </Text>
            </View>
          );
        })}
      </View>

      {/* CTA */}
      <Button
        colors={colors}
        variant={isDone ? "soft" : "solid"}
        onPress={() => defaultPlan && onStart(defaultPlan)}
        disabled={!defaultPlan}
        style={{ marginTop: sp.s6 }}
      >
        {isDone ? "再练一组" : "开始训练"}
      </Button>

      {/* 轻量方案提示，不再画大边框盒子，同时去掉底部无用常驻鸡汤卡 */}
      {defaultPlan && (
        <Pressable
          onPress={onSwitchPlan}
          hitSlop={10}
          style={({ pressed }) => [styles.planSubtle, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Text style={{ color: colors.text3, fontSize: fs.sm }}>
            {defaultPlan.name} · {formatPlanDuration(defaultPlan)} ·{" "}
            <Text style={{ color: colors.accent, fontWeight: "600" }}>切换 ›</Text>
          </Text>
        </Pressable>
      )}

      <View style={{ height: sp.s8 }} />
    </ScrollView>
  );
}

function buildWeek(): { key: string; label: string; isToday: boolean }[] {
  const wd = ["日", "一", "二", "三", "四", "五", "六"];
  const today = new Date();
  const todayStr = todayKey();
  const out: { key: string; label: string; isToday: boolean }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const key = ymd(d);
    out.push({ key, label: wd[d.getDay()], isToday: key === todayStr });
  }
  return out;
}

const styles = StyleSheet.create({
  container: { padding: sp.gutter, paddingTop: sp.s5 },
  header: { marginBottom: sp.s5 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  shareBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center", marginRight: -sp.s2 },
  titleRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: sp.s3, marginTop: sp.s2 },
  question: { fontSize: 34, fontWeight: "700", letterSpacing: 1 },
  metBadge: { paddingHorizontal: sp.s3, paddingVertical: sp.s1, borderRadius: rd.pill },
  quote: { fontSize: fs.base, marginTop: sp.s3, lineHeight: 24 },
  progressRow: {
    flexDirection: "row",
    alignItems: "baseline",
    paddingBottom: sp.s5,
    borderBottomWidth: 1,
  },
  numCol: { flex: 1 },
  slash: { fontSize: 40, fontWeight: "300", marginHorizontal: sp.s3 },
  big: { fontSize: 72, fontWeight: "700", lineHeight: 80 },
  streakCard: {
    marginTop: sp.s5,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: sp.s4,
    paddingHorizontal: sp.s5,
    borderRadius: rd.md,
    borderWidth: 1,
  },
  streakCol: { flex: 1 },
  streakDivider: { width: 1, height: 36, marginHorizontal: sp.s4 },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: sp.s6,
  },
  weekCell: { alignItems: "center", flex: 1 },
  weekDot: {
    width: 28,
    height: 28,
    borderRadius: rd.sm,
    borderWidth: 1.5,
  },
  planSubtle: {
    marginTop: sp.s3,
    alignItems: "center",
    paddingVertical: sp.s2,
  },
});
