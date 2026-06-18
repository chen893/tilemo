// @tilemo/web — Shell：tab 状态 + metroPlan 状态的容器。
// 阶段 3 将在此挂 <Metronome/>，阶段 5 挂 <DeskShell/>。

import { useState } from "react";
import type { Plan } from "@tilemo/data";
import { MobileShell, type Tab } from "./MobileShell";

export function Shell() {
  const [tab, setTab] = useState<Tab>("home");
  const [, setMetroPlan] = useState<Plan | null>(null);
  return <MobileShell tab={tab} setTab={setTab} onStart={setMetroPlan} />;
}
