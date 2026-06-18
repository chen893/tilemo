// @tilemo/web — 训练视图（移动壳，阶段 2 占位，后续补全方案卡）。

import type { Plan } from "@tilemo/data";
import { useDataStore } from "../data";

export function TrainView({ onStart }: { onStart: (p: Plan) => void }) {
  const plans = useDataStore((s) => s.plans);
  return (
    <div className="view-train">
      <div className="eyebrow"><span className="seed" aria-hidden="true" />训练</div>
      <h2 className="section-title">挑<span className="em">一组</span>开始</h2>
      <div className="plan-list">
        {plans.map((p) => (
          <button key={p.id} className="plan-card" onClick={() => onStart(p)}>
            <div className="plan-card-name">{p.name}</div>
            <div className="plan-card-desc">{p.desc}</div>
            <div className="plan-card-params">
              <span>收紧 {p.contract}s</span>
              <span>放松 {p.relax}s</span>
              <span>{p.reps} 次</span>
              <span>{p.sets} 组</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
