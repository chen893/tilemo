// @tilemo/share-card — 成就卡片分享的共享内核（数据 / 文案 / 里程碑 / 二维码）。
// 渲染由两端各自实现：mobile = RN View + react-native-view-shot；web = Canvas。

export * from "./types";
export * from "./config";
export { STREAK_MILESTONES, pickQuote, type MilestoneCopy } from "./quotes";
export { detectStreakMilestone } from "./milestone";
export { buildQr } from "./qr";
export { buildCardData, heatColor, type BuildOpts } from "./build";
export { gatherCardData, type GatherOpts } from "./gather";
