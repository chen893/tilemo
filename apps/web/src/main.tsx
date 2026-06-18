// @tilemo/web — React 入口。
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./app.css";
import { bootstrapStore } from "./data";
import { App } from "./App";

bootstrapStore();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
