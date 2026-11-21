// @tilemo/mobile — 记录 / History screen.
//
// 统计口径统一自 aggregateStats(store) 与 completedCountOfDay；
// 日历三态解耦：底部圆点标今天 + 描边标选中 + 底色深浅标训练量；未来日期降权不可点。

import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  aggregateStats,
  completedCountOfDay,
  formatClock,
  formatDuration,
  levelOfDay,
  pad2,
  todayKey,
  ymd,
} from "@tilemo/core";
import type { DayEntry } from "@tilemo/data";
import { useDataStore } from "../data";
import { useTheme } from "../theme";
import { fs, rd, sp } from "../ui/primitives";

const DOW = ["日", "一", "二", "三", "四", "五", "六"];

export function HistoryScreen({ onStart }: { onStart: (plan: import("@tilemo/data").Plan) => void }) {
  const { colors } = useTheme();
  const store = useDataStore((s) => s.store);
  const streak = useDataStore((s) => s.streak);
  const today = useDataStore((s) => s.today);
  const settings = useDataStore((s) => s.settings);
  const plans = useDataStore((s) => s.plans);
  const defaultPlan = plans.find((p) => p.id === settings?.defaultPlanId) ?? plans[0] ?? null;
  const dailyGoal = settings?.dailyGoalGroups ?? 3;

  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [selectedKey, setSelectedKey] = useState<string | null>(todayKey());

  const stats = useMemo(() => {
    if (!store) return { totalDays: 0, completedSessions: 0, totalSessions: 0 };
    return aggregateStats(store);
  }, [store, streak, today]);

  const todayStr = todayKey();

  const grid = useMemo(() => {
    const firstDay = new Date(cursor.y, cursor.m, 1).getDay();
    const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
    const cells: {
      key: string | null;
      day: number | null;
      lvl: number;
      doneCnt: number;
      totalCnt: number;
      isToday: boolean;
      isFuture: boolean;
    }[] = [];
    for (let i = 0; i < firstDay; i++) {
      cells.push({ key: null, day: null, lvl: 0, doneCnt: 0, totalCnt: 0, isToday: false, isFuture: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(cursor.y, cursor.m, d);
      const key = ymd(dateObj);
      const entry = store?.getDay(key) ?? null;
      const lvl = levelOfDay(entry);
      const doneCnt = completedCountOfDay(entry);
      const totalCnt = entry?.sessions?.length ?? 0;
      cells.push({
        key,
        day: d,
        lvl,
        doneCnt,
        totalCnt,
        isToday: key === todayStr,
        isFuture: key > todayStr,
      });
    }
    return cells;
  }, [cursor, store, today, todayStr]);

  const selectedEntry: DayEntry | null = selectedKey ? (store?.getDay(selectedKey) ?? null) : null;
  const selectedIsToday = selectedKey === todayStr;
  const selectedDone = completedCountOfDay(selectedEntry);
  const selectedGoal = selectedEntry?.goalGroups ?? (selectedIsToday ? dailyGoal : 0);

  const planName = (id: string) => plans.find((p) => p.id === id)?.name ?? "自定义";

  const shiftMonth = (delta: number) => {
    setCursor((c) => {
      let m = c.m + delta;
      let y = c.y;
      if (m < 0) {
        m = 11;
        y--;
      } else if (m > 11) {
        m = 0;
        y++;
      }
      return { y, m };
    });
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: colors.paper }]}
      alwaysBounceVertical
    >
      <Text style={[styles.title, { color: colors.text }]}>记录</Text>

      {/* Stats */}
      <View style={[styles.statsRow, { borderColor: colors.rule }]}>
        <Stat colors={colors} n={streak?.current ?? 0} label="连续天" />
        <Stat colors={colors} n={stats.totalDays} label="训练天" />
        <Stat colors={colors} n={stats.completedSessions} label="完成组数" />
      </View>

      {/* Month nav */}
      <View style={styles.monthBar}>
        <Pressable onPress={() => shiftMonth(-1)} hitSlop={12} style={styles.monthArrow}>
          <Text style={{ color: colors.text2, fontSize: fs.lg }}>‹</Text>
        </Pressable>
        <Text style={{ color: colors.text, fontSize: fs.md, fontWeight: "700" }}>
          {cursor.y} · {pad2(cursor.m + 1)}
        </Text>
        <Pressable onPress={() => shiftMonth(1)} hitSlop={12} style={styles.monthArrow}>
          <Text style={{ color: colors.text2, fontSize: fs.lg }}>›</Text>
        </Pressable>
      </View>

      {/* DOW row */}
      <View style={styles.dowRow}>
        {DOW.map((w) => (
          <Text key={w} style={[styles.dow, { color: colors.text2 }]}>
            {w}
          </Text>
        ))}
      </View>

      {/* Heat grid */}
      <View style={styles.grid}>
        {grid.map((cell, i) => {
          if (cell.key === null) return <View key={`e${i}`} style={styles.cell} />;
          const bg =
            cell.lvl === 0
              ? "transparent"
              : cell.lvl === 1
                ? colors.heat1
                : cell.lvl === 2
                  ? colors.heat2
                  : colors.heat3;
          const selected = cell.key === selectedKey;
          const onHeat3 = cell.lvl === 3;
          const numColor = onHeat3 ? colors.onAccentBtn : colors.text;
          const subColor = onHeat3 ? colors.onAccentBtn : colors.text2;
          return (
            <Pressable
              key={cell.key}
              disabled={cell.isFuture}
              onPress={() => setSelectedKey(cell.key)}
              style={[
                styles.cell,
                styles.cellBtn,
                {
                  backgroundColor: bg,
                  borderColor: selected ? colors.ink : colors.rule,
                  borderWidth: selected ? 2 : 1,
                  opacity: cell.isFuture ? 0.32 : 1,
                },
              ]}
            >
              <Text style={{ color: numColor, fontSize: 12, fontWeight: cell.isToday ? "800" : "600" }}>
                {cell.day}
              </Text>
              {cell.totalCnt > 0 ? (
                <Text style={{ color: subColor, fontSize: 9, fontWeight: "600", marginTop: 1 }}>
                  {cell.doneCnt > 0 ? `${cell.doneCnt}组` : "部分"}
                </Text>
              ) : cell.isToday ? (
                <View style={[styles.todayDot, { backgroundColor: onHeat3 ? colors.onAccentBtn : colors.accent }]} />
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {/* Day detail */}
      {selectedKey && (
        <View style={[styles.detail, { backgroundColor: colors.paperSoft, borderColor: colors.rule }]}>
          <View style={styles.detailHead}>
            <Text style={{ color: colors.text, fontSize: fs.md, fontWeight: "700" }}>
              {selectedKey.replace(/-/g, ".").slice(5)}
              {selectedIsToday ? " · 今天" : ""}
            </Text>
            {selectedGoal > 0 ? (
              <Text style={{ color: colors.text2, fontSize: fs.sm, fontWeight: "600" }}>
                已完成 {selectedDone} / {selectedGoal} 组
              </Text>
            ) : (
              <Text style={{ color: colors.text3, fontSize: fs.sm }}>未训练</Text>
            )}
          </View>
          {!selectedEntry || !selectedEntry.sessions.length ? (
            selectedIsToday && defaultPlan ? (
              <View style={styles.dayEmptyRow}>
                <Text style={{ color: colors.text2, fontSize: fs.sm, flex: 1 }}>
                  今天还没留下足迹。
                </Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.dayGoBtn,
                    { backgroundColor: colors.accentBtn, opacity: pressed ? 0.85 : 1 },
                  ]}
                  onPress={() => onStart(defaultPlan)}
                >
                  <Text style={{ color: colors.onAccentBtn, fontSize: fs.sm, fontWeight: "700" }}>
                    去训练 →
                  </Text>
                </Pressable>
              </View>
            ) : (
              <Text style={{ color: colors.text2, fontSize: fs.sm, marginTop: sp.s3 }}>
                这一天没有记录。安静的一天。
              </Text>
            )
          ) : (
            selectedEntry.sessions.map((ses, i) => {
              const clock = formatClock(ses.ts);
              return (
                <View
                  key={i}
                  style={[
                    styles.sessionItem,
                    {
                      borderColor: colors.rule,
                      borderBottomWidth: i === selectedEntry.sessions.length - 1 ? 0 : 1,
                    },
                  ]}
                >
                  <View>
                    <Text style={{ color: colors.text, fontSize: fs.base, fontWeight: "600" }}>
                      {planName(ses.planId)} · {ses.completedReps} 次
                    </Text>
                    <Text style={{ color: colors.text2, fontSize: fs.sm, marginTop: sp.s1 }}>
                      {formatDuration(ses.durationSec)}
                      {clock ? ` · ${clock}` : ""}
                    </Text>
                  </View>
                  <Text
                    style={{
                      color: ses.finished ? colors.relax : colors.text3,
                      fontSize: fs.sm,
                      fontWeight: "700",
                    }}
                  >
                    {ses.finished ? "完成" : "部分"}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      )}
      <View style={{ height: sp.s8 }} />
    </ScrollView>
  );
}

function Stat({ colors, n, label }: { colors: import("@tilemo/design-tokens").ColorSet; n: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={{ color: colors.accent, fontSize: fs.xl, fontWeight: "700" }}>{n}</Text>
      <Text style={{ color: colors.text2, fontSize: fs.sm, marginTop: sp.s1 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: sp.gutter, paddingTop: sp.s5 },
  title: { fontSize: 28, fontWeight: "700", marginBottom: sp.s4 },
  statsRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    paddingBottom: sp.s4,
    marginBottom: sp.s5,
  },
  stat: { flex: 1, alignItems: "center" },
  monthBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: sp.s3,
  },
  monthArrow: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  dowRow: { flexDirection: "row" },
  dow: { flex: 1, textAlign: "center", fontSize: fs.xs, fontWeight: "600", marginBottom: sp.s2 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, padding: sp.s1 },
  cellBtn: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: rd.sm,
  },
  todayDot: {
    width: 5,
    height: 5,
    borderRadius: 99,
    marginTop: 2,
  },
  detail: {
    marginTop: sp.s5,
    borderRadius: rd.md,
    borderWidth: 1,
    padding: sp.s4,
  },
  detailHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sessionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: sp.s3,
    marginTop: sp.s2,
  },
  dayEmptyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: sp.s3,
    gap: sp.s3,
  },
  dayGoBtn: {
    paddingVertical: sp.s2,
    paddingHorizontal: sp.s4,
    borderRadius: rd.pill,
  },
});
