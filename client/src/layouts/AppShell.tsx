import { Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "../components/sidebar/Sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger, useSidebar } from "../components/ui/sidebar";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { goalsApi } from "../lib/api";
import { toast } from "sonner";
import { useGoalsListQuery } from "../hooks/queries/useGoalsQueries";
import { queryKeys } from "../lib/queryKeys";

const MobileQuickActions = () => {
  const { isMobile } = useSidebar();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [action, setAction] = useState<"goal" | "progress" | "milestone">("goal");
  const goalsQuery = useGoalsListQuery();
  const goals = (goalsQuery.data ?? []).filter((goal) => goal.status === "ACTIVE");
  const loadingGoals = goalsQuery.isLoading;
  const [selectedGoalId, setSelectedGoalId] = useState("");
  const [goalTitle, setGoalTitle] = useState("");
  const [progressValue, setProgressValue] = useState(10);
  const [progressNote, setProgressNote] = useState("");
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pulseKey, setPulseKey] = useState<"goal" | "progress" | "milestone" | null>(null);

  useEffect(() => {
    if (!dialogOpen || !isMobile) return;
    setSelectedGoalId((prev) => prev || goals[0]?.id || "");
  }, [dialogOpen, goals, isMobile]);

  if (!isMobile) return null;

  const openAction = (type: "goal" | "progress" | "milestone") => {
    setAction(type);
    setDialogOpen(true);
  };

  const triggerPulse = (key: "goal" | "progress" | "milestone") => {
    setPulseKey(key);
    setTimeout(() => {
      setPulseKey((prev) => (prev === key ? null : prev));
    }, 220);
  };

  const submit = async () => {
    try {
      setSubmitting(true);
      if (action === "goal") {
        const title = goalTitle.trim();
        if (!title) {
          toast.error("Goal title is required.");
          return;
        }
        setDialogOpen(false);
        await goalsApi.create({ title });
        void queryClient.invalidateQueries({ queryKey: queryKeys.goals.list() });
        setGoalTitle("");
        toast.success("Priority added.");
        triggerPulse("goal");
      }

      if (action === "progress") {
        if (!selectedGoalId) {
          toast.error("Select a goal first.");
          return;
        }
        setDialogOpen(false);
        await goalsApi.addProgress(selectedGoalId, {
          value: Math.max(0, Math.min(100, progressValue)),
          note: progressNote.trim() || undefined,
        });
        void queryClient.invalidateQueries({ queryKey: queryKeys.goals.list() });
        setProgressNote("");
        toast.success("Progress logged.");
        triggerPulse("progress");
      }

      if (action === "milestone") {
        const title = milestoneTitle.trim();
        if (!selectedGoalId) {
          toast.error("Select a goal first.");
          return;
        }
        if (!title) {
          toast.error("Milestone title is required.");
          return;
        }
        setDialogOpen(false);
        await goalsApi.addMilestone(selectedGoalId, { title });
        void queryClient.invalidateQueries({ queryKey: queryKeys.goals.list() });
        setMilestoneTitle("");
        toast.success("Milestone added.");
        triggerPulse("milestone");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Action failed";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-x-0 bottom-4 z-40 px-4 md:hidden">
        <Card className="mx-auto max-w-md">
          <CardContent className="grid grid-cols-3 gap-2 p-2">
            <Button size="sm" onClick={() => openAction("goal")}>
              <span className={pulseKey === "goal" ? "pulse-pop" : ""}>+ Goal</span>
            </Button>
            <Button size="sm" variant="outline" onClick={() => openAction("progress")}>
              <span className={pulseKey === "progress" ? "pulse-pop" : ""}>+ Progress</span>
            </Button>
            <Button size="sm" variant="outline" onClick={() => openAction("milestone")}>
              <span className={pulseKey === "milestone" ? "pulse-pop" : ""}>+ Milestone</span>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === "goal"
                ? "Add Priority"
                : action === "progress"
                  ? "Log Progress"
                  : "Add Milestone"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-3">
            {action === "goal" && (
              <div className="grid gap-2">
                <Label>Title</Label>
                <Input
                  placeholder="What needs focus?"
                  value={goalTitle}
                  onChange={(event) => setGoalTitle(event.target.value)}
                />
              </div>
            )}

            {(action === "progress" || action === "milestone") && (
              <div className="grid gap-2">
                <Label>Goal</Label>
                <select
                  value={selectedGoalId}
                  onChange={(event) => setSelectedGoalId(event.target.value)}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {loadingGoals && <option>Loading...</option>}
                  {!loadingGoals && goals.length === 0 && <option value="">No active goals</option>}
                  {!loadingGoals &&
                    goals.map((goal) => (
                      <option key={goal.id} value={goal.id}>
                        {goal.title}
                      </option>
                    ))}
                </select>
              </div>
            )}

            {action === "progress" && (
              <>
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
                    value={progressNote}
                    onChange={(event) => setProgressNote(event.target.value)}
                    placeholder="What did you complete?"
                  />
                </div>
              </>
            )}

            {action === "milestone" && (
              <div className="grid gap-2">
                <Label>Milestone</Label>
                <Input
                  placeholder="New milestone title"
                  value={milestoneTitle}
                  onChange={(event) => setMilestoneTitle(event.target.value)}
                />
              </div>
            )}

            <div className="flex justify-end">
              <Button
                onClick={submit}
                disabled={submitting}
                aria-busy={submitting}
                className={pulseKey === action ? "pulse-pop" : ""}
              >
                {submitting ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export const AppShell = () => {
  return (
    <SidebarProvider defaultOpen>
      <Sidebar />
      <SidebarInset className="m-4 min-h-0 overflow-hidden rounded-3xl border border-border/60 bg-card shadow-card">
        <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
          <SidebarTrigger />
        </div>
        <main className="min-h-0 flex-1 overflow-y-auto p-4 pb-28 sm:p-6 sm:pb-6">
          <Outlet />
        </main>
      </SidebarInset>
      <MobileQuickActions />
    </SidebarProvider>
  );
};
