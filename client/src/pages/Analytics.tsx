import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { goalsApi } from "../lib/api";
import type { Goal } from "../types/goals";
import { useEffect, useMemo, useState } from "react";
import { Button } from "../components/ui/button";

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

  const activity = useMemo(() => {
    const dayMap = new Map<string, number>();
    goals.forEach((goal) => {
      goal.progressEvents?.forEach((event) => {
        const key = event.createdAt.slice(0, 10);
        dayMap.set(key, (dayMap.get(key) ?? 0) + 1);
      });
    });

    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - 27);
    const days: { key: string; date: Date; count: number }[] = [];
    for (let i = 0; i < 28; i += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const key = date.toISOString().slice(0, 10);
      days.push({ key, date, count: dayMap.get(key) ?? 0 });
    }

    const streaks = days.reduce(
      (acc, day) => {
        if (day.count > 0) {
          acc.current += 1;
          acc.longest = Math.max(acc.longest, acc.current);
        } else {
          acc.current = 0;
        }
        return acc;
      },
      { current: 0, longest: 0 }
    );

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekly = Array.from({ length: 7 }, (_, idx) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + idx);
      const key = date.toISOString().slice(0, 10);
      return { date, count: dayMap.get(key) ?? 0 };
    });

    return { days, streaks, weekly };
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">Progress timeline</CardTitle>
            <Button variant="outline" size="sm">
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                28-day activity
              </p>
              <div className="mt-3 overflow-x-auto">
                <div className="grid min-w-[560px] grid-cols-7 gap-2">
                  {activity.days.map((day) => {
                    const intensity =
                      day.count >= 4 ? "bg-foreground" : day.count >= 2 ? "bg-foreground/60" : "";
                    return (
                      <div
                        key={day.key}
                        className={`h-12 rounded-xl ${
                          day.count === 0 ? "bg-muted" : intensity
                        }`}
                        title={`${day.date.toLocaleDateString()} • ${day.count} updates`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="text-sm text-muted-foreground">Current streak</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold">
                  {activity.streaks.current} days
                </CardContent>
              </Card>
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="text-sm text-muted-foreground">Longest streak</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold">
                  {activity.streaks.longest} days
                </CardContent>
              </Card>
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="text-sm text-muted-foreground">This week</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold">
                  {activity.weekly.reduce((sum, d) => sum + d.count, 0)} updates
                </CardContent>
              </Card>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Weekly summary
              </p>
              <div className="mt-3 space-y-2">
                {activity.weekly.map((day) => (
                  <div key={day.date.toISOString()} className="flex items-center gap-3 text-sm">
                    <span className="w-16 text-muted-foreground">
                      {day.date.toLocaleDateString(undefined, { weekday: "short" })}
                    </span>
                    <div className="h-2 flex-1 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-foreground"
                        style={{ width: `${Math.min(day.count * 20, 100)}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-muted-foreground">{day.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Latest goal updates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {goals.length === 0 && !loading && (
              <p className="text-sm text-muted-foreground">No data yet.</p>
            )}
            {goals.slice(0, 6).map((goal) => (
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
