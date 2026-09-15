import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "bulma/css/bulma.min.css";
import "./styles/editor.css";
import "./styles/graphic.css";
import App from "./App.jsx";
import { GraphicProvider } from "./store.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <GraphicProvider>
      <App />
    </GraphicProvider>
  </StrictMode>
);
