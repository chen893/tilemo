// @tilemo/core — Metro engine. 1:1 port of index.html lines 5090-5365.
//
// Framework-free observable state machine: pure TS + standard timers, so web and
// RN share it identically. Platform visuals (breath-shape animation, audio,
// haptics, reduced-motion) are wired by each app via the emitted snapshot — NOT
// here. Session persistence is delegated via hooks (onRecord) so core stays
// decoupled from the Store.

import type { Plan } from "@tilemo/data";

export type MetroPhase = "contract" | "relax";
export type MetroState = "idle" | "prep" | "running" | "paused" | "done";
export type MetroStage = "prep" | "breath" | "done";

export interface MetroSnapshot {
  state: MetroState;
  stage: MetroStage;
  phase: MetroPhase;
  remaining: number; // seconds left in the current phase
  prepN: number; // prep countdown 3..1
  setIdx: number;
  sets: number;
  startedReps: number; // completed full reps (contract→relax)
  totalReps: number; // plan.reps * plan.sets
  doneSub: string;
  planId: string | null;
}

export interface MetroHooks {
  /** Record a session (completion, or early-stop that completed ≥1 rep). */
  onRecord?: (plan: Plan, completedReps: number, durationSec: number, finished: boolean) => void;
  /** After the overlay closes. startedReps lets the host decide on celebration. */
  onAfterClose?: (completion: boolean, startedReps: number) => void;
}

type Listener = (s: MetroSnapshot) => void;

export class Metro {
  private plan: Plan | null = null;
  private _state: MetroState = "idle";
  private stage: MetroStage = "prep";
  private phase: MetroPhase = "contract";
  private remaining = 0;
  private prepN = 3;
  private setIdx = 0;
  private repIdx = 0;
  private startedReps = 0;
  private totalElapsed = 0;
  private doneSub = "";
  private tickHandle: ReturnType<typeof setInterval> | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly listeners = new Set<Listener>();
  private readonly hooks: MetroHooks;

  constructor(hooks: MetroHooks = {}) {
    this.hooks = hooks;
  }

  subscribe(l: Listener): () => void {
    this.listeners.add(l);
    l(this.snapshot());
    return () => {
      this.listeners.delete(l);
    };
  }

  snapshot(): MetroSnapshot {
    return {
      state: this._state,
      stage: this.stage,
      phase: this.phase,
      remaining: this.remaining,
      prepN: this.prepN,
      setIdx: this.setIdx,
      sets: this.plan?.sets ?? 0,
      startedReps: this.startedReps,
      totalReps: this.plan ? this.plan.reps * this.plan.sets : 0,
      doneSub: this.doneSub,
      planId: this.plan?.id ?? null,
    };
  }

  open(plan: Plan): void {
    this.disposeTimers();
    this.plan = plan;
    this._state = "prep";
    this.stage = "prep";
    this.setIdx = 0;
    this.repIdx = 0;
    this.phase = "contract";
    this.startedReps = 0;
    this.totalElapsed = 0;
    this.doneSub = "";
    this.prepN = 3;
    this.emit();
    this.runPrep(3);
  }

  /** Prep countdown: 3→2→1 then beginRunning. ~660ms per number (600ms hold + 60ms). */
  private runPrep(n: number): void {
    this.prepN = n;
    this.emit();
    this.timer = setTimeout(() => {
      if (n > 1) {
        this.timer = setTimeout(() => this.runPrep(n - 1), 60);
      } else {
        this.timer = setTimeout(() => this.beginRunning(), 600);
      }
    }, 600);
  }

  private beginRunning(): void {
    this._state = "running";
    this.stage = "breath";
    this.setIdx = 0;
    this.repIdx = 0;
    this.startedReps = 0;
    this.setPhase("contract");
  }

  private setPhase(p: MetroPhase): void {
    this.phase = p;
    this.remaining = p === "contract" ? this.plan!.contract : this.plan!.relax;
    this.emit();
    this.startTick();
  }

  private startTick(): void {
    this.stopTick();
    this.tickHandle = setInterval(() => {
      if (this._state !== "running") return;
      this.remaining -= 1;
      this.totalElapsed += 1000; // durationSec accumulator (pause-excluded), v3/v4 fix
      if (this.remaining <= 0) {
        this.stopTick();
        this.onPhaseEnd();
      } else {
        this.emit();
      }
    }, 1000);
  }

  private stopTick(): void {
    if (this.tickHandle) {
      clearInterval(this.tickHandle);
      this.tickHandle = null;
    }
  }

  /** One rep = contract→relax; rep counted when relax ends. */
  private onPhaseEnd(): void {
    if (this.phase === "contract") {
      this.setPhase("relax");
      return;
    }
    this.startedReps += 1;
    this.repIdx += 1;
    if (this.repIdx >= this.plan!.reps) {
      this.repIdx = 0;
      this.setIdx += 1;
      if (this.setIdx >= this.plan!.sets) {
        this.finishAll(true);
        return;
      }
    }
    this.setPhase("contract");
  }

  private finishAll(finished: boolean): void {
    this._state = "done";
    this.stopTick();
    const dur = this.totalElapsed / 1000;
    const total = this.plan!.reps * this.plan!.sets;
    this.hooks.onRecord?.(this.plan!, total, dur, finished);
    this.doneSub = finished ? `完成了 ${total} 次收紧，做得好。` : `做了 ${this.startedReps} 次，也算数。`;
    this.stage = "done";
    this.emit();
    this.timer = setTimeout(() => this.close(true), 1800);
  }

  togglePause(): void {
    if (this._state === "running") this.pause();
    else if (this._state === "paused") this.resume();
  }

  private pause(): void {
    if (this._state !== "running") return;
    this._state = "paused";
    this.stopTick();
    this.emit();
  }

  private resume(): void {
    if (this._state !== "paused") return;
    this._state = "running";
    this.emit();
    this.startTick();
  }

  endEarly(): void {
    if (this._state === "prep" || this._state === "idle") {
      this.close(false);
      return;
    }
    this.stopTick();
    const dur = this.totalElapsed / 1000;
    if (this.startedReps > 0) {
      this.hooks.onRecord?.(this.plan!, this.startedReps, dur, false);
    }
    this.close(false);
  }

  close(completion: boolean): void {
    this.disposeTimers();
    this.stopTick();
    const sr = this.startedReps;
    this._state = "idle";
    this.startedReps = 0;
    this.totalElapsed = 0;
    this.emit();
    this.hooks.onAfterClose?.(completion, sr);
  }

  dispose(): void {
    this.disposeTimers();
    this.stopTick();
    this.listeners.clear();
  }

  private disposeTimers(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private emit(): void {
    const s = this.snapshot();
    this.listeners.forEach((l) => l(s));
  }
}
