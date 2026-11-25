// @tilemo/web — 科学提肛 × 抽象小熊猫 SVG 舞台组件。
// 遵循“低频 React + 高频 Ref + 软校准时钟”架构：
// 60fps rAF 仅通过 ref 直接更新 SVG 几何与样式，不触发 React 重渲染；
// 全程保持挂载（prep / breath / done 无缝阻尼过渡），自动适配浅色/深色与 prefers-reduced-motion。

import { useEffect, useId, useRef } from "react";
import {
  PANDA_PALETTES,
  PandaEngine,
  type MetroSnapshot,
  type PandaTheme,
} from "@tilemo/core";

export interface PandaStageProps {
  snap: MetroSnapshot;
  contractSec: number;
  relaxSec: number;
  className?: string;
}

function readDomTheme(): PandaTheme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function PandaStage({ snap, contractSec, relaxSec, className }: PandaStageProps) {
  const uid = useId().replace(/:/g, "");
  const ids = {
    aura: `${uid}-aura`,
    xray: `${uid}-xray`,
    blush: `${uid}-blush`,
    clip: `${uid}-clip`,
  };

  const engineRef = useRef<PandaEngine | null>(null);
  if (!engineRef.current) engineRef.current = new PandaEngine();

  const themeRef = useRef<PandaTheme>(readDomTheme());
  const reduceRef = useRef<boolean>(
    typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
  );

  // SVG refs
  const bgAura = useRef<SVGCircleElement>(null);
  const auraStop0 = useRef<SVGStopElement>(null);
  const auraStop1 = useRef<SVGStopElement>(null);
  const auraStop2 = useRef<SVGStopElement>(null);
  const groundShadow = useRef<SVGEllipseElement>(null);
  const cushionPath = useRef<SVGPathElement>(null);

  const legL = useRef<SVGPathElement>(null);
  const legR = useRef<SVGPathElement>(null);
  const torsoClipPath = useRef<SVGPathElement>(null);
  const torsoFillPath = useRef<SVGPathElement>(null);
  const torsoStrokePath = useRef<SVGPathElement>(null);
  const shoulderBand = useRef<SVGPathElement>(null);

  const xrayStop0 = useRef<SVGStopElement>(null);
  const xrayStop1 = useRef<SVGStopElement>(null);
  const diaphragmArc = useRef<SVGPathElement>(null);
  const liftGuides = useRef<SVGGElement>(null);
  const guideL = useRef<SVGPathElement>(null);
  const guideR = useRef<SVGPathElement>(null);
  const hammockFill = useRef<SVGPathElement>(null);
  const hammockArc = useRef<SVGPathElement>(null);
  const seedGroup = useRef<SVGGElement>(null);
  const seedBody = useRef<SVGPathElement>(null);

  const armLOutline = useRef<SVGPathElement>(null);
  const armROutline = useRef<SVGPathElement>(null);
  const armL = useRef<SVGPathElement>(null);
  const armR = useRef<SVGPathElement>(null);

  const headGroup = useRef<SVGGElement>(null);
  const earLGroup = useRef<SVGGElement>(null);
  const earRGroup = useRef<SVGGElement>(null);
  const earL = useRef<SVGEllipseElement>(null);
  const earR = useRef<SVGEllipseElement>(null);
  const headPath = useRef<SVGPathElement>(null);
  const blushL = useRef<SVGEllipseElement>(null);
  const blushR = useRef<SVGEllipseElement>(null);
  const patchL = useRef<SVGEllipseElement>(null);
  const patchR = useRef<SVGEllipseElement>(null);
  const openEyes = useRef<SVGGElement>(null);
  const scleraL = useRef<SVGEllipseElement>(null);
  const scleraR = useRef<SVGEllipseElement>(null);
  const pupilL = useRef<SVGCircleElement>(null);
  const pupilR = useRef<SVGCircleElement>(null);
  const lineEyes = useRef<SVGGElement>(null);
  const lineEyeL = useRef<SVGPathElement>(null);
  const lineEyeR = useRef<SVGPathElement>(null);
  const nose = useRef<SVGEllipseElement>(null);
  const mouthPath = useRef<SVGPathElement>(null);

  const exhaleFlow = useRef<SVGGElement>(null);
  const exhale1 = useRef<SVGPathElement>(null);
  const exhale2 = useRef<SVGPathElement>(null);
  const inhaleFlow = useRef<SVGGElement>(null);
  const inhale1 = useRef<SVGPathElement>(null);
  const inhale2 = useRef<SVGPathElement>(null);
  const pauseBubble = useRef<SVGGElement>(null);
  const pauseD1 = useRef<SVGCircleElement>(null);
  const pauseD2 = useRef<SVGCircleElement>(null);
  const pauseD3 = useRef<SVGCircleElement>(null);
  const confettiGroup = useRef<SVGGElement>(null);
  const confS1 = useRef<SVGPathElement>(null);
  const confS2 = useRef<SVGPathElement>(null);
  const confC1 = useRef<SVGCircleElement>(null);
  const confC2 = useRef<SVGCircleElement>(null);
  const confC3 = useRef<SVGCircleElement>(null);

  // Sync 1Hz MetroSnapshot into engine
  useEffect(() => {
    engineRef.current!.sync({
      stage: snap.stage,
      state: snap.state,
      phase: snap.phase,
      remaining: snap.remaining,
      startedReps: snap.startedReps,
      contractSec,
      relaxSec,
    });
  }, [snap.stage, snap.state, snap.phase, snap.remaining, snap.startedReps, contractSec, relaxSec]);

  // Observe theme & reduced-motion + run 60fps rAF loop
  useEffect(() => {
    const mo = new MutationObserver(() => {
      themeRef.current = readDomTheme();
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const onMq = (e: MediaQueryListEvent) => {
      reduceRef.current = e.matches;
    };
    mq?.addEventListener?.("change", onMq);

    let rafId = 0;
    let lastTs = performance.now();

    const frame = (ts: number) => {
      const dt = (ts - lastTs) / 1000;
      lastTs = ts;
      const theme = themeRef.current;
      const reduce = reduceRef.current;
      const pal = PANDA_PALETTES[theme];
      const f = engineRef.current!.step(dt, theme, reduce);

      // 1. Torso + symmetric clipped shoulder band
      const ribW = f.ribW;
      const hipW = 54;
      const torsoD = [
        "M 105 118",
        "Q 140 113 175 118",
        `C ${(140 + ribW + 6).toFixed(1)} 136, ${(140 + hipW + 2).toFixed(1)} 180, ${(140 + hipW - 4).toFixed(1)} 214`,
        "Q 140 227 90 214",
        `C ${(140 - hipW - 2).toFixed(1)} 180, ${(140 - ribW - 6).toFixed(1)} 136, 105 118`,
        "Z",
      ].join(" ");
      torsoClipPath.current?.setAttribute("d", torsoD);
      torsoFillPath.current?.setAttribute("d", torsoD);
      torsoStrokePath.current?.setAttribute("d", torsoD);
      torsoFillPath.current?.setAttribute("fill", pal.fur);
      torsoStrokePath.current?.setAttribute("stroke", pal.furEdge);

      const bandD = [
        "M 100 116",
        "Q 140 111 180 116",
        `L ${(140 + ribW + 4).toFixed(1)} 141`,
        `Q 140 148 ${(140 - ribW - 4).toFixed(1)} 141`,
        "Z",
      ].join(" ");
      shoulderBand.current?.setAttribute("d", bandD);
      shoulderBand.current?.setAttribute("fill", pal.blackFur);

      // 2. Diaphragm + Pelvic floor hammock + anchored seed
      xrayStop0.current?.setAttribute("stop-color", f.pistonColor);
      xrayStop1.current?.setAttribute("stop-color", f.pistonColor);
      diaphragmArc.current?.setAttribute(
        "d",
        `M 109 ${f.diaBaseY.toFixed(1)} Q 140 ${f.diaArchY.toFixed(1)} 171 ${f.diaBaseY.toFixed(1)}`,
      );

      const hamD = `M ${(140 - f.hamW).toFixed(1)} ${f.hamEndY.toFixed(1)} Q 140 ${f.hamMidY.toFixed(1)} ${(140 + f.hamW).toFixed(1)} ${f.hamEndY.toFixed(1)}`;
      hammockArc.current?.setAttribute("d", hamD);
      hammockArc.current?.setAttribute("stroke", f.pistonColor);
      hammockFill.current?.setAttribute(
        "d",
        `${hamD} Q 140 220 ${(140 - f.hamW).toFixed(1)} ${f.hamEndY.toFixed(1)} Z`,
      );
      hammockFill.current?.setAttribute("fill", f.pistonColor);
      hammockFill.current?.setAttribute("opacity", (0.1 + f.lift * 0.14).toFixed(2));

      seedGroup.current?.setAttribute(
        "transform",
        `translate(0, ${f.seedDy.toFixed(2)}) translate(140 212) scale(${f.seedScale.toFixed(3)}) translate(-140 -212)`,
      );
      seedBody.current?.setAttribute("fill", f.pistonColor);

      const gShift = reduce ? 4 : f.guidePhase * 10;
      liftGuides.current?.setAttribute("opacity", (f.guideOp * f.guideEnv * 0.92).toFixed(2));
      guideL.current?.setAttribute(
        "d",
        `M 122 ${(204 - gShift).toFixed(1)} L 122 ${(193 - gShift).toFixed(1)} M 118.5 ${(197 - gShift).toFixed(1)} L 122 ${(193 - gShift).toFixed(1)} L 125.5 ${(197 - gShift).toFixed(1)}`,
      );
      guideR.current?.setAttribute(
        "d",
        `M 158 ${(204 - gShift).toFixed(1)} L 158 ${(193 - gShift).toFixed(1)} M 154.5 ${(197 - gShift).toFixed(1)} L 158 ${(193 - gShift).toFixed(1)} L 161.5 ${(197 - gShift).toFixed(1)}`,
      );
      guideL.current?.setAttribute("stroke", pal.accent);
      guideR.current?.setAttribute("stroke", pal.accent);

      // 3. Legs & damped cheering arms
      legL.current?.setAttribute("fill", pal.blackFur);
      legL.current?.setAttribute("stroke", pal.furEdge);
      legR.current?.setAttribute("fill", pal.blackFur);
      legR.current?.setAttribute("stroke", pal.furEdge);

      const c = f.armCheer;
      const armLD = `M 102 132 Q ${(80 + (74 - 80) * c).toFixed(1)} ${(162 + (114 - 162) * c).toFixed(1)} ${(94 + (68 - 94) * c).toFixed(1)} ${(202 + (84 - 202) * c + f.wave).toFixed(1)}`;
      const armRD = `M 178 132 Q ${(200 + (206 - 200) * c).toFixed(1)} ${(162 + (114 - 162) * c).toFixed(1)} ${(186 + (212 - 186) * c).toFixed(1)} ${(202 + (84 - 202) * c - f.wave).toFixed(1)}`;
      armLOutline.current?.setAttribute("d", armLD);
      armROutline.current?.setAttribute("d", armRD);
      armLOutline.current?.setAttribute("stroke", pal.armOutline);
      armROutline.current?.setAttribute("stroke", pal.armOutline);
      armL.current?.setAttribute("d", armLD);
      armR.current?.setAttribute("d", armRD);
      armL.current?.setAttribute("stroke", pal.blackFur);
      armR.current?.setAttribute("stroke", pal.blackFur);

      // 4. Head, ears, eyes, mouth
      headGroup.current?.setAttribute(
        "transform",
        `translate(0, ${f.headY.toFixed(2)}) rotate(${f.headRot.toFixed(2)} 140 90)`,
      );
      earLGroup.current?.setAttribute("transform", `rotate(${f.earTilt.toFixed(2)} 108 62)`);
      earRGroup.current?.setAttribute("transform", `rotate(${(-f.earTilt).toFixed(2)} 172 62)`);
      earL.current?.setAttribute("fill", pal.blackFur);
      earL.current?.setAttribute("stroke", pal.furEdge);
      earR.current?.setAttribute("fill", pal.blackFur);
      earR.current?.setAttribute("stroke", pal.furEdge);

      headPath.current?.setAttribute("fill", pal.fur);
      headPath.current?.setAttribute("stroke", pal.furEdge);
      patchL.current?.setAttribute("fill", pal.blackFur);
      patchR.current?.setAttribute("fill", pal.blackFur);
      nose.current?.setAttribute("fill", pal.lineInk);
      mouthPath.current?.setAttribute("stroke", pal.lineInk);
      pupilL.current?.setAttribute("fill", pal.lineInk);
      pupilR.current?.setAttribute("fill", pal.lineInk);
      blushL.current?.setAttribute("opacity", f.blushOp.toFixed(2));
      blushR.current?.setAttribute("opacity", f.blushOp.toFixed(2));

      if (f.useLineEyes) {
        openEyes.current?.setAttribute("opacity", "0");
        lineEyes.current?.setAttribute("opacity", "1");
        if (f.eyeMood === "focus") {
          lineEyeL.current?.setAttribute("d", "M 114 86 Q 120 82 126 86");
          lineEyeR.current?.setAttribute("d", "M 154 86 Q 160 82 166 86");
        } else if (f.eyeMood === "relax") {
          lineEyeL.current?.setAttribute("d", "M 114 85 Q 120 90 126 85");
          lineEyeR.current?.setAttribute("d", "M 154 85 Q 160 90 166 85");
        } else {
          lineEyeL.current?.setAttribute("d", "M 114 88 Q 120 80 126 88");
          lineEyeR.current?.setAttribute("d", "M 154 88 Q 160 80 166 88");
        }
      } else {
        openEyes.current?.setAttribute("opacity", "1");
        lineEyes.current?.setAttribute("opacity", "0");
        const ry = Math.max(0.7, 5.6 * f.eyeScaleY);
        scleraL.current?.setAttribute("ry", ry.toFixed(2));
        scleraR.current?.setAttribute("ry", ry.toFixed(2));
        pupilL.current?.setAttribute("cx", (122 + f.pupilOffsetX).toFixed(1));
        pupilL.current?.setAttribute("cy", (85.5 + f.pupilOffsetY).toFixed(1));
        pupilR.current?.setAttribute("cx", (158 + f.pupilOffsetX).toFixed(1));
        pupilR.current?.setAttribute("cy", (85.5 + f.pupilOffsetY).toFixed(1));
        const pOp = f.eyeScaleY > 0.3 ? "1" : "0";
        pupilL.current?.setAttribute("opacity", pOp);
        pupilR.current?.setAttribute("opacity", pOp);
      }

      if (f.mouthBlow > 0.35) {
        const oSize = 2.4 + f.mouthBlow * 1.1;
        mouthPath.current?.setAttribute(
          "d",
          `M ${(140 - oSize).toFixed(1)} 106 A ${oSize.toFixed(1)} ${(oSize * 0.92).toFixed(1)} 0 1 0 ${(140 + oSize).toFixed(1)} 106 A ${oSize.toFixed(1)} ${(oSize * 0.92).toFixed(1)} 0 1 0 ${(140 - oSize).toFixed(1)} 106`,
        );
      } else if (f.confettiOp > 0.5) {
        mouthPath.current?.setAttribute("d", "M 129 102 Q 140 115 151 102");
      } else if (f.pauseOp > 0.1) {
        mouthPath.current?.setAttribute("d", "M 135 106 L 145 106");
      } else if (f.colorT < 0.4) {
        mouthPath.current?.setAttribute("d", "M 131 104 Q 140 111 149 104");
      } else {
        mouthPath.current?.setAttribute("d", "M 134 106 Q 140 107.5 146 106");
      }

      // 5. Breath airflow lines (outside cheek contour)
      exhaleFlow.current?.setAttribute("opacity", (f.exhaleOp * 0.85).toFixed(2));
      exhale1.current?.setAttribute("stroke", pal.accent);
      exhale2.current?.setAttribute("stroke", pal.accent);
      exhale1.current?.setAttribute("stroke-dashoffset", (-f.flowOffset).toFixed(1));
      exhale2.current?.setAttribute("stroke-dashoffset", (-f.flowOffset * 0.85).toFixed(1));

      inhaleFlow.current?.setAttribute("opacity", (f.inhaleOp * 0.85).toFixed(2));
      inhale1.current?.setAttribute("stroke", pal.relax);
      inhale2.current?.setAttribute("stroke", pal.relax);
      inhale1.current?.setAttribute("stroke-dashoffset", (-f.flowOffset * 0.9).toFixed(1));
      inhale2.current?.setAttribute("stroke-dashoffset", (-f.flowOffset * 0.9).toFixed(1));

      // 6. Cushion, aura, pause dots, confetti
      cushionPath.current?.setAttribute("fill", pal.cushion);
      cushionPath.current?.setAttribute("stroke", pal.furEdge);
      bgAura.current?.setAttribute("r", f.auraR.toFixed(1));
      auraStop0.current?.setAttribute("stop-color", f.pistonColor);
      auraStop1.current?.setAttribute("stop-color", f.pistonColor);
      auraStop2.current?.setAttribute("stop-color", f.pistonColor);
      groundShadow.current?.setAttribute("fill", pal.shadow);

      pauseBubble.current?.setAttribute("opacity", f.pauseOp.toFixed(2));
      pauseD1.current?.setAttribute("fill", pal.pauseDot);
      pauseD2.current?.setAttribute("fill", pal.pauseDot);
      pauseD3.current?.setAttribute("fill", pal.pauseDot);

      confettiGroup.current?.setAttribute("opacity", f.confettiOp.toFixed(2));
      confettiGroup.current?.setAttribute("transform", `translate(0, ${f.confettiDrift.toFixed(1)})`);
      confS1.current?.setAttribute("stroke", pal.accent);
      confS2.current?.setAttribute("stroke", pal.relax);
      confC1.current?.setAttribute("fill", pal.accent);
      confC2.current?.setAttribute("fill", pal.relax);
      confC3.current?.setAttribute("fill", pal.accent);

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(rafId);
      mo.disconnect();
      mq?.removeEventListener?.("change", onMq);
    };
  }, []);

  return (
    <div className={className ? `panda-stage ${className}` : "panda-stage"}>
      <svg className="panda-svg" viewBox="0 0 280 280" aria-hidden="true">
        <defs>
          <radialGradient id={ids.aura} cx="50%" cy="55%" r="50%">
            <stop offset="0%" ref={auraStop0} stopColor="#E85A4F" stopOpacity="0.18" />
            <stop offset="70%" ref={auraStop1} stopColor="#E85A4F" stopOpacity="0.05" />
            <stop offset="100%" ref={auraStop2} stopColor="#E85A4F" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={ids.xray} cx="50%" cy="62%" r="50%">
            <stop offset="0%" ref={xrayStop0} stopColor="#E85A4F" stopOpacity="0.24" />
            <stop offset="100%" ref={xrayStop1} stopColor="#E85A4F" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={ids.blush} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#E85A4F" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#E85A4F" stopOpacity="0" />
          </radialGradient>
          <clipPath id={ids.clip}>
            <path ref={torsoClipPath} d="" />
          </clipPath>
        </defs>

        <circle ref={bgAura} cx="140" cy="156" r="106" fill={`url(#${ids.aura})`} />
        <ellipse ref={groundShadow} cx="140" cy="238" rx="76" ry="12" fill="#2B2320" opacity="0.12" />
        <path
          ref={cushionPath}
          d="M 74 232 Q 140 245 206 232 Q 214 224 202 221 Q 140 230 78 221 Q 66 224 74 232 Z"
          fill="#EBDDCB"
          stroke="#2B2320"
          strokeWidth="3.2"
          strokeLinejoin="round"
          opacity="0.92"
        />

        <g>
          <path
            ref={legL}
            d="M 102 204 C 76 202, 66 218, 82 226 C 98 233, 126 230, 134 222"
            fill="#2B2320"
            stroke="#2B2320"
            strokeWidth="3.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            ref={legR}
            d="M 178 204 C 204 202, 214 218, 198 226 C 182 233, 154 230, 146 222"
            fill="#2B2320"
            stroke="#2B2320"
            strokeWidth="3.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <ellipse cx="122" cy="222" rx="6" ry="4" fill="#FFFDF9" opacity="0.24" />
          <ellipse cx="158" cy="222" rx="6" ry="4" fill="#FFFDF9" opacity="0.24" />
        </g>

        <g>
          <g clipPath={`url(#${ids.clip})`}>
            <path ref={torsoFillPath} d="" fill="#FFFDF9" />
            <path ref={shoulderBand} d="" fill="#2B2320" />
          </g>

          <g opacity="0.92">
            <ellipse cx="140" cy="186" rx="34" ry="36" fill={`url(#${ids.xray})`} />
            <path
              ref={diaphragmArc}
              d=""
              fill="none"
              stroke="#6F5F50"
              strokeWidth="2.2"
              strokeDasharray="4 4"
              strokeLinecap="round"
              opacity="0.65"
            />
            <g ref={liftGuides} opacity="0">
              <path ref={guideL} d="" fill="none" stroke="#E85A4F" strokeWidth="2" strokeLinecap="round" />
              <path ref={guideR} d="" fill="none" stroke="#E85A4F" strokeWidth="2" strokeLinecap="round" />
            </g>
            <path ref={hammockFill} d="" fill="#E85A4F" opacity="0.14" />
            <path ref={hammockArc} d="" fill="none" stroke="#E85A4F" strokeWidth="4.2" strokeLinecap="round" />
            <g ref={seedGroup}>
              <path
                ref={seedBody}
                d="M 140 192 C 147 192, 150 197, 149 203 C 148 209, 144 212, 139 212 C 134 212, 131 208, 131 202 C 131 196, 135 192, 140 192 Z"
                fill="#E85A4F"
              />
              <circle cx="137.5" cy="197.5" r="2.1" fill="#FFFDF9" opacity="0.68" />
            </g>
          </g>

          <path ref={torsoStrokePath} d="" fill="none" stroke="#2B2320" strokeWidth="4.8" strokeLinejoin="round" />
        </g>

        <g>
          <path ref={armLOutline} d="" fill="none" stroke="transparent" strokeWidth="13.5" strokeLinecap="round" strokeLinejoin="round" />
          <path ref={armROutline} d="" fill="none" stroke="transparent" strokeWidth="13.5" strokeLinecap="round" strokeLinejoin="round" />
          <path ref={armL} d="" fill="none" stroke="#2B2320" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
          <path ref={armR} d="" fill="none" stroke="#2B2320" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
        </g>

        <g ref={headGroup}>
          <g ref={earLGroup}>
            <ellipse ref={earL} cx="101" cy="54" rx="14" ry="13" transform="rotate(-18 101 54)" fill="#2B2320" stroke="#2B2320" strokeWidth="2.2" />
          </g>
          <g ref={earRGroup}>
            <ellipse ref={earR} cx="179" cy="53" rx="14.5" ry="13" transform="rotate(16 179 53)" fill="#2B2320" stroke="#2B2320" strokeWidth="2.2" />
          </g>
          <path
            ref={headPath}
            d="M 140 44 C 171 43, 191 62, 190 88 C 189 111, 169 124, 140 124 C 110 124, 91 111, 90 87 C 89 62, 110 45, 140 44 Z"
            fill="#FFFDF9"
            stroke="#2B2320"
            strokeWidth="4.8"
            strokeLinejoin="round"
          />
          <ellipse ref={blushL} cx="108" cy="100" rx="11.5" ry="7" fill={`url(#${ids.blush})`} opacity="0.22" />
          <ellipse ref={blushR} cx="172" cy="100" rx="11.5" ry="7" fill={`url(#${ids.blush})`} opacity="0.22" />
          <ellipse ref={patchL} cx="120" cy="86" rx="12.5" ry="15" transform="rotate(16 120 86)" fill="#2B2320" />
          <ellipse ref={patchR} cx="160" cy="86" rx="12.5" ry="15" transform="rotate(-16 160 86)" fill="#2B2320" />

          <g ref={openEyes}>
            <ellipse ref={scleraL} cx="121" cy="85" rx="5.3" ry="5.6" fill="#FFFDF9" />
            <circle ref={pupilL} cx="122" cy="85.5" r="2.5" fill="#2B2320" />
            <ellipse ref={scleraR} cx="159" cy="85" rx="5.3" ry="5.6" fill="#FFFDF9" />
            <circle ref={pupilR} cx="158" cy="85.5" r="2.5" fill="#2B2320" />
          </g>
          <g ref={lineEyes} opacity="0">
            <path ref={lineEyeL} d="" fill="none" stroke="#FFFDF9" strokeWidth="3.1" strokeLinecap="round" />
            <path ref={lineEyeR} d="" fill="none" stroke="#FFFDF9" strokeWidth="3.1" strokeLinecap="round" />
          </g>
          <ellipse ref={nose} cx="140" cy="95" rx="4.2" ry="2.8" fill="#2B2320" />
          <path ref={mouthPath} d="" fill="none" stroke="#2B2320" strokeWidth="3.1" strokeLinecap="round" strokeLinejoin="round" />
        </g>

        <g ref={exhaleFlow} opacity="0">
          <path ref={exhale1} d="M 196 102 Q 214 98 228 94 T 254 90" fill="none" stroke="#E85A4F" strokeWidth="2.6" strokeLinecap="round" strokeDasharray="22 14" />
          <path ref={exhale2} d="M 196 110 Q 214 111 228 108 T 248 106" fill="none" stroke="#E85A4F" strokeWidth="2" strokeLinecap="round" strokeDasharray="16 16" opacity="0.65" />
        </g>
        <g ref={inhaleFlow} opacity="0">
          <path ref={inhale1} d="M 252 90 Q 228 95 212 96 T 194 96" fill="none" stroke="#4F7A65" strokeWidth="2.6" strokeLinecap="round" strokeDasharray="20 14" />
          <path ref={inhale2} d="M 28 90 Q 52 95 68 96 T 86 96" fill="none" stroke="#4F7A65" strokeWidth="2.6" strokeLinecap="round" strokeDasharray="20 14" />
        </g>

        <g ref={pauseBubble} opacity="0">
          <circle ref={pauseD1} cx="204" cy="58" r="3.4" fill="#6F5F50" />
          <circle ref={pauseD2} cx="216" cy="52" r="3.4" fill="#6F5F50" />
          <circle ref={pauseD3} cx="228" cy="46" r="3.4" fill="#6F5F50" />
        </g>

        <g ref={confettiGroup} opacity="0">
          <path ref={confS1} d="M 68 58 L 68 70 M 62 64 L 74 64" stroke="#E85A4F" strokeWidth="3" strokeLinecap="round" />
          <path ref={confS2} d="M 214 54 L 214 66 M 208 60 L 220 60" stroke="#4F7A65" strokeWidth="3" strokeLinecap="round" />
          <circle ref={confC1} cx="56" cy="108" r="4.5" fill="#E85A4F" />
          <circle ref={confC2} cx="224" cy="104" r="4" fill="#4F7A65" />
          <circle ref={confC3} cx="140" cy="22" r="4.5" fill="#E85A4F" />
        </g>
      </svg>
    </div>
  );
}
