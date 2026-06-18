// @tilemo/web — 记录视图（移动壳）。镜像 mobile HistoryScreen，复用 core 计算。

import { useMemo, useState } from "react";
import { aggregateStats, levelOfDay, pad2, todayKey, ymd } from "@tilemo/core";
import type { DayEntry, Session } from "@tilemo/data";
import { useDataStore } from "../data";

const WD_SHORT = ["日", "一", "二", "三", "四", "五", "六"];

export function HistoryView() {
  const store = useDataStore((s) => s.store);
  const streak = useDataStore((s) => s.streak);
  const plans = useDataStore((s) => s.plans);

  const [calCursor, setCalCursor] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const stats = useMemo(
    () => (store ? aggregateStats(store) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store, streak],
  );

  const grid = useMemo(() => {
    const firstDay = new Date(calCursor.y, calCursor.m, 1).getDay();
    const daysInMonth = new Date(calCursor.y, calCursor.m + 1, 0).getDate();
    const todayStr = todayKey();
    const cells: {
      key: string | null;
      day: number | null;
      level: number;
      count: number;
      isToday: boolean;
    }[] = [];
    for (let i = 0; i < firstDay; i++) {
      cells.push({ key: null, day: null, level: 0, count: 0, isToday: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const key = ymd(new Date(calCursor.y, calCursor.m, d));
      const entry = store?.getDay(key) ?? null;
      cells.push({
        key,
        day: d,
        level: levelOfDay(entry),
        count: entry?.sessions?.length ?? 0,
        isToday: key === todayStr,
      });
    }
    return cells;
  }, [calCursor, store]);

  const selectedEntry: DayEntry | null = selectedKey ? store?.getDay(selectedKey) ?? null : null;
  const findPlan = (id: string) => plans.find((p) => p.id === id)?.name ?? "自定义";

  const shiftMonth = (delta: number) => {
    setCalCursor((c) => {
      let m = c.m + delta;
      let y = c.y;
      if (m < 0) {
        m = 11;
        y--;
      } else if (m > 11) {
        m = 0;
        y++;
      }
      return { y, m };
    });
  };

  return (
    <div className="view-history">
      <div className="eyebrow">
        <span className="seed" aria-hidden="true" />
        记录
      </div>
      <h2 className="section-title">
        你的<span className="em">足迹</span>
      </h2>

      {/* 统计行 */}
      <div className="stat-row">
        <div className="stat-cell is-accent">
          <span className="l">连续</span>
          <span className="v">{streak?.current ?? 0}</span>
        </div>
        <div className="stat-cell">
          <span className="l">训练天</span>
          <span className="v">{stats?.totalDays ?? 0}</span>
        </div>
        <div className="stat-cell">
          <span className="l">总组数</span>
          <span className="v">{stats?.totalSessions ?? 0}</span>
        </div>
      </div>

      {/* 月历导航 */}
      <div className="cal-nav">
        <div id="cal-title" className="title">
          <span className="y">{calCursor.y}</span>
          {pad2(calCursor.m + 1)}
        </div>
        <div className="cal-nav-actions">
          <button aria-label="上一月" onClick={() => shiftMonth(-1)}>
            ‹
          </button>
          <button aria-label="下一月" onClick={() => shiftMonth(1)}>
            ›
          </button>
        </div>
      </div>

      {/* 星期表头 */}
      <div className="cal-dow-row">
        {WD_SHORT.map((w) => (
          <div key={w} className="cal-dow">
            {w}
          </div>
        ))}
      </div>

      {/* 月历格子 */}
      <div id="cal-grid" className="cal-grid">
        {grid.map((cell, i) => {
          if (cell.key === null) {
            return <div key={`empty-${i}`} className="cal-cell empty" />;
          }
          const cls =
            "cal-cell" +
            (cell.isToday ? " is-today" : "") +
            (cell.key === selectedKey ? " is-selected" : "");
          return (
            <button
              key={cell.key}
              className={cls}
              data-level={cell.level}
              onClick={() => setSelectedKey(cell.key)}
            >
              <span className="n">{cell.day}</span>
              {cell.count > 0 && <span className="cnt">{cell.count}组</span>}
            </button>
          );
        })}
      </div>

      {/* 日详情 */}
      {selectedKey && selectedEntry && (
        <div className="day-detail">
          <div className="day-detail-head">
            <span className="d">{selectedKey.replace(/-/g, ".").slice(5)}</span>
            <span className="s">
              {selectedEntry.sessions.length} / {selectedEntry.goalGroups ?? 0} 组
            </span>
          </div>
          {selectedEntry.sessions.length === 0 ? (
            <p className="day-empty">这一天没有记录。安静的一天。</p>
          ) : (
            selectedEntry.sessions.map((ses, i) => (
              <SessionRow key={i} session={ses} planName={findPlan(ses.planId)} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function SessionRow({ session, planName }: { session: Session; planName: string }) {
  const mins = Math.round((session.durationSec / 60) * 10) / 10;
  return (
    <div className="session-item">
      <div>
        <div className="plan">
          {planName} · {session.completedReps} 次
        </div>
        <div className="meta">{mins} 分钟</div>
      </div>
      <span className={"tag" + (session.finished ? "" : " is-partial")}>
        {session.finished ? "已完成" : "未完成"}
      </span>
    </div>
  );
}
