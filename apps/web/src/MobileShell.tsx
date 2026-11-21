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
  { id: "train", label: "训练", icon: <IconBreath /> },
  { id: "history", label: "记录", icon: <IconCalendar /> },
  { id: "settings", label: "设置", icon: <IconSliders /> },
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
      <section className="view is-active" aria-label={tab} id={"view-" + tab}>
        <button
          className="share-fab"
          aria-label="分享我的坚持"
          onClick={() => openShare({ type: "review" })}
        >
          <IconShare />
        </button>
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
function IconShare() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" width="18" height="18" aria-hidden="true">
      <path d="M12 14.6V4.4M8.4 7.9L12 4.3l3.6 3.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.8 13v4a2.6 2.6 0 002.6 2.6h9.2a2.6 2.6 0 002.6-2.6v-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
