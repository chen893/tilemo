// @tilemo/web — 桌面设置视图：6 子分类 master-detail。
// 左：分类导航；右：对应面板。复用移动壳 setting-row / stepper / seg / settings-card 体系。

import { useState } from "react";
import { aggregateStats, clamp } from "@tilemo/core";
import { GITHUB_URL } from "@tilemo/share-card";
import type { ThemeSetting } from "@tilemo/data";
import { useDataStore } from "../../data";

type Cat = "goal" | "plan" | "feedback" | "appearance" | "data" | "about";

const CATS: { id: Cat; nm: string; dc: string }[] = [
  { id: "goal", nm: "每日目标", dc: "几组，调到舒服" },
  { id: "plan", nm: "默认方案", dc: "挑一组作为起手" },
  { id: "feedback", nm: "反馈", dc: "声音 · 触感" },
  { id: "appearance", nm: "外观", dc: "主题 · 每日一句" },
  { id: "data", nm: "数据", dc: "导出 · 统计" },
  { id: "about", nm: "关于", dc: "隐私 · 开源" },
];

export function DeskSettingsView() {
  const settings = useDataStore((s) => s.settings);
  const plans = useDataStore((s) => s.plans);
  const store = useDataStore((s) => s.store);
  const refresh = useDataStore((s) => s.refresh);

  const [cat, setCat] = useState<Cat>("goal");

  const update = (patch: Partial<NonNullable<typeof settings>>) => {
    if (!store || !settings) return;
    store.setSettings({ ...settings, ...patch });
    refresh();
  };

  const stats = store ? aggregateStats(store) : null;

  if (!settings) return null;

  const currentPlan = plans.find((p) => p.id === settings.defaultPlanId) ?? plans[0] ?? null;

  const exportData = () => {
    if (!store) return;
    const bundle = store.exportAll();
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tilemo-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const lastTsStr = stats && stats.lastTs > 0 ? new Date(stats.lastTs).toLocaleString("zh-CN") : "尚无";

  return (
    <div className="desk-settings">
      {/* 左：分类 */}
      <nav className="desk-set-cats">
        {CATS.map((c) => (
          <button
            key={c.id}
            className={"desk-set-cat" + (c.id === cat ? " is-active" : "")}
            onClick={() => setCat(c.id)}
          >
            <span className="ic" aria-hidden="true" />
            <span className="nm">{c.nm}</span>
            <span className="dc">{c.dc}</span>
          </button>
        ))}
      </nav>

      {/* 右：面板 */}
      <div className="desk-set-panels">
        {/* goal */}
        <div className={"desk-set-panel" + (cat === "goal" ? " is-active" : "")}>
          <h3 className="desk-set-panel-head">每日目标</h3>
          <p className="desk-set-panel-sub">每天想提几组？调到能长期坚持的节奏，比一味求多更可持续。</p>

          <div className="settings-card">
            <div className="setting-row">
              <div>
                <div className="lbl">每天几组</div>
                <div className="desc">1–8 组，默认 3 组</div>
              </div>
              <div className="stepper">
                <button
                  disabled={settings.dailyGoalGroups <= 1}
                  onClick={() => update({ dailyGoalGroups: clamp(settings.dailyGoalGroups - 1, 1, 8) })}
                >
                  −
                </button>
                <span className="val">{settings.dailyGoalGroups}</span>
                <button
                  disabled={settings.dailyGoalGroups >= 8}
                  onClick={() => update({ dailyGoalGroups: clamp(settings.dailyGoalGroups + 1, 1, 8) })}
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* 近 7 天日均建议 */}
          <div className="desk-set-extra">
            <div className="desk-set-extra-cell">
              <div className="l">近 7 天日均</div>
              <div className="v">
                {sevenDayAvg(store)}<span className="u">组</span>
              </div>
              <div className="dc">{goalAdvice(sevenDayAvg(store), settings.dailyGoalGroups)}</div>
            </div>
            <div className="desk-set-extra-cell">
              <div className="l">达标天占比</div>
              <div className="v">
                {sevenDayMetRate(store, settings.dailyGoalGroups)}<span className="u">%</span>
              </div>
              <div className="dc">近 7 天达标天数 / 7</div>
            </div>
          </div>
        </div>

        {/* plan */}
        <div className={"desk-set-panel" + (cat === "plan" ? " is-active" : "")}>
          <h3 className="desk-set-panel-head">默认方案</h3>
          <p className="desk-set-panel-sub">点「开始一组训练」时直接启动的方案。挑一个最常用的。</p>

          <div className="settings-card">
            <div className="setting-row">
              <div>
                <div className="lbl">默认方案</div>
                <div className="desc">将从首页 CTA 与训练页详情启动</div>
              </div>
              <div className="plan-select">
                {plans.map((p) => (
                  <button
                    key={p.id}
                    aria-pressed={p.id === settings.defaultPlanId}
                    onClick={() => update({ defaultPlanId: p.id })}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 当前方案 KV */}
          <div className="desk-set-kv">
            <div className="row">
              <span className="k">方案名</span>
              <span className="vv">{currentPlan?.name ?? "—"}</span>
            </div>
            <div className="row">
              <span className="k">收紧</span>
              <span className="vv">{currentPlan?.contract ?? 0}s</span>
            </div>
            <div className="row">
              <span className="k">放松</span>
              <span className="vv">{currentPlan?.relax ?? 0}s</span>
            </div>
            <div className="row">
              <span className="k">每组次数</span>
              <span className="vv">{currentPlan?.reps ?? 0}</span>
            </div>
            <div className="row">
              <span className="k">组数</span>
              <span className="vv">{currentPlan?.sets ?? 0}</span>
            </div>
          </div>
        </div>

        {/* feedback */}
        <div className={"desk-set-panel" + (cat === "feedback" ? " is-active" : "")}>
          <h3 className="desk-set-panel-head">反馈</h3>
          <p className="desk-set-panel-sub">呼吸节拍的提示音与触感反馈。</p>

          <div className="settings-card">
            <div className="setting-row">
              <div>
                <div className="lbl">声音提示</div>
                <div className="desc">收 / 放 切换时播放轻提示音</div>
              </div>
              <button
                className={"switch" + (settings.sound ? " on" : "")}
                onClick={() => update({ sound: !settings.sound })}
              >
                {settings.sound ? "开" : "关"}
              </button>
            </div>
            <div className="setting-row">
              <div>
                <div className="lbl">触感反馈</div>
                <div className="desc">收 / 放 切换时轻振动（支持的设备）</div>
              </div>
              <button
                className={"switch" + (settings.haptics ? " on" : "")}
                onClick={() => update({ haptics: !settings.haptics })}
              >
                {settings.haptics ? "开" : "关"}
              </button>
            </div>
          </div>
        </div>

        {/* appearance */}
        <div className={"desk-set-panel" + (cat === "appearance" ? " is-active" : "")}>
          <h3 className="desk-set-panel-head">外观</h3>
          <p className="desk-set-panel-sub">主题与首页的每日一句。</p>

          <div className="settings-card">
            <div className="setting-row">
              <div>
                <div className="lbl">主题</div>
                <div className="desc">跟随系统、强制浅色或深色</div>
              </div>
              <div className="seg">
                {(["light", "system", "dark"] as const).map((t) => (
                  <button
                    key={t}
                    aria-pressed={settings.theme === t}
                    onClick={() => update({ theme: t as ThemeSetting })}
                  >
                    {t === "light" ? "浅色" : t === "dark" ? "深色" : "跟随"}
                  </button>
                ))}
              </div>
            </div>
            <div className="setting-row">
              <div>
                <div className="lbl">每日一句</div>
                <div className="desc">首页显示一句随机箴言</div>
              </div>
              <button
                className={"switch" + (settings.dailyQuote ? " on" : "")}
                onClick={() => update({ dailyQuote: !settings.dailyQuote })}
              >
                {settings.dailyQuote ? "开" : "关"}
              </button>
            </div>
          </div>
        </div>

        {/* data */}
        <div className={"desk-set-panel" + (cat === "data" ? " is-active" : "")}>
          <h3 className="desk-set-panel-head">数据</h3>
          <p className="desk-set-panel-sub">导出你的全部记录为 JSON；所有数据仅存于本设备。</p>

          <div className="settings-card">
            <div className="setting-row">
              <div>
                <div className="lbl">导出 JSON</div>
                <div className="desc">含设置、方案、全部日志与连续天数</div>
              </div>
              <button className="desk-cta" style={{ padding: "10px 20px", fontSize: "var(--t-sm)" }} onClick={exportData}>
                导出数据
              </button>
            </div>
          </div>

          <div className="desk-set-kv">
            <div className="row">
              <span className="k">已记录天数</span>
              <span className="vv">{stats?.totalDays ?? 0} 天</span>
            </div>
            <div className="row">
              <span className="k">累计组数</span>
              <span className="vv">{stats?.totalSessions ?? 0} 组</span>
            </div>
            <div className="row">
              <span className="k">最近一次</span>
              <span className="vv">{lastTsStr}</span>
            </div>
          </div>
        </div>

        {/* about */}
        <div className={"desk-set-panel" + (cat === "about" ? " is-active" : "")}>
          <h3 className="desk-set-panel-head">关于</h3>
          <p className="desk-set-panel-sub">一个安静的小工具。</p>

          <div className="about-block">
            <div className="h">关于「今天提了么」</div>
            <p>「今天提了么」是一个安静的小工具——每天问你一句、陪你提一组、替你记一笔。</p>
            <p>不注册、不联网、不上传。你的每一次呼吸记录都只存在这台设备上。</p>
            <span className="private">🔒 全部数据仅存于本设备</span>
            <p style={{ marginTop: "var(--s-4)" }}>
              <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                ★ 开源 · GitHub 欢迎 Star ↗
              </a>
            </p>
          </div>

          <div className="desk-set-kv">
            <div className="row">
              <span className="k">版本</span>
              <span className="vv">v1.0</span>
            </div>
            <div className="row">
              <span className="k">存储</span>
              <span className="vv">localStorage（本机）</span>
            </div>
            <div className="row">
              <span className="k">联网</span>
              <span className="vv">否（纯离线）</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* —— helpers —— */
function sevenDayAvg(store: ReturnType<typeof useDataStore.getState>["store"]): number {
  if (!store) return 0;
  const now = new Date();
  let total = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const key = `${d.getFullYear()}-${pad2m(d.getMonth() + 1)}-${pad2m(d.getDate())}`;
    total += store.getDay(key)?.sessions?.length ?? 0;
  }
  return Math.round((total / 7) * 10) / 10;
}

function sevenDayMetRate(
  store: ReturnType<typeof useDataStore.getState>["store"],
  goal: number,
): number {
  if (!store) return 0;
  const now = new Date();
  let met = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const key = `${d.getFullYear()}-${pad2m(d.getMonth() + 1)}-${pad2m(d.getDate())}`;
    const n = store.getDay(key)?.sessions?.length ?? 0;
    if (n >= goal) met++;
  }
  return Math.round((met / 7) * 100);
}

function goalAdvice(avg: number, goal: number): string {
  if (avg === 0) return "本周还没开始，先来一组。";
  if (avg >= goal) return "日均已达标，节奏稳健。";
  if (avg >= goal * 0.6) return "接近目标，再坚持一点。";
  return "节奏偏轻，可考虑调低目标。";
}

function pad2m(n: number): string {
  return (n < 10 ? "0" : "") + n;
}
