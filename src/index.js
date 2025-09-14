import { jsx as _jsx } from "react/jsx-runtime";
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App"; // <-- import par défaut
const el = document.getElementById("root");
if (!el)
    throw new Error('No root element found');
createRoot(el).render(_jsx(React.StrictMode, { children: _jsx(App, {}, void 0) }, void 0));
