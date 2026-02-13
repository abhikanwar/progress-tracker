import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "./layouts/AppShell";
import { Dashboard } from "./pages/Dashboard";
import { Analytics } from "./pages/Analytics";
import { CalendarPage } from "./pages/Calendar";
import { SettingsPage } from "./pages/Settings";
import { AuthPage } from "./pages/Auth";
import { RequireAuth } from "./components/auth/RequireAuth";
import { CustomizationPage } from "./pages/Customization";
import { CoachPage } from "./pages/Coach";
import { CoachChatPage } from "./pages/CoachChat";

export const router = createBrowserRouter([
  { path: "/login", element: <AuthPage /> },
  {
    path: "/",
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Dashboard /> },
      { path: "analytics", element: <Analytics /> },
      { path: "calendar", element: <CalendarPage /> },
      { path: "customization", element: <CustomizationPage /> },
      { path: "coach", element: <CoachPage /> },
      { path: "coach-chat", element: <CoachChatPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
]);
