import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

try {
    createRoot(document.getElementById("root")!).render(<App />);
} catch (e) {
    console.error("CRITICAL STARTUP ERROR:", e);
    document.getElementById("root")!.innerHTML = `
    <div style="padding: 20px; color: red; font-family: monospace;">
      <h1>Critical Startup Error</h1>
      <pre>${e instanceof Error ? e.message + "\n" + e.stack : String(e)}</pre>
    </div>
  `;
}
