// @tilemo/mobile — Metronome full-screen overlay.
//
// Driven by the SHARED @tilemo/core Metro engine (the whole point of the shared
// engine — web uses the imperative port, mobile uses this observable one).
// We subscribe to snapshots and render prep / breath / done stages with RN +
// reanimated. Haptics fire on phase change, gated by settings.haptics.
//
// Audio: intentionally skipped (RN has no Web Audio; a bundled sine via expo-av
// would add weight for little value — haptics + visual are the priority per the
// spec). See report.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View, Vibration } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
  useReducedMotion,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { type Plan } from "@tilemo/data";
import { Metro, type MetroSnapshot, recordSession } from "@tilemo/core";
import { useDataStore } from "./data";
import { useTheme } from "./theme";
import { fs, sp } from "./ui/primitives";

const BREATH_CONTRACT = 0.82; // shape scale on contract (matches web --breath-tense)
const BREATH_RELAX = 1.05; // shape scale on relax

export function Metronome({
  plan,
  onClose,
}: {
  plan: Plan;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const store = useDataStore((s) => s.store);
  const refresh = useDataStore((s) => s.refresh);
  const hapticsOn = useDataStore((s) => s.settings?.haptics) ?? true;

  const [snap, setSnap] = useState<MetroSnapshot | null>(null);
  const scale = useSharedValue(1);
  const reduceMotion = useReducedMotion();
  const lastPhase = useRef<string>("");
  const closedRef = useRef(false);

  // Ref indirection so the Metro hooks (constructed once via useMemo) can always
  // reach the latest close handler without re-creating the engine.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const handleClose = useCallback(() => {
    if (closedRef.current) return;
    closedRef.current = true;
    onCloseRef.current();
  }, []);

  const metro = useMemo(() => {
    return new Metro({
      onRecord: (p, reps, dur, finished) => {
        if (store) {
          recordSession(store, p, reps, dur, finished);
          refresh();
        }
      },
      // Engine auto-closes ~1.8s after the done stage; unmount the overlay then.
      // Also fires on endEarly→close. (User taps still go through handleClose.)
      onAfterClose: () => {
        handleClose();
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, refresh, handleClose]);

  // Subscribe + open on mount; dispose on unmount.
  useEffect(() => {
    const unsub = metro.subscribe((s) => setSnap(s));
    metro.open(plan);
    return () => {
      unsub();
      metro.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.id]);

  // Drive breath shape + haptics from snapshot.
  useEffect(() => {
    if (!snap) return;
    if (snap.stage !== "breath") {
      // reset to neutral between stages
      scale.value = reduceMotion ? 1 : withTiming(1, { duration: 200 });
      return;
    }
    const target = snap.phase === "contract" ? BREATH_CONTRACT : BREATH_RELAX;
    const phaseSec = snap.phase === "contract" ? plan.contract : plan.relax;
    if (reduceMotion) {
      scale.value = target;
    } else {
      scale.value = withTiming(target, {
        duration: Math.max(400, phaseSec * 1000),
        easing: Easing.inOut(Easing.ease),
      });
    }

    // Haptic on phase change.
    const key = snap.phase;
    if (hapticsOn && key !== lastPhase.current) {
      lastPhase.current = key;
      if (snap.phase === "contract") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
    }
  }, [snap, scale, plan.contract, plan.relax, hapticsOn, reduceMotion]);

  // Animated style MUST be created unconditionally (rules of hooks) — even before
  // the first snapshot arrives. It reads the shared value, so it's a no-op until
  // a phase effect drives it.
  const breathStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (!snap) {
    return <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.paper }]} />;
  }

  const stage = snap.stage;

  return (
    <View style={[styles.overlay, { backgroundColor: colors.paper }]}>
      {/* Top-right close (only meaningful once not running-prep) */}
      <View style={styles.topBar}>
        <Pressable
          hitSlop={12}
          onPress={() => {
            metro.endEarly();
            handleClose();
          }}
          style={[styles.closeBtn, { borderColor: colors.ruleStrong }]}
        >
          <Text style={{ color: colors.text3, fontSize: fs.lg, fontWeight: "500" }}>×</Text>
        </Pressable>
      </View>

      {stage === "prep" && (
        <View style={styles.center}>
          <Text style={[styles.eyebrow, { color: colors.text3 }]}>准备</Text>
          <Text
            style={{
              color: colors.accent,
              fontSize: 96,
              fontWeight: "700",
              marginTop: sp.s4,
            }}
          >
            {snap.prepN}
          </Text>
          <Text style={[styles.hint, { color: colors.text2, marginTop: sp.s5 }]}>
            找个舒服的姿势，跟着节拍
          </Text>
        </View>
      )}

      {stage === "breath" && (
        <View style={styles.center}>
          <View style={styles.breathWrap}>
            <Animated.View
              style={[
                styles.breathBlob,
                {
                  backgroundColor:
                    snap.phase === "contract" ? colors.accent : colors.accentSoft,
                },
                breathStyle,
              ]}
            />
          </View>
          <Text
            style={{
              color: colors.text,
              fontSize: fs.x2l,
              fontWeight: "700",
              letterSpacing: 4,
              marginTop: sp.s6,
            }}
          >
            {snap.phase === "contract" ? "收 · 紧" : "放 · 松"}
          </Text>
          <Text style={{ color: colors.accent, fontSize: 56, fontWeight: "700", marginTop: sp.s3 }}>
            {snap.remaining}
          </Text>
          <Text style={[styles.hint, { color: colors.text2, marginTop: sp.s4 }]}>
            {snap.setIdx + 1} / {snap.sets} 组 · {snap.startedReps} / {snap.totalReps} 次
          </Text>
        </View>
      )}

      {stage === "done" && (
        <View style={styles.center}>
          <Text style={{ color: colors.success, fontSize: fs.x2l, fontWeight: "700" }}>完成</Text>
          <Text style={[styles.hint, { color: colors.text2, marginTop: sp.s4 }]}>
            {snap.doneSub}
          </Text>
        </View>
      )}

      {/* Controls */}
      <View style={[styles.controls, { borderTopColor: colors.rule }]}>
        {stage === "breath" && (
          <>
            <Pressable
              style={[styles.ctrlBtn, { borderColor: colors.ruleStrong }]}
              onPress={() => metro.togglePause()}
            >
              <Text style={{ color: colors.text, fontSize: fs.base, fontWeight: "600" }}>
                {snap.state === "paused" ? "继续" : "暂停"}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.ctrlBtn, { borderColor: colors.ruleStrong }]}
              onPress={() => {
                metro.endEarly();
                handleClose();
              }}
            >
              <Text style={{ color: colors.text3, fontSize: fs.base, fontWeight: "600" }}>结束</Text>
            </Pressable>
          </>
        )}
        {stage === "prep" && (
          <Pressable
            style={[styles.ctrlBtn, { borderColor: colors.ruleStrong }]}
            onPress={() => {
              metro.endEarly();
              handleClose();
            }}
          >
            <Text style={{ color: colors.text3, fontSize: fs.base, fontWeight: "600" }}>取消</Text>
          </Pressable>
        )}
        {stage === "done" && (
          <Pressable style={[styles.ctrlBtn, { backgroundColor: colors.accent }]} onPress={handleClose}>
            <Text style={{ color: "#FFFFFF", fontSize: fs.base, fontWeight: "600" }}>好的</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
    justifyContent: "space-between",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: sp.gutter,
    paddingTop: sp.s8,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: sp.gutter },
  eyebrow: {
    fontSize: fs.sm,
    fontWeight: "600",
    letterSpacing: 6,
    textTransform: "uppercase",
  },
  hint: { fontSize: fs.base },
  breathWrap: { width: 240, height: 240, alignItems: "center", justifyContent: "center" },
  breathBlob: {
    width: 200,
    height: 200,
    borderRadius: 120,
  },
  controls: {
    flexDirection: "row",
    justifyContent: "center",
    gap: sp.s3,
    paddingHorizontal: sp.gutter,
    paddingBottom: sp.s8,
    paddingTop: sp.s4,
    borderTopWidth: 1,
  },
  ctrlBtn: {
    paddingVertical: sp.s3,
    paddingHorizontal: sp.s6,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 120,
  },
});

// Vibration kept imported for parity/possible fallback if Haptics unavailable;
// expo-haptics is the primary path on device. (Tree-shaken if unused.)
void Vibration;
