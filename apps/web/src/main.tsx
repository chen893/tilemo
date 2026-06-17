import { createRoot } from "react-dom/client";
import { tokensToStylesheet } from "@tilemo/design-tokens";
import { LocalStorageAdapter, Store } from "@tilemo/data";
import { useDataStore } from "@tilemo/store";
import { App } from "./App";
import "./styles.css";

// Inject the full design-token stylesheet once (light :root + dark override).
// Identical CSS custom properties to the original index.html → ported CSS works.
const styleEl = document.createElement("style");
styleEl.textContent = tokensToStylesheet();
document.head.appendChild(styleEl);

// Bootstrap from localStorage — reads existing `tgm:*` data (backward-compat).
useDataStore.getState().init(new Store(new LocalStorageAdapter()));

createRoot(document.getElementById("root")!).render(<App />);
