// @tilemo/mobile — UI primitives.
//
// design-tokens ship px-strings (web CSS). RN StyleSheet wants numbers, so we
// expose `sp` (numeric spacing) and `fs` (numeric font-size) parsed once.
// Plus a couple of tiny shared components to keep screens terse.

import { type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type ViewStyle, type TextStyle, type PressableProps } from "react-native";
import { spacing as _spacing, type as _type, motion, type ColorSet } from "@tilemo/design-tokens";

type PxStr = `${number}px`;

const num = (v: PxStr): number => Number.parseFloat(v);

/** Numeric spacing scale: sp(4)=4, sp("s3")=12, etc. */
export const sp = Object.assign(
  (n: number) => n,
  {
    s1: num(_spacing.s1 as PxStr),
    s2: num(_spacing.s2 as PxStr),
    s3: num(_spacing.s3 as PxStr),
    s4: num(_spacing.s4 as PxStr),
    s5: num(_spacing.s5 as PxStr),
    s6: num(_spacing.s6 as PxStr),
    s7: num(_spacing.s7 as PxStr),
    s8: num(_spacing.s8 as PxStr),
    gutter: 24, // clamp(20,6vw,48) → mobile fixed
  } as const,
);

/** Numeric font-size scale. */
export const fs = {
  xs: num(_type.xs as PxStr),
  sm: num(_type.sm as PxStr),
  base: num(_type.base as PxStr),
  md: num(_type.md as PxStr),
  lg: num(_type.lg as PxStr),
  xl: num(_type.xl as PxStr),
  x2l: num(_type.x2l as PxStr),
} as const;

export { motion };

export function Card({
  children,
  colors,
  style,
}: {
  children: ReactNode;
  colors: ColorSet;
  style?: ViewStyle;
}) {
  return <View style={[styles.card, { backgroundColor: colors.paperSoft, borderColor: colors.rule }, style]}>{children}</View>;
}

export function Row({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[{ flexDirection: "row", alignItems: "center" }, style]}>{children}</View>;
}

export function Txt({
  children,
  colors,
  size = fs.base,
  weight = "400",
  color: ink,
  style,
}: {
  children: ReactNode;
  colors: ColorSet;
  size?: number;
  weight?: TextStyle["fontWeight"];
  color?: keyof ColorSet;
  style?: TextStyle;
}) {
  return (
    <Text
      style={[
        { color: ink ? colors[ink] : colors.text, fontSize: size, fontWeight: weight },
        style,
      ]}
      numberOfLines={undefined}
    >
      {children}
    </Text>
  );
}

type ButtonProps = PressableProps & {
  colors: ColorSet;
  variant?: "solid" | "ghost" | "soft";
  children: ReactNode;
  style?: ViewStyle;
};

export function Button({ colors, variant = "solid", children, style, ...rest }: ButtonProps) {
  const bg =
    variant === "solid" ? colors.accent : variant === "soft" ? colors.paperSoft : "transparent";
  const fg = variant === "solid" ? "#FFFFFF" : colors.text;
  const border = variant === "ghost" ? { borderWidth: 1, borderColor: colors.ruleStrong } : null;
  return (
    <Pressable
      {...rest}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, opacity: pressed ? 0.85 : 1 },
        border,
        style,
      ]}
    >
      <Text style={{ color: fg, fontSize: fs.base, fontWeight: "600", textAlign: "center" }}>
        {children}
      </Text>
    </Pressable>
  );
}

export function Stepper({
  value,
  min,
  max,
  onDec,
  onInc,
  colors,
}: {
  value: number;
  min: number;
  max: number;
  onDec: () => void;
  onInc: () => void;
  colors: ColorSet;
}) {
  return (
    <View style={[styles.stepper, { borderColor: colors.ruleStrong }]}>
      <Pressable
        onPress={onDec}
        disabled={value <= min}
        style={({ pressed }) => ({
          opacity: value <= min ? 0.3 : pressed ? 0.5 : 1,
          paddingHorizontal: sp.s4,
          paddingVertical: sp.s2,
        })}
      >
        <Text style={{ color: colors.text, fontSize: fs.lg, fontWeight: "600" }}>−</Text>
      </Pressable>
      <Text style={{ color: colors.text, fontSize: fs.xl, fontWeight: "700", minWidth: 28, textAlign: "center" }}>
        {value}
      </Text>
      <Pressable
        onPress={onInc}
        disabled={value >= max}
        style={({ pressed }) => ({
          opacity: value >= max ? 0.3 : pressed ? 0.5 : 1,
          paddingHorizontal: sp.s4,
          paddingVertical: sp.s2,
        })}
      >
        <Text style={{ color: colors.text, fontSize: fs.lg, fontWeight: "600" }}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    borderWidth: 1,
    padding: sp.s5,
  },
  btn: {
    paddingVertical: sp.s3,
    paddingHorizontal: sp.s5,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 999,
    overflow: "hidden",
  },
});
