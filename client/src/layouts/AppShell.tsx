import { Outlet } from "react-router-dom";
import { Sidebar } from "../components/sidebar/Sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "../components/ui/sidebar";

export const AppShell = () => {
  return (
    <SidebarProvider defaultOpen>
      <Sidebar />
      <SidebarInset className="m-4 min-h-0 overflow-hidden rounded-3xl border border-border/60 bg-card shadow-card">
        <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
          <SidebarTrigger />
        </div>
        <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};
