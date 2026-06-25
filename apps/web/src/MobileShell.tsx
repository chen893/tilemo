// @tilemo/web — 移动壳（<1024px）：报头 + 当前视图 + 底部 tabbar。

import type { ReactNode } from "react";
import type { Plan } from "@tilemo/data";
import { HomeView } from "./screens/HomeView";
import { TrainView } from "./screens/TrainView";
import { HistoryView } from "./screens/HistoryView";
import { SettingsView } from "./screens/SettingsView";
import { useOpenShare } from "./share/ShareContext";

export type Tab = "home" | "train" | "history" | "settings";

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: "home", label: "今日", icon: <IconHome /> },
  { id: "train", label: "训练", icon: <IconDumbbell /> },
  { id: "history", label: "记录", icon: <IconCalendar /> },
  { id: "settings", label: "设置", icon: <IconCog /> },
];

export function MobileShell({
  tab,
  setTab,
  onStart,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  onStart: (p: Plan) => void;
}) {
  const openShare = useOpenShare();
  return (
    <div className="app" id="app">
      <button
        className="share-fab"
        aria-label="分享我的坚持"
        onClick={() => openShare({ type: "review" })}
      >
        ↗
      </button>
      <section className="view is-active" aria-label={tab} id={"view-" + tab}>
        {tab === "home" && <HomeView onStart={onStart} />}
        {tab === "train" && <TrainView onStart={onStart} />}
        {tab === "history" && <HistoryView onStart={onStart} />}
        {tab === "settings" && <SettingsView />}
      </section>

      <nav className="tabbar" id="tabbar" style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50 }}>

        {TABS.map((t) => (
          <button
            key={t.id}
            className={"tab" + (t.id === tab ? " is-active" : "")}
            data-view={t.id}
            onClick={() => setTab(t.id)}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

/* —— inline tab icons (stroke=currentColor, matches .tab svg) —— */
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
      <path
        d="M6 7l-3 3M18 17l3-3M9 9l6 6M3 13l2 2 2-2M21 11l-2-2-2 2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
      <path
        d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"
        strokeLinecap="round"
      />
    </svg>
  );
}
