// @tilemo/web — 桌面壳（≥1024px）：侧栏 + 主区，与 MobileShell 共用 tab。
// 双壳 DOM 都挂（Shell.tsx），CSS media query（≥1024）显隐：.desk 接管 / #app 隐藏。
// 签名同 MobileShell：{ tab, setTab, onStart }。

import type { ReactNode } from "react";
import type { Plan } from "@tilemo/data";
import { pad2, todayKey } from "@tilemo/core";
import type { Tab } from "./MobileShell";
import { useDataStore } from "./data";
import { DeskHomeView } from "./screens/desk/DeskHomeView";
import { DeskTrainView } from "./screens/desk/DeskTrainView";
import { DeskHistoryView } from "./screens/desk/DeskHistoryView";
import { DeskSettingsView } from "./screens/desk/DeskSettingsView";
import { useOpenShare } from "./share/ShareContext";

const WD = ["日", "一", "二", "三", "四", "五", "六"];

const NAV: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: "home", label: "今日", icon: <IconHome /> },
  { id: "train", label: "训练", icon: <IconBreath /> },
  { id: "history", label: "记录", icon: <IconCalendar /> },
  { id: "settings", label: "设置", icon: <IconSliders /> },
];

// header eyebrow/title per tab
// home 的 h1 用中性的「今日」作锚点，不再重复 brand wordmark 的「提了么」，
// 既消除侧栏/hero 的三连重复，又保住跨 tab 顶部 chrome 的一致性。
const HEADER: Record<Tab, { eyebrow: string; title: ReactNode }> = {
  home: { eyebrow: "日课 · 今天", title: <span><span className="em">今日</span></span> },
  train: { eyebrow: "训练 · 方案", title: <span>挑<span className="em">一组</span>开始</span> },
  history: { eyebrow: "记录 · 足迹", title: <span>你的<span className="em">足迹</span></span> },
  settings: { eyebrow: "设置 · 偏好", title: <span>调成你的<span className="em">样子</span></span> },
};

export function DeskShell({
  tab,
  setTab,
  onStart,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  onStart: (p: Plan) => void;
}) {
  const settings = useDataStore((s) => s.settings);
  const store = useDataStore((s) => s.store);
  const refresh = useDataStore((s) => s.refresh);
  const streak = useDataStore((s) => s.streak);
  const openShare = useOpenShare();

  const now = new Date();
  const today = store?.getDay(todayKey()) ?? null;
  const done = today?.sessions?.length ?? 0;
  const goal = settings?.dailyGoalGroups ?? 3;
  const isDone = done >= goal && done > 0;
  const ratio = goal > 0 ? Math.min(1, done / goal) : 0;

  // ring geometry
  const R = 14;
  const C = 2 * Math.PI * R;
  const dashoffset = C * (1 - ratio);

  const setTheme = (t: "system" | "light" | "dark") => {
    if (!store || !settings) return;
    store.setSettings({ ...settings, theme: t });
    refresh();
  };

  const hdr = HEADER[tab];

  return (
    <div className="desk" id="desk-shell">
      <aside className="desk-nav">
        <div className="brand">
          <span className="seed" aria-hidden="true" />
          <span className="wordmark">
            今天<span className="accent">提了</span>么
          </span>
        </div>
        <div className="stamp">
          {now.getFullYear()}.{pad2(now.getMonth() + 1)}.{pad2(now.getDate())} 周{WD[now.getDay()]}
        </div>

        <div className="rule" />

        <nav className="desk-nav-list">
          {NAV.map((n) => (
            <button
              key={n.id}
              className={"desk-nav-item" + (n.id === tab ? " is-active" : "")}
              onClick={() => setTab(n.id)}
            >
              {n.icon}
              <span>{n.label}</span>
            </button>
          ))}
        </nav>

        <div className="desk-nav-foot">
          {/* 今日进度常驻徽（所有视图都可见） */}
          <div className={"desk-nav-today" + (isDone ? " is-done" : "")}>
            <div className="ring">
              <svg viewBox="0 0 32 32">
                <circle className="track" cx="16" cy="16" r={R} />
                <circle
                  className="fill"
                  cx="16"
                  cy="16"
                  r={R}
                  strokeDasharray={C}
                  strokeDashoffset={dashoffset}
                />
              </svg>
              <span className="n">{done}</span>
            </div>
            <div className="meta">
              <div className="l">{isDone ? "今日已达成" : "今日进度"}</div>
              <div className="v">
                {done}
                <span className="u">/ {goal} 组</span>
              </div>
            </div>
          </div>

          {/* streak */}
          <div className="desk-nav-streak">
            <div className="leaf">
              <IconLeaf />
            </div>
            <div className="meta">
              <div className="l">连续</div>
              <div className="v">
                {streak?.current ?? 0}
                <span className="u">天</span>
              </div>
            </div>
          </div>

          {/* theme 三段 */}
          <div className="desk-nav-theme" role="group" aria-label="主题">
            {(["light", "system", "dark"] as const).map((t) => (
              <button
                key={t}
                aria-pressed={settings?.theme === t}
                onClick={() => setTheme(t)}
              >
                {t === "light" ? "浅" : t === "dark" ? "深" : "跟随系统"}
              </button>
            ))}
          </div>
        </div>
      </aside>

      <main className="desk-main">
        <header className="desk-header">
          <div>
            <div className="eyebrow">
              <span className="seed" aria-hidden="true" />
              {hdr.eyebrow}
            </div>
            <h1>{hdr.title}</h1>
          </div>
          <button className="desk-share-btn" onClick={() => openShare({ type: "review" })}>
            <IconShare />
            <span>分享</span>
          </button>
        </header>

        <div className="desk-views">
          <div className={"desk-view" + (tab === "home" ? " is-active" : "")}>
            {tab === "home" && <DeskHomeView onStart={onStart} />}
          </div>
          <div className={"desk-view" + (tab === "train" ? " is-active" : "")}>
            {tab === "train" && <DeskTrainView onStart={onStart} />}
          </div>
          <div className={"desk-view" + (tab === "history" ? " is-active" : "")}>
            {tab === "history" && <DeskHistoryView onStart={onStart} />}
          </div>
          <div className={"desk-view" + (tab === "settings" ? " is-active" : "")}>
            {tab === "settings" && <DeskSettingsView />}
          </div>
        </div>
      </main>
    </div>
  );
}

/* —— 与 App / 小程序 1:1 统一的温润有机图标 —— */
function IconHome() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" aria-hidden="true">
      <path d="M3.8 10.6L12 4l8.2 6.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.6 9.6v9.8h12.8V9.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.9 19.4v-3.7a2.1 2.1 0 014.2 0v3.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconBreath() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" aria-hidden="true">
      <circle cx="12" cy="12" r="8.4" />
      <path d="M8.5 7.7a5.5 5.5 0 017 0M15.5 16.3a5.5 5.5 0 01-7 0" strokeLinecap="round" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
    </svg>
  );
}
function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" aria-hidden="true">
      <rect x="3.8" y="5.4" width="16.4" height="14.4" rx="3" />
      <path d="M4.2 9.6h15.6M8.4 3.4v2.8M15.6 3.4v2.8" strokeLinecap="round" />
      <circle cx="8.2" cy="13" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="13" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="15.8" cy="13" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="8.2" cy="16.2" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="16.2" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}
function IconSliders() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" aria-hidden="true">
      <path d="M4.2 8.4h2.6M11.6 8.4h8.2" strokeLinecap="round" />
      <circle cx="9.2" cy="8.4" r="2.4" />
      <path d="M4.2 15.6h8.2M17.2 15.6h2.6" strokeLinecap="round" />
      <circle cx="14.8" cy="15.6" r="2.4" />
    </svg>
  );
}
function IconLeaf() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" aria-hidden="true">
      <path d="M20 4C9 4 4 9 4 18c0 0 0 2 2 2 9 0 14-5 14-16z" strokeLinejoin="round" />
      <path d="M4 20C8 14 12 10 18 7" strokeLinecap="round" />
    </svg>
  );
}
function IconShare() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" aria-hidden="true">
      <path d="M12 14.6V4.4M8.4 7.9L12 4.3l3.6 3.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.8 13v4a2.6 2.6 0 002.6 2.6h9.2a2.6 2.6 0 002.6-2.6v-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
