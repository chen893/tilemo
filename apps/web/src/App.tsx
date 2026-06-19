// @tilemo/web — App 根。主题 + <Shell/>。阶段 4 将包 <ShareProvider>。

import { useEffect } from "react";
import { useDataStore } from "./data";
import { Shell } from "./Shell";
import { ShareProvider } from "./share/ShareContext";

export function App() {
  const settings = useDataStore((s) => s.settings);

  // 主题：settings.theme → documentElement.data-theme（system 跟随 matchMedia）。
  // system 模式下订阅 OS 明暗切换（运行时立即生效，不必刷新）。
  // 同时同步 <meta name="theme-color">，使移动浏览器顶栏 / PWA 标题栏与应用主题一致。
  useEffect(() => {
    const pref = settings?.theme ?? "system";
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = pref === "dark" || (pref === "system" && mq.matches);
      document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute("content", dark ? "#1F1814" : "#FAF3EC"); // dark = 设计 token paper
    };
    apply();
    if (pref === "system") {
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
  }, [settings?.theme]);

  return (
    <ShareProvider>
      <Shell />
    </ShareProvider>
  );
}

