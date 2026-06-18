// @tilemo/mobile — 成就卡片视图（react-native-view-shot 的截图目标）。
// 设计稿坐标 1080×1350，按传入 width 等比缩放，与 web Canvas 渲染 1:1 对齐。
// 纯展示组件：接收 CardData，自包含，不依赖全局状态。

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
      {/* eyebrow（daily/review 顶部） */}
      {data.type !== "milestone" && data.eyebrow ? (
        <Text
          style={{
            position: "absolute",
            top: s(130),
            left: pad,
            fontSize: s(32),
            fontWeight: "600",
            color: c.text3,
            letterSpacing: s(4),
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
              top: s(380),
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
              top: s(560),
              left: pad,
              width: W - pad * 2,
              textAlign: "center",
              fontSize: s(54),
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
                top: s(770),
                alignSelf: "center",
                paddingHorizontal: s(40),
                paddingVertical: s(16),
                borderRadius: s(39),
                backgroundColor: c.accent,
              }}
            >
              <Text style={{ fontSize: s(34), fontWeight: "700", color: "#FFFFFF", letterSpacing: s(4) }}>
                {data.badge}
              </Text>
            </View>
          ) : null}
          <Text
            style={{
              position: "absolute",
              top: s(900),
              left: 0,
              width: W,
              textAlign: "center",
              fontSize: s(36),
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
              top: s(230),
              left: pad,
              fontSize: s(48),
              fontWeight: "700",
              color: c.text,
            }}
          >
            {data.headline}
          </Text>
          {(() => {
            const cols = data.heatCols ?? 6;
            const cell = 108 * scale;
            const gap = 14 * scale;
            const gridW = cols * cell + (cols - 1) * gap;
            const startX = (W - gridW) / 2;
            const startY = 380 * scale;
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
                  {data.heat.map((lv, i) => (
                    <View
                      key={i}
                      style={{
                        width: cell,
                        height: cell,
                        borderRadius: cell * 0.22,
                        backgroundColor: heatColor(data.colors, lv),
                      }}
                    />
                  ))}
                </View>
                <Text
                  style={{
                    position: "absolute",
                    top: startY + Math.ceil(data.heat.length / cols) * (cell + gap) + 4 * scale,
                    left: 0,
                    width: W,
                    textAlign: "center",
                    fontSize: s(34),
                    color: c.text3,
                  }}
                >
                  连续 {data.streakDays} 天
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
              top: s(220),
              left: pad,
              fontSize: s(56),
              fontWeight: "700",
              color: c.text,
            }}
          >
            {data.headline}
          </Text>
          <Text
            style={{
              position: "absolute",
              top: s(470),
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
              top: s(685),
              left: 0,
              width: W,
              textAlign: "center",
              fontSize: s(34),
              color: c.text3,
              letterSpacing: s(6),
            }}
          >
            连续天数
          </Text>
          <Text
            style={{
              position: "absolute",
              top: s(765),
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
              top: s(815),
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

      {/* 副文案（review 卡省略） */}
      {data.type !== "review" ? (
        <Text
          style={{
            position: "absolute",
            bottom: s(300),
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

      {/* 底部：二维码 + 品牌 */}
      <QrBlock data={data} size={s(100)} left={pad} top={H - s(282)} />
      <Text
        style={{
          position: "absolute",
          bottom: s(104),
          left: pad,
          fontSize: s(22),
          color: c.text3,
        }}
      >
        扫码，和我一起打卡
      </Text>
      <Text
        style={{
          position: "absolute",
          bottom: s(152),
          right: pad,
          fontSize: s(34),
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
