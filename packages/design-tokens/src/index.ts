// @tilemo/design-tokens — single source of truth for the visual language.
// P0 stub: real 47-token set (light/dark) lands in P1. Shape finalized here so
// consumers can wire up now.
//
// Web consumes via tokensToCssVars() (regenerates the exact CSS custom properties
// the original index.html used). React Native reads the TS object directly.

export type ThemeMode = "light" | "dark";

export interface ColorTokens {
  paper: string;
  paperSoft: string;
  paperDeep: string;
  ink: string;
  accent: string;
  accentHot: string;
  accentSoft: string;
}

export interface TokenSet {
  color: ColorTokens;
}

const light: TokenSet = {
  color: {
    paper: "#FAF3EC",
    paperSoft: "#F3E8DC",
    paperDeep: "#EBDDCB",
    ink: "#2B2320",
    accent: "#E85A4F",
    accentHot: "#D63A2E",
    accentSoft: "#F4B4A8",
  },
};

const dark: TokenSet = {
  color: {
    paper: "#1E1A17",
    paperSoft: "#2A2420",
    paperDeep: "#332B26",
    ink: "#F2EBE0",
    accent: "#E85A4F",
    accentHot: "#FF8270",
    accentSoft: "#4A352C",
  },
};

export const tokens: Record<ThemeMode, TokenSet> = { light, dark };

/** Emit CSS custom-property declarations for `:root`, e.g. `--paper:#FAF3EC;...`. */
export function tokensToCssVars(mode: ThemeMode = "light"): string {
  const c = tokens[mode].color;
  return [
    `--paper:${c.paper}`,
    `--paper-soft:${c.paperSoft}`,
    `--paper-deep:${c.paperDeep}`,
    `--ink:${c.ink}`,
    `--accent:${c.accent}`,
    `--accent-hot:${c.accentHot}`,
    `--accent-soft:${c.accentSoft}`,
  ].join(";");
}
