// @tilemo/mobile — 训练 / Train screen.

import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { aggregateStats, formatPlanDuration } from "@tilemo/core";
import type { Plan } from "@tilemo/data";
import { useDataStore } from "../data";
import { useTheme } from "../theme";
import { fs, rd, sp } from "../ui/primitives";

export function TrainScreen({ onStart }: { onStart: (plan: Plan) => void }) {
  const { colors } = useTheme();
  const store = useDataStore((s) => s.store);
  const plans = useDataStore((s) => s.plans);
  const defaultPlanId = useDataStore((s) => s.settings?.defaultPlanId);
  const isNewbie = useMemo(() => (store ? aggregateStats(store).totalSessions === 0 : false), [store]);
  const [showGuide, setShowGuide] = useState(false);

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: colors.paper }]}
      alwaysBounceVertical
    >
      <Text style={[styles.title, { color: colors.text }]}>训练</Text>

      {plans.map((p) => {
        const isDefault = p.id === defaultPlanId;
        return (
          <Pressable
            key={p.id}
            onPress={() => onStart(p)}
            style={({ pressed }) => [
              styles.card,
              {
                backgroundColor: colors.paperSoft,
                borderColor: isDefault ? colors.accent : colors.rule,
                opacity: pressed ? 0.92 : 1,
                transform: [{ scale: pressed ? 0.985 : 1 }],
              },
            ]}
          >
            <View style={styles.cardTop}>
              <View style={styles.nameRow}>
                <Text style={[styles.name, { color: colors.text }]}>{p.name}</Text>
                {isDefault && (
                  <View style={[styles.defaultTag, { borderColor: colors.accent }]}>
                    <Text style={{ color: colors.accent, fontSize: fs.xs, fontWeight: "600" }}>
                      默认
                    </Text>
                  </View>
                )}
              </View>
              <Text style={{ color: colors.text2, fontSize: fs.sm, fontWeight: "600" }}>
                {formatPlanDuration(p)} ›
              </Text>
            </View>

            <Text style={[styles.desc, { color: colors.text2 }]}>{p.desc}</Text>

            <View style={[styles.metricsRow, { backgroundColor: colors.paperDeep }]}>
              <Metric colors={colors} label="收紧" value={`${p.contract}秒`} />
              <Metric colors={colors} label="放松" value={`${p.relax}秒`} />
              <Metric colors={colors} label="次数" value={`${p.reps} 次`} />
              <Metric colors={colors} label="组数" value={`${p.sets} 组`} />
            </View>
          </Pressable>
        );
      })}

      {/* 动作要领收至底部低干扰文字链，不打扰高频开练 */}
      <Pressable
        onPress={() => setShowGuide((v) => !v)}
        style={({ pressed }) => [styles.guideLink, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Text style={{ color: colors.text3, fontSize: fs.sm }}>
          {showGuide || isNewbie ? "收起动作要领" : "第一次练？查看动作要领"}
        </Text>
      </Pressable>

      {(showGuide || isNewbie) && (
        <View style={[styles.guideBox, { backgroundColor: colors.paperSoft, borderColor: colors.rule }]}>
          <Text style={{ color: colors.text2, fontSize: fs.sm, lineHeight: 22 }}>
            呼气时轻轻向上收紧，保持腹部与臀部自然放松；吸气时完全放松，不必屏气，跟着节拍走即可。
          </Text>
        </View>
      )}
      <View style={{ height: sp.s8 }} />
    </ScrollView>
  );
}

function Metric({
  colors,
  label,
  value,
}: {
  colors: import("@tilemo/design-tokens").ColorSet;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.metricCell}>
      <Text style={{ color: colors.text2, fontSize: fs.xs }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: fs.sm, fontWeight: "700", marginTop: 2 }}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: sp.gutter, paddingTop: sp.s5 },
  title: { fontSize: 28, fontWeight: "700", marginBottom: sp.s4 },
  guideLink: { alignItems: "center", paddingVertical: sp.s3 },
  guideBox: {
    borderRadius: rd.md,
    borderWidth: 1,
    padding: sp.s4,
    marginBottom: sp.s4,
  },
  card: {
    borderRadius: rd.md,
    borderWidth: 1,
    padding: sp.s5,
    marginBottom: sp.s4,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: sp.s2,
  },
  nameRow: { flexDirection: "row", alignItems: "center", gap: sp.s2, flexWrap: "wrap", flex: 1 },
  name: { fontSize: fs.lg, fontWeight: "700" },
  defaultTag: {
    borderWidth: 1,
    paddingHorizontal: sp.s2,
    paddingVertical: 2,
    borderRadius: rd.pill,
  },
  desc: { fontSize: fs.sm, marginTop: sp.s2, lineHeight: 20 },
  metricsRow: {
    flexDirection: "row",
    borderRadius: rd.sm,
    paddingVertical: sp.s3,
    paddingHorizontal: sp.s2,
    marginTop: sp.s4,
  },
  metricCell: { flex: 1, alignItems: "center" },
  cardFoot: {
    marginTop: sp.s3,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
});
