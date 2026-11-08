import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./styles/Variables.css";
import "./index.css";
import "./styles/theme.css";
import "./styles/global.css";
import "./styles/responsive.css";
import "./styles/campus.css";

import App from "./App";
import { installLocalErrorCapture } from "./lib/logger";

installLocalErrorCapture();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);