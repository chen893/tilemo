// @tilemo/web — 桌面今日视图（dashboard）。quote + 主问句 + 进度 + CTA
// + 今日 sessions 列表（桌面独有）+ 本周节奏 cadence（桌面独有）+ week 7 点。

import { useMemo } from "react";
import type { Plan } from "@tilemo/data";
import type { Session } from "@tilemo/data";
import { dayMeetsGoal, heatLevel, levelOfDay, pad2, QUOTES, todayKey, ymd } from "@tilemo/core";
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
      met: boolean;
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
        // 与 streak / aggregateStats 同口径：用当日记录的 goalGroups 快照判定达标，
        // 而非"当前设置"——否则改目标后首页节奏卡与连续天数/历史会互相矛盾。
        met: dayMeetsGoal(entry),
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
    const metDays = week.filter((d) => d.met).length;
    const maxSets = Math.max(1, ...week.map((d) => d.n));
    return { totalSets, metDays, maxSets };
  }, [week]);

  const defaultPlan = plans.find((p) => p.id === settings?.defaultPlanId) ?? plans[0];

  const cadenceNote =
    cadence.metDays >= 7
      ? "本周全勤——你已把节奏刻进了肌肉。"
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
        <h2 className={"desk-hero-question" + (isDone ? " is-settled" : " is-tense")}>
          {isDone ? (
            <>
              今天，已<span className="accent">达标</span>。
            </>
          ) : (
            <>
              今天，<span className="accent">提起</span>来。
            </>
          )}
        </h2>

        {settings?.dailyQuote && <p className="desk-home-quote">{quote}</p>}

        {/* 呼吸分隔：把「为什么」（宣告/quote）与「做什么」（进度/行动）分开 */}
        <div className="desk-today-rule" aria-hidden="true" />

        <div className="desk-today-progress">
          <div
            className={"desk-segments" + (isDone ? " is-done" : "")}
            role="img"
            aria-label={`今日进度 ${done} / ${goal} 组`}
          >
            {Array.from({ length: Math.max(1, goal) }).map((_, i) => (
              <span key={i} className={"desk-seg" + (i < done ? " is-filled" : "")} />
            ))}
          </div>
          <div className="desk-progress-count">
            <span className="n">{done}</span>
            <span className="sep">/</span>
            <span className="goal">{goal}</span>
            <span className="unit">组</span>
          </div>
        </div>

        <button
          className={"desk-cta" + (isDone ? " is-done" : "")}
          disabled={!defaultPlan}
          onClick={() => defaultPlan && onStart(defaultPlan)}
        >
          {isDone ? "再来一组" : "开始一组训练"}
          <span className="arrow">→</span>
        </button>

        <p className="desk-today-note">
          {isDone
            ? "今天的量够了——肌肉记得这份坚持。"
            : done > 0
              ? `还差 ${goal - done} 组，提起来。`
              : "还没有训练，提起来就算今天赢。"}
        </p>

        {/* 今日 sessions 列表（桌面独有） */}
        <div className="desk-sessions-card">
          <div className="desk-sessions-head">今日训练 · {done} 组</div>
          {sessions.length === 0 ? (
            <div className="desk-sessions-empty">完成第一组，开启今天的小坚持。</div>
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
                    {s.finished ? "完成" : "部分"}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 右栏：streak + week + cadence */}
      <aside className="desk-home-aside">
        <div className={"desk-aside-card" + ((streak?.current ?? 0) > 0 ? "" : " is-empty")}>
          <div className="h">连续</div>
          <div className="desk-streak-big">
            <span className="v">{streak?.current ?? 0}</span>
            <span className="u">天</span>
          </div>
          {(streak?.longest ?? 0) > 0 ? (
            <div className="desk-streak-longest">
              最长 <b>{streak?.longest}</b> 天
            </div>
          ) : (
            <div className="desk-streak-longest">即将开启连续打卡</div>
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
                  style={d.n > 0 ? { height: Math.max(14, h) + "%" } : undefined}
                  title={`${d.lbl} · ${d.n} 组`}
                >
                  <span className="bv">{d.n}</span>
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
