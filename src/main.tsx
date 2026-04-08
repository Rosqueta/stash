import React from "react";
import ReactDOM from "react-dom/client";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import App from "./App";

// Add window label as class on both html and body for CSS targeting
const windowLabel = getCurrentWebviewWindow().label;
document.documentElement.classList.add(windowLabel);
document.body.classList.add(windowLabel);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
