import { useEffect, useMemo, useState } from "react";
import { goalsApi } from "../lib/api";
import type { Goal } from "../types/goals";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import {
  formatDateInTimezone,
  getDateKeyInTimezone,
  getDayDifferenceFromTodayInTimezone,
} from "../lib/datetime";
import { settingsStorage } from "../lib/settings";
import { Skeleton } from "../components/ui/skeleton";

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const endOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);

const formatDateKey = (date: Date, timezone: string) => getDateKeyInTimezone(date, timezone) ?? "";

const formatMonthLabel = (date: Date, timezone: string) =>
  formatDateInTimezone(date, timezone, { month: "long", year: "numeric", day: undefined });

const getDueState = (
  goal: Pick<Goal, "status" | "targetDate">,
  timezone: string
): "OVERDUE" | "DUE_SOON" | null => {
  if (!goal.targetDate || goal.status !== "ACTIVE") return null;
  const diffDays = getDayDifferenceFromTodayInTimezone(goal.targetDate, timezone);
  if (diffDays === null) return null;

  if (diffDays < 0) return "OVERDUE";
  if (diffDays <= 7) return "DUE_SOON";
  return null;
};

export const CalendarPage = () => {
  const timezone = settingsStorage.getResolvedTimezone();
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
        const key = formatDateKey(new Date(goal.targetDate), timezone);
        goalsDue.set(key, [...(goalsDue.get(key) ?? []), goal]);
      }
      goal.progressEvents?.forEach((event) => {
        const key = formatDateKey(new Date(event.createdAt), timezone);
        events.set(key, (events.get(key) ?? 0) + 1);
      });
    });
    return { eventsByDay: events, goalsByDay: goalsDue };
  }, [goals, timezone]);

  const weekSummary = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const key = formatDateKey(date, timezone);
      return eventsByDay.get(key) ?? 0;
    });
    const total = days.reduce((sum, value) => sum + value, 0);
    return { total, days };
  }, [eventsByDay, timezone]);

  return (
    <div className="space-y-6 motion-enter">
      <div>
        <p className="page-kicker">Calendar</p>
        <h1 className="page-title">Schedule your goals</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_0.9fr] stagger-children">
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="section-title">{formatMonthLabel(monthCursor, timezone)}</CardTitle>
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
            <div>
              <div className="grid grid-cols-7 gap-1 text-[10px] text-muted-foreground sm:gap-2 sm:text-xs">
                {dayNames.map((day) => (
                  <div
                    key={day}
                    className="text-center font-semibold uppercase tracking-[0.08em] sm:tracking-[0.2em]"
                  >
                    {day}
                  </div>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-7 gap-1 sm:mt-3 sm:gap-2">
                {calendarDays.map((date) => {
                  const key = formatDateKey(date, timezone);
                  const isCurrentMonth = date.getMonth() === monthCursor.getMonth();
                  const eventCount = eventsByDay.get(key) ?? 0;
                  const dueGoals = goalsByDay.get(key) ?? [];
                  const intensity =
                    eventCount >= 4 ? "bg-foreground" : eventCount >= 2 ? "bg-foreground/60" : "";
                  return (
                    <div
                      key={key}
                      className={`min-h-[72px] rounded-lg border border-border/60 p-1 text-[10px] sm:min-h-[96px] sm:rounded-2xl sm:p-2 sm:text-xs ${
                        isCurrentMonth ? "bg-card/70" : "bg-muted/30 text-muted-foreground"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{date.getDate()}</span>
                        {eventCount > 0 && (
                          <span
                            className={`inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-semibold text-background sm:h-5 sm:min-w-[20px] sm:text-[10px] ${intensity}`}
                          >
                            {eventCount}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 space-y-1 sm:mt-2">
                        {dueGoals.slice(0, 2).map((goal, idx) => (
                          <div
                            key={goal.id}
                            className={`truncate rounded-full px-1.5 py-0.5 text-[9px] font-semibold sm:px-2 sm:text-[10px] ${
                              idx === 1 ? "hidden sm:block" : ""
                            } ${
                              getDueState(goal, timezone) === "OVERDUE"
                                ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-200"
                                : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200"
                            }`}
                          >
                            {goal.title}
                          </div>
                        ))}
                        {dueGoals.length > 1 && (
                          <div className="text-[9px] text-muted-foreground sm:hidden">
                            +{dueGoals.length - 1}
                          </div>
                        )}
                        {dueGoals.length > 2 && (
                          <div className="hidden text-[10px] text-muted-foreground sm:block">
                            +{dueGoals.length - 2} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {loading && (
              <div className="mt-4 grid gap-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="section-title">This week</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Progress updates logged:{" "}
                <span className="font-semibold">{loading ? "—" : weekSummary.total}</span>
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
              <CardTitle className="section-title">Upcoming targets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                {loading &&
                  Array.from({ length: 3 }, (_, idx) => (
                    <div key={`calendar-target-skeleton-${idx}`} className="flex items-center justify-between">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  ))}
                {goals
                  .filter((goal) => goal.targetDate && goal.status === "ACTIVE")
                  .sort(
                    (a, b) =>
                      new Date(a.targetDate ?? 0).getTime() - new Date(b.targetDate ?? 0).getTime()
                  )
                  .slice(0, 5)
                  .filter(() => !loading)
                  .map((goal) => (
                    <div key={goal.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{goal.title}</span>
                        {getDueState(goal, timezone) && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              getDueState(goal, timezone) === "OVERDUE"
                                ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-200"
                                : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200"
                            }`}
                          >
                            {getDueState(goal, timezone) === "OVERDUE" ? "Overdue" : "Due this week"}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {goal.targetDate ? formatDateInTimezone(goal.targetDate, timezone) : "—"}
                      </span>
                    </div>
                  ))}
                {!loading &&
                  goals.filter((goal) => goal.targetDate && goal.status === "ACTIVE").length ===
                    0 && (
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
