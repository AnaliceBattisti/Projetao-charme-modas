import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { SessaoProvider } from "./auth.jsx";
import "./theme.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <SessaoProvider>
      <App />
    </SessaoProvider>
  </React.StrictMode>
);
