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
import { toast } from "sonner";
import type { Goal, GoalInput, GoalStatus, ProgressEvent } from "../types/goals";
import { goalsApi } from "../lib/api";

const statusFilters = ["ALL", "ACTIVE", "COMPLETED", "ARCHIVED"] as const;

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const StatusBadge = ({ status }: { status: GoalStatus }) => {
  const styles: Record<GoalStatus, string> = {
    ACTIVE: "bg-blue-50 text-blue-700",
    COMPLETED: "bg-emerald-50 text-emerald-700",
    ARCHIVED: "bg-slate-200 text-slate-600",
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${styles[status]}`}>
      {status}
    </span>
  );
};

const ProgressHistory = ({ events }: { events: ProgressEvent[] }) => {
  if (!events || events.length === 0) {
    return <p className="text-xs text-muted-foreground">No progress events yet.</p>;
  }

  return (
    <div className="space-y-2">
      {events.slice(0, 4).map((event) => (
        <div key={event.id} className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {formatDateTime(event.createdAt)}
          </span>
          <span className="font-semibold">{event.value}%</span>
        </div>
      ))}
    </div>
  );
};

export const Dashboard = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [status, setStatus] = useState<(typeof statusFilters)[number]>("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [formValues, setFormValues] = useState<GoalInput>({
    title: "",
    details: "",
    targetDate: "",
  });
  const [formErrors, setFormErrors] = useState<{ title?: string }>({});

  const loadGoals = async () => {
    try {
      setLoading(true);
      const data = await goalsApi.list();
      setGoals(data);
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
    return goals.filter((goal) => {
      const matchesStatus = status === "ALL" || goal.status === status;
      const matchesSearch =
        goal.title.toLowerCase().includes(search.toLowerCase()) ||
        (goal.details ?? "").toLowerCase().includes(search.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [goals, search, status]);

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

  const handleProgress = async (goal: Goal, value: number) => {
    try {
      await goalsApi.addProgress(goal.id, { value });
      toast.success("Progress updated.");
      await loadGoals();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update progress";
      toast.error(message);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Dashboard</p>
          <h1 className="text-3xl font-semibold">Goals overview</h1>
        </div>
        <Button onClick={openCreate}>New goal</Button>
      </header>

      <Tabs value={status} onValueChange={(value) => setStatus(value as typeof status)}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            {statusFilters.map((tab) => (
              <TabsTrigger key={tab} value={tab}>
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>
          <Input
            placeholder="Search goals"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <TabsContent value={status}>
          {loading && <p className="text-sm text-muted-foreground">Loading goals...</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}

          {!loading && !error && (
            <div className="grid gap-4 lg:grid-cols-2">
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
                      <span>{formatDate(goal.targetDate)}</span>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground">Progress history</p>
                      <ProgressHistory events={goal.progressEvents ?? []} />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {[0, 25, 50, 75, 100].map((value) => (
                        <Button
                          key={value}
                          variant="outline"
                          size="sm"
                          onClick={() => handleProgress(goal, value)}
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
    </div>
  );
};
