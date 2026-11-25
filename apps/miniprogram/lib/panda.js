// 微信小程序端 — 科学提肛 × 抽象小熊猫动画引擎 + Canvas 2D 矢量渲染器。
// 数学曲线、三套呼吸逻辑、阻尼过渡与深浅色板 100% 对齐 @tilemo/core/panda.ts。

var PALETTES = {
  light: {
    lineInk: "#2B2320",
    blackFur: "#2B2320",
    furEdge: "#2B2320",
    armOutline: null,
    fur: "#FFFDF9",
    cushion: "#EBDDCB",
    accent: "#E85A4F",
    relax: "#4F7A65",
    neutral: "#8D7B6C",
    pauseDot: "#6F5F50",
    shadow: "#2B2320"
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
    shadow: "#000000"
  }
};

function lerp(a, b, t) {
  return a + (b - a) * t;
}
function damp(cur, target, speed, dt) {
  return lerp(cur, target, 1 - Math.exp(-speed * dt));
}
function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}
function easeInOutSine(t) {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}
function hexToRgb(hex) {
  var n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function lerpHex(h1, h2, t) {
  var a = hexToRgb(h1);
  var b = hexToRgb(h2);
  return (
    "rgb(" +
    Math.round(lerp(a[0], b[0], t)) +
    "," +
    Math.round(lerp(a[1], b[1], t)) +
    "," +
    Math.round(lerp(a[2], b[2], t)) +
    ")"
  );
}
function liftCurve(u, isQuick) {
  var riseEnd = isQuick ? 0.35 : 0.24;
  if (u < riseEnd) return easeOutCubic(clamp01(u / riseEnd));
  return 1.0;
}
function dropCurve(u, isQuick) {
  var dropEnd = isQuick ? 0.45 : 0.36;
  if (u < dropEnd) return easeInOutSine(clamp01(u / dropEnd));
  return 1.0;
}

function getPandaCopy(snap, contractSec) {
  var isQuick = contractSec <= 1.5;
  var isLongHold = contractSec >= 4.5;
  if (snap.stage === "prep") {
    return { pillText: "准 · 备", cueText: "坐稳放松肩膀和臀部，先轻轻吸一口气" };
  }
  if (snap.stage === "done") {
    return { pillText: "✓ 今天提了", cueText: "漂亮！外松内提，今天这组非常标准" };
  }
  if (snap.state === "paused") {
    return { pillText: "已暂停", cueText: "已定格当前进度，随时可以继续" };
  }
  if (snap.phase === "contract") {
    if (isQuick) {
      return { pillText: "↑ 快收 · 上提", cueText: "保持自然呼吸，盆底干脆向上一提" };
    }
    if (isLongHold) {
      var elapsedSec = Math.max(0, contractSec - snap.remaining);
      return {
        pillText: "↑ 呼气 · 上提",
        cueText:
          elapsedSec < 2
            ? "先轻吹气启动上提，臀腿和肩膀保持松弛"
            : "稳住内部提拉感，恢复浅而平稳的自然呼吸"
      };
    }
    return { pillText: "↑ 呼气 · 上提", cueText: "像轻吹蜡烛一样呼气，盆底向内向上轻提" };
  }
  if (isQuick) {
    return { pillText: "↓ 快放 · 沉降", cueText: "立刻彻底放软，准备下一次轻提" };
  }
  return { pillText: "↓ 吸气 · 放下", cueText: "鼻吸气，感受内部吊床彻底松开、向下沉落" };
}

function PandaEngine() {
  this.clock = 0;
  this.phaseElapsed = 0;
  this.phaseDuration = 3;
  this.lastStage = "prep";
  this.lastPhase = "contract";
  this.lastState = "prep";
  this.lastReps = -1;
  this.lastRemaining = -1;
  this.contractSec = 3;
  this.relaxSec = 3;
  this.blinkTimer = 2.4;
  this.blinkProgress = 0;
  this.disp = {
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
    mouthBlow: 0
  };
}

PandaEngine.prototype.reset = function () {
  this.clock = 0;
  this.phaseElapsed = 0;
  this.lastReps = -1;
  this.lastRemaining = -1;
  this.disp.lift = 0.12;
  this.disp.armCheer = 0;
  this.disp.exhaleOp = 0;
  this.disp.inhaleOp = 0;
};

PandaEngine.prototype.sync = function (input) {
  this.contractSec = Math.max(0.5, input.contractSec || 3);
  this.relaxSec = Math.max(0.5, input.relaxSec || 3);
  var dur =
    input.stage === "prep"
      ? 2.52
      : input.stage === "done"
        ? 4.0
        : input.phase === "contract"
          ? this.contractSec
          : this.relaxSec;

  var changed =
    input.stage !== this.lastStage ||
    input.phase !== this.lastPhase ||
    input.startedReps !== this.lastReps;

  if (changed) {
    this.phaseElapsed = 0;
    this.phaseDuration = dur;
  } else if (
    input.stage === "breath" &&
    input.state === "running" &&
    input.remaining !== this.lastRemaining
  ) {
    var expected = Math.max(0, dur - input.remaining);
    var drift = expected - this.phaseElapsed;
    if (Math.abs(drift) > 0.35) this.phaseElapsed = expected;
    else this.phaseElapsed += drift * 0.4;
    this.phaseDuration = dur;
  }

  this.lastStage = input.stage;
  this.lastPhase = input.phase;
  this.lastState = input.state;
  this.lastReps = input.startedReps;
  this.lastRemaining = input.remaining;
};

PandaEngine.prototype.step = function (dtRaw, theme) {
  var dt = Math.min(0.05, Math.max(0.001, dtRaw));
  var pal = PALETTES[theme === "dark" ? "dark" : "light"];
  var stage = this.lastStage;
  var state = this.lastState;
  var phase = this.lastPhase;
  var isPaused = stage === "breath" && state === "paused";
  var isQuick = this.contractSec <= 1.5;
  var isLongHold = this.contractSec >= 4.5;

  this.clock += dt;
  if (!isPaused) {
    this.phaseElapsed = Math.min(this.phaseDuration, this.phaseElapsed + dt);
  }

  var blinkClose = 0;
  this.blinkTimer -= dt;
  if (this.blinkTimer <= 0) {
    this.blinkProgress = 0.16;
    this.blinkTimer = 2.5 + (Math.sin(this.clock * 12.7) + 1) * 1.4;
  }
  if (this.blinkProgress > 0) {
    this.blinkProgress = Math.max(0, this.blinkProgress - dt);
    blinkClose = Math.sin((1 - this.blinkProgress / 0.16) * Math.PI);
  }

  var u = clamp01(this.phaseElapsed / Math.max(0.01, this.phaseDuration));
  var idleBreath = Math.sin(this.clock * 2.0);
  var d = this.disp;

  var targetLift = d.lift;
  var targetChest = idleBreath * 0.22;
  var targetHeadY = 0;
  var targetHeadRot = 0;
  var targetEarTilt = 0;
  var targetArmCheer = 0;
  var targetExhale = 0;
  var targetInhale = 0;
  var targetBlush = 0.2;
  var targetGuide = 0;
  var targetColorT = d.colorT;
  var targetAuraR = 104;
  var targetMouthBlow = 0;

  var pauseOp = 0;
  var confettiOp = 0;
  var useLineEyes = false;
  var eyeMood = "open";
  var eyeScaleY = 1 - blinkClose * 0.88;
  var pupilOffsetX = 0;
  var pupilOffsetY = 0;

  if (stage === "prep") {
    targetLift = 0.08;
    targetChest = Math.sin(u * Math.PI) * 0.65;
    targetColorT = 0;
    targetInhale = Math.sin(u * Math.PI) * 0.55;
    targetHeadY = -targetChest * 1.1;
  } else if (isPaused) {
    targetLift = d.lift;
    targetChest = 0;
    targetHeadRot = Math.sin(this.clock * 1.3) * 2.4;
    pupilOffsetX = Math.sin(this.clock * 1.0) * 1.8;
    pauseOp = 0.5 + Math.sin(this.clock * 3) * 0.3;
    targetAuraR = 96;
  } else if (stage === "breath" && phase === "contract") {
    var f = liftCurve(u, isQuick);
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
        var eu = clamp01(this.phaseElapsed / 2.0);
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
      eyeMood = "focus";
    }
  } else if (stage === "breath" && phase === "relax") {
    var dr = dropCurve(u, isQuick);
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
      eyeMood = "relax";
    } else {
      eyeScaleY = 0.78 - blinkClose * 0.72;
      pupilOffsetY = 0.8;
    }
  } else if (stage === "done") {
    var bounce = Math.abs(Math.sin(this.clock * 3.8));
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
    eyeMood = "happy";
  }

  var k = isQuick ? 18 : 10;
  d.lift = damp(d.lift, targetLift, k, dt);
  d.chest = damp(d.chest, targetChest, 8, dt);
  d.headY = damp(d.headY, targetHeadY, 9, dt);
  d.headRot = damp(d.headRot, targetHeadRot, 9, dt);
  d.earTilt = damp(d.earTilt, targetEarTilt, 10, dt);
  d.armCheer = damp(d.armCheer, targetArmCheer, 7.5, dt);
  d.exhaleOp = damp(d.exhaleOp, targetExhale, 10, dt);
  d.inhaleOp = damp(d.inhaleOp, targetInhale, 10, dt);
  d.blushOp = damp(d.blushOp, targetBlush, 8, dt);
  d.guideOp = damp(d.guideOp, targetGuide, 9, dt);
  d.colorT = damp(d.colorT, targetColorT, 8, dt);
  d.auraR = damp(d.auraR, targetAuraR, 6, dt);
  d.mouthBlow = damp(d.mouthBlow, targetMouthBlow, 12, dt);

  var lift = d.lift;
  var hamW = lerp(33, 24, lift);
  var hamEndY = lerp(206, 198, lift);
  var hamMidY = lerp(218, 182, lift);
  var hamActualMidY = 0.5 * (hamEndY + hamMidY);
  var microFloat = lift > 0.75 ? Math.sin(this.clock * 3.6) * 0.5 : 0;
  var guidePhase = (this.clock * 1.1) % 1;

  return {
    lift: lift,
    chest: d.chest,
    headY: d.headY + idleBreath * 0.55,
    headRot: d.headRot,
    earTilt: d.earTilt,
    armCheer: d.armCheer,
    exhaleOp: d.exhaleOp,
    inhaleOp: d.inhaleOp,
    blushOp: d.blushOp,
    guideOp: d.guideOp,
    guidePhase: guidePhase,
    guideEnv: Math.sin(guidePhase * Math.PI),
    colorT: d.colorT,
    auraR: d.auraR,
    mouthBlow: d.mouthBlow,
    eyeScaleY: eyeScaleY,
    useLineEyes: useLineEyes,
    eyeMood: eyeMood,
    pupilOffsetX: pupilOffsetX,
    pupilOffsetY: pupilOffsetY,
    pauseOp: pauseOp,
    confettiOp: confettiOp,
    confettiDrift: confettiOp > 0.01 ? Math.sin(this.clock * 4) * 5 : 0,
    flowOffset: this.clock * 42,
    wave: d.armCheer > 0.6 ? Math.sin(this.clock * 10) * 6 * d.armCheer : 0,
    pistonColor: isPaused ? pal.neutral : lerpHex(pal.relax, pal.accent, clamp01(d.colorT)),
    hamW: hamW,
    hamEndY: hamEndY,
    hamMidY: hamMidY,
    hamActualMidY: hamActualMidY,
    diaBaseY: lerp(164, 155, lift),
    diaArchY: lerp(161, 146, lift),
    seedDy: hamActualMidY - 2.5 - 212 + microFloat,
    seedScale: lerp(1.0, 0.94, lift),
    ribW: 46 + d.chest * 2.8
  };
};

function traceTorso(ctx, ribW) {
  var hipW = 54;
  ctx.beginPath();
  ctx.moveTo(105, 118);
  ctx.quadraticCurveTo(140, 113, 175, 118);
  ctx.bezierCurveTo(140 + ribW + 6, 136, 140 + hipW + 2, 180, 140 + hipW - 4, 214);
  ctx.quadraticCurveTo(140, 227, 90, 214);
  ctx.bezierCurveTo(140 - hipW - 2, 180, 140 - ribW - 6, 136, 105, 118);
  ctx.closePath();
}

function drawPandaCanvas(ctx, size, f, theme) {
  var pal = PALETTES[theme === "dark" ? "dark" : "light"];
  ctx.save();
  ctx.clearRect(0, 0, size, size);
  ctx.scale(size / 280, size / 280);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // 1. 氛围光晕
  var aura = ctx.createRadialGradient(140, 156, 4, 140, 156, f.auraR);
  aura.addColorStop(0, f.pistonColor);
  aura.addColorStop(1, "rgba(0,0,0,0)");
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(140, 156, f.auraR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 2. 地面投影 + 稳固坐垫
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

  // 3. 盘坐双腿
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

  // 4. 躯干 + 裁切黑肩带 + 科学透视（膈肌/盆底吊床/暖朱小种子）
  ctx.save();
  traceTorso(ctx, f.ribW);
  ctx.clip();
  ctx.fillStyle = pal.fur;
  ctx.fill();

  // 对称黑肩带
  ctx.beginPath();
  ctx.moveTo(100, 116);
  ctx.quadraticCurveTo(140, 111, 180, 116);
  ctx.lineTo(140 + f.ribW + 4, 141);
  ctx.quadraticCurveTo(140, 148, 140 - f.ribW - 4, 141);
  ctx.closePath();
  ctx.fillStyle = pal.blackFur;
  ctx.fill();

  // 透视柔和内光
  ctx.save();
  ctx.globalAlpha = 0.14;
  ctx.fillStyle = f.pistonColor;
  ctx.beginPath();
  ctx.ellipse(140, 186, 32, 34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 膈肌虚线弧
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

  // 上提小箭头（正弦包络零跳帧）
  var guideA = f.guideOp * f.guideEnv * 0.9;
  if (guideA > 0.02) {
    var gs = f.guidePhase * 10;
    ctx.save();
    ctx.globalAlpha = guideA;
    ctx.strokeStyle = pal.accent;
    ctx.lineWidth = 2;
    [122, 158].forEach(function (gx) {
      ctx.beginPath();
      ctx.moveTo(gx, 204 - gs);
      ctx.lineTo(gx, 193 - gs);
      ctx.moveTo(gx - 3.5, 197 - gs);
      ctx.lineTo(gx, 193 - gs);
      ctx.lineTo(gx + 3.5, 197 - gs);
      ctx.stroke();
    });
    ctx.restore();
  }

  // 盆底吊床弧线 + 填充
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

  // 暖朱小种子（锚定在吊床顶点上方 2.5px）
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
  ctx.fillStyle = "rgba(255,253,249,0.68)";
  ctx.beginPath();
  ctx.arc(137.5, 197.5, 2.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.restore(); // end torso clip

  // 躯干顶层外描边
  traceTorso(ctx, f.ribW);
  ctx.strokeStyle = pal.furEdge;
  ctx.lineWidth = 4.8;
  ctx.stroke();

  // 5. 两只小黑臂（完成态平滑抬手）
  var c = f.armCheer;
  function strokeArms(color, width) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(102, 132);
    ctx.quadraticCurveTo(lerp(80, 74, c), lerp(162, 114, c), lerp(94, 68, c), lerp(202, 84, c) + f.wave);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(178, 132);
    ctx.quadraticCurveTo(lerp(200, 206, c), lerp(162, 114, c), lerp(186, 212, c), lerp(202, 84, c) - f.wave);
    ctx.stroke();
  }
  if (pal.armOutline) strokeArms(pal.armOutline, 13.5);
  strokeArms(pal.blackFur, 10);

  // 6. 抽象熊猫头
  ctx.save();
  ctx.translate(0, f.headY);
  ctx.translate(140, 90);
  ctx.rotate((f.headRot * Math.PI) / 180);
  ctx.translate(-140, -90);

  // 双耳
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

  // 脑袋轮廓
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

  // 腮红
  ctx.save();
  ctx.globalAlpha = f.blushOp * 0.45;
  ctx.fillStyle = pal.accent;
  ctx.beginPath();
  ctx.ellipse(108, 100, 11, 6.5, 0, 0, Math.PI * 2);
  ctx.ellipse(172, 100, 11, 6.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 斜椭圆黑眼圈
  ctx.fillStyle = pal.blackFur;
  ctx.beginPath();
  ctx.ellipse(120, 86, 12.5, 15, (16 * Math.PI) / 180, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(160, 86, 12.5, 15, (-16 * Math.PI) / 180, 0, Math.PI * 2);
  ctx.fill();

  // 眼睛
  if (f.useLineEyes) {
    ctx.strokeStyle = "#FFFDF9";
    ctx.lineWidth = 3.1;
    ctx.beginPath();
    if (f.eyeMood === "focus") {
      ctx.moveTo(114, 86); ctx.quadraticCurveTo(120, 82, 126, 86);
      ctx.moveTo(154, 86); ctx.quadraticCurveTo(160, 82, 166, 86);
    } else if (f.eyeMood === "relax") {
      ctx.moveTo(114, 85); ctx.quadraticCurveTo(120, 90, 126, 85);
      ctx.moveTo(154, 85); ctx.quadraticCurveTo(160, 90, 166, 85);
    } else {
      ctx.moveTo(114, 88); ctx.quadraticCurveTo(120, 80, 126, 88);
      ctx.moveTo(154, 88); ctx.quadraticCurveTo(160, 80, 166, 88);
    }
    ctx.stroke();
  } else {
    var ry = Math.max(0.8, 5.6 * f.eyeScaleY);
    ctx.fillStyle = "#FFFDF9";
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

  // 小黑鼻
  ctx.fillStyle = pal.lineInk;
  ctx.beginPath();
  ctx.ellipse(140, 95, 4.2, 2.8, 0, 0, Math.PI * 2);
  ctx.fill();

  // 嘴巴
  ctx.strokeStyle = pal.lineInk;
  ctx.lineWidth = 3.1;
  ctx.beginPath();
  if (f.mouthBlow > 0.35) {
    var r = 2.4 + f.mouthBlow * 1.1;
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
  ctx.restore(); // end head

  // 7. 脸颊外侧呼气 / 吸气气流
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
    ctx.lineWidth = 2;
    ctx.globalAlpha = f.exhaleOp * 0.55;
    ctx.setLineDash([16, 16]);
    ctx.lineDashOffset = -f.flowOffset * 0.85;
    ctx.beginPath();
    ctx.moveTo(196, 110);
    ctx.quadraticCurveTo(222, 109, 248, 106);
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

  // 8. 暂停点
  if (f.pauseOp > 0.02) {
    ctx.save();
    ctx.globalAlpha = f.pauseOp;
    ctx.fillStyle = pal.pauseDot;
    [[204, 58], [216, 52], [228, 46]].forEach(function (pt) {
      ctx.beginPath();
      ctx.arc(pt[0], pt[1], 3.4, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  // 9. 完成态庆祝光点
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

module.exports = {
  PALETTES: PALETTES,
  PandaEngine: PandaEngine,
  getPandaCopy: getPandaCopy,
  drawPandaCanvas: drawPandaCanvas
};
