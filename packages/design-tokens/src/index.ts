// @tilemo/design-tokens — single source of truth for the visual language.
// Ported 1:1 from index.html `:root` + `[data-theme="dark"]` (lines 18-113).
//
// Web: inject tokensToStylesheet() once into a <style> — emits the identical CSS
// custom properties the original used, so ported CSS works unchanged; theme
// switching just toggles `data-theme`.
// RN: read the structured `color` / `spacing` / `type` / ... objects directly.

export type ThemeMode = "light" | "dark";

export interface ColorSet {
  paper: string;
  paperSoft: string;
  paperDeep: string;
  ink: string;
  accent: string;
  accentHot: string;
  accentSoft: string;
  success: string;
  text: string;
  text2: string;
  text3: string;
  rule: string;
  ruleStrong: string;
  heat0: string;
  heat1: string;
  heat2: string;
  heat3: string;
}

const light: ColorSet = {
  paper: "#FAF3EC",
  paperSoft: "#F3E8DC",
  paperDeep: "#EBDDCB",
  ink: "#2B2320",
  accent: "#E85A4F",
  accentHot: "#D63A2E",
  accentSoft: "#F4B4A8",
  success: "#C8402E",
  text: "#2B2320",
  text2: "#5C4F47",
  text3: "#6F5F50",
  rule: "rgba(43,35,32,0.12)",
  ruleStrong: "rgba(43,35,32,0.24)",
  heat0: "transparent",
  heat1: "#F0DCC9",
  heat2: "#E8B59A",
  heat3: "#E85A4F",
};

const dark: ColorSet = {
  paper: "#1F1814",
  paperSoft: "#2A201A",
  paperDeep: "#352821",
  ink: "#F2E8DC",
  accent: "#FF6B5E",
  accentHot: "#FF8270",
  accentSoft: "#8A4538",
  success: "#F26B5F",
  text: "#F2E8DC",
  text2: "#C4B5A6",
  text3: "#A09080",
  rule: "rgba(242,232,220,0.14)",
  ruleStrong: "rgba(242,232,220,0.30)",
  heat0: "transparent",
  heat1: "#3D2E24",
  heat2: "#6B4234",
  heat3: "#FF6B5E",
};

export const color: Record<ThemeMode, ColorSet> = { light, dark };

export const spacing = {
  s1: "4px",
  s2: "8px",
  s3: "12px",
  s4: "16px",
  s5: "24px",
  s6: "32px",
  s7: "48px",
  s8: "64px",
  gutter: "clamp(20px, 6vw, 48px)",
};

export const type = {
  xs: "12px",
  sm: "14px",
  base: "16px",
  md: "18px",
  lg: "22px",
  xl: "28px",
  x2l: "40px",
};

export const font = {
  sans: '-apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Source Han Sans SC", "Microsoft YaHei", system-ui, sans-serif',
  num: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "PingFang SC", system-ui, sans-serif',
};

export const radius = {
  blob1: "60% 40% 55% 45% / 50% 60% 40% 50%",
  blob2: "45% 55% 60% 40% / 60% 45% 55% 40%",
  blob3: "55% 45% 40% 60% / 45% 55% 45% 55%",
  blobPill: "999px",
  cardA: "22px 24px 23px 21px",
  cardB: "24px 21px 22px 23px",
  cardC: "21px 23px 24px 22px",
  cardStreak: "20px 22px 21px 19px",
  cardAbout: "22px 20px 23px 21px",
  cardCal: "12px 14px 12px 14px",
  md: "18px",
  lg: "28px",
};

export const motion = {
  ease: "cubic-bezier(0.22, 1, 0.36, 1)",
  easeBreath: "cubic-bezier(0.45, 0.05, 0.55, 0.95)",
  easeDroop: "cubic-bezier(0.34, 1.2, 0.64, 1)",
  durFast: "160ms",
  dur: "320ms",
  durBreathCycle: "4500ms",
  durBreath: "3000ms",
};

function colorDecls(c: ColorSet): string {
  return [
    `--paper:${c.paper}`,
    `--paper-soft:${c.paperSoft}`,
    `--paper-deep:${c.paperDeep}`,
    `--ink:${c.ink}`,
    `--accent:${c.accent}`,
    `--accent-hot:${c.accentHot}`,
    `--accent-soft:${c.accentSoft}`,
    `--success:${c.success}`,
    `--text:${c.text}`,
    `--text-2:${c.text2}`,
    `--text-3:${c.text3}`,
    `--rule:${c.rule}`,
    `--rule-strong:${c.ruleStrong}`,
    `--heat-0:${c.heat0}`,
    `--heat-1:${c.heat1}`,
    `--heat-2:${c.heat2}`,
    `--heat-3:var(--accent)`,
  ].join(";");
}

function sharedDecls(): string {
  return [
    `--s-1:${spacing.s1}`,
    `--s-2:${spacing.s2}`,
    `--s-3:${spacing.s3}`,
    `--s-4:${spacing.s4}`,
    `--s-5:${spacing.s5}`,
    `--s-6:${spacing.s6}`,
    `--s-7:${spacing.s7}`,
    `--s-8:${spacing.s8}`,
    `--gutter:${spacing.gutter}`,
    `--t-xs:${type.xs}`,
    `--t-sm:${type.sm}`,
    `--t-base:${type.base}`,
    `--t-md:${type.md}`,
    `--t-lg:${type.lg}`,
    `--t-xl:${type.xl}`,
    `--t-2xl:${type.x2l}`,
    `--font:${font.sans}`,
    `--font-num:${font.num}`,
    `--blob-1:${radius.blob1}`,
    `--blob-2:${radius.blob2}`,
    `--blob-3:${radius.blob3}`,
    `--blob-pill:${radius.blobPill}`,
    `--card-radius-a:${radius.cardA}`,
    `--card-radius-b:${radius.cardB}`,
    `--card-radius-c:${radius.cardC}`,
    `--card-radius-streak:${radius.cardStreak}`,
    `--card-radius-about:${radius.cardAbout}`,
    `--card-radius-cal:${radius.cardCal}`,
    `--radius-md:${radius.md}`,
    `--radius-lg:${radius.lg}`,
    `--ease:${motion.ease}`,
    `--ease-breath:${motion.easeBreath}`,
    `--ease-droop:${motion.easeDroop}`,
    `--dur-fast:${motion.durFast}`,
    `--dur:${motion.dur}`,
    `--dur-breath-cycle:${motion.durBreathCycle}`,
    `--dur-breath:${motion.durBreath}`,
  ].join(";");
}

/** Full CSS: `:root` (shared + light) + `[data-theme="dark"]` overrides. Inject once. */
export function tokensToStylesheet(): string {
  return (
    `:root{${sharedDecls()};${colorDecls(light)};color-scheme:light}` +
    `[data-theme="dark"]{${colorDecls(dark)};color-scheme:dark}`
  );
}

/** Single-mode color vars only (for dynamic injection if ever needed). */
export function tokensToCssVars(mode: ThemeMode = "light"): string {
  return colorDecls(color[mode]);
}
