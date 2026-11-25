// @tilemo/mobile — Metronome full-screen overlay.
//
// Driven by the SHARED @tilemo/core Metro engine.
// 双通道视觉编码：收紧（暖陶土红向心收缩） vs 放松（鼠尾草绿向外舒展）；
// 暂停态中央明确标注「已暂停」，完成页停留至用户主动操作。

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Audio } from "expo-av";
import { type Plan } from "@tilemo/data";
import {
  Metro,
  type MetroSnapshot,
  completedCountOfDay,
  formatPlanDuration,
  getPandaCopy,
  recordSession,
} from "@tilemo/core";
import { detectStreakMilestone, type MilestoneCopy } from "@tilemo/share-card";
import { useDataStore } from "./data";
import { useOpenShare } from "./share/ShareContext";
import { useTheme } from "./theme";
import { fs, rd, sp } from "./ui/primitives";
import { PandaStage } from "./PandaStage";

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
  const today = useDataStore((s) => s.today);
  const goal = useDataStore((s) => s.settings?.dailyGoalGroups) ?? 3;
  const hapticsOn = useDataStore((s) => s.settings?.haptics) ?? true;
  const soundOn = useDataStore((s) => s.settings?.sound) ?? true;
  const openShare = useOpenShare();
  const streakMilestoneRef = useRef<MilestoneCopy | null>(null);

  const [snap, setSnap] = useState<MetroSnapshot | null>(null);
  const lastPhase = useRef<string>("");
  const soundHi = useRef<Audio.Sound | null>(null);
  const soundLo = useRef<Audio.Sound | null>(null);
  const pendingBeep = useRef<"contract" | "relax" | null>(null);
  const closedRef = useRef(false);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const handleClose = useCallback(() => {
    if (closedRef.current) return;
    closedRef.current = true;
    onCloseRef.current();
  }, []);

  const openShareRef = useRef(openShare);
  openShareRef.current = openShare;

  const metro = useMemo(() => {
    return new Metro({
      onRecord: (p, reps, dur, finished) => {
        if (store) {
          const prev = store.getStreak().current;
          recordSession(store, p, reps, dur, finished);
          refresh();
          if (finished) {
            const m = detectStreakMilestone(prev, store.getStreak().current);
            if (m) streakMilestoneRef.current = m;
          }
        }
      },
      onAfterClose: (completion) => {
        handleClose();
        if (completion && streakMilestoneRef.current) {
          const m = streakMilestoneRef.current;
          streakMilestoneRef.current = null;
          setTimeout(() => openShareRef.current({ type: "milestone", milestone: m }), 280);
        }
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, refresh, handleClose]);

  useEffect(() => {
    const unsub = metro.subscribe((s) => setSnap(s));
    metro.open(plan);
    return () => {
      unsub();
      metro.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.id]);

  useEffect(() => {
    let mounted = true;
    Audio.setAudioModeAsync({ playsInSilentModeIOS: true }).catch(() => {});
    (async () => {
      try {
        const [hi, lo] = await Promise.all([
          Audio.Sound.createAsync(require("../assets/audio/beep_high.wav")),
          Audio.Sound.createAsync(require("../assets/audio/beep_low.wav")),
        ]);
        if (!mounted) {
          await Promise.all([hi.sound.unloadAsync(), lo.sound.unloadAsync()]);
          return;
        }
        soundHi.current = hi.sound;
        soundLo.current = lo.sound;
        if (pendingBeep.current) {
          const s = pendingBeep.current === "contract" ? hi.sound : lo.sound;
          pendingBeep.current = null;
          s.replayAsync().catch(() => {});
        }
      } catch {
        /* audio unavailable */
      }
    })();
    return () => {
      mounted = false;
      soundHi.current?.unloadAsync().catch(() => {});
      soundLo.current?.unloadAsync().catch(() => {});
      soundHi.current = null;
      soundLo.current = null;
    };
  }, []);

  const snapStage = snap?.stage ?? null;
  const snapState = snap?.state ?? null;
  const snapPhase = snap?.phase ?? null;

  useEffect(() => {
    if (!snapStage) return;
    if (snapStage !== "breath") {
      lastPhase.current = "";
      return;
    }
    if (snapState !== "running" || !snapPhase) return;

    const isNewPhase = snapPhase !== lastPhase.current;
    if (isNewPhase) {
      lastPhase.current = snapPhase;
      if (hapticsOn) {
        Haptics.impactAsync(
          snapPhase === "contract"
            ? Haptics.ImpactFeedbackStyle.Medium
            : Haptics.ImpactFeedbackStyle.Light,
        ).catch(() => {});
      }
      if (soundOn) {
        const s = snapPhase === "contract" ? soundHi.current : soundLo.current;
        if (s) s.replayAsync().catch(() => {});
        else pendingBeep.current = snapPhase;
      }
    }
  }, [snapStage, snapState, snapPhase, hapticsOn, soundOn]);

  if (!snap) {
    return <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.paper }]} />;
  }

  const stage = snap.stage;
  const isPaused = snap.state === "paused";
  const isContract = snap.phase === "contract";
  const phaseColor = isContract ? colors.accent : colors.relax;
  const todayCompleted = completedCountOfDay(today);
  const copy = getPandaCopy(snap, plan.contract);

  return (
    <View style={[styles.overlay, { backgroundColor: colors.paper }]}>
      <View style={styles.topBar}>
        <Text style={{ color: colors.text2, fontSize: fs.sm, fontWeight: "600" }}>
          {plan.name} · {formatPlanDuration(plan)}
        </Text>
      </View>

      <View style={styles.center}>
        {/* 小熊猫舞台全程保持挂载，确保 prep / breath / done 之间无缝阻尼过渡 */}
        <PandaStage
          snap={snap}
          contractSec={plan.contract}
          relaxSec={plan.relax}
          size={stage === "done" ? 196 : 244}
        />

        {stage === "prep" && (
          <>
            <View style={[styles.pausedBadge, { backgroundColor: colors.paperSoft, borderColor: colors.ruleStrong, marginTop: sp.s2 }]}>
              <Text style={{ color: colors.text, fontSize: fs.sm, fontWeight: "700" }}>{copy.pillText}</Text>
            </View>
            <Text style={{ color: colors.accent, fontSize: 64, fontWeight: "700", marginTop: sp.s2 }}>
              {snap.prepN}
            </Text>
            <Text style={[styles.hint, { color: colors.text2, marginTop: sp.s2 }]}>
              {copy.cueText}
            </Text>
          </>
        )}

        {stage === "breath" && (
          <>
            <View style={[styles.secRow, { marginTop: sp.s3, alignItems: "center", gap: 14 }]}>
              <View
                style={[
                  styles.pausedBadge,
                  {
                    marginBottom: 0,
                    backgroundColor: isPaused ? colors.paperSoft : isContract ? colors.accentBtn : colors.relax,
                    borderColor: isPaused ? colors.ruleStrong : "transparent",
                  },
                ]}
              >
                <Text
                  style={{
                    color: isPaused ? colors.text : colors.onAccentBtn,
                    fontSize: fs.sm,
                    fontWeight: "800",
                    letterSpacing: 1,
                  }}
                >
                  {copy.pillText}
                </Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "baseline" }}>
                <Text style={{ color: isPaused ? colors.text2 : phaseColor, fontSize: 52, fontWeight: "800" }}>
                  {isPaused ? "—" : snap.remaining}
                </Text>
                {!isPaused && (
                  <Text style={{ color: colors.text3, fontSize: fs.md, fontWeight: "600", marginLeft: sp.s1 }}>
                    秒
                  </Text>
                )}
              </View>
            </View>

            <Text style={[styles.hint, { color: colors.text2, marginTop: sp.s3 }]}>
              {copy.cueText}
            </Text>

            <Text style={{ color: colors.text3, fontSize: fs.sm, marginTop: sp.s2 }}>
              {snap.sets > 1
                ? `第 ${snap.setIdx + 1}/${snap.sets} 组 · ${snap.startedReps}/${snap.totalReps} 次`
                : `${snap.startedReps} / ${snap.totalReps} 次`}
            </Text>
          </>
        )}

        {stage === "done" && (
          <>
            <Text style={{ color: colors.text, fontSize: fs.x2l, fontWeight: "700", marginTop: sp.s2 }}>
              今天，提了。
            </Text>
            <Text style={[styles.hint, { color: colors.text2, marginTop: sp.s2 }]}>
              {snap.doneSub}
            </Text>
            <Text style={{ color: colors.text3, fontSize: fs.sm, marginTop: sp.s3 }}>
              今日 {todayCompleted} / {goal} 组
            </Text>
          </>
        )}
      </View>

      {/* Controls — 区分主次权重，防止误触 */}
      <View style={[styles.controls, { borderTopColor: colors.rule }]}>
        {stage === "breath" && (
          <>
            <Pressable
              style={({ pressed }) => [
                styles.ctrlBtn,
                isPaused
                  ? { backgroundColor: colors.accentBtn, borderColor: colors.accentBtn }
                  : { backgroundColor: colors.paperSoft, borderColor: colors.ruleStrong },
                { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
              ]}
              onPress={() => metro.togglePause()}
            >
              <Text
                style={{
                  color: isPaused ? colors.onAccentBtn : colors.text,
                  fontSize: fs.base,
                  fontWeight: "700",
                }}
              >
                {isPaused ? "继续训练" : "暂停"}
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.ctrlBtnGhost,
                { opacity: pressed ? 0.65 : 1 },
              ]}
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
            style={({ pressed }) => [
              styles.ctrlBtn,
              { borderColor: colors.ruleStrong, opacity: pressed ? 0.75 : 1 },
            ]}
            onPress={() => {
              metro.endEarly();
              handleClose();
            }}
          >
            <Text style={{ color: colors.text2, fontSize: fs.base, fontWeight: "600" }}>取消</Text>
          </Pressable>
        )}
        {stage === "done" && (
          <>
            <Pressable
              style={({ pressed }) => [
                styles.ctrlBtn,
                { borderColor: colors.ruleStrong, opacity: pressed ? 0.8 : 1 },
              ]}
              onPress={() => openShare({ type: "daily" })}
            >
              <Text style={{ color: colors.text, fontSize: fs.base, fontWeight: "600" }}>分享这次</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.ctrlBtn,
                {
                  backgroundColor: colors.accentBtn,
                  borderColor: colors.accentBtn,
                  opacity: pressed ? 0.88 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
              onPress={() => metro.close(true)}
            >
              <Text style={{ color: colors.onAccentBtn, fontSize: fs.base, fontWeight: "700" }}>
                返回今日
              </Text>
            </Pressable>
          </>
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
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: sp.gutter,
    paddingTop: sp.s8,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: sp.gutter },
  eyebrow: {
    fontSize: fs.sm,
    fontWeight: "600",
  },
  hint: { fontSize: fs.base, textAlign: "center" },
  prepMeta: {
    marginTop: sp.s5,
    paddingHorizontal: sp.s4,
    paddingVertical: sp.s2,
    borderRadius: rd.pill,
    borderWidth: 1,
  },
  pausedBadge: {
    paddingHorizontal: sp.s4,
    paddingVertical: sp.s2,
    borderRadius: rd.pill,
    borderWidth: 1,
    marginBottom: sp.s4,
  },
  pausedBadgePlaceholder: {
    height: 36,
    marginBottom: sp.s4,
  },
  breathWrap: { width: 240, height: 240, alignItems: "center", justifyContent: "center" },
  breathRing: {
    position: "absolute",
    width: 210,
    height: 210,
    borderRadius: rd.pill,
    borderWidth: 2,
  },
  breathBlob: {
    width: 176,
    height: 176,
    borderRadius: rd.pill,
  },
  secRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: sp.s2,
  },
  doneBadge: {
    paddingHorizontal: sp.s4,
    paddingVertical: sp.s1,
    borderRadius: rd.pill,
  },
  doneSummary: {
    marginTop: sp.s5,
    paddingHorizontal: sp.s5,
    paddingVertical: sp.s3,
    borderRadius: rd.md,
    borderWidth: 1,
  },
  controls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: sp.s4,
    paddingHorizontal: sp.gutter,
    paddingBottom: sp.s8,
    paddingTop: sp.s4,
    borderTopWidth: 1,
  },
  ctrlBtn: {
    paddingVertical: sp.s3,
    paddingHorizontal: sp.s6,
    borderRadius: rd.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 132,
  },
  ctrlBtnGhost: {
    paddingVertical: sp.s3,
    paddingHorizontal: sp.s5,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 88,
  },
});
