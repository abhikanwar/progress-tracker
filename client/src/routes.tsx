import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "./layouts/AppShell";
import { Dashboard } from "./pages/Dashboard";
import { Analytics } from "./pages/Analytics";
import { CalendarPage } from "./pages/Calendar";
import { SettingsPage } from "./pages/Settings";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "analytics", element: <Analytics /> },
      { path: "calendar", element: <CalendarPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
]);
