// @tilemo/web — App 根（阶段 1 骨架：主题 + 验证 React/Store 跑通）。
// 后续阶段在此挂 <ShareProvider><Shell/></ShareProvider>。

import { useEffect } from "react";
import { useDataStore } from "./data";

export function App() {
  const settings = useDataStore((s) => s.settings);
  const streak = useDataStore((s) => s.streak);

  // 主题：settings.theme → documentElement.data-theme（system 跟随 matchMedia）
  useEffect(() => {
    const pref = settings?.theme ?? "system";
    const dark =
      pref === "dark" || (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  }, [settings?.theme]);

  return (
    <div className="app" id="app" style={{ minHeight: "100vh", padding: 24 }}>
      <h1 style={{ color: "var(--text)", fontSize: 34, fontWeight: 700 }}>今天，提了么</h1>
      <p style={{ color: "var(--text2)", marginTop: 12 }}>
        React 重写中（阶段 1 骨架）· 连续 {streak?.current ?? 0} 天
      </p>
    </div>
  );
}
