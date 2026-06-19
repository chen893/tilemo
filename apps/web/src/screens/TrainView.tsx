// @tilemo/web — 训练视图（移动壳）。镜像 mobile TrainScreen，复用 core 计算。

import type { Plan } from "@tilemo/data";
import { pad2 } from "@tilemo/core";
import { useDataStore } from "../data";

export function TrainView({ onStart }: { onStart: (p: Plan) => void }) {
  const plans = useDataStore((s) => s.plans);
  const defaultPlanId = useDataStore((s) => s.settings?.defaultPlanId);

  return (
    <div className="view-train">
      <div className="eyebrow">
        <span className="seed" aria-hidden="true" />
        训练
      </div>
      <h2 className="section-title">
        挑<span className="em">一组</span>开始
      </h2>

      <div className="plan-list" style={{ marginTop: "var(--s-6)" }}>
        {plans.map((p, idx) => {
          const isDefault = p.id === defaultPlanId;
          return (
            <button
              key={p.id}
              className={"plan-card" + (isDefault ? " is-default" : "")}
              onClick={() => onStart(p)}
            >
              <div className="plan-card-top">
                <h3 className="plan-card-name">{p.name}</h3>
                <span className="plan-card-index">
                  {pad2(idx + 1)} / {pad2(plans.length)}
                </span>
              </div>
              {isDefault && <span className="plan-card-default-tag">默认方案</span>}
              <p className="plan-card-desc">{p.desc}</p>
              <div className="plan-card-params">
                <span className="plan-chip">
                  收紧<span className="v">{p.contract}秒</span>
                </span>
                <span className="plan-chip">
                  放松<span className="v">{p.relax}秒</span>
                </span>
                <span className="plan-chip">
                  次<span className="v">{p.reps}</span>
                </span>
                <span className="plan-chip">
                  组<span className="v">{p.sets}</span>
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
