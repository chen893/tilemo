// @tilemo/mobile — theme.
//
// Resolves `settings.theme` ("system" | "light" | "dark" — a ThemeSetting from
// @tilemo/data) against the device color scheme, returning the active `color`
// token set (a ThemeMode "light" | "dark" from @tilemo/design-tokens). RN has
// no CSS vars; StyleSheet reads these structured colors directly.

import { useColorScheme } from "react-native";
import { color, type ColorSet, type ThemeMode } from "@tilemo/design-tokens";
import type { ThemeSetting } from "@tilemo/data";
import { useDataStore } from "./data";

export type { ThemeMode };

export function useTheme(): { mode: ThemeMode; colors: ColorSet } {
  const settings = useDataStore((s) => s.settings);
  const device = useColorScheme();
  const mode = resolveTheme(settings?.theme, device);
  return { mode, colors: color[mode] };
}

/** Imperative resolve for non-component callers (e.g. picking a launch splash). */
export function resolveTheme(
  pref: ThemeSetting | undefined,
  device: "light" | "dark" | null | undefined,
): ThemeMode {
  if (!pref || pref === "system") return device === "dark" ? "dark" : "light";
  return pref;
}
