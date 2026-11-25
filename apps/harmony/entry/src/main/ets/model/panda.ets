// HarmonyOS ArkTS — Scientific pelvic-floor training × abstract Panda engine & Canvas renderer.
// 100% aligned with @tilemo/core/panda.ts biomechanics curves, palettes & copy.

import { MetroPhase, MetroSnapshot, MetroStage, MetroState } from './metro';

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

const LIGHT_PAL: PandaPalette = {
  lineInk: '#2B2320',
  blackFur: '#2B2320',
  furEdge: '#2B2320',
  armOutline: '',
  fur: '#FFFDF9',
  cushion: '#EBDDCB',
  accent: '#E85A4F',
  relax: '#4F7A65',
  neutral: '#8D7B6C',
  pauseDot: '#6F5F50',
  shadow: '#2B2320'
};

const DARK_PAL: PandaPalette = {
  lineInk: '#241B17',
  blackFur: '#3D322C',
  furEdge: '#766357',
  armOutline: '#766357',
  fur: '#F5ECE2',
  cushion: '#3A2C24',
  accent: '#FF6B5E',
  relax: '#7BB598',
  neutral: '#A09080',
  pauseDot: '#C4B5A6',
  shadow: '#000000'
};

export interface PandaCopy {
  pillText: string;
  cueText: string;
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
  eyeMood: string;
  pupilOffsetX: number;
  pupilOffsetY: number;
  pauseOp: number;
  confettiOp: number;
  confettiDrift: number;
  flowOffset: number;
  wave: number;
  pistonColor: string;
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

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function damp(cur: number, target: number, speed: number, dt: number): number {
  return lerp(cur, target, 1 - Math.exp(-speed * dt));
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

function lerpHex(h1: string, h2: string, t: number): string {
  const n1 = parseInt(h1.slice(1), 16);
  const n2 = parseInt(h2.slice(1), 16);
  const r = Math.round(lerp((n1 >> 16) & 255, (n2 >> 16) & 255, t));
  const g = Math.round(lerp((n1 >> 8) & 255, (n2 >> 8) & 255, t));
  const b = Math.round(lerp(n1 & 255, n2 & 255, t));
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}

function liftCurve(u: number, isQuick: boolean): number {
  const riseEnd = isQuick ? 0.35 : 0.24;
  if (u < riseEnd) return easeOutCubic(clamp01(u / riseEnd));
  return 1.0;
}

function dropCurve(u: number, isQuick: boolean): number {
  const dropEnd = isQuick ? 0.45 : 0.36;
  if (u < dropEnd) return easeInOutSine(clamp01(u / dropEnd));
  return 1.0;
}

export function getPandaCopy(snap: MetroSnapshot, contractSec: number): PandaCopy {
  const isQuick = contractSec <= 1.5;
  const isLongHold = contractSec >= 4.5;
  if (snap.stage === 'prep') {
    return { pillText: '准 · 备', cueText: '坐稳放松肩膀和臀部，先轻轻吸一口气' };
  }
  if (snap.stage === 'done') {
    return { pillText: '✓ 今天提了', cueText: '漂亮！外松内提，今天这组非常标准' };
  }
  if (snap.state === 'paused') {
    return { pillText: '已暂停', cueText: '已定格当前进度，随时可以继续' };
  }
  if (snap.phase === 'contract') {
    if (isQuick) {
      return { pillText: '↑ 快收 · 上提', cueText: '保持自然呼吸，盆底干脆向上一提' };
    }
    if (isLongHold) {
      const elapsedSec = Math.max(0, contractSec - snap.remaining);
      return {
        pillText: '↑ 呼气 · 上提',
        cueText: elapsedSec < 2
          ? '先轻吹气启动上提，臀腿和肩膀保持松弛'
          : '稳住内部提拉感，恢复浅而平稳的自然呼吸'
      };
    }
    return { pillText: '↑ 呼气 · 上提', cueText: '像轻吹蜡烛一样呼气，盆底向内向上轻提' };
  }
  if (isQuick) {
    return { pillText: '↓ 快放 · 沉降', cueText: '立刻彻底放软，准备下一次轻提' };
  }
  return { pillText: '↓ 吸气 · 放下', cueText: '鼻吸气，感受内部吊床彻底松开、向下沉落' };
}

export class PandaEngine {
  private clock: number = 0;
  private phaseElapsed: number = 0;
  private phaseDuration: number = 3;
  private lastStage: MetroStage = 'prep';
  private lastPhase: MetroPhase = 'contract';
  private lastState: MetroState = 'prep';
  private lastReps: number = -1;
  private lastRemaining: number = -1;
  private contractSec: number = 3;
  private relaxSec: number = 3;
  private blinkTimer: number = 2.4;
  private blinkProgress: number = 0;

  private dLift: number = 0.12;
  private dChest: number = 0;
  private dHeadY: number = 0;
  private dHeadRot: number = 0;
  private dEarTilt: number = 0;
  private dArmCheer: number = 0;
  private dExhaleOp: number = 0;
  private dInhaleOp: number = 0;
  private dBlushOp: number = 0.2;
  private dGuideOp: number = 0;
  private dColorT: number = 0;
  private dAuraR: number = 104;
  private dMouthBlow: number = 0;

  reset(): void {
    this.clock = 0;
    this.phaseElapsed = 0;
    this.lastReps = -1;
    this.lastRemaining = -1;
    this.dLift = 0.12;
    this.dArmCheer = 0;
    this.dExhaleOp = 0;
    this.dInhaleOp = 0;
  }

  sync(snap: MetroSnapshot, contractSec: number, relaxSec: number): void {
    this.contractSec = Math.max(0.5, contractSec);
    this.relaxSec = Math.max(0.5, relaxSec);
    const dur = snap.stage === 'prep'
      ? 2.52
      : snap.stage === 'done'
        ? 4.0
        : snap.phase === 'contract'
          ? this.contractSec
          : this.relaxSec;

    const changed = snap.stage !== this.lastStage || snap.phase !== this.lastPhase || snap.startedReps !== this.lastReps;
    if (changed) {
      this.phaseElapsed = 0;
      this.phaseDuration = dur;
    } else if (snap.stage === 'breath' && snap.state === 'running' && snap.remaining !== this.lastRemaining) {
      const expected = Math.max(0, dur - snap.remaining);
      const drift = expected - this.phaseElapsed;
      if (Math.abs(drift) > 0.35) this.phaseElapsed = expected;
      else this.phaseElapsed += drift * 0.4;
      this.phaseDuration = dur;
    }

    this.lastStage = snap.stage;
    this.lastPhase = snap.phase;
    this.lastState = snap.state;
    this.lastReps = snap.startedReps;
    this.lastRemaining = snap.remaining;
  }

  step(dtRaw: number, isDark: boolean): PandaFrame {
    const dt = Math.min(0.05, Math.max(0.001, dtRaw));
    const pal = isDark ? DARK_PAL : LIGHT_PAL;
    const stage = this.lastStage;
    const state = this.lastState;
    const phase = this.lastPhase;
    const isPaused = stage === 'breath' && state === 'paused';
    const isQuick = this.contractSec <= 1.5;
    const isLongHold = this.contractSec >= 4.5;

    this.clock += dt;
    if (!isPaused) {
      this.phaseElapsed = Math.min(this.phaseDuration, this.phaseElapsed + dt);
    }

    let blinkClose = 0;
    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) {
      this.blinkProgress = 0.16;
      this.blinkTimer = 2.5 + (Math.sin(this.clock * 12.7) + 1) * 1.4;
    }
    if (this.blinkProgress > 0) {
      this.blinkProgress = Math.max(0, this.blinkProgress - dt);
      blinkClose = Math.sin((1 - this.blinkProgress / 0.16) * Math.PI);
    }

    const u = clamp01(this.phaseElapsed / Math.max(0.01, this.phaseDuration));
    const idleBreath = Math.sin(this.clock * 2.0);

    let targetLift = this.dLift;
    let targetChest = idleBreath * 0.22;
    let targetHeadY = 0;
    let targetHeadRot = 0;
    let targetEarTilt = 0;
    let targetArmCheer = 0;
    let targetExhale = 0;
    let targetInhale = 0;
    let targetBlush = 0.2;
    let targetGuide = 0;
    let targetColorT = this.dColorT;
    let targetAuraR = 104;
    let targetMouthBlow = 0;

    let pauseOp = 0;
    let confettiOp = 0;
    let useLineEyes = false;
    let eyeMood = 'open';
    let eyeScaleY = 1 - blinkClose * 0.88;
    let pupilOffsetX = 0;
    let pupilOffsetY = 0;

    if (stage === 'prep') {
      targetLift = 0.08;
      targetChest = Math.sin(u * Math.PI) * 0.65;
      targetColorT = 0;
      targetInhale = Math.sin(u * Math.PI) * 0.55;
      targetHeadY = -targetChest * 1.1;
    } else if (isPaused) {
      targetLift = this.dLift;
      targetChest = 0;
      targetHeadRot = Math.sin(this.clock * 1.3) * 2.4;
      pupilOffsetX = Math.sin(this.clock * 1.0) * 1.8;
      pauseOp = 0.5 + Math.sin(this.clock * 3) * 0.3;
      targetAuraR = 96;
    } else if (stage === 'breath' && phase === 'contract') {
      const f = liftCurve(u, isQuick);
      targetLift = clamp01(f);
      targetColorT = 1;
      targetAuraR = lerp(110, 92, targetLift);
      targetGuide = targetLift * 0.82;
      targetHeadY = -targetLift * 1.1;
      targetEarTilt = -2.2 * targetLift;
      targetBlush = lerp(0.18, 0.4, targetLift);

      if (isQuick) {
        targetChest = idleBreath * 0.15;
      } else if (isLongHold) {
        if (this.phaseElapsed < 2.0) {
          const eu = clamp01(this.phaseElapsed / 2.0);
          targetChest = -easeOutCubic(eu) * 0.62;
          targetExhale = Math.sin(eu * Math.PI) * 0.85;
          targetMouthBlow = Math.sin(eu * Math.PI);
        } else {
          targetChest = Math.sin((this.phaseElapsed - 2.0) * 2.2) * 0.28;
        }
      } else {
        targetChest = -targetLift * 0.62;
        targetExhale = Math.sin(u * Math.PI) * 0.85;
        targetMouthBlow = Math.sin(u * Math.PI);
      }

      if (targetLift > 0.35) {
        useLineEyes = true;
        eyeMood = 'focus';
      }
    } else if (stage === 'breath' && phase === 'relax') {
      const dr = dropCurve(u, isQuick);
      targetLift = clamp01(1 - dr);
      targetColorT = 0;
      targetAuraR = lerp(94, 114, dr);
      targetHeadY = dr * 1.4;
      targetEarTilt = 1.4 * dr;
      targetBlush = lerp(0.32, 0.14, dr);

      if (isQuick) {
        targetChest = idleBreath * 0.15;
      } else {
        targetChest = dr * 0.72;
        targetInhale = u >= 0.72 ? 0 : Math.sin((u / 0.72) * Math.PI) * 0.82;
      }

      if (u < 0.55) {
        useLineEyes = true;
        eyeMood = 'relax';
      } else {
        eyeScaleY = 0.78 - blinkClose * 0.72;
        pupilOffsetY = 0.8;
      }
    } else if (stage === 'done') {
      const bounce = Math.abs(Math.sin(this.clock * 3.8));
      targetLift = 0.35 + bounce * 0.22;
      targetColorT = 1;
      targetAuraR = 112 + bounce * 6;
      targetHeadRot = Math.sin(this.clock * 5.2) * 3.8;
      targetHeadY = -bounce * 3.5;
      targetEarTilt = Math.sin(this.clock * 10) * 4;
      targetArmCheer = 1;
      confettiOp = 0.95;
      targetBlush = 0.5;
      useLineEyes = true;
      eyeMood = 'happy';
    }

    const k = isQuick ? 18 : 10;
    this.dLift = damp(this.dLift, targetLift, k, dt);
    this.dChest = damp(this.dChest, targetChest, 8, dt);
    this.dHeadY = damp(this.dHeadY, targetHeadY, 9, dt);
    this.dHeadRot = damp(this.dHeadRot, targetHeadRot, 9, dt);
    this.dEarTilt = damp(this.dEarTilt, targetEarTilt, 10, dt);
    this.dArmCheer = damp(this.dArmCheer, targetArmCheer, 7.5, dt);
    this.dExhaleOp = damp(this.dExhaleOp, targetExhale, 10, dt);
    this.dInhaleOp = damp(this.dInhaleOp, targetInhale, 10, dt);
    this.dBlushOp = damp(this.dBlushOp, targetBlush, 8, dt);
    this.dGuideOp = damp(this.dGuideOp, targetGuide, 9, dt);
    this.dColorT = damp(this.dColorT, targetColorT, 8, dt);
    this.dAuraR = damp(this.dAuraR, targetAuraR, 6, dt);
    this.dMouthBlow = damp(this.dMouthBlow, targetMouthBlow, 12, dt);

    const lift = this.dLift;
    const hamW = lerp(33, 24, lift);
    const hamEndY = lerp(206, 198, lift);
    const hamMidY = lerp(218, 182, lift);
    const hamActualMidY = 0.5 * (hamEndY + hamMidY);
    const microFloat = lift > 0.75 ? Math.sin(this.clock * 3.6) * 0.5 : 0;
    const guidePhase = (this.clock * 1.1) % 1;

    return {
      lift: lift,
      chest: this.dChest,
      headY: this.dHeadY + idleBreath * 0.55,
      headRot: this.dHeadRot,
      earTilt: this.dEarTilt,
      armCheer: this.dArmCheer,
      exhaleOp: this.dExhaleOp,
      inhaleOp: this.dInhaleOp,
      blushOp: this.dBlushOp,
      guideOp: this.dGuideOp,
      guidePhase: guidePhase,
      guideEnv: Math.sin(guidePhase * Math.PI),
      colorT: this.dColorT,
      auraR: this.dAuraR,
      mouthBlow: this.dMouthBlow,
      eyeScaleY: eyeScaleY,
      useLineEyes: useLineEyes,
      eyeMood: eyeMood,
      pupilOffsetX: pupilOffsetX,
      pupilOffsetY: pupilOffsetY,
      pauseOp: pauseOp,
      confettiOp: confettiOp,
      confettiDrift: confettiOp > 0.01 ? Math.sin(this.clock * 4) * 5 : 0,
      flowOffset: this.clock * 42,
      wave: this.dArmCheer > 0.6 ? Math.sin(this.clock * 10) * 6 * this.dArmCheer : 0,
      pistonColor: isPaused ? pal.neutral : lerpHex(pal.relax, pal.accent, clamp01(this.dColorT)),
      hamW: hamW,
      hamEndY: hamEndY,
      hamMidY: hamMidY,
      hamActualMidY: hamActualMidY,
      diaBaseY: lerp(164, 155, lift),
      diaArchY: lerp(161, 146, lift),
      seedDy: hamActualMidY - 2.5 - 212 + microFloat,
      seedScale: lerp(1.0, 0.94, lift),
      ribW: 46 + this.dChest * 2.8
    };
  }
}

function traceTorso(ctx: CanvasRenderingContext2D, ribW: number): void {
  const hipW = 54;
  ctx.beginPath();
  ctx.moveTo(105, 118);
  ctx.quadraticCurveTo(140, 113, 175, 118);
  ctx.bezierCurveTo(140 + ribW + 6, 136, 140 + hipW + 2, 180, 140 + hipW - 4, 214);
  ctx.quadraticCurveTo(140, 227, 90, 214);
  ctx.bezierCurveTo(140 - hipW - 2, 180, 140 - ribW - 6, 136, 105, 118);
  ctx.closePath();
}

export function drawPandaCanvas(ctx: CanvasRenderingContext2D, size: number, f: PandaFrame, isDark: boolean): void {
  const pal = isDark ? DARK_PAL : LIGHT_PAL;
  ctx.save();
  ctx.clearRect(0, 0, size, size);
  ctx.scale(size / 280, size / 280);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 1. Aura
  ctx.save();
  ctx.globalAlpha = 0.14;
  ctx.fillStyle = f.pistonColor;
  ctx.beginPath();
  ctx.arc(140, 156, f.auraR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 2. Shadow & cushion
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = pal.shadow;
  ctx.beginPath();
  ctx.ellipse(140, 238, 76, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.beginPath();
  ctx.moveTo(74, 232);
  ctx.quadraticCurveTo(140, 245, 206, 232);
  ctx.quadraticCurveTo(214, 224, 202, 221);
  ctx.quadraticCurveTo(140, 230, 78, 221);
  ctx.quadraticCurveTo(66, 224, 74, 232);
  ctx.closePath();
  ctx.fillStyle = pal.cushion;
  ctx.strokeStyle = pal.furEdge;
  ctx.lineWidth = 3.2;
  ctx.fill();
  ctx.stroke();

  // 3. Crossed legs
  ctx.fillStyle = pal.blackFur;
  ctx.strokeStyle = pal.furEdge;
  ctx.lineWidth = 3.6;
  ctx.beginPath();
  ctx.moveTo(102, 204);
  ctx.bezierCurveTo(76, 202, 66, 218, 82, 226);
  ctx.bezierCurveTo(98, 233, 126, 230, 134, 222);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(178, 204);
  ctx.bezierCurveTo(204, 202, 214, 218, 198, 226);
  ctx.bezierCurveTo(182, 233, 154, 230, 146, 222);
  ctx.fill();
  ctx.stroke();

  // 4. Torso + clipped shoulder band + diaphragm/hammock/seed
  ctx.save();
  traceTorso(ctx, f.ribW);
  ctx.clip();
  ctx.fillStyle = pal.fur;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(100, 116);
  ctx.quadraticCurveTo(140, 111, 180, 116);
  ctx.lineTo(140 + f.ribW + 4, 141);
  ctx.quadraticCurveTo(140, 148, 140 - f.ribW - 4, 141);
  ctx.closePath();
  ctx.fillStyle = pal.blackFur;
  ctx.fill();

  ctx.save();
  ctx.globalAlpha = 0.14;
  ctx.fillStyle = f.pistonColor;
  ctx.beginPath();
  ctx.ellipse(140, 186, 32, 34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.65;
  ctx.strokeStyle = pal.pauseDot;
  ctx.lineWidth = 2.2;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(109, f.diaBaseY);
  ctx.quadraticCurveTo(140, f.diaArchY, 171, f.diaBaseY);
  ctx.stroke();
  ctx.restore();

  const guideA = f.guideOp * f.guideEnv * 0.9;
  if (guideA > 0.02) {
    const gs = f.guidePhase * 10;
    ctx.save();
    ctx.globalAlpha = guideA;
    ctx.strokeStyle = pal.accent;
    ctx.lineWidth = 2;
    const xs: number[] = [122, 158];
    for (let i = 0; i < xs.length; i++) {
      const gx = xs[i];
      ctx.beginPath();
      ctx.moveTo(gx, 204 - gs);
      ctx.lineTo(gx, 193 - gs);
      ctx.moveTo(gx - 3.5, 197 - gs);
      ctx.lineTo(gx, 193 - gs);
      ctx.lineTo(gx + 3.5, 197 - gs);
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.save();
  ctx.globalAlpha = 0.1 + f.lift * 0.14;
  ctx.fillStyle = f.pistonColor;
  ctx.beginPath();
  ctx.moveTo(140 - f.hamW, f.hamEndY);
  ctx.quadraticCurveTo(140, f.hamMidY, 140 + f.hamW, f.hamEndY);
  ctx.quadraticCurveTo(140, 220, 140 - f.hamW, f.hamEndY);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = f.pistonColor;
  ctx.lineWidth = 4.2;
  ctx.beginPath();
  ctx.moveTo(140 - f.hamW, f.hamEndY);
  ctx.quadraticCurveTo(140, f.hamMidY, 140 + f.hamW, f.hamEndY);
  ctx.stroke();

  ctx.save();
  ctx.translate(0, f.seedDy);
  ctx.translate(140, 212);
  ctx.scale(f.seedScale, f.seedScale);
  ctx.translate(-140, -212);
  ctx.fillStyle = f.pistonColor;
  ctx.beginPath();
  ctx.moveTo(140, 192);
  ctx.bezierCurveTo(147, 192, 150, 197, 149, 203);
  ctx.bezierCurveTo(148, 209, 144, 212, 139, 212);
  ctx.bezierCurveTo(134, 212, 131, 208, 131, 202);
  ctx.bezierCurveTo(131, 196, 135, 192, 140, 192);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,253,249,0.68)';
  ctx.beginPath();
  ctx.arc(137.5, 197.5, 2.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.restore(); // end clip

  traceTorso(ctx, f.ribW);
  ctx.strokeStyle = pal.furEdge;
  ctx.lineWidth = 4.8;
  ctx.stroke();

  // 5. Arms
  const c = f.armCheer;
  if (pal.armOutline.length > 0) {
    ctx.strokeStyle = pal.armOutline;
    ctx.lineWidth = 13.5;
    ctx.beginPath();
    ctx.moveTo(102, 132);
    ctx.quadraticCurveTo(lerp(80, 74, c), lerp(162, 114, c), lerp(94, 68, c), lerp(202, 84, c) + f.wave);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(178, 132);
    ctx.quadraticCurveTo(lerp(200, 206, c), lerp(162, 114, c), lerp(186, 212, c), lerp(202, 84, c) - f.wave);
    ctx.stroke();
  }
  ctx.strokeStyle = pal.blackFur;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(102, 132);
  ctx.quadraticCurveTo(lerp(80, 74, c), lerp(162, 114, c), lerp(94, 68, c), lerp(202, 84, c) + f.wave);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(178, 132);
  ctx.quadraticCurveTo(lerp(200, 206, c), lerp(162, 114, c), lerp(186, 212, c), lerp(202, 84, c) - f.wave);
  ctx.stroke();

  // 6. Head
  ctx.save();
  ctx.translate(0, f.headY);
  ctx.translate(140, 90);
  ctx.rotate((f.headRot * Math.PI) / 180);
  ctx.translate(-140, -90);

  ctx.save();
  ctx.translate(108, 62);
  ctx.rotate((f.earTilt * Math.PI) / 180);
  ctx.translate(-108, -62);
  ctx.fillStyle = pal.blackFur;
  ctx.strokeStyle = pal.furEdge;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.ellipse(101, 54, 14, 13, (-18 * Math.PI) / 180, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.translate(172, 62);
  ctx.rotate((-f.earTilt * Math.PI) / 180);
  ctx.translate(-172, -62);
  ctx.fillStyle = pal.blackFur;
  ctx.strokeStyle = pal.furEdge;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.ellipse(179, 53, 14.5, 13, (16 * Math.PI) / 180, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  ctx.beginPath();
  ctx.moveTo(140, 44);
  ctx.bezierCurveTo(171, 43, 191, 62, 190, 88);
  ctx.bezierCurveTo(189, 111, 169, 124, 140, 124);
  ctx.bezierCurveTo(110, 124, 91, 111, 90, 87);
  ctx.bezierCurveTo(89, 62, 110, 45, 140, 44);
  ctx.closePath();
  ctx.fillStyle = pal.fur;
  ctx.strokeStyle = pal.furEdge;
  ctx.lineWidth = 4.8;
  ctx.fill();
  ctx.stroke();

  ctx.save();
  ctx.globalAlpha = f.blushOp * 0.45;
  ctx.fillStyle = pal.accent;
  ctx.beginPath();
  ctx.ellipse(108, 100, 11, 6.5, 0, 0, Math.PI * 2);
  ctx.ellipse(172, 100, 11, 6.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = pal.blackFur;
  ctx.beginPath();
  ctx.ellipse(120, 86, 12.5, 15, (16 * Math.PI) / 180, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(160, 86, 12.5, 15, (-16 * Math.PI) / 180, 0, Math.PI * 2);
  ctx.fill();

  if (f.useLineEyes) {
    ctx.strokeStyle = '#FFFDF9';
    ctx.lineWidth = 3.1;
    ctx.beginPath();
    if (f.eyeMood === 'focus') {
      ctx.moveTo(114, 86); ctx.quadraticCurveTo(120, 82, 126, 86);
      ctx.moveTo(154, 86); ctx.quadraticCurveTo(160, 82, 166, 86);
    } else if (f.eyeMood === 'relax') {
      ctx.moveTo(114, 85); ctx.quadraticCurveTo(120, 90, 126, 85);
      ctx.moveTo(154, 85); ctx.quadraticCurveTo(160, 90, 166, 85);
    } else {
      ctx.moveTo(114, 88); ctx.quadraticCurveTo(120, 80, 126, 88);
      ctx.moveTo(154, 88); ctx.quadraticCurveTo(160, 80, 166, 88);
    }
    ctx.stroke();
  } else {
    const ry = Math.max(0.8, 5.6 * f.eyeScaleY);
    ctx.fillStyle = '#FFFDF9';
    ctx.beginPath();
    ctx.ellipse(121, 85, 5.3, ry, 0, 0, Math.PI * 2);
    ctx.ellipse(159, 85, 5.3, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    if (f.eyeScaleY > 0.3) {
      ctx.fillStyle = pal.lineInk;
      ctx.beginPath();
      ctx.arc(122 + f.pupilOffsetX, 85.5 + f.pupilOffsetY, 2.5, 0, Math.PI * 2);
      ctx.arc(158 + f.pupilOffsetX, 85.5 + f.pupilOffsetY, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.fillStyle = pal.lineInk;
  ctx.beginPath();
  ctx.ellipse(140, 95, 4.2, 2.8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = pal.lineInk;
  ctx.lineWidth = 3.1;
  ctx.beginPath();
  if (f.mouthBlow > 0.35) {
    const r = 2.4 + f.mouthBlow * 1.1;
    ctx.ellipse(140, 106, r, r * 0.92, 0, 0, Math.PI * 2);
  } else if (f.confettiOp > 0.5) {
    ctx.moveTo(129, 102); ctx.quadraticCurveTo(140, 115, 151, 102);
  } else if (f.pauseOp > 0.1) {
    ctx.moveTo(135, 106); ctx.lineTo(145, 106);
  } else if (f.colorT < 0.4) {
    ctx.moveTo(131, 104); ctx.quadraticCurveTo(140, 111, 149, 104);
  } else {
    ctx.moveTo(134, 106); ctx.quadraticCurveTo(140, 107.5, 146, 106);
  }
  ctx.stroke();
  ctx.restore();

  // 7. Breath flow
  if (f.exhaleOp > 0.02) {
    ctx.save();
    ctx.globalAlpha = f.exhaleOp * 0.85;
    ctx.strokeStyle = pal.accent;
    ctx.lineWidth = 2.6;
    ctx.setLineDash([22, 14]);
    ctx.lineDashOffset = -f.flowOffset;
    ctx.beginPath();
    ctx.moveTo(196, 102);
    ctx.quadraticCurveTo(222, 95, 254, 90);
    ctx.stroke();
    ctx.restore();
  }
  if (f.inhaleOp > 0.02) {
    ctx.save();
    ctx.globalAlpha = f.inhaleOp * 0.85;
    ctx.strokeStyle = pal.relax;
    ctx.lineWidth = 2.6;
    ctx.setLineDash([20, 14]);
    ctx.lineDashOffset = -f.flowOffset * 0.9;
    ctx.beginPath();
    ctx.moveTo(252, 90); ctx.quadraticCurveTo(220, 96, 194, 96);
    ctx.moveTo(28, 90); ctx.quadraticCurveTo(60, 96, 86, 96);
    ctx.stroke();
    ctx.restore();
  }

  // 8. Pause dots
  if (f.pauseOp > 0.02) {
    ctx.save();
    ctx.globalAlpha = f.pauseOp;
    ctx.fillStyle = pal.pauseDot;
    const pts: number[][] = [[204, 58], [216, 52], [228, 46]];
    for (let i = 0; i < pts.length; i++) {
      ctx.beginPath();
      ctx.arc(pts[i][0], pts[i][1], 3.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 9. Confetti
  if (f.confettiOp > 0.02) {
    ctx.save();
    ctx.globalAlpha = f.confettiOp;
    ctx.translate(0, f.confettiDrift);
    ctx.strokeStyle = pal.accent;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(68, 58); ctx.lineTo(68, 70);
    ctx.moveTo(62, 64); ctx.lineTo(74, 64);
    ctx.stroke();
    ctx.strokeStyle = pal.relax;
    ctx.beginPath();
    ctx.moveTo(214, 54); ctx.lineTo(214, 66);
    ctx.moveTo(208, 60); ctx.lineTo(220, 60);
    ctx.stroke();
    ctx.fillStyle = pal.accent;
    ctx.beginPath();
    ctx.arc(56, 108, 4.5, 0, Math.PI * 2);
    ctx.arc(140, 22, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = pal.relax;
    ctx.beginPath();
    ctx.arc(224, 104, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}
