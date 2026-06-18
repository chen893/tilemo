// @tilemo/web — Shell：tab 状态 + metroPlan 状态的容器。
// 双壳渲染：MobileShell(<1024) + DeskShell(≥1024) 共用 tab/metroPlan，
// CSS media query 控显隐（.desk 接管 / #app 隐藏）。Metronome overlay 全局。

import { useState } from "react";
import type { Plan } from "@tilemo/data";
import { MobileShell, type Tab } from "./MobileShell";
import { DeskShell } from "./DeskShell";
import { Metronome } from "./Metronome";

export function Shell() {
  const [tab, setTab] = useState<Tab>("home");
  const [metroPlan, setMetroPlan] = useState<Plan | null>(null);
  return (
    <>
      <MobileShell tab={tab} setTab={setTab} onStart={setMetroPlan} />
      <DeskShell tab={tab} setTab={setTab} onStart={setMetroPlan} />
      {metroPlan && <Metronome plan={metroPlan} onClose={() => setMetroPlan(null)} />}
    </>
  );
}
