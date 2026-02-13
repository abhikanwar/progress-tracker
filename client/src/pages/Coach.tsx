import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";
import { Link } from "react-router-dom";
import {
  useCoachCompletionRateQuery,
  useCoachInsightQuery,
  useCompleteCoachActionMutation,
  useGenerateCoachInsightMutation,
} from "../hooks/queries/useCoachQueries";
import { formatDateTimeInTimezone } from "../lib/datetime";
import { settingsStorage } from "../lib/settings";

const riskCategoryLabel: Record<"schedule" | "execution" | "consistency", string> = {
  schedule: "Schedule risk",
  execution: "Execution risk",
  consistency: "Consistency risk",
};

export const CoachPage = () => {
  const timezone = settingsStorage.getResolvedTimezone();
  const insightQuery = useCoachInsightQuery();
  const completionRateQuery = useCoachCompletionRateQuery(7);
  const generateMutation = useGenerateCoachInsightMutation();
  const completeActionMutation = useCompleteCoachActionMutation();

  const insight = insightQuery.data;
  const summary = insight?.summary;
  const loading = insightQuery.isLoading;

  const handleCompleteAction = async (goalId: string) => {
    if (!insight?.id || !goalId || goalId.startsWith("00000000")) return;
    await completeActionMutation.mutateAsync({ goalId, insightId: insight.id });
  };

  return (
    <div className="space-y-6 motion-enter">
      <div className="page-header">
        <div>
          <p className="page-kicker">Coach Summary</p>
          <h1 className="page-title">Weekly strategy brief</h1>
        </div>
        <div className="page-actions">
          <Button variant="outline" asChild>
            <Link to="/coach-chat">Open Coach Chat</Link>
          </Button>
          <Button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="pressable"
          >
            {generateMutation.isPending ? "Generating..." : summary ? "Regenerate" : "Generate brief"}
          </Button>
        </div>
      </div>

      {loading && (
        <div className="grid gap-4 lg:grid-cols-2 stagger-children">
          {Array.from({ length: 4 }, (_, index) => (
            <Card key={`coach-skeleton-${index}`}>
              <CardHeader>
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && insightQuery.error instanceof Error && (
        <Card>
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <p className="text-sm text-red-600">{insightQuery.error.message}</p>
            <Button variant="outline" onClick={() => insightQuery.refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && !insightQuery.error && !summary && (
        <Card>
          <CardHeader>
            <CardTitle className="section-title">No brief yet</CardTitle>
            <CardDescription>
              Generate your weekly brief to see priorities, risks, and next actions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
              {generateMutation.isPending ? "Generating..." : "Generate brief"}
            </Button>
          </CardContent>
        </Card>
      )}

      {summary && (
        <>
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="section-title">Brief metadata</CardTitle>
                  <CardDescription>
                    Generated {formatDateTimeInTimezone(summary.meta.generatedAt, timezone)}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      insight.source === "ai"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200"
                    }`}
                  >
                    {insight.source === "ai" ? "AI" : "Fallback"}
                  </span>
                  <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                    {summary.meta.engineVersion}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm md:grid-cols-3">
              <p>
                Confidence: <span className="font-semibold">{summary.confidence.value}%</span> (
                {summary.confidence.band})
              </p>
              <p>
                Data window: <span className="font-semibold">{summary.meta.dataWindowDays} days</span>
              </p>
              <p>
                7-day completion rate:{" "}
                <span className="font-semibold">
                  {completionRateQuery.data ? `${completionRateQuery.data.rate}%` : "—"}
                </span>
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-3 stagger-children">
            <Card>
              <CardHeader>
                <CardTitle className="section-title">Top priorities</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {summary.topPriorities.length === 0 && (
                  <p className="text-muted-foreground">No priorities yet.</p>
                )}
                {summary.topPriorities.map((item) => (
                  <div key={`priority-${item.goalId}`} className="rounded-lg border border-border/70 p-3">
                    <p className="font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.reason}</p>
                    <p className="mt-1 text-xs">Score: {item.score}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="section-title">Risks</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {summary.risks.length === 0 && (
                  <p className="text-muted-foreground">No immediate risks detected.</p>
                )}
                {summary.risks.map((item) => (
                  <div key={`risk-${item.goalId}`} className="rounded-lg border border-border/70 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{item.title}</p>
                      <span className="text-xs uppercase text-muted-foreground">{item.severity}</span>
                    </div>
                    <p className="mt-1 inline-flex rounded-full bg-muted px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      {riskCategoryLabel[item.category]}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.reason}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="section-title">This Week Plan (3 actions)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {summary.nextActions.length === 0 && (
                  <p className="text-muted-foreground">No actions yet.</p>
                )}
                {summary.nextActions.map((item, index) => (
                  <div key={`action-${item.goalId}-${index}`} className="rounded-lg border border-border/70 p-3">
                    <p className="text-xs font-semibold text-muted-foreground">Step {index + 1}</p>
                    <p className="font-medium">{item.action}</p>
                    <p className="text-xs text-muted-foreground">{item.why}</p>
                    {!item.goalId.startsWith("00000000") && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2"
                        disabled={completeActionMutation.isPending}
                        onClick={() => void handleCompleteAction(item.goalId)}
                      >
                        Mark complete
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}

    </div>
  );
};
