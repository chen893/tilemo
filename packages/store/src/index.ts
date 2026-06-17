// @tilemo/store — reactive layer (Zustand) bound to @tilemo/data, shared by web & mobile.
// P0 stub proving zustand works across the workspace; real stores in P1+.
import { create } from "zustand";

interface P0State {
  bootCount: number;
  bump: () => void;
}

export const useBootStore = create<P0State>((set) => ({
  bootCount: 0,
  bump: () => set((s) => ({ bootCount: s.bootCount + 1 })),
}));
