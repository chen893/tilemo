import { useDataStore } from "@tilemo/store";

/** P1 Home — the spine: "今天提了么?" + today's progress + streak, read from the
 *  Store (existing tgm: localStorage data is shown as-is). */
export function App() {
  const settings = useDataStore((s) => s.settings);
  const today = useDataStore((s) => s.today);
  const streak = useDataStore((s) => s.streak);
  if (!settings) return null;

  const done = today?.sessions?.length ?? 0;
  const goal = settings.dailyGoalGroups;
  const now = new Date();
  const dateStr = `${now.getMonth() + 1} 月 ${now.getDate()} 日`;

  return (
    <div className="page">
      <div className="masthead">{dateStr}</div>
      <h1 className="question">今天，提了么？</h1>
      <p className="progress">
        已完成 <b>{done}</b> / {goal} 组
      </p>
      <p className="streak">
        连续 <b>{streak?.current ?? 0}</b> 天 · 最长 {streak?.longest ?? 0} 天
      </p>
    </div>
  );
}
