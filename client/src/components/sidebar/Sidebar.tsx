import { NavLink } from "react-router-dom";
import { BarChart3, Calendar, LayoutGrid, Settings } from "lucide-react";
import { Button } from "../ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { cn } from "../../lib/utils";

const navItems = [
  { label: "Dashboard", to: "/", icon: LayoutGrid },
  { label: "Analytics", to: "/analytics", icon: BarChart3 },
  { label: "Calendar", to: "/calendar", icon: Calendar },
  { label: "Settings", to: "/settings", icon: Settings },
];

export const Sidebar = ({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) => {
  return (
    <aside
      className={cn(
        "flex h-full flex-col gap-6 rounded-3xl bg-card p-4 shadow-card",
        collapsed ? "items-center" : "items-stretch"
      )}
    >
      <div className={cn("flex w-full items-center justify-between", collapsed && "flex-col gap-3")}>
        <div className={cn("flex items-center gap-3", collapsed && "flex-col")}
        >
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-foreground text-background">
            PT
          </div>
          {!collapsed && (
            <div>
              <p className="text-sm font-semibold">Progress Tracker</p>
              <p className="text-xs text-muted-foreground">Goals & momentum</p>
            </div>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={onToggle} className="text-xs">
          {collapsed ? "Expand" : "Collapse"}
        </Button>
      </div>

      <TooltipProvider delayDuration={200}>
        <nav className={cn("flex flex-col gap-2", collapsed && "items-center")}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Tooltip key={item.label}>
                <TooltipTrigger asChild>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
                        isActive
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:bg-muted",
                        collapsed && "justify-center"
                      )
                    }
                  >
                    <Icon className="h-5 w-5" />
                    {!collapsed && <span>{item.label}</span>}
                  </NavLink>
                </TooltipTrigger>
                {collapsed && <TooltipContent side="right">{item.label}</TooltipContent>}
              </Tooltip>
            );
          })}
        </nav>
      </TooltipProvider>

      {!collapsed && (
        <div className="mt-auto rounded-2xl bg-muted p-4 text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">Tip</p>
          <p className="mt-1">Use Analytics to track trends once enabled.</p>
        </div>
      )}
    </aside>
  );
};
