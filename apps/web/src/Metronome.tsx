// @tilemo/web — 节拍器 overlay。mirror mobile Metronome.tsx：
// core.Metro 状态机 + subscribe(snapshot) + WebAudio/navigator.vibrate 反馈。
// 呼吸形由 CSS class（.is-contract/.is-relax）驱动，替代 mobile 的 reanimated。

import { useEffect, useMemo, useRef, useState } from "react";
import { Metro, type MetroSnapshot, recordSession } from "@tilemo/core";
import { detectStreakMilestone, type MilestoneCopy } from "@tilemo/share-card";
import type { Plan } from "@tilemo/data";
import { useDataStore } from "./data";
import { useOpenShare } from "./share/ShareContext";

export function Metronome({ plan, onClose }: { plan: Plan; onClose: () => void }) {
  const store = useDataStore((s) => s.store);
  const refresh = useDataStore((s) => s.refresh);
  const settings = useDataStore((s) => s.settings);

  const [snap, setSnap] = useState<MetroSnapshot | null>(null);
  const closedRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const lastPhaseRef = useRef("");
  const audioRef = useRef<AudioContext | null>(null);
  const milestoneRef = useRef<MilestoneCopy | null>(null);
  const openShare = useOpenShare();

  const handleClose = () => {
    if (closedRef.current) return;
    closedRef.current = true;
    onCloseRef.current();
  };

  const metro = useMemo(
    () =>
      new Metro({
        onRecord: (p, reps, dur, finished) => {
          if (store) {
            const prev = store.getStreak().current;
            recordSession(store, p, reps, dur, finished);
            refresh();
            if (finished) {
              const m = detectStreakMilestone(prev, store.getStreak().current);
              if (m) milestoneRef.current = m;
            }
          }
        },
        // 完成且跨 streak 里程碑 → 延迟弹成就卡（晚于 CTA 庆祝）
        onAfterClose: (completion) => {
          handleClose();
          if (completion && milestoneRef.current) {
            const m = milestoneRef.current;
            milestoneRef.current = null;
            setTimeout(() => openShare({ type: "milestone", milestone: m }), 900);
          }
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store, refresh, openShare],
  );

  useEffect(() => {
    const unsub = metro.subscribe(setSnap);
    metro.open(plan);
    return () => {
      unsub();
      metro.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.id, metro]);

  // phase 边沿 → 反馈（WebAudio + vibrate）+ 呼吸形时长绑定本拍秒数
  useEffect(() => {
    if (!snap || snap.stage !== "breath") {
      lastPhaseRef.current = "";
      return;
    }
    if (snap.phase !== lastPhaseRef.current) {
      lastPhaseRef.current = snap.phase;
      feedback(snap.phase);
    }
    const sec = snap.phase === "contract" ? plan.contract : plan.relax;
    document.documentElement.style.setProperty("--dur-breath", sec * 1000 + "ms");
  }, [snap, plan]);

  function feedback(phase: "contract" | "relax") {
    if (settings?.haptics && navigator.vibrate) {
      try {
        navigator.vibrate(phase === "contract" ? 8 : 4);
      } catch {
        /* ignore */
      }
    }
    if (settings?.sound) {
      try {
        if (!audioRef.current) {
          const AC = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
            .AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
          if (AC) audioRef.current = new AC();
        }
        const ac = audioRef.current;
        if (ac) {
          const osc = ac.createOscillator();
          const gain = ac.createGain();
          osc.type = "sine";
          osc.frequency.value = phase === "contract" ? 880 : 660;
          const now = ac.currentTime;
          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(0.06, now + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
          osc.connect(gain).connect(ac.destination);
          osc.start(now);
          osc.stop(now + 0.07);
        }
      } catch {
        /* ignore */
      }
    }
  }

  if (!snap) return null;
  const stage = snap.stage;
  const rootClass =
    "metronome is-open" +
    (stage === "breath" ? (snap.phase === "contract" ? " is-contract" : " is-relax") : "");

  return (
    <div className={rootClass} id="metronome" role="dialog" aria-modal="true">
      <div className="metro-stage" id="metro-stage">
        {stage === "prep" && (
          <div className="metro-prep" id="metro-prep">
            <div className="prep-num" id="prep-num">{snap.prepN}</div>
            <div className="prep-hint">准备</div>
          </div>
        )}
        {stage === "breath" && (
          <div className="metro-breath" id="metro-breath">
            <div className="breath-shape" id="breath-shape">
              <div className="breath-inner" />
            </div>
            <div className="breath-count" id="breath-count">{snap.remaining}</div>
            <div className="breath-phase" id="breath-phase">
              {snap.phase === "contract" ? "收 · 紧" : "放 · 松"}
            </div>
            <div className="metro-progress" id="metro-progress">
              {snap.setIdx + 1}/{snap.sets} 组 · {snap.startedReps}/{snap.totalReps} 次
            </div>
          </div>
        )}
        {stage === "done" && (
          <div className="metro-done" id="metro-done">
            <div className="done-blob" aria-hidden="true">✓</div>
            <div className="done-title">
              今天，<span className="em">提了</span>。
            </div>
            <div className="done-sub" id="done-sub">{snap.doneSub}</div>
          </div>
        )}
      </div>

      <div className="metronome-bottom">
        {stage === "prep" && (
          <button className="mbtn mbtn-ghost" id="metro-end" onClick={() => metro.endEarly()}>
            取消
          </button>
        )}
        {stage === "breath" && (
          <>
            <button className="mbtn mbtn-ghost" id="metro-end" onClick={() => metro.endEarly()}>
              结束
            </button>
            <button className="mbtn mbtn-primary" id="metro-pause" onClick={() => metro.togglePause()}>
              {snap.state === "paused" ? "继续" : "暂停"}
            </button>
          </>
        )}
        {stage === "done" && (
          <>
            <button className="mbtn mbtn-ghost" onClick={() => openShare({ type: "daily" })}>
              分享这次
            </button>
            <button className="mbtn mbtn-primary" id="metro-close" onClick={handleClose}>
              好的
            </button>
          </>
        )}
      </div>
    </div>
  );
}
