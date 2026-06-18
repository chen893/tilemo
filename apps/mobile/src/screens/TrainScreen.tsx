// @tilemo/mobile — 训练 / Train screen.

import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { pad2 } from "@tilemo/core";
import type { Plan } from "@tilemo/data";
import { useDataStore } from "../data";
import { useTheme } from "../theme";
import { fs, rd, sp } from "../ui/primitives";

export function TrainScreen({ onStart }: { onStart: (plan: Plan) => void }) {
  const { colors } = useTheme();
  const plans = useDataStore((s) => s.plans);
  const defaultPlanId = useDataStore((s) => s.settings?.defaultPlanId);

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: colors.paper }]}
      alwaysBounceVertical
    >
      <Text style={[styles.title, { color: colors.text }]}>训练</Text>
      <Text style={[styles.sub, { color: colors.text2 }]}>
        选一个方案，开始这一组。
      </Text>

      {plans.map((p, idx) => {
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
              },
            ]}
          >
            <View style={styles.cardTop}>
              <Text style={[styles.name, { color: colors.text }]}>{p.name}</Text>
              <Text style={{ color: colors.text3, fontSize: fs.sm }}>
                {pad2(idx + 1)} / {pad2(plans.length)}
              </Text>
            </View>
            {isDefault && (
              <Text
                style={[
                  styles.defaultTag,
                  { color: colors.accent, borderColor: colors.accent },
                ]}
              >
                默认方案
              </Text>
            )}
            <Text style={[styles.desc, { color: colors.text2 }]}>{p.desc}</Text>
            <View style={styles.chips}>
              <Chip colors={colors} label="收紧" value={`${p.contract}s`} />
              <Chip colors={colors} label="放松" value={`${p.relax}s`} />
              <Chip colors={colors} label="次" value={`${p.reps}`} />
              <Chip colors={colors} label="组" value={`${p.sets}`} />
            </View>
          </Pressable>
        );
      })}
      <View style={{ height: sp.s8 }} />
    </ScrollView>
  );
}

function Chip({
  colors,
  label,
  value,
}: {
  colors: import("@tilemo/design-tokens").ColorSet;
  label: string;
  value: string;
}) {
  return (
    <View
      style={{
        paddingHorizontal: sp.s3,
        paddingVertical: sp.s2,
        borderRadius: 999,
        backgroundColor: colors.paperDeep,
        flexDirection: "row",
        alignItems: "baseline",
        gap: 4,
      }}
    >
      <Text style={{ color: colors.text3, fontSize: fs.xs }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: fs.sm, fontWeight: "600" }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: sp.gutter, paddingTop: sp.s6 },
  title: { fontSize: 28, fontWeight: "700" },
  sub: { fontSize: fs.base, marginTop: sp.s2, marginBottom: sp.s4 },
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
  },
  name: { fontSize: fs.lg, fontWeight: "700" },
  defaultTag: {
    alignSelf: "flex-start",
    marginTop: sp.s2,
    fontSize: fs.xs,
    borderWidth: 1,
    paddingHorizontal: sp.s2,
    paddingVertical: 2,
    borderRadius: 999,
    fontWeight: "600",
  },
  desc: { fontSize: fs.base, marginTop: sp.s3, lineHeight: 22 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: sp.s2, marginTop: sp.s4 },
});
