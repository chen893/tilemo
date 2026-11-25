import { describe, expect, it } from "vitest";
import { PandaEngine, getPandaCopy, pandaDropCurve, pandaLiftCurve } from "./panda";
import type { MetroSnapshot } from "./metro";

function baseSnap(over: Partial<MetroSnapshot> = {}): MetroSnapshot {
  return {
    state: "running",
    stage: "breath",
    phase: "contract",
    remaining: 3,
    prepN: 3,
    setIdx: 0,
    sets: 1,
    startedReps: 0,
    totalReps: 10,
    doneSub: "",
    planId: "beginner",
    ...over,
  };
}

describe("PandaEngine scientific curves & state continuity", () => {
  it("aligns lift end with drop start to prevent phase-switch snap", () => {
    expect(pandaLiftCurve(1, false)).toBe(1);
    expect(1 - pandaDropCurve(0, false)).toBe(1);
    expect(pandaDropCurve(1, false)).toBe(1);
  });

  it("keeps seed strictly above hammock quadratic midpoint across full lift range", () => {
    const engine = new PandaEngine();
    engine.sync({
      stage: "breath",
      state: "running",
      phase: "contract",
      remaining: 3,
      startedReps: 0,
      contractSec: 3,
      relaxSec: 3,
    });
    for (let i = 0; i < 60; i++) {
      const f = engine.step(0.05, "light", true);
      const seedBottomY = 212 + f.seedDy;
      expect(seedBottomY).toBeLessThan(f.hamActualMidY);
    }
  });

  it("freezes lift during pause instead of dropping to zero", () => {
    const engine = new PandaEngine();
    engine.sync({
      stage: "breath",
      state: "running",
      phase: "contract",
      remaining: 3,
      startedReps: 0,
      contractSec: 3,
      relaxSec: 3,
    });
    let lifted = 0;
    for (let i = 0; i < 30; i++) {
      lifted = engine.step(0.05, "dark", true).lift;
    }
    expect(lifted).toBeGreaterThan(0.8);

    engine.sync({
      stage: "breath",
      state: "paused",
      phase: "contract",
      remaining: 2,
      startedReps: 0,
      contractSec: 3,
      relaxSec: 3,
    });
    const afterPause = engine.step(0.05, "dark", true).lift;
    expect(Math.abs(afterPause - lifted)).toBeLessThan(0.05);
  });

  it("disables strong breath flow in quick-flick mode and transitions long holds to natural breathing", () => {
    const quickCopy = getPandaCopy(baseSnap({ remaining: 1 }), 1);
    expect(quickCopy.pillText).toContain("↑");

    const engine = new PandaEngine();
    engine.sync({
      stage: "breath",
      state: "running",
      phase: "contract",
      remaining: 1,
      startedReps: 0,
      contractSec: 1,
      relaxSec: 1,
    });
    const quickFrame = engine.step(0.05, "light", false);
    expect(quickFrame.exhaleOp).toBe(0);

    const longEngine = new PandaEngine();
    longEngine.sync({
      stage: "breath",
      state: "running",
      phase: "contract",
      remaining: 8,
      startedReps: 0,
      contractSec: 8,
      relaxSec: 6,
    });
    // Advance past 2s exhale initiation into steady hold
    let f = longEngine.step(0.05, "light", false);
    for (let i = 0; i < 60; i++) {
      f = longEngine.step(0.05, "light", false);
    }
    expect(f.exhaleOp).toBeLessThan(0.05);
  });
});
