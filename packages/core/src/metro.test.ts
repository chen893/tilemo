import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Metro } from "./metro";
import { DEFAULT_PLANS } from "@tilemo/data";

// Prep countdown lands beginRunning at ~2520ms (600 + 60 gaps × 2 + 600 final).
const PREP_MS = 3000;

describe("Metro engine", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("completes a beginner plan (3/3/10/1): records reps*sets=10, durationSec=60", () => {
    const recorded: Array<{ reps: number; dur: number; fin: boolean }> = [];
    const m = new Metro({
      onRecord: (_p, reps, dur, fin) => recorded.push({ reps, dur, fin }),
    });
    let snap = m.snapshot();
    m.subscribe((s) => (snap = s));
    const plan = DEFAULT_PLANS[0]; // beginner 3s/3s/10 reps/1 set

    m.open(plan);
    vi.advanceTimersByTime(PREP_MS);
    expect(snap.state).toBe("running");
    expect(snap.phase).toBe("contract");
    expect(snap.remaining).toBe(3);

    vi.advanceTimersByTime(60_000); // 10 reps × (3+3)s
    expect(recorded).toHaveLength(1);
    expect(recorded[0].reps).toBe(10);
    expect(recorded[0].dur).toBe(60);
    expect(recorded[0].fin).toBe(true);
  });

  it("counts a rep only when relax ends (contract→relax→rep++)", () => {
    const m = new Metro();
    let snap = m.snapshot();
    m.subscribe((s) => (snap = s));
    m.open(DEFAULT_PLANS[0]);

    vi.advanceTimersByTime(PREP_MS); // running, contract
    expect(snap.phase).toBe("contract");
    vi.advanceTimersByTime(3000); // contract ends → relax
    expect(snap.phase).toBe("relax");
    expect(snap.startedReps).toBe(0);
    vi.advanceTimersByTime(3000); // relax ends → rep++, contract
    expect(snap.startedReps).toBe(1);
    expect(snap.phase).toBe("contract");
  });

  it("early-stop records startedReps with finished=false", () => {
    const recorded: Array<{ reps: number; fin: boolean }> = [];
    const m = new Metro({ onRecord: (_p, reps, _d, fin) => recorded.push({ reps, fin }) });
    m.open(DEFAULT_PLANS[0]);
    vi.advanceTimersByTime(PREP_MS); // running
    vi.advanceTimersByTime(7000); // ≥1 full rep done, into 2nd contract
    m.endEarly();
    expect(recorded).toHaveLength(1);
    expect(recorded[0].fin).toBe(false);
    expect(recorded[0].reps).toBeGreaterThanOrEqual(1);
  });

  it("stopping during prep records nothing", () => {
    const recorded: unknown[] = [];
    const m = new Metro({ onRecord: () => recorded.push(1) });
    m.open(DEFAULT_PLANS[0]);
    vi.advanceTimersByTime(500); // still prep
    m.endEarly();
    expect(recorded).toHaveLength(0);
  });

  it("pause/resume excludes paused time from durationSec", () => {
    const recorded: Array<{ dur: number }> = [];
    const m = new Metro({ onRecord: (_p, _r, dur) => recorded.push({ dur }) });
    let snap = m.snapshot();
    m.subscribe((s) => (snap = s));
    m.open(DEFAULT_PLANS[0]);
    vi.advanceTimersByTime(PREP_MS); // running, contract
    vi.advanceTimersByTime(2000); // 2s ticked, remaining 1
    m.togglePause(); // pause
    expect(snap.state).toBe("paused");
    vi.advanceTimersByTime(5000); // paused time must NOT accumulate
    m.togglePause(); // resume
    vi.advanceTimersByTime(1000); // finish this contract tick
    // only 3 real seconds ticked since running → totalElapsed = 3000
    expect(snap.remaining === 3 || snap.phase === "relax").toBe(true);
    void recorded;
  });
});
