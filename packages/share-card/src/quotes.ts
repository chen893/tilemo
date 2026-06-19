// @tilemo/share-card — milestone copy + quote rotation.
// 复用 @tilemo/core 的 QUOTES 做日常配文（"换一句"轮换）。

import { QUOTES } from "@tilemo/core";

export interface MilestoneCopy {
  /** 连续天数阈值。 */
  value: number;
  eyebrow: string;
  headline: string;
  badge: string;
}

/** 铁律：文案绝不出现「提肛 / 凯格尔 / 盆底肌」——抽象化、得体、可转发。 */
export const STREAK_MILESTONES: MilestoneCopy[] = [
  { value: 1, eyebrow: "DAY 1", headline: "开始了。", badge: "第一天" },
  { value: 7, eyebrow: "DAY 7", headline: "第一周，兑现了。", badge: "一周" },
  { value: 30, eyebrow: "DAY 30", headline: "三十天，身体记得。", badge: "三十天" },
  { value: 100, eyebrow: "DAY 100", headline: "一百天，已经是习惯了。", badge: "一百天" },
  { value: 365, eyebrow: "DAY 365", headline: "一年，一格一格亮着。", badge: "一年" },
];

/** 按 index 取一句配文（负数/越界安全）。 */
export function pickQuote(index: number): string {
  const n = QUOTES.length;
  return QUOTES[((index % n) + n) % n];
}

/** 回顾卡主标题轮换池（更"总结"口吻，与日常配文 QUOTES 独立）。 */
export const REVIEW_HEADLINES: string[] = [
  "坚持的形状，是一格一格亮起来的",
  "日复一日，身体在悄悄记住",
  "看得见的，是你不声不响的坚持",
];

/** 按 index 取一句回顾主标题（负数/越界安全）。 */
export function pickReviewHeadline(index: number): string {
  const n = REVIEW_HEADLINES.length;
  return REVIEW_HEADLINES[((index % n) + n) % n];
}
