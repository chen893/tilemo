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
