import { useEffect, useMemo, useState } from "react";
import { goalsApi } from "../lib/api";
import type { Goal } from "../types/goals";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { toast } from "sonner";

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const endOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);

const formatDateKey = (date: Date) => date.toISOString().slice(0, 10);

const formatMonthLabel = (date: Date) =>
  date.toLocaleDateString(undefined, { month: "long", year: "numeric" });

export const CalendarPage = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthCursor, setMonthCursor] = useState(() => new Date());

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await goalsApi.list();
        setGoals(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load goals";
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const calendarDays = useMemo(() => {
    const start = startOfMonth(monthCursor);
    const end = endOfMonth(monthCursor);
    const days: Date[] = [];
    const startWeekday = start.getDay();
    for (let i = 0; i < startWeekday; i += 1) {
      days.push(new Date(start.getFullYear(), start.getMonth(), i - startWeekday + 1));
    }
    for (let d = 1; d <= end.getDate(); d += 1) {
      days.push(new Date(start.getFullYear(), start.getMonth(), d));
    }
    while (days.length % 7 !== 0) {
      const last = days[days.length - 1];
      days.push(new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1));
    }
    return days;
  }, [monthCursor]);

  const { eventsByDay, goalsByDay } = useMemo(() => {
    const events = new Map<string, number>();
    const goalsDue = new Map<string, Goal[]>();
    goals.forEach((goal) => {
      if (goal.targetDate) {
        const key = formatDateKey(new Date(goal.targetDate));
        goalsDue.set(key, [...(goalsDue.get(key) ?? []), goal]);
      }
      goal.progressEvents?.forEach((event) => {
        const key = formatDateKey(new Date(event.createdAt));
        events.set(key, (events.get(key) ?? 0) + 1);
      });
    });
    return { eventsByDay: events, goalsByDay: goalsDue };
  }, [goals]);

  const weekSummary = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const key = formatDateKey(date);
      return eventsByDay.get(key) ?? 0;
    });
    const total = days.reduce((sum, value) => sum + value, 0);
    return { total, days };
  }, [eventsByDay]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Calendar</p>
        <h1 className="text-3xl font-semibold">Schedule your goals</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_0.9fr]">
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">{formatMonthLabel(monthCursor)}</CardTitle>
              <p className="text-xs text-muted-foreground">Targets and progress activity.</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))
                }
              >
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))
                }
              >
                Next
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="min-w-[720px]">
                <div className="grid grid-cols-7 gap-2 text-xs text-muted-foreground">
                  {dayNames.map((day) => (
                    <div key={day} className="text-center font-semibold uppercase tracking-[0.2em]">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-7 gap-2">
                  {calendarDays.map((date) => {
                    const key = formatDateKey(date);
                    const isCurrentMonth = date.getMonth() === monthCursor.getMonth();
                    const eventCount = eventsByDay.get(key) ?? 0;
                    const dueGoals = goalsByDay.get(key) ?? [];
                    const intensity =
                      eventCount >= 4 ? "bg-foreground" : eventCount >= 2 ? "bg-foreground/60" : "";
                    return (
                      <div
                        key={key}
                        className={`min-h-[96px] rounded-2xl border border-border/60 p-2 text-xs ${
                          isCurrentMonth ? "bg-white/70" : "bg-white/30 text-muted-foreground"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{date.getDate()}</span>
                          {eventCount > 0 && (
                            <span
                              className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[10px] font-semibold text-background ${intensity}`}
                            >
                              {eventCount}
                            </span>
                          )}
                        </div>
                        <div className="mt-2 space-y-1">
                          {dueGoals.slice(0, 2).map((goal) => (
                            <div
                              key={goal.id}
                              className="truncate rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700"
                            >
                              {goal.title}
                            </div>
                          ))}
                          {dueGoals.length > 2 && (
                            <div className="text-[10px] text-muted-foreground">
                              +{dueGoals.length - 2} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            {loading && <p className="mt-4 text-sm text-muted-foreground">Loading...</p>}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">This week</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Progress updates logged: <span className="font-semibold">{weekSummary.total}</span>
              </div>
              <div className="grid grid-cols-7 gap-2">
                {weekSummary.days.map((count, idx) => (
                  <div key={`${idx}-${count}`} className="flex flex-col items-center gap-2">
                    <div
                      className={`h-12 w-full rounded-xl ${
                        count === 0 ? "bg-muted" : count < 2 ? "bg-foreground/40" : "bg-foreground"
                      }`}
                      style={{ opacity: count === 0 ? 0.4 : 1 }}
                    />
                    <span className="text-[10px] text-muted-foreground">{dayNames[idx]}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upcoming targets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                {goals
                  .filter((goal) => goal.targetDate)
                  .sort(
                    (a, b) =>
                      new Date(a.targetDate ?? 0).getTime() - new Date(b.targetDate ?? 0).getTime()
                  )
                  .slice(0, 5)
                  .map((goal) => (
                    <div key={goal.id} className="flex items-center justify-between">
                      <span className="font-medium">{goal.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(goal.targetDate ?? "").toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                {!loading && goals.filter((goal) => goal.targetDate).length === 0 && (
                  <p className="text-sm text-muted-foreground">No targets yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
