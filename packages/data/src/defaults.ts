// @tilemo/data — built-in seeds, verbatim from index.html (lines 3696-3709).
import type { Plan, Settings } from "./types";

export const DEFAULT_PLANS: Plan[] = [
  { id: "plan_beginner", name: "入门", desc: "从最短的 3 秒开始，建立感觉。", contract: 3, relax: 3, reps: 10, sets: 1, builtin: true },
  { id: "plan_steady", name: "巩固", desc: "稍长一些，让肌肉记住收紧。", contract: 5, relax: 5, reps: 12, sets: 2, builtin: true },
  { id: "plan_advanced", name: "进阶", desc: "长收紧短放松，挑战耐力。", contract: 8, relax: 4, reps: 15, sets: 3, builtin: true },
  { id: "plan_quick", name: "快速一组", desc: "忙的时候，30 秒也好过不做。", contract: 3, relax: 2, reps: 8, sets: 1, builtin: true },
];

export const DEFAULT_SETTINGS: Settings = {
  dailyGoalGroups: 3,
  defaultPlanId: "plan_beginner",
  theme: "system",
  sound: true,
  haptics: true,
  dailyQuote: true,
};
