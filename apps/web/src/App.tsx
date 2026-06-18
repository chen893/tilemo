// @tilemo/web — App 根。主题 + <Shell/>。阶段 4 将包 <ShareProvider>。

import { useEffect } from "react";
import { useDataStore } from "./data";
import { Shell } from "./Shell";
import { ShareProvider } from "./share/ShareContext";

export function App() {
  const settings = useDataStore((s) => s.settings);

  // 主题：settings.theme → documentElement.data-theme（system 跟随 matchMedia）
  useEffect(() => {
    const pref = settings?.theme ?? "system";
    const dark =
      pref === "dark" || (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  }, [settings?.theme]);

  return (
    <ShareProvider>
      <Shell />
    </ShareProvider>
  );
}

