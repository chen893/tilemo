// @tilemo/mobile — 今日 / Home screen.

import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { levelOfDay, pad2, todayKey, ymd, QUOTES } from "@tilemo/core";
import { useDataStore } from "../data";
import { useOpenShare } from "../share/ShareContext";
import { useTheme } from "../theme";
import { Button, Card, fs, rd, sp, Txt } from "../ui/primitives";
import type { Plan } from "@tilemo/data";

const WD = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

export function HomeScreen({ onStart }: { onStart: (plan: Plan) => void }) {
  const { colors } = useTheme();
  const openShare = useOpenShare();
  const settings = useDataStore((s) => s.settings);
  const plans = useDataStore((s) => s.plans);
  const today = useDataStore((s) => s.today);
  const streak = useDataStore((s) => s.streak);
  const store = useDataStore((s) => s.store);

  const now = new Date();
  const dateLabel = `${now.getMonth() + 1}.${pad2(now.getDate())} ${WD[now.getDay()]}`;

  const done = today?.sessions?.length ?? 0;
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
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: colors.text3, fontSize: fs.sm }}>{dateLabel}</Text>
          <Pressable onPress={() => openShare({ type: "review" })} hitSlop={10}>
            <Ionicons name="share-outline" size={22} color={colors.text2} />
          </Pressable>
        </View>
        <Text style={[styles.question, { color: colors.text, opacity: isDone ? 0.5 : 1 }]}>
          今天，提了么？
        </Text>
        {settings?.dailyQuote && (
          <Text style={[styles.quote, { color: colors.text2 }]}>{quote}</Text>
        )}
      </View>

      {/* Progress big numerals */}
      <View style={[styles.progressRow, { borderBottomColor: colors.rule }]}>
        <View style={styles.numCol}>
          <Text style={[styles.big, { color: isDone ? colors.success : colors.accent }]}>
            {done}
          </Text>
          <Text style={{ color: colors.text3, fontSize: fs.sm, marginTop: sp.s1 }}>已完成组</Text>
        </View>
        <Text style={[styles.slash, { color: colors.text3 }]}>/</Text>
        <View style={styles.numCol}>
          <Text style={[styles.big, { color: colors.text2 }]}>{goal}</Text>
          <Text style={{ color: colors.text3, fontSize: fs.sm, marginTop: sp.s1 }}>目标</Text>
        </View>
      </View>

      {/* Streak */}
      {(s?.current ?? 0) > 0 && (
        <View style={[styles.streak, { backgroundColor: colors.paperSoft }]}>
          <Text style={{ color: colors.accent, fontSize: fs.xl, fontWeight: "700" }}>
            连续 {s?.current} 天
          </Text>
          {(s?.longest ?? 0) > 0 && (
            <Text style={{ color: colors.text3, fontSize: fs.sm, marginTop: sp.s1 }}>
              最长 {s?.longest} 天
            </Text>
          )}
        </View>
      )}

      {/* Week heatmap */}
      <View style={[styles.weekRow]}>
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
                    borderColor: d.isToday ? colors.accent : colors.rule,
                  },
                ]}
              />
              <Text style={{ color: colors.text3, fontSize: 10, marginTop: sp.s1 }}>{d.label}</Text>
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
        style={{ marginTop: sp.s5 }}
      >
        {isDone ? "今天，提了。再来一组" : "开始一组训练"}
      </Button>

      <Card colors={colors} style={{ marginTop: sp.s5 }}>
        <Txt colors={colors} color="text2" size={fs.sm}>
          一组只要一分钟，做了就记得住。
        </Txt>
      </Card>

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
  container: { padding: sp.gutter, paddingTop: sp.s6 },
  header: { marginBottom: sp.s5 },
  question: { fontSize: 34, fontWeight: "700", marginTop: sp.s2, letterSpacing: 1 },
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
  streak: {
    marginTop: sp.s5,
    paddingHorizontal: sp.s5,
    paddingVertical: sp.s4,
    borderRadius: rd.md,
    alignSelf: "flex-start",
  },
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
});
