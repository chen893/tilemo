// @tilemo/mobile — 科学提肛 × 抽象小熊猫原生矢量舞台（零额外原生依赖）。
// 复用 @tilemo/core 的 PandaEngine / PANDA_PALETTES，与 Web / 小程序 / 鸿蒙 100% 同源动作曲线与深浅色板。

import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import {
  PANDA_PALETTES,
  PandaEngine,
  type MetroSnapshot,
  type PandaFrame,
} from "@tilemo/core";
import { useTheme } from "./theme";

export interface PandaStageProps {
  snap: MetroSnapshot;
  contractSec: number;
  relaxSec: number;
  size?: number;
}

export function PandaStage({ snap, contractSec, relaxSec, size = 240 }: PandaStageProps) {
  const { mode } = useTheme();
  const reduceMotion = useReducedMotion();
  const engineRef = useRef<PandaEngine | null>(null);
  if (!engineRef.current) engineRef.current = new PandaEngine();

  const [frame, setFrame] = useState<PandaFrame>(() =>
    engineRef.current!.step(0.016, mode, !!reduceMotion),
  );

  const modeRef = useRef(mode);
  modeRef.current = mode;
  const reduceRef = useRef(!!reduceMotion);
  reduceRef.current = !!reduceMotion;

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

  useEffect(() => {
    let rafId = 0;
    let lastTs = Date.now();
    let acc = 0;
    const loop = () => {
      const now = Date.now();
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTs) / 1000));
      lastTs = now;
      acc += dt;
      // 30fps state tick keeps RN bridge light while staying silky smooth
      if (acc >= 0.032) {
        const stepDt = acc;
        acc = 0;
        setFrame(engineRef.current!.step(stepDt, modeRef.current, reduceRef.current));
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const pal = PANDA_PALETTES[mode];
  const scale = size / 280;
  const lift = frame.lift;
  const cheer = frame.armCheer;
  const seedTop = 192 + frame.seedDy;
  const hammockTop = frame.hamActualMidY - 8;
  const diaTop = frame.diaArchY;
  const ribScaleX = frame.ribW / 46;
  const eyeH = Math.max(2, 11.2 * frame.eyeScaleY);

  return (
    <View style={[styles.root, { width: size, height: size }]} accessible={false}>
      <View style={[styles.canvas, { transform: [{ scale }] }]}>
        {/* 1. 氛围光晕 */}
        <View
          style={{
            position: "absolute",
            left: 140 - frame.auraR,
            top: 156 - frame.auraR,
            width: frame.auraR * 2,
            height: frame.auraR * 2,
            borderRadius: frame.auraR,
            backgroundColor: frame.pistonColor,
            opacity: 0.12,
          }}
        />

        {/* 2. 地面投影与稳固坐垫 */}
        <View
          style={{
            position: "absolute",
            left: 64,
            top: 228,
            width: 152,
            height: 22,
            borderRadius: 11,
            backgroundColor: pal.shadow,
            opacity: 0.12,
          }}
        />
        <View
          style={{
            position: "absolute",
            left: 72,
            top: 221,
            width: 136,
            height: 18,
            borderRadius: 9,
            backgroundColor: pal.cushion,
            borderWidth: 3,
            borderColor: pal.furEdge,
          }}
        />

        {/* 3. 盘坐双腿（外松不夹腿） */}
        <View
          style={{
            position: "absolute",
            left: 72,
            top: 204,
            width: 62,
            height: 26,
            borderRadius: 13,
            backgroundColor: pal.blackFur,
            borderWidth: 3,
            borderColor: pal.furEdge,
            transform: [{ rotate: "8deg" }],
          }}
        />
        <View
          style={{
            position: "absolute",
            left: 146,
            top: 204,
            width: 62,
            height: 26,
            borderRadius: 13,
            backgroundColor: pal.blackFur,
            borderWidth: 3,
            borderColor: pal.furEdge,
            transform: [{ rotate: "-8deg" }],
          }}
        />

        {/* 4. 躯干 + 裁切黑肩带 + 内部透视膈肌/盆底吊床 */}
        <View
          style={{
            position: "absolute",
            left: 88,
            top: 116,
            width: 104,
            height: 108,
            borderTopLeftRadius: 46,
            borderTopRightRadius: 46,
            borderBottomLeftRadius: 40,
            borderBottomRightRadius: 40,
            backgroundColor: pal.fur,
            borderWidth: 4.5,
            borderColor: pal.furEdge,
            overflow: "hidden",
            transform: [{ scaleX: ribScaleX }],
          }}
        >
          {/* 招牌黑肩带 */}
          <View
            style={{
              position: "absolute",
              left: -6,
              right: -6,
              top: -4,
              height: 30,
              backgroundColor: pal.blackFur,
              borderBottomLeftRadius: 24,
              borderBottomRightRadius: 24,
            }}
          />
          {/* 内部柔和透视光晕 */}
          <View
            style={{
              position: "absolute",
              left: 18,
              top: 38,
              width: 60,
              height: 62,
              borderRadius: 31,
              backgroundColor: frame.pistonColor,
              opacity: 0.14,
            }}
          />
          {/* 膈肌虚线弧 */}
          <View
            style={{
              position: "absolute",
              left: 18,
              top: diaTop - 116,
              width: 60,
              height: 14,
              borderTopWidth: 2,
              borderColor: pal.pauseDot,
              borderStyle: "dashed",
              borderTopLeftRadius: 30,
              borderTopRightRadius: 30,
              opacity: 0.65,
            }}
          />
          {/* 盆底肌吊床弧线（下沉弧与上提弧交叉淡入淡出，消除 lift=0.5 处跳变） */}
          <View
            style={{
              position: "absolute",
              left: 48 - frame.hamW,
              top: hammockTop - 116,
              width: frame.hamW * 2,
              height: 18,
              borderBottomWidth: 4,
              borderColor: frame.pistonColor,
              borderRadius: 18,
              opacity: Math.max(0, Math.min(1, 1 - lift * 1.4)),
            }}
          />
          <View
            style={{
              position: "absolute",
              left: 48 - frame.hamW,
              top: hammockTop - 116,
              width: frame.hamW * 2,
              height: 18,
              borderTopWidth: 4,
              borderColor: frame.pistonColor,
              borderRadius: 18,
              opacity: Math.max(0, Math.min(1, (lift - 0.25) * 1.4)),
            }}
          />
        </View>

        {/* 暖朱品牌小种子（锚定在吊床顶点上方） */}
        <View
          style={{
            position: "absolute",
            left: 131,
            top: seedTop,
            width: 18,
            height: 20,
            borderTopLeftRadius: 10,
            borderTopRightRadius: 8,
            borderBottomLeftRadius: 8,
            borderBottomRightRadius: 10,
            backgroundColor: frame.pistonColor,
            transform: [{ scale: frame.seedScale }],
          }}
        >
          <View
            style={{
              position: "absolute",
              left: 4,
              top: 4,
              width: 4,
              height: 4,
              borderRadius: 2,
              backgroundColor: "#FFFDF9",
              opacity: 0.68,
            }}
          />
        </View>

        {/* 5. 两只小黑臂（完成态平滑抬起） */}
        <View
          style={{
            position: "absolute",
            left: 80 - cheer * 16,
            top: 132 - cheer * 34 + frame.wave * 0.5,
            width: 14,
            height: 68,
            borderRadius: 7,
            backgroundColor: pal.blackFur,
            borderWidth: mode === "dark" ? 1.8 : 0,
            borderColor: pal.furEdge,
            transform: [{ rotate: `${14 + cheer * 124}deg` }],
          }}
        />
        <View
          style={{
            position: "absolute",
            left: 186 + cheer * 16,
            top: 132 - cheer * 34 - frame.wave * 0.5,
            width: 14,
            height: 68,
            borderRadius: 7,
            backgroundColor: pal.blackFur,
            borderWidth: mode === "dark" ? 1.8 : 0,
            borderColor: pal.furEdge,
            transform: [{ rotate: `${-14 - cheer * 124}deg` }],
          }}
        />

        {/* 6. 抽象熊猫头 */}
        <View
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 280,
            height: 280,
            transform: [{ translateY: frame.headY }, { rotate: `${frame.headRot}deg` }],
          }}
        >
          {/* 双耳 */}
          <View
            style={{
              position: "absolute",
              left: 87,
              top: 41,
              width: 28,
              height: 26,
              borderRadius: 14,
              backgroundColor: pal.blackFur,
              borderWidth: 2,
              borderColor: pal.furEdge,
              transform: [{ rotate: `${-18 + frame.earTilt}deg` }],
            }}
          />
          <View
            style={{
              position: "absolute",
              left: 165,
              top: 40,
              width: 29,
              height: 26,
              borderRadius: 14,
              backgroundColor: pal.blackFur,
              borderWidth: 2,
              borderColor: pal.furEdge,
              transform: [{ rotate: `${16 - frame.earTilt}deg` }],
            }}
          />

          {/* 圆润脑袋 */}
          <View
            style={{
              position: "absolute",
              left: 90,
              top: 44,
              width: 100,
              height: 80,
              borderRadius: 44,
              backgroundColor: pal.fur,
              borderWidth: 4.5,
              borderColor: pal.furEdge,
            }}
          >
            {/* 腮红 */}
            <View
              style={{
                position: "absolute",
                left: 8,
                top: 46,
                width: 20,
                height: 12,
                borderRadius: 6,
                backgroundColor: pal.accent,
                opacity: frame.blushOp * 0.55,
              }}
            />
            <View
              style={{
                position: "absolute",
                right: 8,
                top: 46,
                width: 20,
                height: 12,
                borderRadius: 6,
                backgroundColor: pal.accent,
                opacity: frame.blushOp * 0.55,
              }}
            />

            {/* 招牌斜椭圆黑眼圈 */}
            <View
              style={{
                position: "absolute",
                left: 14,
                top: 23,
                width: 24,
                height: 28,
                borderRadius: 13,
                backgroundColor: pal.blackFur,
                transform: [{ rotate: "16deg" }],
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {frame.useLineEyes ? (
                <View
                  style={{
                    width: 12,
                    height: 6,
                    borderTopWidth: frame.eyeMood === "relax" ? 0 : 2.8,
                    borderBottomWidth: frame.eyeMood === "relax" ? 2.8 : 0,
                    borderColor: "#FFFDF9",
                    borderRadius: 6,
                  }}
                />
              ) : (
                <View
                  style={{
                    width: 10.5,
                    height: eyeH,
                    borderRadius: 6,
                    backgroundColor: "#FFFDF9",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {frame.eyeScaleY > 0.3 && (
                    <View
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: 2.5,
                        backgroundColor: pal.lineInk,
                        transform: [
                          { translateX: frame.pupilOffsetX },
                          { translateY: frame.pupilOffsetY },
                        ],
                      }}
                    />
                  )}
                </View>
              )}
            </View>

            <View
              style={{
                position: "absolute",
                right: 14,
                top: 23,
                width: 24,
                height: 28,
                borderRadius: 13,
                backgroundColor: pal.blackFur,
                transform: [{ rotate: "-16deg" }],
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {frame.useLineEyes ? (
                <View
                  style={{
                    width: 12,
                    height: 6,
                    borderTopWidth: frame.eyeMood === "relax" ? 0 : 2.8,
                    borderBottomWidth: frame.eyeMood === "relax" ? 2.8 : 0,
                    borderColor: "#FFFDF9",
                    borderRadius: 6,
                  }}
                />
              ) : (
                <View
                  style={{
                    width: 10.5,
                    height: eyeH,
                    borderRadius: 6,
                    backgroundColor: "#FFFDF9",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {frame.eyeScaleY > 0.3 && (
                    <View
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: 2.5,
                        backgroundColor: pal.lineInk,
                        transform: [
                          { translateX: frame.pupilOffsetX },
                          { translateY: frame.pupilOffsetY },
                        ],
                      }}
                    />
                  )}
                </View>
              )}
            </View>

            {/* 小黑鼻 */}
            <View
              style={{
                position: "absolute",
                left: 41,
                top: 44,
                width: 9,
                height: 6,
                borderRadius: 4,
                backgroundColor: pal.lineInk,
              }}
            />

            {/* 嘴巴：吹蜡烛小圆嘴 vs 淡笑/开心笑 */}
            {frame.mouthBlow > 0.35 ? (
              <View
                style={{
                  position: "absolute",
                  left: 41.5,
                  top: 54,
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  borderWidth: 2.6,
                  borderColor: pal.lineInk,
                }}
              />
            ) : (
              <View
                style={{
                  position: "absolute",
                  left: 36,
                  top: 53,
                  width: 18,
                  height: frame.confettiOp > 0.5 ? 10 : 6,
                  borderBottomWidth: 2.8,
                  borderColor: pal.lineInk,
                  borderBottomLeftRadius: 10,
                  borderBottomRightRadius: 10,
                }}
              />
            )}
          </View>
        </View>

        {/* 7. 脸颊外侧呼吸气流 */}
        {frame.exhaleOp > 0.05 && (
          <View
            style={{
              position: "absolute",
              left: 202,
              top: 94,
              opacity: frame.exhaleOp * 0.85,
              transform: [{ translateX: (frame.flowOffset % 16) * 0.6 }],
            }}
          >
            <View style={{ width: 26, height: 3, borderRadius: 2, backgroundColor: pal.accent, marginBottom: 6 }} />
            <View style={{ width: 18, height: 2.5, borderRadius: 2, backgroundColor: pal.accent, opacity: 0.65 }} />
          </View>
        )}

        {frame.inhaleOp > 0.05 && (
          <>
            <View
              style={{
                position: "absolute",
                left: 206,
                top: 94,
                opacity: frame.inhaleOp * 0.85,
                transform: [{ translateX: -(frame.flowOffset % 14) * 0.5 }],
              }}
            >
              <View style={{ width: 24, height: 3, borderRadius: 2, backgroundColor: pal.relax }} />
            </View>
            <View
              style={{
                position: "absolute",
                left: 48,
                top: 94,
                opacity: frame.inhaleOp * 0.85,
                transform: [{ translateX: (frame.flowOffset % 14) * 0.5 }],
              }}
            >
              <View style={{ width: 24, height: 3, borderRadius: 2, backgroundColor: pal.relax }} />
            </View>
          </>
        )}

        {/* 8. 暂停省略号 */}
        {frame.pauseOp > 0.05 && (
          <View style={{ position: "absolute", left: 202, top: 46, opacity: frame.pauseOp, flexDirection: "row", gap: 6 }}>
            <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: pal.pauseDot, marginTop: 10 }} />
            <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: pal.pauseDot, marginTop: 5 }} />
            <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: pal.pauseDot }} />
          </View>
        )}

        {/* 9. 完成态庆祝光点 */}
        {frame.confettiOp > 0.05 && (
          <View
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: 280,
              height: 280,
              opacity: frame.confettiOp,
              transform: [{ translateY: frame.confettiDrift }],
            }}
          >
            <View style={{ position: "absolute", left: 54, top: 102, width: 9, height: 9, borderRadius: 4.5, backgroundColor: pal.accent }} />
            <View style={{ position: "absolute", left: 218, top: 98, width: 8, height: 8, borderRadius: 4, backgroundColor: pal.relax }} />
            <View style={{ position: "absolute", left: 136, top: 18, width: 9, height: 9, borderRadius: 4.5, backgroundColor: pal.accent }} />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  canvas: {
    width: 280,
    height: 280,
  },
});
