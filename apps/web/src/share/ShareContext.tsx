// @tilemo/web — 分享 Provider：触发 share.ts 的 openShareCard（Canvas 浮层）。
// 镜像 mobile ShareContext，但底层是 web Canvas（share.ts）而非 view-shot。

import { createContext, useCallback, useContext, type ReactNode } from "react";
import { gatherCardData, type CardType, type MilestoneCopy } from "@tilemo/share-card";
import { openShareCard } from "../share";
import { useDataStore } from "../data";

export interface ShareInit {
  type: CardType;
  milestone?: MilestoneCopy;
}

const Ctx = createContext<(init: ShareInit) => void>(() => {});

function currentTheme(): "light" | "dark" {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

export function ShareProvider({ children }: { children: ReactNode }) {
  const store = useDataStore((s) => s.store);
  const settings = useDataStore((s) => s.settings);

  const openShare = useCallback(
    (init: ShareInit) => {
      if (!store || !settings) return;
      openShareCard(() =>
        gatherCardData(store, settings, {
          theme: currentTheme(),
          type: init.type,
          milestone: init.milestone,
        }),
      );
    },
    [store, settings],
  );

  return <Ctx.Provider value={openShare}>{children}</Ctx.Provider>;
}

export function useOpenShare(): (init: ShareInit) => void {
  return useContext(Ctx);
}
