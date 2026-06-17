// @tilemo/data — storage abstraction.
//
// Store only ever sees a SYNCHRONOUS adapter. localStorage is sync; on RN we
// preload AsyncStorage into a MemoryAdapter at bootstrap so the same sync API
// works everywhere (no async refactor of the Store / engine).

export interface SyncStorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  getAllKeys(): string[];
  isMemOnly?(): boolean;
}

/** localStorage with an in-memory fallback for private/incognito mode. */
export class LocalStorageAdapter implements SyncStorageAdapter {
  private mem = new Map<string, string>();
  private useMem = false;

  constructor() {
    if (typeof localStorage === "undefined") {
      this.useMem = true;
      return;
    }
    try {
      localStorage.setItem("__tgm_test__", "1");
      localStorage.removeItem("__tgm_test__");
    } catch {
      this.useMem = true;
    }
  }

  isMemOnly(): boolean {
    return this.useMem;
  }

  getItem(key: string): string | null {
    if (this.useMem) return this.mem.get(key) ?? null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  setItem(key: string, value: string): void {
    if (this.useMem) {
      this.mem.set(key, value);
      return;
    }
    try {
      localStorage.setItem(key, value);
    } catch {
      this.mem.set(key, value);
    }
  }

  removeItem(key: string): void {
    if (this.useMem) {
      this.mem.delete(key);
      return;
    }
    try {
      localStorage.removeItem(key);
    } catch {
      this.mem.delete(key);
    }
  }

  getAllKeys(): string[] {
    if (this.useMem) return [...this.mem.keys()];
    const out: string[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k) out.push(k);
      }
    } catch {
      /* ignore */
    }
    return out;
  }
}

/** Pure in-memory adapter. RN constructs one from AsyncStorage at launch. */
export class MemoryAdapter implements SyncStorageAdapter {
  private mem = new Map<string, string>();
  constructor(initial?: Record<string, string>) {
    if (initial) for (const k in initial) this.mem.set(k, initial[k]);
  }
  getItem(key: string): string | null {
    return this.mem.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.mem.set(key, value);
  }
  removeItem(key: string): void {
    this.mem.delete(key);
  }
  getAllKeys(): string[] {
    return [...this.mem.keys()];
  }
  isMemOnly(): boolean {
    return true;
  }
}
