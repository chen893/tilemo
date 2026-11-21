// @tilemo/share-card — 从 Store 投影出 CardData。
// web/mobile 共用，避免两端各写一份「取 streak/今日/近 N 天热力」采集逻辑。

import { levelOfDay, todayKey, ymd } from "@tilemo/core";
import type { Settings, Store } from "@tilemo/data";
import type { ThemeMode } from "@tilemo/design-tokens";
import { REVIEW_DAYS } from "./config";
import { buildCardData } from "./build";
import type { CardData, CardType } from "./types";
import type { MilestoneCopy } from "./quotes";

export interface GatherOpts {
  theme: ThemeMode;
  type: CardType;
  milestone?: MilestoneCopy;
  sessionReps?: number;
}

export function gatherCardData(store: Store, settings: Settings, opts: GatherOpts): CardData {
  const s = store.getStreak();
  const today = store.getDay(todayKey());
  const sessions = today?.sessions ?? [];
  const goalDone = sessions.length;
  const latestReps = sessions.length > 0 ? sessions[sessions.length - 1].completedReps : undefined;
  let heat: number[] | undefined;
  if (opts.type === "review") {
    heat = [];
    const now = new Date();
    for (let i = REVIEW_DAYS - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      heat.push(levelOfDay(store.getDay(ymd(d))));
    }
  }
  return buildCardData({
    type: opts.type,
    theme: opts.theme,
    streakDays: s.current,
    goalDone,
    goalTotal: settings.dailyGoalGroups,
    sessionReps: opts.sessionReps ?? latestReps,
    heat,
    heatCols: 6,
    milestone: opts.milestone,
    withQr: true,
  });
}
