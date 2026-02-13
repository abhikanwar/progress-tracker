import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { cn } from "../../lib/utils";
import { Skeleton } from "./skeleton";

type MetricCardProps = {
  label: string;
  value: string | number;
  note?: string;
  loading?: boolean;
  className?: string;
};

export const MetricCard = ({ label, value, note, loading, className }: MetricCardProps) => {
  return (
    <Card className={cn("ui-transition", className)}>
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="text-2xl font-semibold">
          {loading ? <Skeleton className="h-8 w-20" /> : value}
        </div>
        {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
      </CardContent>
    </Card>
  );
};

type TrendBadgeProps = {
  value: number;
  label: string;
  className?: string;
};

export const TrendBadge = ({ value, label, className }: TrendBadgeProps) => {
  const positive = value >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        positive
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200"
          : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-200",
        className
      )}
    >
      {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {positive ? "+" : ""}
      {value}% {label}
    </span>
  );
};

type CalloutPanelProps = {
  title: string;
  description: string;
  className?: string;
};

export const CalloutPanel = ({ title, description, className }: CalloutPanelProps) => (
  <div className={cn("rounded-2xl border border-border/60 bg-muted/60 p-4", className)}>
    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Highlight</p>
    <p className="mt-1 text-sm font-semibold">{title}</p>
    <p className="mt-1 text-xs text-muted-foreground">{description}</p>
  </div>
);
