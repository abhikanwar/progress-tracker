import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { goalsApi } from "../lib/api";
import type { Goal } from "../types/goals";
import { useEffect, useMemo, useState } from "react";
import { Button } from "../components/ui/button";
import {
  formatDateInTimezone,
  getDateKeyInTimezone,
  getDayDifferenceFromTodayInTimezone,
} from "../lib/datetime";
import { settingsStorage } from "../lib/settings";
import { Skeleton } from "../components/ui/skeleton";

export const Analytics = () => {
  const timezone = settingsStorage.getResolvedTimezone();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [presentationMode, setPresentationMode] = useState(false);

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
    const archived = goals.filter((g) => g.status === "ARCHIVED").length;
    const avgProgress = total
      ? Math.round(goals.reduce((sum, g) => sum + g.currentProgress, 0) / total)
      : 0;
    return { total, completed, active, archived, avgProgress };
  }, [goals]);

  const activity = useMemo(() => {
    const dayMap = new Map<string, number>();
    goals.forEach((goal) => {
      goal.progressEvents?.forEach((event) => {
        const key = getDateKeyInTimezone(event.createdAt, timezone);
        if (!key) return;
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
      const key = getDateKeyInTimezone(date, timezone) ?? "";
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
      const key = getDateKeyInTimezone(date, timezone) ?? "";
      return { date, count: dayMap.get(key) ?? 0 };
    });

    return { days, streaks, weekly };
  }, [goals, timezone]);

  const executive = useMemo(() => {
    const isOverdue = (goal: Goal) => {
      const diff = getDayDifferenceFromTodayInTimezone(goal.targetDate ?? "", timezone);
      return diff !== null && diff < 0;
    };

    const activeGoals = goals.filter((goal) => goal.status === "ACTIVE");
    const overdue = activeGoals.filter((goal) => goal.targetDate && isOverdue(goal)).length;
    const atRisk = overdue;
    const onTrack = Math.max(activeGoals.length - atRisk, 0);
    const completionRate = summary.total
      ? Math.round((summary.completed / summary.total) * 100)
      : 0;

    const rollingCurrent = activity.days.slice(-7).reduce((sum, day) => sum + day.count, 0);
    const rollingPrevious = activity.days
      .slice(-14, -7)
      .reduce((sum, day) => sum + day.count, 0);

    const percentDelta = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const currentWeekKeys = new Set(activity.days.slice(-7).map((day) => day.key));
    const previousWeekKeys = new Set(activity.days.slice(-14, -7).map((day) => day.key));

    const completedThisWeek = goals.filter((goal) => {
      if (goal.status !== "COMPLETED") return false;
      const key = getDateKeyInTimezone(goal.updatedAt, timezone);
      return key ? currentWeekKeys.has(key) : false;
    }).length;

    const completedLastWeek = goals.filter((goal) => {
      if (goal.status !== "COMPLETED") return false;
      const key = getDateKeyInTimezone(goal.updatedAt, timezone);
      return key ? previousWeekKeys.has(key) : false;
    }).length;

    const momentumScore = Math.min(
      100,
      Math.round(
        rollingCurrent * 8 + activity.streaks.current * 4 + Math.round(completionRate * 0.4)
      )
    );

    return {
      overdue,
      atRisk,
      onTrack,
      completionRate,
      rollingCurrent,
      rollingPrevious,
      updatesDelta: percentDelta(rollingCurrent, rollingPrevious),
      completedThisWeek,
      completedLastWeek,
      completedDelta: percentDelta(completedThisWeek, completedLastWeek),
      momentumScore,
    };
  }, [activity.days, activity.streaks.current, goals, summary.completed, summary.total, timezone]);

  const donutStyle = useMemo(() => {
    const total = executive.onTrack + executive.atRisk + summary.completed;
    if (total === 0) {
      return { background: "conic-gradient(#e2e8f0 0deg 360deg)" };
    }

    const completedDeg = (summary.completed / total) * 360;
    const onTrackDeg = (executive.onTrack / total) * 360;
    const atRiskDeg = (executive.atRisk / total) * 360;
    return {
      background: `conic-gradient(
        #10b981 0deg ${completedDeg}deg,
        #3b82f6 ${completedDeg}deg ${completedDeg + onTrackDeg}deg,
        #ef4444 ${completedDeg + onTrackDeg}deg ${completedDeg + onTrackDeg + atRiskDeg}deg
      )`,
    };
  }, [executive.atRisk, executive.onTrack, summary.completed]);

  return (
    <div className="space-y-6 motion-enter">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="page-kicker">Analytics</p>
          <h1 className="page-title">Executive snapshot</h1>
        </div>
        <Button
          variant={presentationMode ? "default" : "outline"}
          size="sm"
          onClick={() => setPresentationMode((prev) => !prev)}
        >
          {presentationMode ? "Presentation mode on" : "Presentation mode"}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 stagger-children">
        {[
          { label: "On track", value: executive.onTrack },
          { label: "At risk", value: executive.atRisk },
          { label: "Completion rate", value: `${executive.completionRate}%` },
          { label: "Momentum score", value: executive.momentumScore },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">{stat.label}</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {loading ? <Skeleton className="h-8 w-20" /> : stat.value}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.9fr] stagger-children">
        <Card>
          <CardHeader>
            <CardTitle className="section-title">Week-over-week performance</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border/70 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Updates</p>
              <p className="mt-2 text-3xl font-semibold">
                {loading ? <Skeleton className="h-8 w-24" /> : executive.rollingCurrent}
              </p>
              <p className="text-xs text-muted-foreground">
                Last 7 days vs previous 7 days: {executive.updatesDelta >= 0 ? "+" : ""}
                {executive.updatesDelta}%
              </p>
            </div>
            <div className="rounded-xl border border-border/70 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Goals completed
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {loading ? <Skeleton className="h-8 w-24" /> : executive.completedThisWeek}
              </p>
              <p className="text-xs text-muted-foreground">
                Last 7 days vs previous 7 days: {executive.completedDelta >= 0 ? "+" : ""}
                {executive.completedDelta}%
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="section-title">Status distribution</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-6">
            {loading ? (
              <Skeleton className="h-32 w-32 rounded-full" />
            ) : (
              <div className="relative h-32 w-32 rounded-full" style={donutStyle}>
                <div className="absolute inset-4 grid place-items-center rounded-full bg-card text-xs font-medium">
                  {summary.total}
                </div>
              </div>
            )}
            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                Completed: {summary.completed}
              </p>
              <p className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                On track: {executive.onTrack}
              </p>
              <p className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                At risk: {executive.atRisk}
              </p>
              <p className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                Archived: {summary.archived}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="section-title">Progress timeline</CardTitle>
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
                <div className="grid min-w-0 grid-cols-7 gap-1.5 sm:gap-2">
                  {activity.days.map((day) => {
                    const intensity =
                      day.count >= 4 ? "bg-foreground" : day.count >= 2 ? "bg-foreground/60" : "";
                    return (
                      <div
                        key={day.key}
                        className={`h-9 rounded-lg sm:h-12 sm:rounded-xl ${
                          day.count === 0 ? "bg-muted" : intensity
                        }`}
                        title={`${formatDateInTimezone(day.date, timezone)} • ${day.count} updates`}
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

            {!presentationMode && (
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Weekly summary
                </p>
                <div className="mt-3 space-y-2">
                  {activity.weekly.map((day) => (
                    <div key={day.date.toISOString()} className="flex items-center gap-2 text-xs sm:gap-3 sm:text-sm">
                      <span className="w-12 text-muted-foreground sm:w-16">
                        {formatDateInTimezone(day.date, timezone, { weekday: "short" })}
                      </span>
                      <div className="h-2 flex-1 rounded-full bg-muted">
                        <div
                          className="h-2 rounded-full bg-foreground"
                          style={{ width: `${Math.min(day.count * 20, 100)}%` }}
                        />
                      </div>
                      <span className="w-6 text-right text-muted-foreground sm:w-8">{day.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {!presentationMode && (
        <Card>
          <CardHeader>
            <CardTitle className="section-title">Latest goal updates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {loading &&
                Array.from({ length: 4 }, (_, idx) => (
                  <div key={`analytics-updates-skeleton-${idx}`} className="rounded-xl border border-border p-3">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="mt-2 h-3 w-1/2" />
                  </div>
                ))}
              {goals.length === 0 && !loading && (
                <p className="text-sm text-muted-foreground">No data yet.</p>
              )}
              {!loading &&
                goals.slice(0, 6).map((goal) => (
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
      )}
    </div>
  );
};
