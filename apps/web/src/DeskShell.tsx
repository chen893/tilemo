// @tilemo/web — 桌面壳（≥1024px）：侧栏 + 主区，与 MobileShell 共用 tab。
// 双壳 DOM 都挂（Shell.tsx），CSS media query（≥1024）显隐：.desk 接管 / #app 隐藏。
// 签名同 MobileShell：{ tab, setTab, onStart }。

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

const NAV: { id: Tab; label: string; icon: JSX.Element }[] = [
  { id: "home", label: "今日", icon: <IconHome /> },
  { id: "train", label: "训练", icon: <IconDumbbell /> },
  { id: "history", label: "记录", icon: <IconCalendar /> },
  { id: "settings", label: "设置", icon: <IconCog /> },
];

// header eyebrow/title per tab
const HEADER: Record<Tab, { eyebrow: string; title: JSX.Element }> = {
  home: { eyebrow: "日课 · 今天", title: <span>今天，<span className="em">提了</span>么？</span> },
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
            {tab === "history" && <DeskHistoryView />}
          </div>
          <div className={"desk-view" + (tab === "settings" ? " is-active" : "")}>
            {tab === "settings" && <DeskSettingsView />}
          </div>
        </div>
      </main>
    </div>
  );
}

/* —— inline nav icons (stroke=currentColor) —— */
function IconHome() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      <path d="M3 11l9-8 9 8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 10v10h14V10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconDumbbell() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      <path d="M6 7l-3 3M18 17l3-3M9 9l6 6M3 13l2 2 2-2M21 11l-2-2-2 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v4M16 3v4" strokeLinecap="round" />
    </svg>
  );
}
function IconCog() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" strokeLinecap="round" />
    </svg>
  );
}
function IconLeaf() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      <path d="M20 4C9 4 4 9 4 18c0 0 0 2 2 2 9 0 14-5 14-16z" strokeLinejoin="round" />
      <path d="M4 20C8 14 12 10 18 7" strokeLinecap="round" />
    </svg>
  );
}
function IconShare() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      <path d="M12 15V4M12 4l-4 4M12 4l4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 12v6a2 2 0 002 2h10a2 2 0 002-2v-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
