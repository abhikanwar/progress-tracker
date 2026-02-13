const MS_IN_DAY = 1000 * 60 * 60 * 24;
const DATA_WINDOW_DAYS = 14;
const ENGINE_VERSION = "rules-v1.1";
const EMPTY_GOAL_ID = "00000000-0000-0000-0000-000000000000";
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const toBand = (value) => {
    if (value >= 70)
        return "high";
    if (value >= 40)
        return "medium";
    return "low";
};
const getDayDiff = (dateInput) => {
    if (!dateInput)
        return null;
    const target = new Date(dateInput);
    if (Number.isNaN(target.getTime()))
        return null;
    return Math.ceil((target.getTime() - Date.now()) / MS_IN_DAY);
};
const getEffectiveStatus = (goal) => {
    if (goal.status === "ARCHIVED")
        return "ARCHIVED";
    return goal.currentProgress >= 100 ? "COMPLETED" : "ACTIVE";
};
const getStaleDays = (goal) => {
    const latest = goal.progressEvents?.[0]?.createdAt ?? goal.updatedAt;
    return Math.max(0, Math.floor((Date.now() - new Date(latest).getTime()) / MS_IN_DAY));
};
const getRecentVelocity = (goal) => {
    const windowStart = Date.now() - DATA_WINDOW_DAYS * MS_IN_DAY;
    const recentEvents = (goal.progressEvents ?? []).filter((event) => new Date(event.createdAt).getTime() >= windowStart);
    if (recentEvents.length < 2)
        return 0;
    const latest = recentEvents[0].value;
    const oldest = recentEvents[recentEvents.length - 1].value;
    return clamp(latest - oldest, -100, 100);
};
const getArchetype = (goal, dueDays, staleDays, velocity) => {
    if ((dueDays !== null && dueDays < 0) || staleDays >= 7)
        return "rescue";
    if (goal.currentProgress >= 80 || (goal.currentProgress >= 65 && velocity >= 8))
        return "close";
    return "push";
};
const getRiskSeverity = (score) => {
    if (score >= 75)
        return "high";
    if (score >= 45)
        return "medium";
    return "low";
};
const getPriorityReason = (archetype, dueDays, staleDays, velocity) => {
    if (archetype === "rescue") {
        if (dueDays !== null && dueDays < 0)
            return "Overdue goal: recover immediately with a focused execution block.";
        if (staleDays >= 7)
            return "Momentum dropped for 7+ days; immediate reactivation needed.";
        return "High-risk execution path requires rapid stabilization.";
    }
    if (archetype === "close") {
        return "Close-to-finish goal with strong payoff if completed this week.";
    }
    if (dueDays !== null && dueDays <= 7) {
        return "Due within a week; prioritized for predictable completion.";
    }
    if (velocity <= 0) {
        return "Progress velocity is flat; needs a concrete push to move.";
    }
    return "High-leverage active goal with room to accelerate outcomes.";
};
const getActionForArchetype = (goal, archetype, dueDays, staleDays) => {
    const nextMilestone = goal.milestones.find((milestone) => !milestone.completed);
    if (archetype === "rescue") {
        return {
            goalId: goal.id,
            action: dueDays !== null && dueDays < 0
                ? "Run one 45-minute recovery sprint and log a concrete progress update today."
                : "Run one 45-minute restart sprint and unblock the next critical step today.",
            why: staleDays >= 7
                ? "Breaking long inactivity is the fastest way to restore momentum."
                : "Time-sensitive goals need immediate output to avoid further slip.",
        };
    }
    if (archetype === "close") {
        return {
            goalId: goal.id,
            action: nextMilestone
                ? `Block a 40-minute finish sprint to complete milestone: ${nextMilestone.title}.`
                : "Block a 40-minute finish sprint and move progress to 100% this week.",
            why: "Completing near-finish goals frees capacity and compounds motivation.",
        };
    }
    return {
        goalId: goal.id,
        action: nextMilestone
            ? `Schedule a 45-minute deep-work block to complete: ${nextMilestone.title}.`
            : "Schedule a 45-minute deep-work block and ship one measurable milestone step.",
        why: "Time-boxed focused execution is the highest-leverage move for this goal.",
    };
};
export const buildRulesSummary = (goals) => {
    const activeGoals = goals.filter((goal) => getEffectiveStatus(goal) === "ACTIVE");
    const baseMeta = {
        generatedAt: new Date().toISOString(),
        source: "rules",
        engineVersion: ENGINE_VERSION,
        dataWindowDays: DATA_WINDOW_DAYS,
    };
    if (activeGoals.length === 0) {
        return {
            topPriorities: [],
            risks: [],
            nextActions: [
                {
                    goalId: EMPTY_GOAL_ID,
                    action: "Schedule a 30-minute planning session and create one goal with a clear target date.",
                    why: "Coach recommendations become more precise once active goals exist.",
                },
                {
                    goalId: EMPTY_GOAL_ID,
                    action: "Define two milestones for that goal in a 20-minute setup block.",
                    why: "Milestones make weekly actions concrete and trackable.",
                },
                {
                    goalId: EMPTY_GOAL_ID,
                    action: "Run one 25-minute execution block and log your first progress update.",
                    why: "A first progress log establishes momentum and baseline confidence.",
                },
            ],
            confidence: { value: 40, band: "medium" },
            meta: baseMeta,
        };
    }
    const scored = activeGoals.map((goal) => {
        const dueDays = getDayDiff(goal.targetDate);
        const staleDays = getStaleDays(goal);
        const velocity = getRecentVelocity(goal);
        const totalMilestones = goal.milestones.length;
        const doneMilestones = goal.milestones.filter((milestone) => milestone.completed).length;
        const milestoneCompletionRatio = totalMilestones > 0 ? doneMilestones / totalMilestones : 0;
        const urgencyScore = (dueDays !== null && dueDays < 0 ? 100 : dueDays !== null && dueDays <= 7 ? 70 : dueDays === null ? 35 : 20) +
            Math.min(staleDays * 2, 20);
        const momentumScore = clamp(55 + velocity * 2 - staleDays * 3, 0, 100);
        const feasibilityScore = clamp(40 + milestoneCompletionRatio * 45 + goal.currentProgress * 0.15, 0, 100);
        const effortProxyScore = goal.currentProgress >= 80 && staleDays >= 3
            ? 90
            : goal.currentProgress >= 65
                ? 70
                : goal.currentProgress <= 25 && staleDays >= 7
                    ? 75
                    : 50;
        const priorityScore = Math.round(clamp(urgencyScore * 0.4 +
            (100 - momentumScore) * 0.25 +
            (100 - feasibilityScore) * 0.2 +
            effortProxyScore * 0.15, 0, 100));
        const archetype = getArchetype(goal, dueDays, staleDays, velocity);
        return {
            goal,
            dueDays,
            staleDays,
            velocity,
            archetype,
            priorityScore,
            urgencyScore,
            momentumScore,
            feasibilityScore,
        };
    });
    const sortedByPriority = [...scored].sort((a, b) => b.priorityScore - a.priorityScore);
    const topPriorities = sortedByPriority.slice(0, 3).map((item) => ({
        goalId: item.goal.id,
        title: item.goal.title,
        reason: getPriorityReason(item.archetype, item.dueDays, item.staleDays, item.velocity),
        score: item.priorityScore,
    }));
    const risks = sortedByPriority
        .filter((item) => {
        const hasScheduleRisk = item.dueDays !== null && item.dueDays <= 7;
        const hasConsistencyRisk = item.staleDays >= 7;
        const hasExecutionRisk = item.momentumScore < 35 || item.goal.currentProgress < 25;
        return hasScheduleRisk || hasConsistencyRisk || hasExecutionRisk;
    })
        .slice(0, 4)
        .map((item) => {
        if (item.dueDays !== null && item.dueDays <= 7) {
            return {
                goalId: item.goal.id,
                title: item.goal.title,
                category: "schedule",
                severity: getRiskSeverity(item.urgencyScore),
                reason: item.dueDays < 0
                    ? "Deadline has passed; schedule recovery needed now."
                    : "Deadline is within 7 days with limited execution buffer.",
            };
        }
        if (item.staleDays >= 7) {
            return {
                goalId: item.goal.id,
                title: item.goal.title,
                category: "consistency",
                severity: getRiskSeverity(65 + item.staleDays),
                reason: "No meaningful update in over a week, signaling momentum decay.",
            };
        }
        return {
            goalId: item.goal.id,
            title: item.goal.title,
            category: "execution",
            severity: getRiskSeverity(55 + (35 - item.momentumScore)),
            reason: "Execution pace is below required velocity for confident completion.",
        };
    });
    const actionCandidates = sortedByPriority.map((item) => getActionForArchetype(item.goal, item.archetype, item.dueDays, item.staleDays));
    const seenGoals = new Set();
    const nextActions = [];
    for (const action of actionCandidates) {
        if (seenGoals.has(action.goalId))
            continue;
        nextActions.push(action);
        seenGoals.add(action.goalId);
        if (nextActions.length === 3)
            break;
    }
    while (nextActions.length < 3) {
        nextActions.push({
            goalId: sortedByPriority[0]?.goal.id ?? EMPTY_GOAL_ID,
            action: "Run one 30-minute focused block and log a measurable update.",
            why: "Small, time-boxed execution blocks keep weekly momentum reliable.",
        });
    }
    const overdueCount = scored.filter((item) => item.dueDays !== null && item.dueDays < 0).length;
    const staleCount = scored.filter((item) => item.staleDays >= 7).length;
    const cadenceComponent = clamp(100 -
        Math.round((scored.reduce((sum, item) => sum + item.staleDays, 0) / Math.max(scored.length, 1)) * 7), 0, 100);
    const deadlineComponent = clamp(100 - Math.round((overdueCount / Math.max(scored.length, 1)) * 100), 0, 100);
    const completionComponent = clamp(Math.round(scored.reduce((sum, item) => sum + item.feasibilityScore, 0) / Math.max(scored.length, 1)), 0, 100);
    const confidenceValue = Math.round(clamp(cadenceComponent * 0.35 + deadlineComponent * 0.4 + completionComponent * 0.25 - staleCount * 2, 0, 100));
    return {
        topPriorities,
        risks,
        nextActions,
        confidence: {
            value: confidenceValue,
            band: toBand(confidenceValue),
        },
        meta: baseMeta,
    };
};
