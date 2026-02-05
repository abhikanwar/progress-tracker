import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "../components/sidebar/Sidebar";
import { cn } from "../lib/utils";

export const AppShell = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={cn("app-shell", collapsed && "is-collapsed")}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((prev) => !prev)} />
      <main className="rounded-3xl bg-card p-6 shadow-card">
        <Outlet />
      </main>
    </div>
  );
};
