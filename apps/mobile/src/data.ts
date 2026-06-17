// @tilemo/mobile — data bootstrap.
//
// AsyncStorage is async; @tilemo/data's Store is synchronous and takes a
// SyncStorageAdapter. The pattern (per the shared-package contract): at launch
// load ALL `tgm:` keys into a plain object, wrap a MemoryAdapter around it, then
// construct the Store. On every write we also fire-and-forget the changed key
// back to AsyncStorage so the next cold boot sees it.
//
// The reactive layer is the SHARED @tilemo/store (zustand) — we just call
// `useDataStore.getState().init(store)` once the Store is ready, and
// `.refresh()` after each write. No duplication.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { MemoryAdapter, Store, type SyncStorageAdapter } from "@tilemo/data";
import { useDataStore } from "@tilemo/store";

/**
 * A MemoryAdapter whose backing map is the single source of truth at runtime,
 * and which mirrors every setItem/removeItem to AsyncStorage (fire-and-forget).
 * getAllKeys() reads the in-memory map (sync), matching the Store contract.
 */
class RnStorageAdapter implements SyncStorageAdapter {
  private mem = new Map<string, string>();

  constructor(initial?: Record<string, string>) {
    if (initial) for (const k in initial) this.mem.set(k, initial[k]);
  }

  getItem(key: string): string | null {
    return this.mem.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.mem.set(key, value);
    AsyncStorage.setItem(key, value).catch(() => {
      /* storage full / unavailable — keep going in-memory */
    });
  }

  removeItem(key: string): void {
    this.mem.delete(key);
    AsyncStorage.removeItem(key).catch(() => {
      /* ignore */
    });
  }

  getAllKeys(): string[] {
    return [...this.mem.keys()];
  }

  isMemOnly(): boolean {
    return false;
  }
}

let bootstrapped: Store | null = null;
let bootPromise: Promise<Store> | null = null;

/** Load every persisted `tgm:` key, build the Store, init the zustand layer. */
export async function bootstrapStore(): Promise<Store> {
  if (bootstrapped) return bootstrapped;
  if (bootPromise) return bootPromise;

  bootPromise = (async () => {
    const initial: Record<string, string> = {};
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      for (const k of allKeys) {
        if (typeof k === "string" && k.startsWith("tgm:")) {
          const v = await AsyncStorage.getItem(k);
          if (v != null) initial[k] = v;
        }
      }
    } catch {
      /* fresh install or storage unavailable → empty map, defaults seed below */
    }

    const adapter = new RnStorageAdapter(initial);
    const store = new Store(adapter);

    // Seed plans on very first read so the UI has something to show immediately.
    store.getPlans();

    useDataStore.getState().init(store);
    bootstrapped = store;
    return store;
  })();

  return bootPromise;
}

export { useDataStore };
