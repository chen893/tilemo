// @tilemo/web — 设置视图（移动壳，阶段 2 占位，后续补 stepper/toggle/theme/export）。

import { clamp } from "@tilemo/core";
import { GITHUB_URL } from "@tilemo/share-card";
import { useDataStore } from "../data";

export function SettingsView() {
  const settings = useDataStore((s) => s.settings);
  const store = useDataStore((s) => s.store);
  const refresh = useDataStore((s) => s.refresh);

  const update = (patch: Partial<NonNullable<typeof settings>>) => {
    if (!store || !settings) return;
    store.setSettings({ ...settings, ...patch });
    refresh();
  };

  if (!settings) return null;

  return (
    <div className="view-settings">
      <div className="eyebrow"><span className="seed" aria-hidden="true" />设置</div>
      <h2 className="section-title">调成你的<span className="em">样子</span></h2>

      <div className="set-row">
        <span>每天几组</span>
        <div className="stepper">
          <button disabled={settings.dailyGoalGroups <= 1} onClick={() => update({ dailyGoalGroups: clamp(settings.dailyGoalGroups - 1, 1, 8) })}>−</button>
          <span className="num">{settings.dailyGoalGroups}</span>
          <button disabled={settings.dailyGoalGroups >= 8} onClick={() => update({ dailyGoalGroups: clamp(settings.dailyGoalGroups + 1, 1, 8) })}>+</button>
        </div>
      </div>

      <div className="set-row">
        <span>触感反馈</span>
        <button className={"switch" + (settings.haptics ? " on" : "")} onClick={() => update({ haptics: !settings.haptics })}>
          {settings.haptics ? "开" : "关"}
        </button>
      </div>

      <div className="set-row">
        <span>每日一句</span>
        <button className={"switch" + (settings.dailyQuote ? " on" : "")} onClick={() => update({ dailyQuote: !settings.dailyQuote })}>
          {settings.dailyQuote ? "开" : "关"}
        </button>
      </div>

      <div className="about">
        <div className="h">关于</div>
        <p>「今天提了么」是一个安静的小工具——每天问你一句、陪你提一组、替你记一笔。全部数据仅存于本设备。</p>
        <a href={GITHUB_URL} target="_blank" rel="noopener">★ 开源 · GitHub 欢迎 Star ↗</a>
      </div>
    </div>
  );
}
