import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";   // <-- import par défaut

const el = document.getElementById("root");
if (!el) throw new Error('No root element found');

createRoot(el).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
