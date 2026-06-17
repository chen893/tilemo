import { TILEMO_CORE_VERSION } from "@tilemo/core";
import { TILEMO_DATA_VERSION } from "@tilemo/data";
import { useBootStore } from "@tilemo/store";

/** P0 shell — proves the monorepo wiring (4 packages resolve + build + render). */
export function App() {
  const bootCount = useBootStore((s) => s.bootCount);
  const bump = useBootStore((s) => s.bump);

  return (
    <div
      style={{
        background: "var(--paper)",
        color: "var(--ink)",
        minHeight: "100vh",
        fontFamily: "system-ui, -apple-system, 'PingFang SC', sans-serif",
        padding: "2rem",
      }}
    >
      <h1 style={{ margin: 0, color: "var(--accent)" }}>今天提了么</h1>
      <p>monorepo P0 · core {TILEMO_CORE_VERSION} · data {TILEMO_DATA_VERSION}</p>
      <button onClick={bump} style={btn}>
        zustand works · clicked {bootCount}
      </button>
    </div>
  );
}

const btn: React.CSSProperties = {
  background: "var(--accent)",
  color: "var(--paper)",
  border: "none",
  borderRadius: 999,
  padding: "0.6rem 1.2rem",
  fontSize: 16,
  cursor: "pointer",
};
