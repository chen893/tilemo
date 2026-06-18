// @tilemo/web — 桌面今日视图（dashboard）。quote + 主问句 + 进度 + CTA
// + 今日 sessions 列表（桌面独有）+ 本周节奏 cadence（桌面独有）+ week 7 点。

import { useMemo } from "react";
import type { Plan } from "@tilemo/data";
import type { Session } from "@tilemo/data";
import { heatLevel, levelOfDay, pad2, QUOTES, todayKey, ymd } from "@tilemo/core";
import { useDataStore } from "../../data";

const WD = ["日", "一", "二", "三", "四", "五", "六"];

export function DeskHomeView({ onStart }: { onStart: (p: Plan) => void }) {
  const settings = useDataStore((s) => s.settings);
  const plans = useDataStore((s) => s.plans);
  const streak = useDataStore((s) => s.streak);
  const store = useDataStore((s) => s.store);

  const now = new Date();
  const tStr = todayKey();
  const today = store?.getDay(tStr) ?? null;
  const sessions: Session[] = today?.sessions ?? [];
  const done = sessions.length;
  const goal = settings?.dailyGoalGroups ?? 3;
  const isDone = done >= goal && done > 0;

  const quote = useMemo(
    () => QUOTES[(now.getDate() + now.getMonth() * 31) % QUOTES.length],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // 近 7 天（含今天）—— week 点 + cadence 柱
  const week = useMemo(() => {
    const out: {
      key: string;
      date: Date;
      level: number;
      n: number;
      lbl: string;
      dd: string;
      isToday: boolean;
    }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const key = ymd(d);
      const entry = store?.getDay(key) ?? null;
      const n = entry?.sessions?.length ?? 0;
      out.push({
        key,
        date: d,
        level: levelOfDay(entry),
        n,
        lbl: WD[d.getDay()],
        dd: pad2(d.getDate()),
        isToday: key === tStr,
      });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, done]);

  // cadence 统计
  const cadence = useMemo(() => {
    const totalSets = week.reduce((a, d) => a + d.n, 0);
    const metDays = week.filter((d) => d.n >= (settings?.dailyGoalGroups ?? 3)).length;
    const maxSets = Math.max(1, ...week.map((d) => d.n));
    return { totalSets, metDays, maxSets };
  }, [week, settings?.dailyGoalGroups]);

  const defaultPlan = plans.find((p) => p.id === settings?.defaultPlanId) ?? plans[0];

  const cadenceNote =
    cadence.metDays >= 7
      ? "本周全勤——你已把呼吸编进了肌肉。"
      : cadence.metDays >= 5
        ? "本周节奏稳健，再坚持两天就满一周。"
        : cadence.metDays >= 3
          ? "渐入状态——本周已过半。"
          : cadence.metDays >= 1
            ? "起步了——把每一次小坚持攒起来。"
            : "今天，开始第一组吧。";

  const planName = (id: string) => plans.find((p) => p.id === id)?.name ?? "方案";

  return (
    <div className="desk-home">
      <div className="desk-home-main">
        {settings?.dailyQuote && <p className="desk-home-quote">{quote}</p>}

        <h2 className={"desk-hero-question" + (isDone ? " is-settled" : " is-tense")}>
          今天，<span className="accent">提了</span>么？
        </h2>

        <div className={"desk-progress" + (isDone ? " is-done" : "")}>
          <span className="big">{done}</span>
          <span className="goal">
            / {goal}
            <span className="unit">组目标</span>
          </span>
        </div>

        <button
          className={"desk-cta" + (isDone ? " is-done" : "")}
          disabled={!defaultPlan}
          onClick={() => defaultPlan && onStart(defaultPlan)}
        >
          {isDone
            ? done > goal
              ? "今天，提了。再来一组"
              : "今天，提了。继续保持"
            : "开始这组训练"}
          <span className="arrow">→</span>
        </button>

        {/* 今日 sessions 列表（桌面独有） */}
        <div className="desk-sessions-card">
          <div className="desk-sessions-head">今日训练 · {done} 组</div>
          {sessions.length === 0 ? (
            <div className="desk-sessions-empty">今天还没有训练</div>
          ) : (
            sessions.map((s, i) => {
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
        </div>
      </div>

      {/* 右栏：streak + week + cadence */}
      <aside className="desk-home-aside">
        <div className="desk-aside-card">
          <div className="h">连续</div>
          <div className="desk-streak-big">
            <span className="v">{streak?.current ?? 0}</span>
            <span className="u">天</span>
          </div>
          {(streak?.longest ?? 0) > 0 && (
            <div className="desk-streak-longest">
              最长 <b>{streak?.longest}</b> 天
            </div>
          )}
        </div>

        <div className="desk-aside-card">
          <div className="h">本周 7 天</div>
          <div className="desk-week">
            {week.map((d) => (
              <div
                key={d.key}
                className={"desk-week-dot" + (d.isToday ? " is-today" : "")}
                data-level={d.level}
                title={`${d.lbl} ${d.dd} · ${d.n} 组`}
              >
                {d.level > 0 && <div className="blob" />}
                <div className="lbl">{d.lbl}</div>
                <div className="dd">{d.dd}</div>
              </div>
            ))}
          </div>
          <div className="desk-legend">
            少
            <i className="l0" />
            <i className="l1" />
            <i className="l2" />
            <i className="l3" />
            多
          </div>
        </div>

        {/* 本周节奏 cadence（桌面独有） */}
        <div className="desk-aside-card">
          <div className="h">本周节奏</div>
          <div className="desk-cadence-stats">
            <div className="desk-cadence-stat">
              <div className="l">本周组数</div>
              <div className="v">
                {cadence.totalSets}
                <span className="u">组</span>
              </div>
            </div>
            <div className="desk-cadence-stat">
              <div className="l">达标天数</div>
              <div className="v">
                {cadence.metDays}
                <span className="u">/ 7 天</span>
              </div>
            </div>
          </div>
          <div className="desk-cadence-bar">
            {week.map((d) => {
              const lv = heatLevel({ length: d.n }, settings?.dailyGoalGroups ?? 1);
              const h = Math.round((d.n / cadence.maxSets) * 100);
              return (
                <div
                  key={d.key}
                  className={"bar" + (d.isToday ? " is-today" : "")}
                  data-level={lv}
                  style={{ height: (d.n === 0 ? 8 : Math.max(14, h)) + "%" }}
                  title={`${d.lbl} · ${d.n} 组`}
                >
                  <span className="bv">{d.n > 0 ? d.n : "·"}</span>
                </div>
              );
            })}
          </div>
          <div className="desk-cadence-note">{cadenceNote}</div>
        </div>
      </aside>
    </div>
  );
}
