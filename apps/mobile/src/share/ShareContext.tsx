// @tilemo/mobile — 分享 Provider：持有 ShareSheet 的 open 状态，
// 暴露 useOpenShare() 给任意子组件（如 Metronome、Home）触发卡片浮层。

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { ShareSheet, type ShareInit } from "./ShareSheet";

const OpenShareCtx = createContext<(init: ShareInit) => void>(() => {});

export function ShareProvider({ children }: { children: ReactNode }) {
  const [init, setInit] = useState<ShareInit | null>(null);
  const openShare = useCallback((i: ShareInit) => setInit(i), []);
  const close = useCallback(() => setInit(null), []);

  return (
    <OpenShareCtx.Provider value={openShare}>
      {children}
      <ShareSheet init={init} onClose={close} />
    </OpenShareCtx.Provider>
  );
}

export function useOpenShare(): (init: ShareInit) => void {
  return useContext(OpenShareCtx);
}

export type { ShareInit };
