import { describe, it, expect } from "vitest";
import { Store, MemoryAdapter, DEFAULT_PLANS } from "@tilemo/data";
import { aggregateStats, dayMeetsGoal, heatLevel, recordSession, recomputeStreak, todayKey } from "./index";

const newStore = () => new Store(new MemoryAdapter());
const day = (sessionsLen: number, goal: number) => ({
  date: "2026-06-17",
  goalGroups: goal,
  sessions: Array.from({ length: sessionsLen }, (_, i) => ({
    ts: i,
    planId: "p",
    completedReps: 1,
    durationSec: 1,
    finished: true,
  })),
  manualOverride: false,
});
const arr = (n: number) => Array.from({ length: n });

describe("heatLevel thresholds", () => {
  it("maps ratio → 0/1/2/3", () => {
    expect(heatLevel(arr(0), 3)).toBe(0);
    expect(heatLevel(arr(2), 3)).toBe(1); // 0.67 partial
    expect(heatLevel(arr(3), 3)).toBe(2); // 1.0 met
    expect(heatLevel(arr(4), 3)).toBe(3); // 1.33 over
  });
  it("defaults goal to 1 when falsy", () => {
    expect(heatLevel(arr(1), 0)).toBe(2);
  });
});

describe("dayMeetsGoal", () => {
  it("null / empty → false, met → true", () => {
    expect(dayMeetsGoal(null)).toBe(false);
    expect(dayMeetsGoal(day(2, 3))).toBe(false);
    expect(dayMeetsGoal(day(3, 3))).toBe(true);
    expect(dayMeetsGoal(day(5, 3))).toBe(true);
  });
});

describe("recordSession + recomputeStreak", () => {
  it("records a session under today's key and snapshots the goal", () => {
    const store = newStore();
    const plan = DEFAULT_PLANS[0];
    recordSession(store, plan, 10, 60.4, true);
    const d = store.getDay(todayKey());
    expect(d?.sessions).toHaveLength(1);
    expect(d?.sessions[0].durationSec).toBe(60); // Math.round
    expect(d?.goalGroups).toBe(3); // snapshot from settings
  });

  it("only counts a streak day once the goal is met", () => {
    const store = newStore();
    const plan = DEFAULT_PLANS[0];
    recordSession(store, plan, 10, 60, true); // 1/3 → not met
    expect(store.getStreak().current).toBe(0);
    recordSession(store, plan, 10, 60, true); // 2/3 → not met
    expect(store.getStreak().current).toBe(0);
    recordSession(store, plan, 10, 60, true); // 3/3 → met
    const s = store.getStreak();
    expect(s.current).toBe(1);
    expect(s.longest).toBe(1);
    expect(s.lastCheckedDate).toBe(todayKey());
  });

  it("recomputeStreak is monotonic on longest", () => {
    const store = newStore();
    store.setStreak({ current: 0, longest: 9, lastCheckedDate: null });
    recomputeStreak(store); // no logs → current 0
    expect(store.getStreak().longest).toBe(9); // preserved
  });
});

describe("aggregateStats", () => {
  it("aggregates totalDays / totalSessions / metDays / keysCount", () => {
    const store = newStore();
    const plan = DEFAULT_PLANS[0];
    recordSession(store, plan, 10, 60, true);
    recordSession(store, plan, 10, 60, true);
    recordSession(store, plan, 10, 60, true); // today: 3/3 met
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const yk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    store.setDay(yk, {
      date: yk,
      goalGroups: 3,
      sessions: [{ ts: 1, planId: "p", completedReps: 1, durationSec: 1, finished: true }],
      manualOverride: false,
    }); // yesterday: 1/3 not met
    const st = aggregateStats(store);
    expect(st.totalSessions).toBe(4);
    expect(st.totalDays).toBe(2);
    expect(st.metDays).toBe(1);
    expect(st.keysCount).toBe(2);
    expect(st.lastTs).toBeGreaterThan(1);
  });
});
