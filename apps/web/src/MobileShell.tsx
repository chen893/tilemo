// @tilemo/web — 移动壳（<1024px）：报头 + 当前视图 + 底部 tabbar。

import type { Plan } from "@tilemo/data";
import { HomeView } from "./screens/HomeView";
import { TrainView } from "./screens/TrainView";
import { HistoryView } from "./screens/HistoryView";
import { SettingsView } from "./screens/SettingsView";
import { useOpenShare } from "./share/ShareContext";

export type Tab = "home" | "train" | "history" | "settings";

const TABS: { id: Tab; label: string }[] = [
  { id: "home", label: "今日" },
  { id: "train", label: "训练" },
  { id: "history", label: "记录" },
  { id: "settings", label: "设置" },
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
        {tab === "history" && <HistoryView />}
        {tab === "settings" && <SettingsView />}
      </section>

      <nav className="tabbar" id="tabbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={"tab" + (t.id === tab ? " is-active" : "")}
            data-view={t.id}
            onClick={() => setTab(t.id)}
          >
            <span className="tab-label">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
