import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";

// App initialization
const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(
    <HelmetProvider>
      <App />
    </HelmetProvider>
  );
} else {
  console.error("Root element not found");
}
