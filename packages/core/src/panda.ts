// @tilemo/core — Shared scientific pelvic-floor training × abstract Panda animation engine.
//
// Zero-dependency pure TypeScript: drives Web SVG, React Native, WeChat Miniprogram Canvas 2D,
// and HarmonyOS ArkUI Canvas from the exact same biomechanics curves, soft-synced clock,
// and critically-damped interpolation state.

import type { MetroPhase, MetroSnapshot, MetroStage, MetroState } from "./metro";

export type PandaTheme = "light" | "dark";

export interface PandaPalette {
  lineInk: string;
  blackFur: string;
  furEdge: string;
  armOutline: string;
  fur: string;
  cushion: string;
  accent: string;
  relax: string;
  neutral: string;
  pauseDot: string;
  shadow: string;
}

export const PANDA_PALETTES: Record<PandaTheme, PandaPalette> = {
  light: {
    lineInk: "#2B2320",
    blackFur: "#2B2320",
    furEdge: "#2B2320",
    armOutline: "transparent",
    fur: "#FFFDF9",
    cushion: "#EBDDCB",
    accent: "#E85A4F",
    relax: "#4F7A65",
    neutral: "#8D7B6C",
    pauseDot: "#6F5F50",
    shadow: "#2B2320",
  },
  dark: {
    lineInk: "#241B17",
    blackFur: "#3D322C",
    furEdge: "#766357",
    armOutline: "#766357",
    fur: "#F5ECE2",
    cushion: "#3A2C24",
    accent: "#FF6B5E",
    relax: "#7BB598",
    neutral: "#A09080",
    pauseDot: "#C4B5A6",
    shadow: "#000000",
  },
};

export interface PandaSyncInput {
  stage: MetroStage;
  state: MetroState;
  phase: MetroPhase;
  remaining: number;
  startedReps: number;
  contractSec: number;
  relaxSec: number;
}

export interface PandaFrame {
  lift: number;
  chest: number;
  headY: number;
  headRot: number;
  earTilt: number;
  armCheer: number;
  exhaleOp: number;
  inhaleOp: number;
  blushOp: number;
  guideOp: number;
  guidePhase: number;
  guideEnv: number;
  colorT: number;
  auraR: number;
  mouthBlow: number;
  eyeScaleY: number;
  useLineEyes: boolean;
  eyeMood: "open" | "focus" | "relax" | "happy";
  pupilOffsetX: number;
  pupilOffsetY: number;
  pauseOp: number;
  confettiOp: number;
  confettiDrift: number;
  flowOffset: number;
  wave: number;
  pistonColor: string;
  isQuick: boolean;
  isLongHold: boolean;
  /** Exact quadratic Bezier hammock midpoint y = 0.5 * (hamEndY + hamMidY). */
  hamW: number;
  hamEndY: number;
  hamMidY: number;
  hamActualMidY: number;
  diaBaseY: number;
  diaArchY: number;
  seedDy: number;
  seedScale: number;
  ribW: number;
}

export interface PandaCopy {
  pillText: string;
  cueText: string;
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const damp = (cur: number, target: number, speed: number, dt: number): number =>
  lerp(cur, target, 1 - Math.exp(-speed * dt));
const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));
const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
const easeInOutSine = (t: number): number => -(Math.cos(Math.PI * t) - 1) / 2;

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function lerpHexColor(h1: string, h2: string, t: number): string {
  const a = hexToRgb(h1);
  const b = hexToRgb(h2);
  const r = Math.round(lerp(a[0], b[0], t));
  const g = Math.round(lerp(a[1], b[1], t));
  const bl = Math.round(lerp(a[2], b[2], t));
  return `rgb(${r}, ${g}, ${bl})`;
}

/** Scientific pelvic-floor lift curve: rises smoothly then holds steady at 1.0 (zero snap to relax). */
export function pandaLiftCurve(u: number, isQuick: boolean): number {
  const riseEnd = isQuick ? 0.35 : 0.24;
  if (u < riseEnd) return easeOutCubic(clamp01(u / riseEnd));
  return 1.0;
}

/** Scientific complete-drop curve: lowers smoothly from 1.0 to 0.0. */
export function pandaDropCurve(u: number, isQuick: boolean): number {
  const dropEnd = isQuick ? 0.45 : 0.36;
  if (u < dropEnd) return easeInOutSine(clamp01(u / dropEnd));
  return 1.0;
}

/** Low-frequency accessible phase pill & cue copy aligned with medical guidelines. */
export function getPandaCopy(snap: MetroSnapshot, contractSec: number): PandaCopy {
  const isQuick = contractSec <= 1.5;
  const isLongHold = contractSec >= 4.5;
  if (snap.stage === "prep") {
    return {
      pillText: "准 · 备",
      cueText: "坐稳放松肩膀和臀部，先轻轻吸一口气",
    };
  }
  if (snap.stage === "done") {
    return {
      pillText: "✓ 今天提了",
      cueText: "漂亮！外松内提，今天这组非常标准",
    };
  }
  if (snap.state === "paused") {
    return {
      pillText: "已暂停",
      cueText: "已定格当前进度，随时可以继续",
    };
  }
  if (snap.phase === "contract") {
    if (isQuick) {
      return {
        pillText: "↑ 快收 · 上提",
        cueText: "保持自然呼吸，盆底干脆向上一提",
      };
    }
    if (isLongHold) {
      const elapsedSec = Math.max(0, contractSec - snap.remaining);
      return {
        pillText: "↑ 呼气 · 上提",
        cueText:
          elapsedSec < 2
            ? "先轻吹气启动上提，臀腿和肩膀保持松弛"
            : "稳住内部提拉感，恢复浅而平稳的自然呼吸",
      };
    }
    return {
      pillText: "↑ 呼气 · 上提",
      cueText: "像轻吹蜡烛一样呼气，盆底向内向上轻提",
    };
  }
  if (isQuick) {
    return {
      pillText: "↓ 快放 · 沉降",
      cueText: "立刻彻底放软，准备下一次轻提",
    };
  }
  return {
    pillText: "↓ 吸气 · 放下",
    cueText: "鼻吸气，感受内部吊床彻底松开、向下沉落",
  };
}

/**
 * Stateful 60fps animation engine anchored to 1Hz MetroSnapshot ticks.
 * Handles phase-transition resets, soft drift correction on each 1s tick,
 * pause freezing, autonomous blinking, and reduced-motion mode.
 */
export class PandaEngine {
  private clock = 0;
  private phaseElapsed = 0;
  private phaseDuration = 3;
  private lastStage: MetroStage = "prep";
  private lastPhase: MetroPhase = "contract";
  private lastState: MetroState = "prep";
  private lastReps = -1;
  private lastRemaining = -1;
  private contractSec = 3;
  private relaxSec = 3;

  private blinkTimer = 2.4;
  private blinkProgress = 0;

  // Critically damped display state (prevents snaps across phase/pause/done transitions)
  private disp = {
    lift: 0.12,
    chest: 0,
    headY: 0,
    headRot: 0,
    earTilt: 0,
    armCheer: 0,
    exhaleOp: 0,
    inhaleOp: 0,
    blushOp: 0.2,
    guideOp: 0,
    colorT: 0,
    auraR: 104,
    mouthBlow: 0,
  };

  reset(): void {
    this.clock = 0;
    this.phaseElapsed = 0;
    this.lastReps = -1;
    this.lastRemaining = -1;
    this.disp.lift = 0.12;
    this.disp.armCheer = 0;
    this.disp.exhaleOp = 0;
    this.disp.inhaleOp = 0;
  }

  /** Sync with latest 1Hz MetroSnapshot; soft-calibrates elapsed time to prevent drift. */
  sync(input: PandaSyncInput): void {
    this.contractSec = Math.max(0.5, input.contractSec);
    this.relaxSec = Math.max(0.5, input.relaxSec);

    const dur =
      input.stage === "prep"
        ? 2.52
        : input.stage === "done"
          ? 4.0
          : input.phase === "contract"
            ? this.contractSec
            : this.relaxSec;

    const phaseChanged =
      input.stage !== this.lastStage ||
      input.phase !== this.lastPhase ||
      input.startedReps !== this.lastReps;

    if (phaseChanged) {
      this.phaseElapsed = 0;
      this.phaseDuration = dur;
    } else if (
      input.stage === "breath" &&
      input.state === "running" &&
      input.remaining !== this.lastRemaining
    ) {
      // Soft-calibrate against discrete 1s tick (keeps smooth motion after tab backgrounding or resume)
      const expected = Math.max(0, dur - input.remaining);
      const drift = expected - this.phaseElapsed;
      if (Math.abs(drift) > 0.35) {
        this.phaseElapsed = expected;
      } else {
        this.phaseElapsed += drift * 0.4;
      }
      this.phaseDuration = dur;
    }

    this.lastStage = input.stage;
    this.lastPhase = input.phase;
    this.lastState = input.state;
    this.lastReps = input.startedReps;
    this.lastRemaining = input.remaining;
  }

  step(dtRaw: number, theme: PandaTheme, reducedMotion: boolean): PandaFrame {
    const dt = Math.min(0.05, Math.max(0.001, dtRaw));
    const pal = PANDA_PALETTES[theme];
    const stage = this.lastStage;
    const state = this.lastState;
    const phase = this.lastPhase;
    const isPaused = stage === "breath" && state === "paused";
    const isQuick = this.contractSec <= 1.5;
    const isLongHold = this.contractSec >= 4.5;

    this.clock += dt;
    if (!isPaused) {
      this.phaseElapsed = Math.min(this.phaseDuration, this.phaseElapsed + dt);
    }

    // Autonomous blinking (disabled under reduced-motion)
    let blinkClose = 0;
    if (!reducedMotion) {
      this.blinkTimer -= dt;
      if (this.blinkTimer <= 0) {
        this.blinkProgress = 0.16;
        this.blinkTimer = 2.5 + ((Math.sin(this.clock * 12.7) + 1) * 1.4);
      }
      if (this.blinkProgress > 0) {
        this.blinkProgress = Math.max(0, this.blinkProgress - dt);
        blinkClose = Math.sin((1 - this.blinkProgress / 0.16) * Math.PI);
      }
    }

    const u = clamp01(this.phaseElapsed / Math.max(0.01, this.phaseDuration));
    const idleBreath = reducedMotion ? 0 : Math.sin(this.clock * 2.0);

    let targetLift = this.disp.lift;
    let targetChest = idleBreath * 0.22;
    let targetHeadY = 0;
    let targetHeadRot = 0;
    let targetEarTilt = 0;
    let targetArmCheer = 0;
    let targetExhale = 0;
    let targetInhale = 0;
    let targetBlush = 0.2;
    let targetGuide = 0;
    let targetColorT = this.disp.colorT;
    let targetAuraR = 104;
    let targetMouthBlow = 0;

    let pauseOp = 0;
    let confettiOp = 0;
    let useLineEyes = false;
    let eyeMood: PandaFrame["eyeMood"] = "open";
    let eyeScaleY = 1 - blinkClose * 0.88;
    let pupilOffsetX = 0;
    let pupilOffsetY = 0;

    if (stage === "prep") {
      targetLift = 0.08;
      targetChest = reducedMotion ? 0.3 : Math.sin(u * Math.PI) * 0.65;
      targetColorT = 0;
      targetInhale = reducedMotion ? 0 : Math.sin(u * Math.PI) * 0.55;
      targetHeadY = -targetChest * 1.1;
    } else if (isPaused) {
      // Freeze lift where it was paused (never drop suddenly)
      targetLift = this.disp.lift;
      targetChest = 0;
      targetHeadRot = reducedMotion ? 0 : Math.sin(this.clock * 1.3) * 2.4;
      pupilOffsetX = reducedMotion ? 0 : Math.sin(this.clock * 1.0) * 1.8;
      pauseOp = reducedMotion ? 0.75 : 0.5 + Math.sin(this.clock * 3) * 0.3;
      targetAuraR = 96;
    } else if (stage === "breath" && phase === "contract") {
      const f = pandaLiftCurve(u, isQuick);
      targetLift = clamp01(f);
      targetColorT = 1;
      targetAuraR = lerp(110, 92, targetLift);
      targetGuide = targetLift * 0.82;
      targetHeadY = -targetLift * 1.1;
      targetEarTilt = -2.2 * targetLift;
      targetBlush = lerp(0.18, 0.4, targetLift);

      if (isQuick) {
        targetChest = idleBreath * 0.15;
        targetExhale = 0;
        targetMouthBlow = 0;
      } else if (isLongHold) {
        if (this.phaseElapsed < 2.0) {
          const eu = clamp01(this.phaseElapsed / 2.0);
          targetChest = -easeOutCubic(eu) * 0.62;
          targetExhale = reducedMotion ? 0 : Math.sin(eu * Math.PI) * 0.85;
          targetMouthBlow = Math.sin(eu * Math.PI);
        } else {
          targetChest = reducedMotion ? 0 : Math.sin((this.phaseElapsed - 2.0) * 2.2) * 0.28;
          targetExhale = 0;
          targetMouthBlow = 0;
        }
      } else {
        targetChest = -targetLift * 0.62;
        targetExhale = reducedMotion ? 0 : Math.sin(u * Math.PI) * 0.85;
        targetMouthBlow = Math.sin(u * Math.PI);
      }

      if (targetLift > 0.35) {
        useLineEyes = true;
        eyeMood = "focus";
      }
    } else if (stage === "breath" && phase === "relax") {
      const d = pandaDropCurve(u, isQuick);
      targetLift = clamp01(1 - d);
      targetColorT = 0;
      targetAuraR = lerp(94, 114, d);
      targetHeadY = d * 1.4;
      targetEarTilt = 1.4 * d;
      targetBlush = lerp(0.32, 0.14, d);

      if (isQuick) {
        targetChest = idleBreath * 0.15;
        targetInhale = 0;
      } else {
        targetChest = d * 0.72;
        targetInhale = reducedMotion || u >= 0.72 ? 0 : Math.sin((u / 0.72) * Math.PI) * 0.82;
      }

      if (u < 0.55) {
        useLineEyes = true;
        eyeMood = "relax";
      } else {
        eyeScaleY = 0.78 - blinkClose * 0.72;
        pupilOffsetY = 0.8;
      }
    } else if (stage === "done") {
      const bounce = reducedMotion ? 0 : Math.abs(Math.sin(this.clock * 3.8));
      targetLift = 0.35 + bounce * 0.22;
      targetColorT = 1;
      targetAuraR = 112 + bounce * 6;
      targetHeadRot = reducedMotion ? 0 : Math.sin(this.clock * 5.2) * 3.8;
      targetHeadY = -bounce * 3.5;
      targetEarTilt = reducedMotion ? 0 : Math.sin(this.clock * 10) * 4;
      targetArmCheer = 1;
      confettiOp = 0.95;
      targetBlush = 0.5;
      useLineEyes = true;
      eyeMood = "happy";
    }

    const k = isQuick ? 18 : 10;
    this.disp.lift = damp(this.disp.lift, targetLift, k, dt);
    this.disp.chest = damp(this.disp.chest, targetChest, 8, dt);
    this.disp.headY = damp(this.disp.headY, targetHeadY, 9, dt);
    this.disp.headRot = damp(this.disp.headRot, targetHeadRot, 9, dt);
    this.disp.earTilt = damp(this.disp.earTilt, targetEarTilt, 10, dt);
    this.disp.armCheer = damp(this.disp.armCheer, targetArmCheer, 7.5, dt);
    this.disp.exhaleOp = damp(this.disp.exhaleOp, targetExhale, 10, dt);
    this.disp.inhaleOp = damp(this.disp.inhaleOp, targetInhale, 10, dt);
    this.disp.blushOp = damp(this.disp.blushOp, targetBlush, 8, dt);
    this.disp.guideOp = damp(this.disp.guideOp, targetGuide, 9, dt);
    this.disp.colorT = damp(this.disp.colorT, targetColorT, 8, dt);
    this.disp.auraR = damp(this.disp.auraR, targetAuraR, 6, dt);
    this.disp.mouthBlow = damp(this.disp.mouthBlow, targetMouthBlow, 12, dt);

    const lift = this.disp.lift;
    const hamW = lerp(33, 24, lift);
    const hamEndY = lerp(206, 198, lift);
    const hamMidY = lerp(218, 182, lift);
    const hamActualMidY = 0.5 * (hamEndY + hamMidY);
    const microFloat = !reducedMotion && lift > 0.75 ? Math.sin(this.clock * 3.6) * 0.5 : 0;
    const seedDy = hamActualMidY - 2.5 - 212 + microFloat;
    const seedScale = lerp(1.0, 0.94, lift);

    const guidePhase = reducedMotion ? 0.5 : (this.clock * 1.1) % 1;
    const guideEnv = reducedMotion ? 0.5 : Math.sin(guidePhase * Math.PI);
    const pistonColor = isPaused ? pal.neutral : lerpHexColor(pal.relax, pal.accent, clamp01(this.disp.colorT));

    return {
      lift,
      chest: this.disp.chest,
      headY: this.disp.headY + idleBreath * 0.55,
      headRot: this.disp.headRot,
      earTilt: this.disp.earTilt,
      armCheer: this.disp.armCheer,
      exhaleOp: this.disp.exhaleOp,
      inhaleOp: this.disp.inhaleOp,
      blushOp: this.disp.blushOp,
      guideOp: this.disp.guideOp,
      guidePhase,
      guideEnv,
      colorT: this.disp.colorT,
      auraR: this.disp.auraR,
      mouthBlow: this.disp.mouthBlow,
      eyeScaleY,
      useLineEyes,
      eyeMood,
      pupilOffsetX,
      pupilOffsetY,
      pauseOp,
      confettiOp,
      confettiDrift: confettiOp > 0.01 && !reducedMotion ? Math.sin(this.clock * 4) * 5 : 0,
      flowOffset: reducedMotion ? 0 : this.clock * 42,
      wave: !reducedMotion && this.disp.armCheer > 0.6 ? Math.sin(this.clock * 10) * 6 * this.disp.armCheer : 0,
      pistonColor,
      isQuick,
      isLongHold,
      hamW,
      hamEndY,
      hamMidY,
      hamActualMidY,
      diaBaseY: lerp(164, 155, lift),
      diaArchY: lerp(161, 146, lift),
      seedDy,
      seedScale,
      ribW: 46 + this.disp.chest * 2.8,
    };
  }
}
