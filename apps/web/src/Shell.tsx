// @tilemo/web — Shell：tab 状态 + metroPlan 状态的容器。
// 阶段 5 将挂 <DeskShell/>（与 MobileShell 共用 tab/metroPlan）。

import { useState } from "react";
import type { Plan } from "@tilemo/data";
import { MobileShell, type Tab } from "./MobileShell";
import { Metronome } from "./Metronome";

export function Shell() {
  const [tab, setTab] = useState<Tab>("home");
  const [metroPlan, setMetroPlan] = useState<Plan | null>(null);
  return (
    <>
      <MobileShell tab={tab} setTab={setTab} onStart={setMetroPlan} />
      {metroPlan && <Metronome plan={metroPlan} onClose={() => setMetroPlan(null)} />}
    </>
  );
}
