// @tilemo/web — 桌面记录视图：统计 4 格 + 年度热力（杀手锏）+ 日详情。
// 热力 365/366 格用事件委托（grid 容器单 click → closest + data-key）。

import { useMemo, useState } from "react";
import type { Session } from "@tilemo/data";
import { aggregateStats, heatLevel, levelOfDay, pad2, ymd } from "@tilemo/core";
import { useDataStore } from "../../data";

const MONTHS = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

export function DeskHistoryView() {
  const store = useDataStore((s) => s.store);
  const settings = useDataStore((s) => s.settings);
  const plans = useDataStore((s) => s.plans);
  const streak = useDataStore((s) => s.streak);

  const stats = store ? aggregateStats(store) : null;
  const goalDefault = settings?.dailyGoalGroups ?? 1;
  const thisYear = new Date().getFullYear();

  const [heatYear, setHeatYear] = useState<number>(thisYear);
  const [selectedKey, setSelectedKey] = useState<string | null>(ymd(new Date()));

  // 构造该年热力网格（Jan 1 起对齐周日；grid-auto-flow: column × 7 行）
  const heat = useMemo(() => {
    const start = new Date(heatYear, 0, 1);
    const startDow = start.getDay(); // 0..6 (Sun..Sat)
    const end = new Date(heatYear, 11, 31);
    const totalDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1; // 365 or 366
    const cells: { key: string | null; date: Date | null; level: number; n: number }[] = [];
    // 前导空格：把 Jan 1 对齐到所在周列
    for (let i = 0; i < startDow; i++) cells.push({ key: null, date: null, level: 0, n: 0 });
    const todayStr = ymd(new Date());
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(heatYear, 0, 1 + i);
      const key = ymd(d);
      const entry = key > todayStr ? null : store?.getDay(key) ?? null;
      cells.push({
        key,
        date: d,
        level: entry ? levelOfDay(entry) : 0,
        n: entry?.sessions?.length ?? 0,
      });
    }
    return { cells, todayStr };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, heatYear]);

  // 月份标签位置（按列号定位 Jan/Feb…）—— 每月首日所在列
  const monthMarks = useMemo(() => {
    const marks: { idx: number; label: string }[] = [];
    for (let m = 0; m < 12; m++) {
      const d = new Date(heatYear, m, 1);
      const startDow = new Date(heatYear, 0, 1).getDay();
      const dayOfYear = Math.round((d.getTime() - new Date(heatYear, 0, 1).getTime()) / 86400000);
      const col = Math.floor((dayOfYear + startDow) / 7);
      marks.push({ idx: col, label: MONTHS[m] });
    }
    return marks;
  }, [heatYear]);

  const todayStr = ymd(new Date());

  const onGridClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-key]");
    if (!el) return;
    const key = el.dataset.key;
    if (key) setSelectedKey(key);
  };

  const selectedDay = selectedKey ? store?.getDay(selectedKey) ?? null : null;
  const selectedSessions: Session[] = selectedDay?.sessions ?? [];
  const planName = (id: string) => plans.find((p) => p.id === id)?.name ?? "方案";

  const fmtDay = (key: string | null) => {
    if (!key) return "";
    const [y, m, d] = key.split("-");
    return `${y}.${m}.${d}`;
  };

  const prevYear = () => setHeatYear((y) => y - 1);
  const nextYear = () => {
    if (heatYear < thisYear) setHeatYear((y) => y + 1);
  };

  return (
    <div className="desk-history">
      {/* 统计 4 格 */}
      <div className="desk-stat-row">
        <div className="desk-stat-cell is-accent">
          <div className="l">连续天</div>
          <div className="v">{streak?.current ?? 0}</div>
          <div className="sub">最长 {streak?.longest ?? 0} 天</div>
        </div>
        <div className="desk-stat-cell">
          <div className="l">总天数</div>
          <div className="v">{stats?.totalDays ?? 0}</div>
          <div className="sub">有记录</div>
        </div>
        <div className="desk-stat-cell">
          <div className="l">总组数</div>
          <div className="v">{stats?.totalSessions ?? 0}</div>
          <div className="sub">累计完成</div>
        </div>
        <div className="desk-stat-cell">
          <div className="l">达标天</div>
          <div className="v">{stats?.metDays ?? 0}</div>
          <div className="sub">达成目标</div>
        </div>
      </div>

      {/* 年度热力 */}
      <div className="desk-heat-wrap">
        <div className="desk-heat-head">
          <div className="t">
            <span className="y">{heatYear}</span>
            年度节奏
          </div>
          <div className="desk-heat-nav">
            <button onClick={prevYear} aria-label="上一年">
              ‹
            </button>
            <button onClick={nextYear} disabled={heatYear >= thisYear} aria-label="下一年">
              ›
            </button>
          </div>
        </div>

        <div className="desk-heat-scroll">
          <div className="desk-heat-months">
            {monthMarks.map((m) => (
              <span key={m.label} style={{ gridColumnStart: m.idx + 1 }}>
                {m.label}
              </span>
            ))}
          </div>
          <div className="desk-heat-grid" onClick={onGridClick}>
            {heat.cells.map((c, i) => {
              if (!c.key) {
                return <div key={"e" + i} className="desk-heat-cell empty" />;
              }
              const isToday = c.key === todayStr;
              const isSelected = c.key === selectedKey;
              return (
                <div
                  key={c.key}
                  className={
                    "desk-heat-cell" +
                    (isToday ? " is-today" : "") +
                    (isSelected ? " is-selected" : "")
                  }
                  data-level={c.level}
                  data-key={c.key}
                  title={`${c.key} · ${c.n} 组`}
                />
              );
            })}
          </div>
        </div>

        <div className="desk-heat-legend">
          <span>少</span>
          <span className="scale">
            <i className="s0" />
            <i className="s1" />
            <i className="s2" />
            <i className="s3" />
          </span>
          <span>多</span>
          <span className="today-mark">
            <i />
            今天
          </span>
          <span className="hint">点击任意一天查看详情</span>
        </div>
      </div>

      {/* 日详情 */}
      <div className="desk-day-detail">
        <div className="desk-day-detail-head">
          <div className="d">{fmtDay(selectedKey)}</div>
          <div className="s">
            {selectedSessions.length} 组 · {selectedDay ? (selectedDay.sessions.length >= selectedDay.goalGroups ? "已达标" : "未达标") : "无记录"}
          </div>
        </div>
        {selectedKey && (
          <>
            {selectedSessions.length === 0 ? (
              <div className="desk-day-empty">这一天没有训练记录</div>
            ) : (
              selectedSessions.map((s, i) => {
                const durMin = Math.max(1, Math.round(s.durationSec / 60));
                return (
                  <div className="desk-session-row" key={i}>
                    <div>
                      <div className="plan">{planName(s.planId)}</div>
                      <div className="meta">{s.completedReps} 次 · {durMin} 分钟</div>
                    </div>
                    <span className={"tag" + (s.finished ? "" : " is-partial")}>
                      {s.finished ? "已完成" : "未完成"}
                    </span>
                  </div>
                );
              })
            )}
          </>
        )}
      </div>
    </div>
  );
}
