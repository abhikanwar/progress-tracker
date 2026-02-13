import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Skeleton } from "../components/ui/skeleton";
import { toast } from "sonner";
import type { Goal, GoalInput, GoalStatus, ProgressEvent, Tag } from "../types/goals";
import { goalsApi } from "../lib/api";
import {
  formatDateInTimezone,
  formatDateTimeInTimezone,
  getDayDifferenceFromTodayInTimezone,
} from "../lib/datetime";
import { settingsStorage } from "../lib/settings";

const statusFilters = ["ALL", "ACTIVE", "COMPLETED", "ARCHIVED"] as const;
const dueFilters = ["ALL", "OVERDUE", "DUE_SOON", "NO_TARGET_DATE"] as const;
const sortOptions = [
  { value: "UPDATED_DESC", label: "Recently updated" },
  { value: "TARGET_ASC", label: "Target date (soonest)" },
  { value: "PROGRESS_DESC", label: "Highest progress" },
  { value: "TITLE_ASC", label: "Title (A-Z)" },
] as const;
type SortOption = (typeof sortOptions)[number]["value"];

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

const StatusBadge = ({ status }: { status: GoalStatus }) => {
  const styles: Record<GoalStatus, string> = {
    ACTIVE: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200",
    COMPLETED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200",
    ARCHIVED: "bg-slate-200 text-slate-600 dark:bg-slate-500/20 dark:text-slate-200",
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${styles[status]}`}>
      {status}
    </span>
  );
};

const DueBadge = ({
  goal,
  timezone,
}: {
  goal: Pick<Goal, "status" | "targetDate">;
  timezone: string;
}) => {
  const state = getDueState(goal, timezone);
  if (!state) return null;

  const config =
    state === "OVERDUE"
      ? { label: "Overdue", style: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-200" }
      : {
          label: "Due this week",
          style: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200",
        };

  return (
    <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${config.style}`}>
      {config.label}
    </span>
  );
};

const ProgressHistory = ({ events, timezone }: { events: ProgressEvent[]; timezone: string }) => {
  if (!events || events.length === 0) {
    return <p className="text-xs text-muted-foreground">No progress events yet.</p>;
  }

  return (
    <div className="max-h-28 space-y-2 overflow-y-auto pr-1">
      {events.map((event) => (
        <div key={event.id} className="rounded-lg border border-border/60 p-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              {formatDateTimeInTimezone(event.createdAt, timezone)}
            </span>
            <span className="font-semibold">{event.value}%</span>
          </div>
          {event.note && <p className="mt-1 text-muted-foreground">{event.note}</p>}
        </div>
      ))}
    </div>
  );
};

export const Dashboard = () => {
  const timezone = settingsStorage.getResolvedTimezone();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [status, setStatus] = useState<(typeof statusFilters)[number]>("ALL");
  const [dueFilter, setDueFilter] = useState<(typeof dueFilters)[number]>("ALL");
  const [search, setSearch] = useState("");
  const [selectedTagId, setSelectedTagId] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>("UPDATED_DESC");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);
  const [progressGoal, setProgressGoal] = useState<Goal | null>(null);
  const [progressValue, setProgressValue] = useState<number>(0);
  const [progressNote, setProgressNote] = useState("");
  const [milestoneDrafts, setMilestoneDrafts] = useState<Record<string, string>>({});
  const [tagDrafts, setTagDrafts] = useState<Record<string, string>>({});
  const [formValues, setFormValues] = useState<GoalInput>({
    title: "",
    details: "",
    targetDate: "",
  });
  const [formErrors, setFormErrors] = useState<{ title?: string }>({});

  const loadGoals = async () => {
    try {
      setLoading(true);
      const [goalsData, tagsData] = await Promise.all([goalsApi.list(), goalsApi.listTags()]);
      setGoals(goalsData);
      setTags(tagsData);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load goals";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadGoals();
  }, []);

  const filteredGoals = useMemo(() => {
    const filtered = goals.filter((goal) => {
      const matchesStatus = status === "ALL" || goal.status === status;
      const dueState = getDueState(goal, timezone);
      const matchesDueFilter =
        dueFilter === "ALL" ||
        (dueFilter === "OVERDUE" && dueState === "OVERDUE") ||
        (dueFilter === "DUE_SOON" && dueState === "DUE_SOON") ||
        (dueFilter === "NO_TARGET_DATE" && !goal.targetDate);
      const matchesSearch =
        goal.title.toLowerCase().includes(search.toLowerCase()) ||
        (goal.details ?? "").toLowerCase().includes(search.toLowerCase());
      const matchesTag =
        selectedTagId === "ALL" || goal.goalTags?.some((goalTag) => goalTag.tagId === selectedTagId);
      return matchesStatus && matchesDueFilter && matchesSearch && matchesTag;
    });

    return filtered.sort((a, b) => {
      if (sortBy === "TITLE_ASC") {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === "PROGRESS_DESC") {
        return b.currentProgress - a.currentProgress;
      }
      if (sortBy === "TARGET_ASC") {
        const aDate = a.targetDate ? new Date(a.targetDate).getTime() : Number.POSITIVE_INFINITY;
        const bDate = b.targetDate ? new Date(b.targetDate).getTime() : Number.POSITIVE_INFINITY;
        return aDate - bDate;
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [dueFilter, goals, search, selectedTagId, sortBy, status, timezone]);

  const weeklyPlan = useMemo(() => {
    const activeGoals = goals.filter((goal) => goal.status === "ACTIVE");

    const getPriorityScore = (goal: Goal) => {
      let score = 0;
      const dueState = getDueState(goal, timezone);
      if (dueState === "OVERDUE") score += 100;
      if (dueState === "DUE_SOON") score += 50;
      score += Math.max(0, 100 - goal.currentProgress);
      return score;
    };

    const topThree = [...activeGoals]
      .sort((a, b) => getPriorityScore(b) - getPriorityScore(a))
      .slice(0, 3)
      .map((goal) => {
        const dueState = getDueState(goal, timezone);
        return {
          goal,
          hint:
            dueState === "OVERDUE"
              ? "Overdue"
              : dueState === "DUE_SOON"
                ? "Due this week"
                : `${goal.currentProgress}% complete`,
        };
      });

    const carryOver = activeGoals
      .filter((goal) => getDueState(goal, timezone) === "OVERDUE")
      .slice(0, 4)
      .map((goal) => ({
        goal,
        hint: goal.targetDate
          ? `Was due ${formatDateInTimezone(goal.targetDate, timezone)}`
          : "No target date",
      }));

    const needsAttention = activeGoals
      .filter((goal) => {
        const latestEvent = goal.progressEvents?.[0];
        if (!latestEvent) return true;
        const dayDiff = getDayDifferenceFromTodayInTimezone(latestEvent.createdAt, timezone);
        return dayDiff !== null && dayDiff <= -7;
      })
      .slice(0, 4)
      .map((goal) => ({
        goal,
        hint: goal.progressEvents?.[0]
          ? `Last update: ${formatDateInTimezone(goal.progressEvents[0].createdAt, timezone)}`
          : "No progress update yet",
      }));

    return { topThree, carryOver, needsAttention };
  }, [goals, timezone]);

  const openCreate = () => {
    setEditingGoal(null);
    setFormErrors({});
    setFormValues({ title: "", details: "", targetDate: "" });
    setDialogOpen(true);
  };

  const openEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setFormErrors({});
    setFormValues({
      title: goal.title,
      details: goal.details ?? "",
      targetDate: goal.targetDate ? goal.targetDate.slice(0, 10) : "",
    });
    setDialogOpen(true);
  };

  const validate = () => {
    const errors: { title?: string } = {};
    if (!formValues.title.trim()) {
      errors.title = "Title is required.";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    const payload: GoalInput = {
      title: formValues.title.trim(),
      details: formValues.details?.trim() || undefined,
      targetDate: formValues.targetDate
        ? new Date(formValues.targetDate).toISOString()
        : undefined,
    };

    try {
      if (editingGoal) {
        await goalsApi.update(editingGoal.id, payload);
        toast.success("Goal updated.");
      } else {
        await goalsApi.create(payload);
        toast.success("Goal created.");
      }
      setDialogOpen(false);
      await loadGoals();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save goal";
      toast.error(message);
    }
  };

  const handleDelete = async (goal: Goal) => {
    try {
      await goalsApi.remove(goal.id);
      toast.success("Goal deleted.");
      await loadGoals();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete goal";
      toast.error(message);
    }
  };

  const openProgressDialog = (goal: Goal, value: number) => {
    setProgressGoal(goal);
    setProgressValue(value);
    setProgressNote("");
    setProgressDialogOpen(true);
  };

  const handleProgressSubmit = async () => {
    if (!progressGoal) return;

    try {
      await goalsApi.addProgress(progressGoal.id, {
        value: progressValue,
        note: progressNote.trim() || undefined,
      });
      toast.success("Progress updated.");
      setProgressDialogOpen(false);
      setProgressGoal(null);
      await loadGoals();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update progress";
      toast.error(message);
    }
  };

  const handleMilestoneCreate = async (goal: Goal) => {
    const title = (milestoneDrafts[goal.id] ?? "").trim();
    if (!title) return;

    try {
      await goalsApi.addMilestone(goal.id, { title });
      setMilestoneDrafts((prev) => ({ ...prev, [goal.id]: "" }));
      toast.success("Milestone added.");
      await loadGoals();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add milestone";
      toast.error(message);
    }
  };

  const handleMilestoneToggle = async (
    goalId: string,
    milestoneId: string,
    completed: boolean
  ) => {
    try {
      await goalsApi.updateMilestone(goalId, milestoneId, { completed });
      await loadGoals();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update milestone";
      toast.error(message);
    }
  };

  const handleMilestoneDelete = async (goalId: string, milestoneId: string) => {
    try {
      await goalsApi.removeMilestone(goalId, milestoneId);
      toast.success("Milestone removed.");
      await loadGoals();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to remove milestone";
      toast.error(message);
    }
  };

  const handleTagCreate = async (goal: Goal) => {
    const tagName = (tagDrafts[goal.id] ?? "").trim();
    if (!tagName) return;
    try {
      await goalsApi.addTag(goal.id, tagName);
      setTagDrafts((prev) => ({ ...prev, [goal.id]: "" }));
      toast.success("Tag added.");
      await loadGoals();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add tag";
      toast.error(message);
    }
  };

  const handleTagDelete = async (goalId: string, tagId: string) => {
    try {
      await goalsApi.removeTag(goalId, tagId);
      toast.success("Tag removed.");
      await loadGoals();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to remove tag";
      toast.error(message);
    }
  };

  return (
    <div className="flex h-full flex-col gap-6 overflow-hidden motion-enter">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="page-kicker">Focus</p>
          <h1 className="page-title">Weekly execution</h1>
        </div>
        <Button onClick={openCreate}>New goal</Button>
      </header>

      <Card className="motion-enter">
        <CardHeader>
          <CardTitle className="section-title">Weekly planning</CardTitle>
          <CardDescription>
            Clear weekly snapshot of what to do now.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {loading && (
            <>
              <div className="space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </>
          )}
          {!loading && (
            <>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Top 3 this week ({weeklyPlan.topThree.length})
            </p>
            {weeklyPlan.topThree.length === 0 && (
              <p className="text-sm text-muted-foreground">No active goals yet.</p>
            )}
            {weeklyPlan.topThree.map(({ goal, hint }) => (
              <div key={goal.id} className="rounded-lg border border-border/60 p-2 text-sm">
                <p className="font-medium">{goal.title}</p>
                <p className="text-xs text-muted-foreground">{hint}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Carry-over ({weeklyPlan.carryOver.length})
            </p>
            {weeklyPlan.carryOver.length === 0 && (
              <p className="text-sm text-muted-foreground">No carry-over items.</p>
            )}
            {weeklyPlan.carryOver.map(({ goal, hint }) => (
              <div key={goal.id} className="rounded-lg border border-border/60 p-2 text-sm">
                <p className="font-medium">{goal.title}</p>
                <p className="text-xs text-red-600">{hint}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Needs attention ({weeklyPlan.needsAttention.length})
            </p>
            {weeklyPlan.needsAttention.length === 0 && (
              <p className="text-sm text-muted-foreground">Everything is in motion.</p>
            )}
            {weeklyPlan.needsAttention.map(({ goal, hint }) => (
              <div key={goal.id} className="rounded-lg border border-border/60 p-2 text-sm">
                <p className="font-medium">{goal.title}</p>
                <p className="text-xs text-muted-foreground">{hint}</p>
              </div>
            ))}
          </div>
            </>
          )}
        </CardContent>
      </Card>

      <Tabs
        value={status}
        onValueChange={(value) => setStatus(value as typeof status)}
        className="flex h-full flex-1 flex-col"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            {statusFilters.map((tab) => (
              <TabsTrigger key={tab} value={tab}>
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="flex flex-wrap items-center gap-2">
            {dueFilters.map((filter) => (
              <Button
                key={filter}
                type="button"
                variant={dueFilter === filter ? "default" : "outline"}
                size="sm"
                onClick={() => setDueFilter(filter)}
              >
                {filter === "ALL"
                  ? "All dates"
                  : filter === "OVERDUE"
                    ? "Overdue"
                    : filter === "DUE_SOON"
                      ? "Due this week"
                      : "No target date"}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedTagId}
              onChange={(event) => setSelectedTagId(event.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="ALL">All tags</option>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortOption)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Input
              placeholder="Search goals"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        <TabsContent value={status} className="flex-1 min-h-0">
          {loading && (
            <div className="grid gap-4 lg:grid-cols-2 stagger-children">
              {Array.from({ length: 4 }, (_, idx) => (
                <Card key={`goal-skeleton-${idx}`}>
                  <CardHeader>
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="mt-2 h-4 w-5/6" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-8 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}

          {!loading && !error && (
            <div className="flex h-full min-h-0 flex-1">
              <div className="h-full w-full overflow-y-auto pr-1">
                <div className="grid gap-4 lg:grid-cols-2 stagger-children">
                  {filteredGoals.length === 0 && (
                    <Card>
                      <CardContent className="p-6 text-sm text-muted-foreground">
                        No goals yet. Create your first goal.
                      </CardContent>
                    </Card>
                  )}

                  {filteredGoals.map((goal) => (
                    <Card key={goal.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <CardTitle>{goal.title}</CardTitle>
                            <CardDescription>{goal.details || "No details yet."}</CardDescription>
                          </div>
                          <StatusBadge status={goal.status} />
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Progress</span>
                            <span>{goal.currentProgress}%</span>
                          </div>
                          <div className="mt-2 h-2 w-full rounded-full bg-muted">
                            <div
                              className="h-2 rounded-full bg-foreground"
                              style={{ width: `${goal.currentProgress}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Target date</span>
                          <div className="flex items-center gap-2">
                            <span>
                              {goal.targetDate
                                ? formatDateInTimezone(goal.targetDate, timezone)
                                : "—"}
                            </span>
                            <DueBadge goal={goal} timezone={timezone} />
                          </div>
                        </div>

                        <div>
                          <p className="text-xs text-muted-foreground">Progress history</p>
                          <ProgressHistory events={goal.progressEvents ?? []} timezone={timezone} />
                        </div>

                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">Milestones</p>
                          <div className="space-y-2">
                            {(goal.milestones ?? []).map((milestone) => (
                              <div
                                key={milestone.id}
                                className="flex items-center justify-between gap-2 rounded-md border border-border/60 p-2 text-xs"
                              >
                                <label className="flex min-w-0 flex-1 items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={milestone.completed}
                                    onChange={(event) =>
                                      handleMilestoneToggle(
                                        goal.id,
                                        milestone.id,
                                        event.target.checked
                                      )
                                    }
                                  />
                                  <span
                                    className={`truncate ${
                                      milestone.completed ? "text-muted-foreground line-through" : ""
                                    }`}
                                  >
                                    {milestone.title}
                                  </span>
                                </label>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleMilestoneDelete(goal.id, milestone.id)}
                                >
                                  Remove
                                </Button>
                              </div>
                            ))}
                            {(goal.milestones ?? []).length === 0 && (
                              <p className="text-xs text-muted-foreground">
                                No milestones yet. Add one below.
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <Input
                              placeholder="Add milestone"
                              value={milestoneDrafts[goal.id] ?? ""}
                              onChange={(event) =>
                                setMilestoneDrafts((prev) => ({
                                  ...prev,
                                  [goal.id]: event.target.value,
                                }))
                              }
                            />
                            <Button size="sm" onClick={() => handleMilestoneCreate(goal)}>
                              Add
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">Tags</p>
                          <div className="flex flex-wrap items-center gap-2">
                            {(goal.goalTags ?? []).map((goalTag) => (
                              <span
                                key={goalTag.id}
                                className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs"
                              >
                                {goalTag.tag.name}
                                <button
                                  type="button"
                                  className="text-muted-foreground hover:text-foreground"
                                  onClick={() => handleTagDelete(goal.id, goalTag.tagId)}
                                >
                                  x
                                </button>
                              </span>
                            ))}
                            {(goal.goalTags ?? []).length === 0 && (
                              <p className="text-xs text-muted-foreground">No tags yet.</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              placeholder="Add tag (e.g. fitness)"
                              value={tagDrafts[goal.id] ?? ""}
                              onChange={(event) =>
                                setTagDrafts((prev) => ({
                                  ...prev,
                                  [goal.id]: event.target.value,
                                }))
                              }
                            />
                            <Button size="sm" onClick={() => handleTagCreate(goal)}>
                              Add
                            </Button>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {[0, 25, 50, 75, 100].map((value) => (
                            <Button
                              key={value}
                              variant="outline"
                              size="sm"
                              onClick={() => openProgressDialog(goal, value)}
                            >
                              {value}%
                            </Button>
                          ))}
                        </div>
                      </CardContent>
                      <div className="flex items-center justify-between px-4 pb-4">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(goal)}>
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(goal)}>
                          Delete
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingGoal ? "Edit goal" : "Create goal"}</DialogTitle>
            <DialogDescription>
              {editingGoal
                ? "Update the details of your goal."
                : "Add a new goal to track."}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 grid gap-4">
            <div className="grid gap-2">
              <Label>Title</Label>
              <Input
                value={formValues.title}
                onChange={(event) =>
                  setFormValues((prev) => ({ ...prev, title: event.target.value }))
                }
              />
              {formErrors.title && (
                <p className="text-xs text-red-600">{formErrors.title}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label>Details</Label>
              <Textarea
                value={formValues.details}
                onChange={(event) =>
                  setFormValues((prev) => ({ ...prev, details: event.target.value }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label>Target date</Label>
              <Input
                type="date"
                value={formValues.targetDate}
                onChange={(event) =>
                  setFormValues((prev) => ({ ...prev, targetDate: event.target.value }))
                }
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>{editingGoal ? "Save" : "Create"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={progressDialogOpen} onOpenChange={setProgressDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log progress</DialogTitle>
            <DialogDescription>
              {progressGoal ? `Add a progress update for "${progressGoal.title}".` : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 grid gap-4">
            <div className="grid gap-2">
              <Label>Progress value</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={progressValue}
                onChange={(event) =>
                  setProgressValue(
                    Math.max(0, Math.min(100, Number.parseInt(event.target.value || "0", 10)))
                  )
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>Note (optional)</Label>
              <Textarea
                placeholder="What did you complete today?"
                value={progressNote}
                onChange={(event) => setProgressNote(event.target.value)}
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setProgressDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleProgressSubmit}>Save update</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
