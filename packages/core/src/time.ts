// @tilemo/core — time helpers. LOCAL calendar date (not UTC), matching the
// original ymd/todayKey (index.html lines 3685-3690). Day buckets must stay
// local or streak / "is-today" logic breaks across midnight.

export function pad2(n: number): string {
  return (n < 10 ? "0" : "") + n;
}

export function ymd(date: Date): string {
  return date.getFullYear() + "-" + pad2(date.getMonth() + 1) + "-" + pad2(date.getDate());
}

export function todayKey(): string {
  return ymd(new Date());
}

export function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v));
}
