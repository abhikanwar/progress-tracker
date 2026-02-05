import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { goalsApi } from "../lib/api";
import type { Goal } from "../types/goals";
import { useEffect, useMemo, useState } from "react";

export const Analytics = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await goalsApi.list();
        setGoals(data);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const summary = useMemo(() => {
    const total = goals.length;
    const completed = goals.filter((g) => g.status === "COMPLETED").length;
    const active = goals.filter((g) => g.status === "ACTIVE").length;
    const avgProgress = total
      ? Math.round(goals.reduce((sum, g) => sum + g.currentProgress, 0) / total)
      : 0;
    return { total, completed, active, avgProgress };
  }, [goals]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Analytics</p>
        <h1 className="text-3xl font-semibold">Progress trends</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total goals", value: summary.total },
          { label: "Active", value: summary.active },
          { label: "Completed", value: summary.completed },
          { label: "Avg progress", value: `${summary.avgProgress}%` },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">{stat.label}</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {loading ? "—" : stat.value}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Progress timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {goals.length === 0 && !loading && (
              <p className="text-sm text-muted-foreground">No data yet.</p>
            )}
            {goals.slice(0, 5).map((goal) => (
              <div key={goal.id} className="rounded-xl border border-border p-3 text-sm">
                <p className="font-medium">{goal.title}</p>
                <p className="text-xs text-muted-foreground">
                  {goal.progressEvents?.[0]
                    ? `Latest update: ${goal.progressEvents[0].value}%`
                    : "No progress events"}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
