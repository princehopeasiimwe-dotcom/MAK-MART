import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./styles/Variables.css";
import "./index.css";
import "./styles/theme.css";
import "./styles/global.css";
import "./styles/responsive.css";

import App from "./App";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);