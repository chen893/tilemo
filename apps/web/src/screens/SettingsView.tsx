// @tilemo/web — 设置视图（移动壳）。镜像 mobile SettingsScreen，复用 core 计算。

import { useState } from "react";
import { clamp } from "@tilemo/core";
import type { Plan, Settings as SettingsT, ThemeSetting } from "@tilemo/data";
import { GITHUB_URL } from "@tilemo/share-card";
import { useDataStore } from "../data";

const THEME_OPTS: { v: ThemeSetting; label: string }[] = [
  { v: "light", label: "浅色" },
  { v: "dark", label: "深色" },
  { v: "system", label: "跟随系统" },
];

export function SettingsView() {
  const settings = useDataStore((s) => s.settings);
  const store = useDataStore((s) => s.store);
  const plans = useDataStore((s) => s.plans);
  const refresh = useDataStore((s) => s.refresh);

  const [toast, setToast] = useState<string | null>(null);

  const update = (patch: Partial<SettingsT>) => {
    if (!store || !settings) return;
    store.setSettings({ ...settings, ...patch });
    refresh();
  };

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1800);
  };

  const exportData = () => {
    if (!store) return;
    const bundle = store.exportAll();
    const json = JSON.stringify(bundle, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tgm-data.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("已导出");
  };

  if (!settings) return null;

  return (
    <div className="view-settings">
      <div className="eyebrow">
        <span className="seed" aria-hidden="true" />
        设置
      </div>
      <h2 className="section-title">
        调成你的<span className="em">样子</span>
      </h2>

      {/* 每日目标 */}
      <Group title="每日目标">
        <div className="settings-card">
          <div className="setting-row">
            <div>
              <div className="lbl">每天几组</div>
              <div className="desc">连续达标即计入 streak</div>
            </div>
            <div className="stepper">
              <button
                disabled={settings.dailyGoalGroups <= 1}
                onClick={() =>
                  update({ dailyGoalGroups: clamp(settings.dailyGoalGroups - 1, 1, 8) })
                }
                aria-label="减少"
              >
                −
              </button>
              <span className="val">{settings.dailyGoalGroups}</span>
              <button
                disabled={settings.dailyGoalGroups >= 8}
                onClick={() =>
                  update({ dailyGoalGroups: clamp(settings.dailyGoalGroups + 1, 1, 8) })
                }
                aria-label="增加"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </Group>

      {/* 默认方案 */}
      <Group title="默认方案">
        <div id="plan-select" className="plan-select" style={{ padding: "var(--s-3) 0" }}>
          {plans.map((p) => (
            <PlanChip
              key={p.id}
              plan={p}
              active={p.id === settings.defaultPlanId}
              onSelect={() => update({ defaultPlanId: p.id })}
            />
          ))}
        </div>
      </Group>

      {/* 体验 */}
      <Group title="体验">
        <div className="settings-card">
          <ToggleRow
            label="声音"
            hint="节拍音 — 暂未实现"
            value={settings.sound}
            disabled
            onToggle={() => update({ sound: !settings.sound })}
          />
          <ToggleRow
            label="触感反馈"
            hint="阶段切换时轻震"
            value={settings.haptics}
            onToggle={() => update({ haptics: !settings.haptics })}
          />
          <ToggleRow
            label="每日一句"
            hint="首页显示一句鼓励"
            value={settings.dailyQuote}
            onToggle={() => update({ dailyQuote: !settings.dailyQuote })}
          />
        </div>
      </Group>

      {/* 外观 */}
      <Group title="外观">
        <div className="seg" role="group" aria-label="主题">
          {THEME_OPTS.map((o) => (
            <button
              key={o.v}
              aria-pressed={o.v === settings.theme}
              onClick={() => update({ theme: o.v })}
            >
              {o.label}
            </button>
          ))}
        </div>
      </Group>

      {/* 数据 */}
      <Group title="数据">
        <button className="export-btn" onClick={exportData}>
          导出 JSON 数据
        </button>
        <p style={{ color: "var(--text-3)", fontSize: "var(--t-sm)", marginTop: "var(--s-2)" }}>
          全部数据仅存于本设备，导出生成 tgm-data.json。
        </p>
      </Group>

      {/* 关于 */}
      <div className="about">
        <div className="h">关于</div>
        <p>「今天提了么」是一个安静的小工具——每天问你一句、陪你提一组、替你记一笔。</p>
        <span className="private">本地存储 · 无云端</span>
        <p style={{ marginTop: "var(--s-4)" }}>
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
            ★ 开源 · GitHub 欢迎 Star ↗
          </a>
        </p>
      </div>

      {toast && (
        <div
          role="status"
          style={{
            position: "fixed",
            left: "50%",
            bottom: "calc(72px + env(safe-area-inset-bottom))",
            transform: "translateX(-50%)",
            background: "var(--accent)",
            color: "#fff",
            padding: "10px 20px",
            borderRadius: "999px",
            fontSize: "var(--t-sm)",
            fontWeight: 700,
            boxShadow: "0 6px 20px rgba(0,0,0,0.18)",
            zIndex: 50,
            animation: "fadeUp var(--dur) var(--ease)",
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="settings-group">
      <h3 className="settings-group-title">{title}</h3>
      {children}
    </div>
  );
}

function PlanChip({
  plan,
  active,
  onSelect,
}: {
  plan: Plan;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button aria-pressed={active} onClick={onSelect}>
      {plan.name}
    </button>
  );
}

function ToggleRow({
  label,
  hint,
  value,
  onToggle,
  disabled,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <div
      className="setting-row"
      style={{ opacity: disabled ? 0.45 : 1, cursor: disabled ? "not-allowed" : "pointer" }}
      onClick={disabled ? undefined : onToggle}
    >
      <div>
        <div className="lbl">{label}</div>
        {hint && <div className="desc">{hint}</div>}
      </div>
      <span
        className="toggle"
        role="switch"
        aria-checked={value}
        aria-label={label}
        style={disabled ? { pointerEvents: "none" } : undefined}
      />
    </div>
  );
}
