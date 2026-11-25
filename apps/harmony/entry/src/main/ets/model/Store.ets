import { preferences } from '@kit.ArkData';
import { common } from '@kit.AbilityKit';
import { DEFAULT_PLANS, DEFAULT_SETTINGS } from './defaults';
import { DayEntry, Plan, Session, Settings, Streak } from './types';
import { todayKey, ymd } from './time';

export function freshSettings(): Settings {
  return { dailyGoalGroups: DEFAULT_SETTINGS.dailyGoalGroups, defaultPlanId: DEFAULT_SETTINGS.defaultPlanId,
    theme: DEFAULT_SETTINGS.theme, sound: DEFAULT_SETTINGS.sound, haptics: DEFAULT_SETTINGS.haptics,
    dailyQuote: DEFAULT_SETTINGS.dailyQuote };
}

interface Backup {
  settings: Settings;
  plans: Plan[];
  streak: Streak;
  logs: Record<string, DayEntry>;
}

export class Store {
  settings: Settings = freshSettings();
  streak: Streak = { current: 0, longest: 0, lastCheckedDate: null };
  private logs: Record<string, DayEntry> = {};
  private db: preferences.Preferences;
  readonly plans: Plan[] = DEFAULT_PLANS;

  constructor(context: common.UIAbilityContext) {
    this.db = preferences.getPreferencesSync(context, { name: 'tilemo' });
    this.settings = JSON.parse(this.db.getSync('tgm:settings', JSON.stringify(this.settings)) as string) as Settings;
    this.streak = JSON.parse(this.db.getSync('tgm:streak', JSON.stringify(this.streak)) as string) as Streak;
    for (const key of Object.keys(this.db.getAllSync())) {
      if (key.startsWith('tgm:log:')) {
        this.logs[key.slice(8)] = JSON.parse(this.db.getSync(key, '{}') as string) as DayEntry;
      }
    }
    this.refreshStreak();
  }

  day(key: string): DayEntry | undefined {
    return this.logs[key];
  }

  completed(key: string): number {
    return this.day(key)?.sessions.filter((session: Session) => session.finished !== false).length ?? 0;
  }

  heat(key: string): number {
    const day = this.day(key);
    if (!day || day.sessions.length === 0) return 0;
    const ratio = this.completed(key) / day.goalGroups;
    return ratio >= 1.2 ? 3 : ratio >= 1 ? 2 : 1;
  }

  totalDays(): number {
    return Object.keys(this.logs).filter((key: string) => this.logs[key].sessions.length > 0).length;
  }

  totalCompleted(): number {
    return Object.keys(this.logs).reduce((sum: number, key: string) => sum + this.completed(key), 0);
  }

  activePlan(): Plan {
    return this.plans.find((plan: Plan) => plan.id === this.settings.defaultPlanId) ?? this.plans[0];
  }

  planName(id: string): string {
    return this.plans.find((plan: Plan) => plan.id === id)?.name ?? '自定义';
  }

  saveSettings(): void {
    this.db.putSync('tgm:settings', JSON.stringify(this.settings));
    this.db.flushSync();
  }

  record(plan: Plan, reps: number, duration: number, finished: boolean): void {
    const key = todayKey();
    const day: DayEntry = this.logs[key] ?? {
      date: key, goalGroups: this.settings.dailyGoalGroups, sessions: [], manualOverride: false
    };
    day.sessions.push({ ts: Date.now(), planId: plan.id, completedReps: reps, durationSec: duration, finished: finished });
    this.logs[key] = day;
    this.db.putSync('tgm:log:' + key, JSON.stringify(day));
    this.refreshStreak();
    this.db.flushSync();
  }

  refreshStreak(): void {
    const cursor = new Date();
    if (this.heat(ymd(cursor)) < 2) cursor.setDate(cursor.getDate() - 1);
    let current = 0;
    while (this.heat(ymd(cursor)) >= 2) {
      current++;
      cursor.setDate(cursor.getDate() - 1);
    }
    const longest = Math.max(current, this.streak.longest);
    const checked = todayKey();
    if (current !== this.streak.current || longest !== this.streak.longest || checked !== this.streak.lastCheckedDate) {
      this.streak = { current: current, longest: longest, lastCheckedDate: checked };
      this.db.putSync('tgm:streak', JSON.stringify(this.streak));
    }
  }

  exportText(): string {
    const backup: Backup = { settings: this.settings,
      plans: this.plans, streak: this.streak, logs: this.logs };
    return JSON.stringify(backup, null, 2);
  }

  clear(): void {
    this.db.clearSync();
    this.settings = freshSettings();
    this.streak = { current: 0, longest: 0, lastCheckedDate: null };
    this.logs = {};
    this.db.flushSync();
  }
}
