// @tilemo/share-card — card data model shared by mobile (RN view-shot) and
// web (Canvas). Pure data; each platform renders it. Colors are inlined so a
// renderer never has to look up the theme itself.

import type { ColorSet, ThemeMode } from "@tilemo/design-tokens";

export type CardType = "daily" | "milestone" | "review";

/** QR as a flat boolean grid (size × size), row-major. */
export interface QrMatrix {
  size: number;
  dark: boolean[];
}

export interface CardData {
  type: CardType;
  theme: ThemeMode;
  colors: ColorSet;

  /** 顶部小标，如 "DAY 30" / "今天" / "我的坚持"。 */
  eyebrow?: string;
  /** 主标题。 */
  headline: string;
  /** 副文案，来自 QUOTES（可轮换）。 */
  sub: string;
  /** 徽章文字，如 "三十天"。 */
  badge?: string;

  streakDays: number;
  goalDone: number;
  goalTotal: number;
  /** 今日卡片：本次（或今日最近一次）完成的收紧次数，streak=0 时作 C 位焦点。 */
  sessionReps?: number;

  /** 回顾卡：近 N 天热力等级（0–3），末尾=今天。 */
  heat?: number[];
  heatCols?: number;

  brand: string;

  qr?: QrMatrix;
}
