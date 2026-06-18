// @tilemo/mobile — 记录 / History screen.
//
// Stat row + month calendar heatmap (colored by heatLevel via design-tokens
// heat1/2/3) + tap-to-detail. Pure local-component state for the month cursor
// and selected day.

import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { levelOfDay, pad2, todayKey, ymd } from "@tilemo/core";
import type { DayEntry } from "@tilemo/data";
import { useDataStore } from "../data";
import { useTheme } from "../theme";
import { fs, rd, sp } from "../ui/primitives";

const DOW = ["日", "一", "二", "三", "四", "五", "六"];

export function HistoryScreen() {
  const { colors } = useTheme();
  const store = useDataStore((s) => s.store);
  const streak = useDataStore((s) => s.streak);
  const plans = useDataStore((s) => s.plans);

  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const stats = useMemo(() => {
    if (!store) return { days: 0, sessions: 0 };
    let days = 0;
    let sessions = 0;
    for (const k of store.allLogKeys()) {
      const day = store.getDay(k.substring("tgm:log:".length));
      if (day && day.sessions && day.sessions.length) {
        days++;
        sessions += day.sessions.length;
      }
    }
    return { days, sessions };
  }, [store, streak]);

  const grid = useMemo(() => {
    const firstDay = new Date(cursor.y, cursor.m, 1).getDay();
    const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
    const todayStr = todayKey();
    const cells: {
      key: string | null;
      day: number | null;
      lvl: number;
      cnt: number;
      isToday: boolean;
    }[] = [];
    for (let i = 0; i < firstDay; i++) cells.push({ key: null, day: null, lvl: 0, cnt: 0, isToday: false });
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(cursor.y, cursor.m, d);
      const key = ymd(dateObj);
      const entry = store?.getDay(key) ?? null;
      const lvl = levelOfDay(entry);
      const cnt = entry?.sessions?.length ?? 0;
      cells.push({ key, day: d, lvl, cnt, isToday: key === todayStr });
    }
    return cells;
  }, [cursor, store]);

  const selectedEntry: DayEntry | null = selectedKey ? (store?.getDay(selectedKey) ?? null) : null;

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
        <Stat colors={colors} n={stats.days} label="训练天" />
        <Stat colors={colors} n={stats.sessions} label="总组数" />
      </View>

      {/* Month nav */}
      <View style={styles.monthBar}>
        <Pressable onPress={() => shiftMonth(-1)} hitSlop={10}>
          <Text style={{ color: colors.text2, fontSize: fs.lg }}>‹</Text>
        </Pressable>
        <Text style={{ color: colors.text, fontSize: fs.md, fontWeight: "700" }}>
          {cursor.y} · {pad2(cursor.m + 1)}
        </Text>
        <Pressable onPress={() => shiftMonth(1)} hitSlop={10}>
          <Text style={{ color: colors.text2, fontSize: fs.lg }}>›</Text>
        </Pressable>
      </View>

      {/* DOW row */}
      <View style={styles.dowRow}>
        {DOW.map((w) => (
          <Text key={w} style={[styles.dow, { color: colors.text3 }]}>
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
          return (
            <Pressable
              key={cell.key}
              onPress={() => setSelectedKey(cell.key)}
              style={[
                styles.cell,
                styles.cellBtn,
                {
                  backgroundColor: bg,
                  borderColor: cell.isToday ? colors.accent : selected ? colors.ruleStrong : colors.rule,
                  borderWidth: cell.isToday || selected ? 1.5 : 1,
                },
              ]}
            >
              <Text style={{ color: colors.text, fontSize: 12, fontWeight: "600" }}>{cell.day}</Text>
              {cell.cnt > 0 && (
                <Text style={{ color: colors.text2, fontSize: 9, marginTop: 1 }}>{cell.cnt}组</Text>
              )}
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
            </Text>
            <Text style={{ color: colors.text3, fontSize: fs.sm }}>
              {selectedEntry?.sessions.length ?? 0} / {selectedEntry?.goalGroups ?? 0} 组
            </Text>
          </View>
          {!selectedEntry || !selectedEntry.sessions.length ? (
            <Text style={{ color: colors.text3, fontSize: fs.sm, marginTop: sp.s3 }}>
              这一天没有记录。安静的一天。
            </Text>
          ) : (
            selectedEntry.sessions.map((ses, i) => {
              const mins = Math.round((ses.durationSec / 60) * 10) / 10;
              return (
                <View key={i} style={[styles.sessionItem, { borderColor: colors.rule }]}>
                  <View>
                    <Text style={{ color: colors.text, fontSize: fs.base, fontWeight: "600" }}>
                      {planName(ses.planId)} · {ses.completedReps} 次
                    </Text>
                    <Text style={{ color: colors.text3, fontSize: fs.sm, marginTop: 2 }}>
                      {mins} 分钟
                    </Text>
                  </View>
                  <Text
                    style={{
                      color: ses.finished ? colors.success : colors.text3,
                      fontSize: fs.sm,
                      fontWeight: "600",
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
      <Text style={{ color: colors.text3, fontSize: fs.sm, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: sp.gutter, paddingTop: sp.s6 },
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
  dowRow: { flexDirection: "row" },
  dow: { flex: 1, textAlign: "center", fontSize: fs.xs, marginBottom: sp.s2 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 2 },
  cellBtn: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: rd.sm,
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
    borderBottomWidth: 1,
    marginTop: sp.s2,
  },
});
