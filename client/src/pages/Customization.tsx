import { useMemo, useState } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Skeleton } from "../components/ui/skeleton";
import { Textarea } from "../components/ui/textarea";
import { useApplyTemplateMutation, useGoalTemplatesQuery } from "../hooks/queries/useTemplateQueries";
import type { GoalTemplate } from "../types/templates";

const categoryFilters = ["ALL", "Fitness", "Learning", "Career", "Health", "Productivity"] as const;

const getDefaultTargetDate = (defaultTargetDays?: number | null) => {
  if (!defaultTargetDays || defaultTargetDays <= 0) return "";
  const date = new Date();
  date.setDate(date.getDate() + defaultTargetDays);
  return date.toISOString().slice(0, 10);
};

export const CustomizationPage = () => {
  const [category, setCategory] = useState<(typeof categoryFilters)[number]>("ALL");
  const [search, setSearch] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<GoalTemplate | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [titleOverride, setTitleOverride] = useState("");
  const [detailsOverride, setDetailsOverride] = useState("");
  const [targetDateOverride, setTargetDateOverride] = useState("");

  const templatesQuery = useGoalTemplatesQuery({
    category: category === "ALL" ? undefined : category,
    search: search.trim() || undefined,
  });
  const applyTemplateMutation = useApplyTemplateMutation();

  const templates = templatesQuery.data ?? [];

  const openTemplateDialog = (template: GoalTemplate) => {
    setSelectedTemplate(template);
    setTitleOverride(template.name);
    setDetailsOverride(template.description ?? "");
    setTargetDateOverride(getDefaultTargetDate(template.defaultTargetDays));
    setDialogOpen(true);
  };

  const handleApply = async () => {
    if (!selectedTemplate) return;

    await applyTemplateMutation.mutateAsync({
      templateId: selectedTemplate.id,
      payload: {
        titleOverride: titleOverride.trim() || undefined,
        detailsOverride: detailsOverride.trim() || undefined,
        targetDateOverride: targetDateOverride ? new Date(targetDateOverride).toISOString() : undefined,
      },
    });

    setDialogOpen(false);
    setSelectedTemplate(null);
  };

  const hasResults = templates.length > 0;

  const templateCards = useMemo(
    () =>
      templates.map((template) => (
        <Card key={template.id}>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">{template.name}</CardTitle>
                <CardDescription className="mt-1">{template.description ?? "No description"}</CardDescription>
              </div>
              <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {template.category}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-xs text-muted-foreground">
              <p>{template.milestones.length} milestones</p>
              <p>
                {template.defaultTargetDays
                  ? `${template.defaultTargetDays} day estimate`
                  : "Flexible duration"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {template.tags.map((tag) => (
                <span key={tag.id} className="rounded-full bg-muted px-2 py-1 text-xs">
                  {tag.name}
                </span>
              ))}
            </div>

            <Button className="w-full" onClick={() => openTemplateDialog(template)}>
              Use template
            </Button>
          </CardContent>
        </Card>
      )),
    [templates]
  );

  return (
    <div className="space-y-6 motion-enter">
      <div className="page-header">
        <div>
          <p className="page-kicker">Customization</p>
          <h1 className="page-title">Goal templates</h1>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap gap-2">
            {categoryFilters.map((item) => (
              <Button
                key={item}
                type="button"
                size="sm"
                variant={category === item ? "default" : "outline"}
                onClick={() => setCategory(item)}
              >
                {item === "ALL" ? "All" : item}
              </Button>
            ))}
          </div>

          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search templates"
          />
        </CardContent>
      </Card>

      {templatesQuery.isLoading && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 stagger-children">
          {Array.from({ length: 6 }, (_, idx) => (
            <Card key={`template-skeleton-${idx}`}>
              <CardHeader>
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="mt-2 h-4 w-full" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-8 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {templatesQuery.error instanceof Error && (
        <Card>
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <p className="text-sm text-red-600">{templatesQuery.error.message}</p>
            <Button variant="outline" onClick={() => templatesQuery.refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {!templatesQuery.isLoading && !templatesQuery.error && !hasResults && (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            No templates found for your current filters.
          </CardContent>
        </Card>
      )}

      {!templatesQuery.isLoading && !templatesQuery.error && hasResults && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 stagger-children">{templateCards}</div>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (applyTemplateMutation.isPending) return;
          setDialogOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create goal from template</DialogTitle>
            <DialogDescription>
              {selectedTemplate
                ? `Customize "${selectedTemplate.name}" before creating.`
                : "Customize template details."}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="template-goal-title">Goal title</Label>
              <Input
                id="template-goal-title"
                value={titleOverride}
                onChange={(event) => setTitleOverride(event.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="template-goal-target-date">Target date (optional)</Label>
              <Input
                id="template-goal-target-date"
                type="date"
                value={targetDateOverride}
                onChange={(event) => setTargetDateOverride(event.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="template-goal-details">Details (optional)</Label>
              <Textarea
                id="template-goal-details"
                value={detailsOverride}
                onChange={(event) => setDetailsOverride(event.target.value)}
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" disabled={applyTemplateMutation.isPending} onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button disabled={applyTemplateMutation.isPending} onClick={handleApply}>
              {applyTemplateMutation.isPending ? "Creating..." : "Create from template"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
