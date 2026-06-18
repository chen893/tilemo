// @tilemo/web — 记录视图（移动壳，阶段 2 占位，后续补月历 + 日详情）。

import { aggregateStats } from "@tilemo/core";
import { useDataStore } from "../data";

export function HistoryView() {
  const store = useDataStore((s) => s.store);
  const streak = useDataStore((s) => s.streak);
  const stats = store ? aggregateStats(store) : null;
  return (
    <div className="view-history">
      <div className="eyebrow"><span className="seed" aria-hidden="true" />记录</div>
      <h2 className="section-title">你的<span className="em">足迹</span></h2>
      <div className="stat-row">
        <div><span className="big">{streak?.current ?? 0}</span><span className="sub">连续天</span></div>
        <div><span className="big">{stats?.totalDays ?? 0}</span><span className="sub">总天数</span></div>
        <div><span className="big">{stats?.totalSessions ?? 0}</span><span className="sub">总组数</span></div>
      </div>
      <p className="hint">月历与日详情待补（阶段 2 后续）。</p>
    </div>
  );
}
