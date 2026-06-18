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
        今天，<span className="em">提了</span>么？
      </h2>

      <div className="home-progress">
        <span className="big" style={{ color: isDone ? "var(--success)" : "var(--accent)" }}>
          {done}
        </span>
        <span className="slash">/</span>
        <span className="big num">{goal}</span>
        <span className="unit">组目标</span>
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
          <span className="num">{streak?.current}</span> 天连续
          {(streak?.longest ?? 0) > 0 && <span className="sub">最长 {streak?.longest} 天</span>}
        </div>
      )}

      <div className="mini-dots" id="mini-dots">
        {week.map((d) => (
          <div
            key={d.key}
            className={"mini-dot level-" + d.level + (d.isToday ? " is-today" : "")}
            title={d.lbl}
          >
            <span className="lbl">{d.lbl}</span>
            <span className="dd">{d.dd}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
