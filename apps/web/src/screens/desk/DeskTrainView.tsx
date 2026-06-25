// @tilemo/web — 桌面训练视图（master-detail）。
// 左：方案卡片列表 click 选中；右：选中方案详情 + 大开始按钮。

import { useState } from "react";
import type { Plan } from "@tilemo/data";
import { useDataStore } from "../../data";

export function DeskTrainView({ onStart }: { onStart: (p: Plan) => void }) {
  const plans = useDataStore((s) => s.plans);
  const settings = useDataStore((s) => s.settings);

  const [selectedId, setSelectedId] = useState<string>(settings?.defaultPlanId ?? plans[0]?.id ?? "");
  const selected = plans.find((p) => p.id === selectedId) ?? plans[0] ?? null;

  if (!selected) return null;

  // 预计耗时：(contract + relax) * reps * sets（秒 → 分钟）
  const estSec = (selected.contract + selected.relax) * selected.reps * selected.sets;
  const estMin = Math.max(1, Math.round(estSec / 60));

  return (
    <div className="desk-train">
      {/* 左：方案列表 */}
      <ul className="desk-plan-list">
        {plans.map((p, i) => {
          const isSelected = p.id === selected.id;
          const isDefault = p.id === settings?.defaultPlanId;
          return (
            <li key={p.id}>
              <button
                className={"desk-plan-card" + (isSelected ? " is-selected" : "")}
                onClick={() => setSelectedId(p.id)}
              >
                <div className="desk-plan-card-top">
                  <h3 className="desk-plan-card-name">{p.name}</h3>
                  <span className="desk-plan-card-index">{pad2idx(i + 1)} / {pad2idx(plans.length)}</span>
                </div>
                {isDefault && <span className="desk-plan-default-tag">默认方案</span>}
                <p className="desk-plan-card-desc">{p.desc}</p>
                <div className="desk-plan-card-params">
                  <span className="desk-plan-chip">
                    收紧<span className="v">{p.contract}秒</span>
                  </span>
                  <span className="desk-plan-chip">
                    放松<span className="v">{p.relax}秒</span>
                  </span>
                  <span className="desk-plan-chip">
                    <span className="v">{p.reps}</span>次
                  </span>
                  <span className="desk-plan-chip">
                    <span className="v">{p.sets}</span>组
                  </span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {/* 右：方案详情 —— 不重复左侧的参数 chip，只补决策辅助：预计耗时 + 呼吸提示 + 大开始按钮 */}
      <div className="desk-plan-detail">
        <div className="eyebrow">
          <span className="seed" aria-hidden="true" />
          选中方案
        </div>
        <h3 className="name">{selected.name}</h3>
        <p className="desc">{selected.desc}</p>

        <div className="desk-set-note">预计耗时 <b>{estMin}</b> 分钟（{(selected.contract + selected.relax) * selected.reps * selected.sets}秒）</div>

        <div className="desk-breath-tip">
          <div className="h">呼吸提示</div>
          <p>收紧时吸气，放松时呼气，跟着节拍走——不用刻意，身体会自己找到节奏。</p>
        </div>

        <button className="desk-cta" onClick={() => onStart(selected)}>
          开始一组训练
          <span className="arrow">→</span>
        </button>
      </div>
    </div>
  );
}

function pad2idx(n: number): string {
  return String(n).padStart(2, "0");
}
