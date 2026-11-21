// @tilemo/web — 节拍器 overlay。
// core.Metro 状态机 + subscribe(snapshot) + WebAudio/navigator.vibrate 反馈。
// 双通道视觉编码：收紧（暖红向心） vs 放松（鼠尾草绿舒展）；
// 暂停态中央明确标注「已暂停」，完成页停留至用户主动操作。

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Metro,
  type MetroSnapshot,
  completedCountOfDay,
  formatPlanDuration,
  recordSession,
  todayKey,
} from "@tilemo/core";
import { detectStreakMilestone, type MilestoneCopy } from "@tilemo/share-card";
import type { Plan } from "@tilemo/data";
import { useDataStore } from "./data";
import { useOpenShare } from "./share/ShareContext";

export function Metronome({ plan, onClose }: { plan: Plan; onClose: (goHome?: boolean) => void }) {
  const store = useDataStore((s) => s.store);
  const refresh = useDataStore((s) => s.refresh);
  const settings = useDataStore((s) => s.settings);

  const [snap, setSnap] = useState<MetroSnapshot | null>(null);
  const closedRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const lastPhaseRef = useRef("");
  const lastRepsRef = useRef(0);
  const audioRef = useRef<AudioContext | null>(null);
  const milestoneRef = useRef<MilestoneCopy | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const openShare = useOpenShare();
  const openShareRef = useRef(openShare);
  openShareRef.current = openShare;

  const handleClose = (goHome = false) => {
    if (closedRef.current) return;
    closedRef.current = true;
    onCloseRef.current(goHome);
  };

  const metro = useMemo(
    () =>
      new Metro({
        onRecord: (p, reps, dur, finished) => {
          lastRepsRef.current = reps;
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
        onAfterClose: (completion) => {
          handleClose(completion);
          if (completion && milestoneRef.current) {
            const m = milestoneRef.current;
            milestoneRef.current = null;
            setTimeout(() => openShareRef.current({ type: "milestone", milestone: m }), 400);
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
      if (audioRef.current) {
        audioRef.current.close().catch(() => {});
        audioRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.id, metro]);

  // 键盘控制（Space 暂停/继续、Esc 退出或返回今日）与初始焦点管理
  useEffect(() => {
    rootRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (document.querySelector(".share-overlay.is-open")) return;
      if (e.key === "Escape") {
        e.preventDefault();
        if (snap?.stage === "done") metro.close(true);
        else metro.endEarly();
      } else if (e.key === " " || e.code === "Space") {
        if (snap?.stage === "breath") {
          e.preventDefault();
          metro.togglePause();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [metro, snap?.stage]);

  useEffect(() => {
    if (!snap || snap.stage !== "breath") {
      lastPhaseRef.current = "";
      return;
    }
    if (snap.state === "running" && snap.phase !== lastPhaseRef.current) {
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
          const AC =
            (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
              .AudioContext ||
            (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
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
  const isPaused = snap.state === "paused";
  const phaseSec = snap.phase === "contract" ? plan.contract : plan.relax;
  const phaseStyle = { animationDuration: `${phaseSec}s` };
  const rootClass =
    "metronome is-open" +
    (stage === "breath" ? (snap.phase === "contract" ? " is-contract" : " is-relax") : "") +
    (isPaused ? " is-paused" : "");

  const todayDone = completedCountOfDay(store?.getDay(todayKey()) ?? null);
  const goal = settings?.dailyGoalGroups ?? 3;

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      className={rootClass}
      id="metronome"
      role="dialog"
      aria-modal="true"
      aria-label={`${plan.name} 训练节拍器`}
    >
      <div className="metronome-top">
        <div className="progress-text">
          {plan.name} · {formatPlanDuration(plan)}
        </div>
        {stage === "breath" && (
          <div className="progress-text">
            {snap.sets > 1 && (
              <>
                第 <span className="num">{snap.setIdx + 1}</span>/<span className="num">{snap.sets}</span> 组 ·{" "}
              </>
            )}
            <span className="num">{snap.startedReps}</span>
            <span className="sep">/</span>
            <span className="num">{snap.totalReps}</span> 次
          </div>
        )}
      </div>

      <div className="metronome-stage">
        {stage === "prep" && (
          <div className="prep">
            <div className="ready">准备</div>
            <div className="num-321">{snap.prepN}</div>
          </div>
        )}
        {stage === "breath" && (
          <>
            <div className={"pause-banner" + (isPaused ? " is-show" : "")} aria-live="polite">
              {isPaused ? "已暂停" : ""}
            </div>
            <div className="breath-organism">
              <svg className="breath-svg" viewBox="0 0 200 200" aria-hidden="true">
                <path
                  className="breath-shape"
                  style={phaseStyle}
                  d="M100 18 C150 18 182 50 182 100 C182 150 150 182 100 182 C50 182 18 150 18 100 C18 50 50 18 100 18 Z"
                />
                <path
                  className="breath-inner"
                  style={phaseStyle}
                  d="M100 50 C130 50 150 70 150 100 C150 130 130 150 100 150 C70 150 50 130 50 100 C50 70 70 50 100 50 Z"
                />
              </svg>
              <div className="breath-core">
                <div className="breath-count">
                  {snap.remaining}
                  <span className="breath-unit">秒</span>
                </div>
                <div className="breath-phase">
                  {snap.phase === "contract" ? "收 · 紧" : "放 · 松"}
                </div>
              </div>
            </div>
          </>
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
            <div className="done-summary">
              今日进度：<strong>{todayDone} / {goal} 组</strong>
              {todayDone >= goal ? "（已达标）" : ""}
            </div>
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
            <button
              className={"mbtn " + (isPaused ? "mbtn-primary" : "mbtn-soft")}
              id="metro-pause"
              onClick={() => metro.togglePause()}
            >
              {isPaused ? "继续训练" : "暂停"}
            </button>
            <button className="mbtn mbtn-weak" id="metro-end" onClick={() => metro.endEarly()}>
              结束
            </button>
          </>
        )}
        {stage === "done" && (
          <>
            <button
              className="mbtn mbtn-ghost"
              onClick={() =>
                openShare({
                  type: "daily",
                  sessionReps: lastRepsRef.current || snap.totalReps,
                })
              }
            >
              分享这次
            </button>
            <button className="mbtn mbtn-primary" id="metro-close" onClick={() => metro.close(true)}>
              返回今日
            </button>
          </>
        )}
      </div>
    </div>
  );
}
