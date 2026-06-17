import { createRoot } from "react-dom/client";
import { tokensToCssVars } from "@tilemo/design-tokens";
import { App } from "./App";

// Inject design tokens as CSS custom properties on :root — regenerates the exact
// variable names the original single-file index.html used, so ported CSS works as-is.
document.documentElement.style.cssText += ";" + tokensToCssVars("light");

createRoot(document.getElementById("root")!).render(<App />);
