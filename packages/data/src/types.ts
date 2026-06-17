// @tilemo/data — schema. Index signatures preserve the original's forward-compat
// rule: unknown stored keys are never stripped (settings merge via spread).

export type ThemeSetting = "system" | "light" | "dark";

export interface Settings {
  dailyGoalGroups: number;
  defaultPlanId: string;
  theme: ThemeSetting;
  sound: boolean;
  haptics: boolean;
  dailyQuote: boolean;
  [k: string]: unknown;
}

export interface Plan {
  id: string;
  name: string;
  desc: string;
  contract: number; // 收紧秒数
  relax: number; // 放松秒数
  reps: number; // 每组次数
  sets: number; // 组数
  builtin: boolean;
  [k: string]: unknown;
}

export interface Session {
  ts: number; // Date.now(), epoch ms
  planId: string;
  completedReps: number;
  durationSec: number;
  finished: boolean;
}

export interface DayEntry {
  date: string; // YYYY-MM-DD (local)
  goalGroups: number; // snapshot at day creation
  sessions: Session[];
  manualOverride: boolean;
}

export interface Streak {
  current: number;
  longest: number;
  lastCheckedDate: string | null;
}
