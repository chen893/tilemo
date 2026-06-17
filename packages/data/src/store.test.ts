import { describe, it, expect } from "vitest";
import { Store, MemoryAdapter, DEFAULT_PLANS, DEFAULT_SETTINGS } from "./index";

const newStore = () => new Store(new MemoryAdapter());

describe("Store", () => {
  it("seeds the 4 built-in plans on first read", () => {
    const s = newStore();
    const plans = s.getPlans();
    expect(plans).toHaveLength(4);
    expect(plans[0].id).toBe("plan_beginner");
    expect(plans.map((p) => p.id)).toEqual([
      "plan_beginner",
      "plan_steady",
      "plan_advanced",
      "plan_quick",
    ]);
  });

  it("settings defaults-merge keeps unknown keys (forward-compat)", () => {
    const s = newStore();
    s.setSettings({ ...DEFAULT_SETTINGS, futureKey: "x", dailyGoalGroups: 5 });
    const got = s.getSettings();
    expect(got.dailyGoalGroups).toBe(5); // override honored
    expect((got as Record<string, unknown>).futureKey).toBe("x"); // unknown key not stripped
    expect(got.defaultPlanId).toBe("plan_beginner"); // default filled
  });

  it("returns defaults on corrupt JSON instead of throwing", () => {
    const s = newStore();
    s.setSettings("not-json" as never);
    expect(s.getSettings().dailyGoalGroups).toBe(3);
  });

  it("writes/reads a day entry and lists log keys", () => {
    const s = newStore();
    s.setDay("2026-06-17", {
      date: "2026-06-17",
      goalGroups: 3,
      sessions: [
        { ts: 1, planId: "plan_beginner", completedReps: 10, durationSec: 60, finished: true },
      ],
      manualOverride: false,
    });
    const d = s.getDay("2026-06-17");
    expect(d?.sessions).toHaveLength(1);
    expect(s.getDay("1999-01-01")).toBeNull();
    expect(s.allLogKeys()).toEqual(["tgm:log:2026-06-17"]);
  });

  it("exportAll has the canonical shape", () => {
    const s = newStore();
    s.getPlans(); // seed
    const all = s.exportAll();
    expect(all.settings.dailyGoalGroups).toBe(3);
    expect(all.plans).toHaveLength(4);
    expect(all.logs).toEqual({});
    expect(all.streak).toEqual({ current: 0, longest: 0, lastCheckedDate: null });
  });
});
