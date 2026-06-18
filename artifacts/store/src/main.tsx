import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initSentry } from "./lib/sentry";

void initSentry().then(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
