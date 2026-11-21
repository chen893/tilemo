// @tilemo/web — 记录视图（移动壳）。
// 统计口径统一自 aggregateStats / completedCountOfDay；
// 日历三态解耦：底部圆点标今天 + 描边标选中 + 底色标训练量；未来日期降权不可点。

import { useMemo, useState } from "react";
import {
  aggregateStats,
  completedCountOfDay,
  formatClock,
  formatDuration,
  levelOfDay,
  pad2,
  todayKey,
  ymd,
} from "@tilemo/core";
import type { DayEntry, Plan, Session } from "@tilemo/data";
import { useDataStore } from "../data";

const WD_SHORT = ["日", "一", "二", "三", "四", "五", "六"];

export function HistoryView({ onStart }: { onStart: (p: Plan) => void }) {
  const store = useDataStore((s) => s.store);
  const streak = useDataStore((s) => s.streak);
  const plans = useDataStore((s) => s.plans);
  const settings = useDataStore((s) => s.settings);

  const [calCursor, setCalCursor] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [selectedKey, setSelectedKey] = useState<string | null>(todayKey());

  const stats = useMemo(
    () => (store ? aggregateStats(store) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store, streak],
  );

  const todayStr = todayKey();

  const grid = useMemo(() => {
    const firstDay = new Date(calCursor.y, calCursor.m, 1).getDay();
    const daysInMonth = new Date(calCursor.y, calCursor.m + 1, 0).getDate();
    const cells: {
      key: string | null;
      day: number | null;
      level: number;
      doneCnt: number;
      totalCnt: number;
      isToday: boolean;
      isFuture: boolean;
    }[] = [];
    for (let i = 0; i < firstDay; i++) {
      cells.push({ key: null, day: null, level: 0, doneCnt: 0, totalCnt: 0, isToday: false, isFuture: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const key = ymd(new Date(calCursor.y, calCursor.m, d));
      const entry = store?.getDay(key) ?? null;
      cells.push({
        key,
        day: d,
        level: levelOfDay(entry),
        doneCnt: completedCountOfDay(entry),
        totalCnt: entry?.sessions?.length ?? 0,
        isToday: key === todayStr,
        isFuture: key > todayStr,
      });
    }
    return cells;
  }, [calCursor, store, todayStr]);

  const selectedEntry: DayEntry | null = selectedKey ? (store?.getDay(selectedKey) ?? null) : null;
  const findPlan = (id: string) => plans.find((p) => p.id === id)?.name ?? "自定义";
  const defaultPlan = plans.find((p) => p.id === settings?.defaultPlanId) ?? plans[0] ?? null;
  const selectedIsToday = selectedKey === todayStr;
  const selectedDone = completedCountOfDay(selectedEntry);
  const selectedGoal = selectedEntry?.goalGroups ?? (selectedIsToday ? (settings?.dailyGoalGroups ?? 3) : 0);

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
        <div className={"stat-cell" + ((streak?.current ?? 0) > 0 ? " is-accent" : " is-empty")}>
          <span className="l">连续天</span>
          <span className="v">{streak?.current ?? 0}</span>
          {(streak?.current ?? 0) === 0 && <span className="sub">即将开启连续打卡</span>}
        </div>
        <div className="stat-cell">
          <span className="l">训练天</span>
          <span className="v">{stats?.totalDays ?? 0}</span>
        </div>
        <div className="stat-cell">
          <span className="l">完成组数</span>
          <span className="v">{stats?.completedSessions ?? 0}</span>
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
            (cell.key === selectedKey ? " is-selected" : "") +
            (cell.isFuture ? " is-future" : "");
          return (
            <button
              key={cell.key}
              className={cls}
              data-level={cell.level}
              disabled={cell.isFuture}
              onClick={() => !cell.isFuture && setSelectedKey(cell.key)}
            >
              <span className="n">{cell.day}</span>
              {cell.totalCnt > 0 ? (
                <span className="cnt">{cell.doneCnt > 0 ? `${cell.doneCnt}组` : "部分"}</span>
              ) : cell.isToday ? (
                <span className="today-dot" aria-hidden="true" />
              ) : null}
            </button>
          );
        })}
      </div>

      {/* 日详情 */}
      {selectedKey && (
        <div className="day-detail">
          <div className="day-detail-head">
            <span className="d">
              {selectedKey.replace(/-/g, ".").slice(5)}
              {selectedIsToday ? " · 今天" : ""}
            </span>
            <span className="s">
              {selectedGoal > 0 ? `已完成 ${selectedDone} / ${selectedGoal} 组` : "未训练"}
            </span>
          </div>
          {!selectedEntry || selectedEntry.sessions.length === 0 ? (
            selectedIsToday ? (
              <div className="day-empty day-empty--action">
                <span>今天还没留下足迹。</span>
                {defaultPlan && (
                  <button className="day-go" onClick={() => onStart(defaultPlan)}>
                    去训练<span className="arrow">→</span>
                  </button>
                )}
              </div>
            ) : (
              <p className="day-empty">这一天没有记录。安静的一天。</p>
            )
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
  const clock = formatClock(session.ts);
  return (
    <div className="session-item">
      <div>
        <div className="plan">
          {planName} · {session.completedReps} 次
        </div>
        <div className="meta">
          {formatDuration(session.durationSec)}
          {clock ? ` · ${clock}` : ""}
        </div>
      </div>
      <span className={"tag" + (session.finished ? "" : " is-partial")}>
        {session.finished ? "完成" : "部分"}
      </span>
    </div>
  );
}
