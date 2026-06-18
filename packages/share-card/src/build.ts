// @tilemo/share-card — assemble CardData from raw inputs.
// 两端渲染前都调这个，保证字段口径一致。

import { color, type ColorSet, type ThemeMode } from "@tilemo/design-tokens";
import { BRAND, LANDING_URL } from "./config";
import type { MilestoneCopy } from "./quotes";
import { pickQuote } from "./quotes";
import { buildQr } from "./qr";
import type { CardData, CardType } from "./types";

export interface BuildOpts {
  type: CardType;
  theme: ThemeMode;
  streakDays: number;
  goalDone: number;
  goalTotal: number;
  /** 回顾卡热力（近 N 天等级 0–3）。 */
  heat?: number[];
  heatCols?: number;
  /** 里程碑卡必填。 */
  milestone?: MilestoneCopy;
  /** 配文轮换序号（"换一句"）。 */
  quoteIndex?: number;
  withQr?: boolean;
}

/** 热力等级 0–3 → 颜色（两端渲染共用，消除 4 处重复映射）。 */
export function heatColor(colors: ColorSet, level: number): string {
  if (level <= 0) return colors.paperDeep;
  if (level === 1) return colors.heat1;
  if (level === 2) return colors.heat2;
  return colors.heat3;
}

export function buildCardData(o: BuildOpts): CardData {
  const colors: ColorSet = color[o.theme];

  const data: CardData = {
    type: o.type,
    theme: o.theme,
    colors,
    headline: "",
    sub: pickQuote(o.quoteIndex ?? 0),
    streakDays: o.streakDays,
    goalDone: o.goalDone,
    goalTotal: o.goalTotal,
    heat: o.heat,
    heatCols: o.heatCols,
    brand: BRAND,
  };

  if (o.type === "milestone" && o.milestone) {
    data.eyebrow = o.milestone.eyebrow;
    data.headline = o.milestone.headline;
    data.badge = o.milestone.badge;
  } else if (o.type === "review") {
    data.headline = "坚持的形状，是一格一格亮起来的";
  } else {
    data.eyebrow = "今天";
    data.headline = o.goalTotal > 0 && o.goalDone >= o.goalTotal ? "今天，提了。" : "又稳了一点。";
  }

  if (o.withQr) data.qr = buildQr(LANDING_URL);
  return data;
}
