// @tilemo/web — 训练视图（移动壳）。

import { useState } from "react";
import type { Plan } from "@tilemo/data";
import { formatPlanDuration } from "@tilemo/core";
import { useDataStore } from "../data";

export function TrainView({ onStart }: { onStart: (p: Plan) => void }) {
  const plans = useDataStore((s) => s.plans);
  const defaultPlanId = useDataStore((s) => s.settings?.defaultPlanId);
  const [showGuide, setShowGuide] = useState(false);

  return (
    <div className="view-train">
      <div className="eyebrow">
        <span className="seed" aria-hidden="true" />
        训练
      </div>
      <h2 className="section-title">
        挑<span className="em">一组</span>开始
      </h2>

      <div className="plan-list" style={{ marginTop: "var(--s-5)" }}>
        {plans.map((p) => {
          const isDefault = p.id === defaultPlanId;
          return (
            <button
              key={p.id}
              className={"plan-card" + (isDefault ? " is-default" : "")}
              onClick={() => onStart(p)}
            >
              <div className="plan-card-top">
                <div className="plan-card-title-wrap">
                  <h3 className="plan-card-name">{p.name}</h3>
                  {isDefault && <span className="plan-card-default-tag">默认</span>}
                </div>
                <span className="plan-card-dur">{formatPlanDuration(p)} ›</span>
              </div>
              <p className="plan-card-desc">{p.desc}</p>
              <div className="plan-card-metrics">
                <div className="plan-metric">
                  <span className="k">收紧</span>
                  <span className="v">{p.contract}秒</span>
                </div>
                <div className="plan-metric">
                  <span className="k">放松</span>
                  <span className="v">{p.relax}秒</span>
                </div>
                <div className="plan-metric">
                  <span className="k">次数</span>
                  <span className="v">{p.reps} 次</span>
                </div>
                <div className="plan-metric">
                  <span className="k">组数</span>
                  <span className="v">{p.sets} 组</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <button
        className="guide-pill"
        style={{ marginTop: "var(--s-4)", display: "block", marginInline: "auto", border: "none" }}
        onClick={() => setShowGuide((v) => !v)}
      >
        {showGuide ? "收起动作要领" : "第一次练？查看动作要领"}
      </button>

      {showGuide && (
        <div className="guide-box">
          <p>呼气时轻轻向上收紧，保持腹部与臀部自然放松；吸气时完全放松，不必屏气，跟着节拍走即可。</p>
        </div>
      )}
    </div>
  );
}
