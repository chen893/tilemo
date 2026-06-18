// @tilemo/core — domain math. 1:1 port of index.html lines 3815-3878, refactored
// to take the Store as a parameter (dependency injection) instead of a global —
// makes it testable and platform-agnostic.

import type { DayEntry, Plan, Streak, Store } from "@tilemo/data";
import { todayKey, ymd } from "./time";

export function dayMeetsGoal(day: DayEntry | null): boolean {
  if (!day || !day.sessions || !day.sessions.length) return false;
  return day.sessions.length >= day.goalGroups;
}

/** 0 none / 1 partial / 2 met / 3 over (>= 1.2×). goal defaults to 1. */
export function heatLevel(sessions: { length: number } | null | undefined, goalGroups: number): number {
  const n = sessions && sessions.length ? sessions.length : 0;
  const goal = goalGroups || 1;
  if (n === 0) return 0;
  const ratio = n / goal;
  if (ratio >= 1.2) return 3;
  if (ratio >= 1) return 2;
  return 1;
}

export function levelOfDay(day: DayEntry | null): number {
  if (!day) return 0;
  return heatLevel(day.sessions, day.goalGroups);
}

/** Walks back consecutive met-goal days. Today doesn't break a streak you
 *  haven't started yet. Mutates + persists streak; longest is monotonic. */
export function recomputeStreak(store: Store): Streak {
  const today = new Date();
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let streak = 0;

  if (!dayMeetsGoal(store.getDay(ymd(cursor)))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (true) {
    const entry = store.getDay(ymd(cursor));
    if (dayMeetsGoal(entry)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
    if (streak > 3650) break;
  }

  const s = store.getStreak();
  s.current = streak;
  s.longest = Math.max(s.longest || 0, streak);
  s.lastCheckedDate = todayKey();
  store.setStreak(s);
  return s;
}

/** Append one session to today's entry (creating it with a goal snapshot if
 *  absent), persist, then recompute the streak. */
export function recordSession(
  store: Store,
  plan: Plan,
  completedReps: number,
  durationSec: number,
  finished: boolean,
): void {
  const k = todayKey();
  const existing = store.getDay(k);
  const day: DayEntry = existing ?? {
    date: k,
    goalGroups: store.getSettings().dailyGoalGroups,
    sessions: [],
    manualOverride: false,
  };
  day.sessions.push({
    ts: Date.now(),
    planId: plan.id,
    completedReps,
    durationSec: Math.round(durationSec),
    finished,
  });
  store.setDay(k, day);
  recomputeStreak(store);
}

export interface AggregateStats {
  /** 有 ≥1 session 的天数。 */
  totalDays: number;
  /** session 总条数。 */
  totalSessions: number;
  /** dayMeetsGoal 的天数。 */
  metDays: number;
  /** 最近一次 session 的 ts（0 表示无）。 */
  lastTs: number;
  /** allLogKeys 数量（含空 day）。 */
  keysCount: number;
}

/** 全部记录的聚合统计（单次遍历，复用 Store.getDay 缓存）。 */
export function aggregateStats(store: Store): AggregateStats {
  let totalDays = 0;
  let totalSessions = 0;
  let metDays = 0;
  let lastTs = 0;
  let keysCount = 0;
  for (const { entry } of store.allDayEntries()) {
    keysCount++;
    const n = entry && entry.sessions ? entry.sessions.length : 0;
    if (n > 0) totalDays++;
    totalSessions += n;
    if (dayMeetsGoal(entry)) metDays++;
    if (entry) {
      for (const s of entry.sessions) if (s.ts > lastTs) lastTs = s.ts;
    }
  }
  return { totalDays, totalSessions, metDays, lastTs, keysCount };
}
