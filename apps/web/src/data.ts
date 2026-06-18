// @tilemo/web — Store bootstrap。
// 镜像 mobile 的 data.ts，但 web 用同步 LocalStorageAdapter（localStorage 同步），
// 无需 async/ready 等待态：main.tsx 顶层直接调一次即可。

import { LocalStorageAdapter, Store } from "@tilemo/data";
import { useDataStore } from "@tilemo/store";

let bootstrapped = false;

/** 构造 Store、seed 默认方案、init zustand 层。幂等。 */
export function bootstrapStore(): void {
  if (bootstrapped) return;
  const store = new Store(new LocalStorageAdapter());
  store.getPlans(); // 首读 seed DEFAULT_PLANS
  useDataStore.getState().init(store);
  bootstrapped = true;
}

export { useDataStore };
