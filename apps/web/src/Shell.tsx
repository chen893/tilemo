// @tilemo/web — Shell：tab 状态 + metroPlan 状态的容器。
// 按断点条件渲染 MobileShell(<1024) 或 DeskShell(≥1024)，避免双套 DOM 同时挂载。

import { useEffect, useState } from "react";
import type { Plan } from "@tilemo/data";
import { MobileShell, type Tab } from "./MobileShell";
import { DeskShell } from "./DeskShell";
import { Metronome } from "./Metronome";

const DESK_MQ = "(min-width: 1024px)";

export function Shell() {
  const [tab, setTab] = useState<Tab>("home");
  const [metroPlan, setMetroPlan] = useState<Plan | null>(null);
  const [isDesk, setIsDesk] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(DESK_MQ).matches : false,
  );

  useEffect(() => {
    const mq = window.matchMedia(DESK_MQ);
    const onChange = () => setIsDesk(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <>
      {isDesk ? (
        <DeskShell tab={tab} setTab={setTab} onStart={setMetroPlan} />
      ) : (
        <MobileShell tab={tab} setTab={setTab} onStart={setMetroPlan} />
      )}
      {metroPlan && (
        <Metronome
          plan={metroPlan}
          onClose={(goHome) => {
            setMetroPlan(null);
            if (goHome) setTab("home");
          }}
        />
      )}
    </>
  );
}
