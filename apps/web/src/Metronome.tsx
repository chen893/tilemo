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
  // openShare 是 ShareContext 里的 useCallback([store, settings])，settings 在每次
  // refresh() 后引用都换 → openShare 引用随之换。若把 openShare 放进 metro 的 useMemo
  // 依赖，refresh() 会让 metro 被重建并重跑 metro.open(plan)，用户看到的现象就是
  // 「done 后突然回到准备中、又开始了一组」。用 ref 间接，metro 只依赖真正稳定的
  // (store, refresh) —— 详见 web/mobile Metronome 注释。
  const openShareRef = useRef(openShare);
  openShareRef.current = openShare;

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
            setTimeout(() => openShareRef.current({ type: "milestone", milestone: m }), 900);
          }
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store, refresh],
  );

  useEffect(() => {
    const unsub = metro.subscribe(setSnap);
    metro.open(plan);
    return () => {
      unsub();
      metro.dispose();
      // 关闭 WebAudio 上下文：浏览器对并发 AudioContext 数有上限（~6），
      // 每次开节拍器新建却不 close，反复进出训练后提示音会静默失效。
      if (audioRef.current) {
        audioRef.current.close().catch(() => {});
        audioRef.current = null;
      }
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
      <div className="metronome-top">
        <div className="progress-text">
          <span className="num">{stage === "breath" ? snap.setIdx + 1 : stage === "done" ? snap.sets : 0}</span>
          <span className="sep">/</span>
          <span className="num">{snap.sets}</span>
          组 ·
          <span className="num">{snap.startedReps}</span>
          <span className="sep">/</span>
          <span className="num">{snap.totalReps}</span>
          次
        </div>
        <button className="metronome-close" aria-label="关闭" onClick={handleClose}>
          ✕
        </button>
      </div>

      <div className="metronome-stage">
        {stage === "prep" && (
          <div className="prep">
            <div className="ready">准备</div>
            <div className="num-321">{snap.prepN}</div>
          </div>
        )}
        {stage === "breath" && (
          <div className="breath-organism">
            <svg className="breath-svg" viewBox="0 0 200 200" aria-hidden="true">
              <path
                className="breath-shape"
                d="M100 18 C150 18 182 50 182 100 C182 150 150 182 100 182 C50 182 18 150 18 100 C18 50 50 18 100 18 Z"
              />
              <path
                className="breath-inner"
                d="M100 50 C130 50 150 70 150 100 C150 130 130 150 100 150 C70 150 50 130 50 100 C50 70 70 50 100 50 Z"
              />
            </svg>
            <div className="breath-core">
              <div className="breath-count">{snap.remaining}</div>
              <div className="breath-phase">
                {snap.phase === "contract" ? "收 · 紧" : "放 · 松"}
              </div>
            </div>
          </div>
        )}
        {stage === "done" && (
          <div className="done">
            <div className="done-blob" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M5 12l5 5 9-11" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
              </svg>
            </div>
            <h2 className="title">
              今天，<span className="em">提了</span>。
            </h2>
            <p className="sub">{snap.doneSub}</p>
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
