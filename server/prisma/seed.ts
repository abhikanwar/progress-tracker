import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type TemplateSeed = {
  slug: string;
  name: string;
  description: string;
  category: string;
  defaultTargetDays?: number;
  milestones: string[];
  tags: string[];
};

const templates: TemplateSeed[] = [
  {
    slug: "run-5k",
    name: "Run 5K",
    description: "Build endurance with a simple progressive running plan.",
    category: "Fitness",
    defaultTargetDays: 42,
    milestones: [
      "Baseline run and pacing check",
      "Complete three runs per week",
      "Hit a continuous 3K run",
      "Complete final 5K trial run",
    ],
    tags: ["fitness", "cardio", "health"],
  },
  {
    slug: "strength-12-week-plan",
    name: "Strength 12-week plan",
    description: "Follow a structured strength block with progression.",
    category: "Fitness",
    defaultTargetDays: 84,
    milestones: [
      "Define split and schedule",
      "Track baseline lifts",
      "Complete 4 weeks consistently",
      "Deload and recover",
      "Complete full 12-week cycle",
    ],
    tags: ["fitness", "strength", "routine"],
  },
  {
    slug: "learn-react-6-weeks",
    name: "Learn React in 6 weeks",
    description: "Master fundamentals and ship a small portfolio project.",
    category: "Learning",
    defaultTargetDays: 42,
    milestones: [
      "Complete React fundamentals",
      "Build components and state flows",
      "Learn routing and async data",
      "Build and deploy mini project",
    ],
    tags: ["learning", "react", "frontend"],
  },
  {
    slug: "system-design-prep",
    name: "System design prep",
    description: "Prepare for architecture rounds with focused practice.",
    category: "Learning",
    defaultTargetDays: 56,
    milestones: [
      "Revise core distributed systems concepts",
      "Practice 5 common design problems",
      "Run 2 mock interviews",
      "Create reusable answer frameworks",
    ],
    tags: ["learning", "interview", "backend"],
  },
  {
    slug: "portfolio-launch",
    name: "Portfolio launch",
    description: "Create and publish a strong personal portfolio website.",
    category: "Career",
    defaultTargetDays: 30,
    milestones: [
      "Define personal brand and sections",
      "Build project case studies",
      "Finalize responsive UI",
      "Deploy and connect custom domain",
    ],
    tags: ["career", "portfolio", "branding"],
  },
  {
    slug: "interview-prep",
    name: "Interview prep",
    description: "Structured prep for coding and behavioral interviews.",
    category: "Career",
    defaultTargetDays: 45,
    milestones: [
      "Build role-target list",
      "Practice coding questions daily",
      "Prepare STAR stories",
      "Complete mock interview set",
    ],
    tags: ["career", "interview", "growth"],
  },
  {
    slug: "deep-work-routine",
    name: "Deep work routine",
    description: "Establish repeatable focused work blocks every week.",
    category: "Productivity",
    defaultTargetDays: 28,
    milestones: [
      "Define daily focus windows",
      "Set distraction controls",
      "Log deep work sessions",
      "Review weekly focus output",
    ],
    tags: ["productivity", "focus", "routine"],
  },
  {
    slug: "sleep-consistency",
    name: "Sleep consistency",
    description: "Stabilize sleep/wake timing and improve recovery.",
    category: "Health",
    defaultTargetDays: 28,
    milestones: [
      "Set fixed sleep schedule",
      "Track sleep for 7 days",
      "Reduce late-night screen usage",
      "Hit consistency target for 2 weeks",
    ],
    tags: ["health", "sleep", "wellness"],
  },
];

const seedTemplates = async () => {
  for (const template of templates) {
    const savedTemplate = await prisma.goalTemplate.upsert({
      where: { slug: template.slug },
      update: {
        name: template.name,
        description: template.description,
        category: template.category,
        defaultTargetDays: template.defaultTargetDays ?? null,
      },
      create: {
        slug: template.slug,
        name: template.name,
        description: template.description,
        category: template.category,
        defaultTargetDays: template.defaultTargetDays ?? null,
      },
    });

    await prisma.goalTemplateMilestone.deleteMany({
      where: { templateId: savedTemplate.id },
    });
    await prisma.goalTemplateTag.deleteMany({
      where: { templateId: savedTemplate.id },
    });

    await prisma.goalTemplateMilestone.createMany({
      data: template.milestones.map((title, index) => ({
        templateId: savedTemplate.id,
        title,
        sortOrder: index + 1,
      })),
    });

    await prisma.goalTemplateTag.createMany({
      data: template.tags.map((name) => ({
        templateId: savedTemplate.id,
        name,
      })),
    });
  }
};

async function main() {
  await seedTemplates();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
