// @tilemo/share-card — detect a freshly-crossed streak milestone.
// prev < value <= now 命中；取最大的那一档（一次完成可能跨多档，极少见）。

import type { MilestoneCopy } from "./quotes";
import { STREAK_MILESTONES } from "./quotes";

export function detectStreakMilestone(prevStreak: number, newStreak: number): MilestoneCopy | null {
  let hit: MilestoneCopy | null = null;
  for (const m of STREAK_MILESTONES) {
    if (prevStreak < m.value && newStreak >= m.value) hit = m;
  }
  return hit;
}
