import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initializeMobile } from "./mobile/MobileBootstrap";

// Initialize mobile-specific features before rendering
initializeMobile({
  statusBarStyle: 'dark',
  enableBackButtonHandler: true,
  enableKeyboardHandling: true,
  enableBackgroundSync: true,
}).then(() => {
  createRoot(document.getElementById("root")!).render(<App />);
}).catch((error) => {
  console.error('[Mobile] Initialization failed, rendering anyway:', error);
  createRoot(document.getElementById("root")!).render(<App />);
});
