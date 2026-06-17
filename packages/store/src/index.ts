// @tilemo/store — reactive layer (Zustand) bound to @tilemo/data + @tilemo/core.
// Shared by web and mobile: each app constructs a platform Store (LocalStorage /
// Memory adapter) and calls init() once; selectors re-read on refresh().

import { create } from "zustand";
import type { DayEntry, Plan, Settings, Streak, Store } from "@tilemo/data";
import { recomputeStreak, todayKey } from "@tilemo/core";

interface DataState {
  store: Store | null;
  settings: Settings | null;
  plans: Plan[];
  todayKey: string | null;
  today: DayEntry | null;
  streak: Streak | null;
  init: (store: Store) => void;
  refresh: () => void;
}

function snapshot(store: Store) {
  const tk = todayKey();
  return {
    settings: store.getSettings(),
    plans: store.getPlans(),
    todayKey: tk,
    today: store.getDay(tk),
    streak: store.getStreak(),
  };
}

export const useDataStore = create<DataState>((set, get) => ({
  store: null,
  settings: null,
  plans: [],
  todayKey: null,
  today: null,
  streak: null,
  init: (store) => {
    recomputeStreak(store); // refresh cached streak from logs before first read
    set({ store, ...snapshot(store) });
  },
  refresh: () => {
    const store = get().store;
    if (!store) return;
    set(snapshot(store));
  },
}));

/** Convenience accessor for imperative callers (engine, exporters). */
export function getStore(): Store | null {
  return useDataStore.getState().store;
}
