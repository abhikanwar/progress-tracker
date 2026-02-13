import { BarChart3, Calendar, LayoutGrid, Settings } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { ThemeToggle } from "../ThemeToggle";
import {
  Sidebar as UiSidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "../ui/sidebar";

const navItems = [
  { label: "Focus", to: "/", icon: LayoutGrid },
  { label: "Analytics", to: "/analytics", icon: BarChart3 },
  { label: "Calendar", to: "/calendar", icon: Calendar },
  { label: "Settings", to: "/settings", icon: Settings },
] as const;

const isPathActive = (pathname: string, to: string) => {
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(`${to}/`);
};

export const Sidebar = () => {
  const { pathname } = useLocation();

  return (
    <UiSidebar collapsible="icon" variant="floating" className="border-r-0">
      <SidebarHeader>
        <div className="flex items-center gap-2 overflow-hidden px-2">
          <div className="flex min-w-0 items-center gap-3 group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:justify-center">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8">
              PT
            </div>
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-sm font-semibold">Progress Tracker</p>
              <p className="truncate text-xs text-muted-foreground">Goals & momentum</p>
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarMenu>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isPathActive(pathname, item.to);
              return (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                    <NavLink to={item.to}>
                      <Icon />
                      <span>{item.label}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="group-data-[collapsible=icon]:hidden">
          <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/40 p-3 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">Momentum tip</p>
            <p className="mt-1">Log quick updates to keep streaks and trends visible.</p>
          </div>
          <div className="mt-3 flex justify-start">
            <ThemeToggle />
          </div>
        </div>
      </SidebarFooter>
    </UiSidebar>
  );
};
