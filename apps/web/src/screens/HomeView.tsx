// @tilemo/web — 今日视图（移动壳）。镜像 mobile HomeScreen，复用 core 计算。

import { useMemo } from "react";
import type { Plan } from "@tilemo/data";
import { levelOfDay, pad2, QUOTES, todayKey, ymd } from "@tilemo/core";
import { useDataStore } from "../data";

const WD = ["日", "一", "二", "三", "四", "五", "六"];

export function HomeView({ onStart }: { onStart: (p: Plan) => void }) {
  const settings = useDataStore((s) => s.settings);
  const plans = useDataStore((s) => s.plans);
  const streak = useDataStore((s) => s.streak);
  const store = useDataStore((s) => s.store);

  const now = new Date();
  const today = store?.getDay(todayKey()) ?? null;
  const done = today?.sessions?.length ?? 0;
  const goal = settings?.dailyGoalGroups ?? 3;
  const isDone = done >= goal && done > 0;

  const quote = useMemo(
    () => QUOTES[(now.getDate() + now.getMonth() * 31) % QUOTES.length],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const week = useMemo(() => {
    const out: { key: string; level: number; lbl: string; dd: string; isToday: boolean }[] = [];
    const tStr = todayKey();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const key = ymd(d);
      out.push({
        key,
        level: levelOfDay(store?.getDay(key) ?? null),
        lbl: WD[d.getDay()],
        dd: pad2(d.getDate()),
        isToday: key === tStr,
      });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, done]);

  const defaultPlan = plans.find((p) => p.id === settings?.defaultPlanId) ?? plans[0];

  return (
    <div className="view-home" id="view-home-inner">
      <div className="eyebrow">
        <span className="seed" aria-hidden="true" />
        日课 · {now.getMonth() + 1}.{pad2(now.getDate())} 周{WD[now.getDay()]}
      </div>

      {settings?.dailyQuote && <p className="home-quote">{quote}</p>}

      <h2 className={"home-question" + (isDone ? " is-settled" : " is-tense")}>
        今天，<span className="accent">提了</span>么？
      </h2>

      <div className={"home-progress" + (isDone ? " is-done" : "")}>
        <span className="big">{done}</span>
        <span className="goal">
          / {goal}
          <span className="unit">组目标</span>
        </span>
      </div>

      <button
        className={"cta" + (isDone ? " is-done" : "")}
        id="home-cta"
        disabled={!defaultPlan}
        onClick={() => defaultPlan && onStart(defaultPlan)}
      >
        {isDone ? (done > goal ? "今天，提了。再来一组" : "今天，提了。继续保持") : "开始一组训练"}
      </button>

      {(streak?.current ?? 0) > 0 && (
        <div className="streak-block is-show">
          <span className="leaf" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                d="M20 4C9 4 4 9 4 18c0 0 0 2 2 2 9 0 14-5 14-16z"
                strokeLinejoin="round"
              />
              <path d="M4 20C8 14 12 10 18 7" strokeLinecap="round" />
            </svg>
          </span>
          <div className="text">
            <div className="lbl">连续</div>
            <div className="v">
              {streak?.current}
              <span className="unit">天</span>
            </div>
            {(streak?.longest ?? 0) > 0 && (
              <div className="lbl" style={{ marginTop: "4px" }}>
                最长 {streak?.longest} 天
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mini">
        <div className="mini-head">
          <span className="t">最近 7 天</span>
          <span className="legend">
            <i className="l0" />
            <i className="l1" />
            <i className="l2" />
            <i className="l3" />
          </span>
        </div>
        <div className="mini-dots" id="mini-dots">
          {week.map((d) => (
            <div
              key={d.key}
              className={"mini-dot" + (d.isToday ? " is-today" : "")}
              data-level={d.level}
              title={`${d.lbl} ${d.dd}`}
            >
              {d.level > 0 && <span className="blob" />}
              <span className="lbl">{d.lbl}</span>
              <span className="dd">{d.dd}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
