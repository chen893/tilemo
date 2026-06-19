// @tilemo/mobile — 成就卡片视图（react-native-view-shot 的截图目标）。
// 设计稿坐标 1080×1350，按传入 width 等比缩放。布局对齐 apps/web/src/share.ts 的
// renderCard（结构、字号、底部带、0 状态「今天格点亮」一致；RN 用 top 定位、Canvas
// 用 baseline，坐标各自取值但视觉对应）。纯展示组件：接收 CardData，自包含。

import { memo } from "react";
import { Text, View } from "react-native";
import { heatColor, type CardData } from "@tilemo/share-card";

const QrBlock = memo(function QrBlock({ data, size, left, top }: { data: CardData; size: number; left: number; top: number }) {
  const qr = data.qr;
  if (!qr) return null;
  const pad = size * 0.14;
  const n = qr.size;
  const cell = size / n;
  return (
    <View
      style={{
        position: "absolute",
        left: left - pad,
        top: top - pad,
        width: size + pad * 2,
        height: size + pad * 2,
        backgroundColor: "#FFFFFF",
        borderRadius: size * 0.12,
        padding: pad,
      }}
    >
      <View style={{ width: size, height: size, flexDirection: "row", flexWrap: "wrap" }}>
        {qr.dark.map((on, i) => (
          <View key={i} style={{ width: cell, height: cell, backgroundColor: on ? data.colors.ink : "transparent" }} />
        ))}
      </View>
    </View>
  );
});

export function ShareCardView({ data, width }: { data: CardData; width: number }) {
  const c = data.colors;
  const scale = width / 1080;
  const H = 1350 * scale;
  const pad = 96 * scale;
  const s = (n: number) => n * scale;
  const W = width;

  return (
    <View style={{ width, height: H, backgroundColor: c.paper, overflow: "hidden" }}>
      {/* eyebrow（milestone 用大号 DAY N 作焦点，另绘） */}
      {data.type !== "milestone" && data.eyebrow ? (
        <Text
          style={{
            position: "absolute",
            top: s(96),
            left: pad,
            fontSize: s(30),
            fontWeight: "600",
            color: c.text3,
            letterSpacing: s(6),
          }}
        >
          {data.eyebrow}
        </Text>
      ) : null}

      {/* 中心区——按类型 */}
      {data.type === "milestone" ? (
        <>
          <Text
            style={{
              position: "absolute",
              top: s(290),
              left: 0,
              width: W,
              textAlign: "center",
              fontSize: s(104),
              fontWeight: "800",
              color: c.accent,
              letterSpacing: s(8),
            }}
          >
            {data.eyebrow}
          </Text>
          <Text
            style={{
              position: "absolute",
              top: s(450),
              left: pad,
              width: W - pad * 2,
              textAlign: "center",
              fontSize: s(56),
              fontWeight: "700",
              color: c.text,
            }}
          >
            {data.headline}
          </Text>
          {data.badge ? (
            <View
              style={{
                position: "absolute",
                top: s(590),
                alignSelf: "center",
                paddingHorizontal: s(40),
                paddingVertical: s(16),
                borderRadius: s(39),
                backgroundColor: c.accent,
              }}
            >
              <Text style={{ fontSize: s(32), fontWeight: "700", color: "#FFFFFF", letterSpacing: s(4) }}>
                {data.badge}
              </Text>
            </View>
          ) : null}
          <Text
            style={{
              position: "absolute",
              top: s(730),
              left: 0,
              width: W,
              textAlign: "center",
              fontSize: s(30),
              color: c.text3,
            }}
          >
            连续 {data.streakDays} 天
          </Text>
        </>
      ) : data.type === "review" && data.heat ? (
        <>
          <Text
            style={{
              position: "absolute",
              top: s(96),
              left: pad,
              width: W - pad * 2,
              fontSize: s(60),
              fontWeight: "700",
              color: c.text,
            }}
          >
            {data.headline}
          </Text>
          {(() => {
            const cols = data.heatCols ?? 6;
            const cell = 110 * scale;
            const gap = 14 * scale;
            const gridW = cols * cell + (cols - 1) * gap;
            const startX = (W - gridW) / 2;
            const startY = 200 * scale;
            const rows = Math.ceil(data.heat.length / cols);
            return (
              <>
                <View
                  style={{
                    position: "absolute",
                    left: startX,
                    top: startY,
                    width: gridW,
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap,
                  }}
                >
                  {data.heat.map((lv, i) => {
                    // 0 状态：把「今天」(最后一格)点亮成第一格，呼应「从今天开始」
                    const lit = data.streakDays === 0 && i === data.heat.length - 1;
                    return (
                      <View
                        key={i}
                        style={{
                          width: cell,
                          height: cell,
                          borderRadius: cell * 0.22,
                          backgroundColor: lit ? c.heat3 : heatColor(data.colors, lv),
                          borderWidth: lit ? 3 : 1,
                          borderColor: lit ? c.accent : c.rule,
                        }}
                      />
                    );
                  })}
                </View>
                <Text
                  style={{
                    position: "absolute",
                    top: startY + rows * (cell + gap) + 26 * scale,
                    left: 0,
                    width: W,
                    textAlign: "center",
                    fontSize: s(44),
                    fontWeight: "700",
                    color: c.accent,
                  }}
                >
                  {data.streakDays > 0 ? `连续 ${data.streakDays} 天` : "从今天，开始打卡"}
                </Text>
              </>
            );
          })()}
        </>
      ) : (
        <>
          {/* daily */}
          <Text
            style={{
              position: "absolute",
              top: s(150),
              left: pad,
              fontSize: s(58),
              fontWeight: "700",
              color: c.text,
            }}
          >
            {data.headline}
          </Text>
          <Text
            style={{
              position: "absolute",
              top: s(330),
              left: 0,
              width: W,
              textAlign: "center",
              fontSize: s(190),
              fontWeight: "800",
              color: c.accent,
            }}
          >
            {data.streakDays}
          </Text>
          <Text
            style={{
              position: "absolute",
              top: s(540),
              left: 0,
              width: W,
              textAlign: "center",
              fontSize: s(30),
              color: c.text3,
              letterSpacing: s(6),
            }}
          >
            连续天数
          </Text>
          <Text
            style={{
              position: "absolute",
              top: s(645),
              left: 0,
              width: W,
              textAlign: "center",
              fontSize: s(30),
              color: c.text2,
            }}
          >
            今日  {data.goalDone} / {data.goalTotal} 组
          </Text>
          <View
            style={{
              position: "absolute",
              top: s(690),
              left: pad,
              width: W - pad * 2,
              height: s(14),
              borderRadius: s(7),
              backgroundColor: c.paperDeep,
            }}
          >
            <View
              style={{
                width: `${Math.min(100, data.goalTotal > 0 ? (data.goalDone / data.goalTotal) * 100 : 0)}%`,
                height: s(14),
                borderRadius: s(7),
                backgroundColor: c.accent,
              }}
            />
          </View>
        </>
      )}

      {/* 副文案（QUOTES 一句）；review 卡省略 */}
      {data.type !== "review" ? (
        <Text
          style={{
            position: "absolute",
            top: s(data.type === "milestone" ? 860 : 820),
            left: pad,
            width: W - pad * 2,
            textAlign: "center",
            fontSize: s(30),
            color: c.text2,
          }}
        >
          「{data.sub}」
        </Text>
      ) : null}

      {/* 底部带：左下 QR（加大 + quiet zone）+ 扫码 caption，右下品牌 */}
      <QrBlock data={data} size={s(190)} left={pad} top={H - s(280)} />
      <Text
        style={{
          position: "absolute",
          bottom: s(60),
          left: pad,
          fontSize: s(26),
          color: c.text3,
        }}
      >
        扫码，和我一起打卡
      </Text>
      <Text
        style={{
          position: "absolute",
          bottom: s(130),
          right: pad,
          fontSize: s(38),
          fontWeight: "700",
          color: c.text,
          textAlign: "right",
        }}
      >
        {data.brand}
      </Text>
    </View>
  );
}
