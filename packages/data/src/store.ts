// @tilemo/data — Store. 1:1 port of the original IIFE (index.html lines 3736-3812),
// generalized over a SyncStorageAdapter instead of the global localStorage.
//
// Backward-compat contract preserved exactly:
//  - tgm: keys unchanged; no version key.
//  - settings: spread-merge over defaults (unknown keys kept, never stripped).
//  - parse errors / null → defaults, never throw.
//  - plans: seeded into storage on first read.

import type { SyncStorageAdapter } from "./adapter";
import type { DayEntry, Plan, Settings, Streak } from "./types";
import { DEFAULT_PLANS, DEFAULT_SETTINGS } from "./defaults";

const K_SETTINGS = "tgm:settings";
const K_PLANS = "tgm:plans";
const K_STREAK = "tgm:streak";
const K_LOG_PREFIX = "tgm:log:";

const DEFAULT_STREAK: Streak = { current: 0, longest: 0, lastCheckedDate: null };

export interface ExportBundle {
  settings: Settings;
  plans: Plan[];
  logs: Record<string, DayEntry>;
  streak: Streak;
}

export class Store {
  constructor(private readonly adapter: SyncStorageAdapter) {}

  isMemOnly(): boolean {
    return this.adapter.isMemOnly?.() ?? false;
  }

  getSettings(): Settings {
    const raw = this.adapter.getItem(K_SETTINGS);
    if (!raw) return { ...DEFAULT_SETTINGS };
    try {
      return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as object) };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  setSettings(s: Settings): void {
    this.adapter.setItem(K_SETTINGS, JSON.stringify(s));
  }

  getPlans(): Plan[] {
    const raw = this.adapter.getItem(K_PLANS);
    if (!raw) {
      this.adapter.setItem(K_PLANS, JSON.stringify(DEFAULT_PLANS));
      return DEFAULT_PLANS.slice();
    }
    try {
      return JSON.parse(raw) as Plan[];
    } catch {
      return DEFAULT_PLANS.slice();
    }
  }

  setPlans(p: Plan[]): void {
    this.adapter.setItem(K_PLANS, JSON.stringify(p));
  }

  getDay(key: string): DayEntry | null {
    const raw = this.adapter.getItem(K_LOG_PREFIX + key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as DayEntry;
    } catch {
      return null;
    }
  }

  setDay(key: string, data: DayEntry): void {
    this.adapter.setItem(K_LOG_PREFIX + key, JSON.stringify(data));
  }

  getStreak(): Streak {
    const raw = this.adapter.getItem(K_STREAK);
    if (!raw) return { ...DEFAULT_STREAK };
    try {
      return JSON.parse(raw) as Streak;
    } catch {
      return { ...DEFAULT_STREAK };
    }
  }

  setStreak(s: Streak): void {
    this.adapter.setItem(K_STREAK, JSON.stringify(s));
  }

  allLogKeys(): string[] {
    return this.adapter.getAllKeys().filter((k) => k.startsWith(K_LOG_PREFIX));
  }

  exportAll(): ExportBundle {
    const out: ExportBundle = {
      settings: this.getSettings(),
      plans: this.getPlans(),
      logs: {},
      streak: this.getStreak(),
    };
    for (const k of this.allLogKeys()) {
      const raw = this.adapter.getItem(k);
      if (raw) {
        try {
          out.logs[k.substring(K_LOG_PREFIX.length)] = JSON.parse(raw) as DayEntry;
        } catch {
          /* skip corrupt */
        }
      }
    }
    return out;
  }
}
