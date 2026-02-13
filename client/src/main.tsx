import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./routes";
import { SonnerToaster } from "./components/ui/sonner";
import { themeManager } from "./lib/theme";
import "./styles/globals.css";

themeManager.init();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
    <SonnerToaster />
  </React.StrictMode>
);
