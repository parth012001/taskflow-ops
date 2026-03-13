/**
 * Demo seed script — creates realistic data for portfolio screenshots.
 * All records are tagged so demo-cleanup.ts can remove them safely.
 *
 * Run AFTER the base seed + productivity seed:
 *   npx tsx scripts/demo-seed.ts
 */
import {
  PrismaClient,
  TaskStatus,
  TaskPriority,
  TaskSize,
  AssignedByType,
} from "@prisma/client";

const prisma = new PrismaClient();

// Tag to identify demo records for cleanup
const DEMO_TAG = "[DEMO]";

async function main() {
  console.log("=== Demo Screenshot Seed ===\n");

  // --- Fetch existing users ---
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: "admin@taskflow.com" } });
  const manager = await prisma.user.findUniqueOrThrow({ where: { email: "manager1@taskflow.com" } });
  const employee1 = await prisma.user.findUniqueOrThrow({ where: { email: "employee1@taskflow.com" } });
  const employee2 = await prisma.user.findUniqueOrThrow({ where: { email: "employee2@taskflow.com" } });
  const deptHead = await prisma.user.findUniqueOrThrow({ where: { email: "head@taskflow.com" } });

  const kpiBuckets = await prisma.kpiBucket.findMany();
  if (kpiBuckets.length === 0) throw new Error("No KPI buckets. Run base seed first.");

  // Pick KPI buckets for variety
  const kpi = (idx: number) => kpiBuckets[idx % kpiBuckets.length].id;

  // --- Helper: create a task with status history ---
  async function createTask(opts: {
    title: string;
    description: string;
    ownerId: string;
    status: TaskStatus;
    priority: TaskPriority;
    size: TaskSize;
    kpiBucketId: string;
    assignedByType?: AssignedByType;
    requiresReview?: boolean;
    deadlineDaysFromNow: number;
    completedDaysAgo?: number;
  }) {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + opts.deadlineDaysFromNow);

    const completedAt = opts.completedDaysAgo != null
      ? new Date(Date.now() - opts.completedDaysAgo * 86400000)
      : undefined;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Math.abs(opts.deadlineDaysFromNow) - 3);

    const task = await prisma.task.create({
      data: {
        title: opts.title,
        description: `${DEMO_TAG} ${opts.description}`,
        ownerId: opts.ownerId,
        status: opts.status,
        priority: opts.priority,
        size: opts.size,
        kpiBucketId: opts.kpiBucketId,
        assignedByType: opts.assignedByType ?? "SELF",
        requiresReview: opts.requiresReview ?? true,
        deadline,
        completedAt,
        startDate,
        estimatedMinutes: opts.size === "EASY" ? 45 : opts.size === "MEDIUM" ? 120 : 300,
        actualMinutes: completedAt ? (opts.size === "EASY" ? 38 : opts.size === "MEDIUM" ? 105 : 270) : undefined,
      },
    });

    // Minimal status history
    await prisma.taskStatusHistory.create({
      data: {
        taskId: task.id,
        fromStatus: null,
        toStatus: TaskStatus.NEW,
        changedById: opts.ownerId,
        createdAt: startDate,
      },
    });

    return task;
  }

  // ================================================================
  // EMPLOYEE 1 (Neha Gupta) — Tasks for Kanban board
  // ================================================================
  console.log("Creating tasks for Employee 1 (Neha)...");

  // In Progress
  await createTask({
    title: "Update vendor payment terms for Q2 contracts",
    description: "Review and update payment terms across all active Q2 vendor contracts to reflect new 45-day net policy.",
    ownerId: employee1.id, status: TaskStatus.IN_PROGRESS,
    priority: "URGENT_IMPORTANT", size: "MEDIUM", kpiBucketId: kpi(0),
    assignedByType: "MANAGER", deadlineDaysFromNow: 2,
  });
  await createTask({
    title: "Prepare RFQ for office furniture replacement",
    description: "Draft request for quotation for 50 ergonomic desk chairs and 20 standing desks.",
    ownerId: employee1.id, status: TaskStatus.IN_PROGRESS,
    priority: "NOT_URGENT_IMPORTANT", size: "DIFFICULT", kpiBucketId: kpi(1),
    deadlineDaysFromNow: 5,
  });
  await createTask({
    title: "Reconcile March vendor invoices",
    description: "Cross-check all vendor invoices received in March against purchase orders and delivery receipts.",
    ownerId: employee1.id, status: TaskStatus.IN_PROGRESS,
    priority: "URGENT_NOT_IMPORTANT", size: "MEDIUM", kpiBucketId: kpi(2),
    assignedByType: "MANAGER", deadlineDaysFromNow: 1,
  });

  // Accepted / Todo
  await createTask({
    title: "Onboard new logistics vendor — FastTrack Shipping",
    description: "Complete vendor onboarding checklist: NDA, tax forms, bank details, quality certification.",
    ownerId: employee1.id, status: TaskStatus.ACCEPTED,
    priority: "NOT_URGENT_IMPORTANT", size: "MEDIUM", kpiBucketId: kpi(3),
    deadlineDaysFromNow: 7,
  });
  await createTask({
    title: "Review safety compliance docs for Site B",
    description: "Audit all safety gear procurement records and vendor certifications for Site B warehouse.",
    ownerId: employee1.id, status: TaskStatus.ACCEPTED,
    priority: "NOT_URGENT_NOT_IMPORTANT", size: "EASY", kpiBucketId: kpi(4),
    deadlineDaysFromNow: 10,
  });

  // Completed Pending Review
  await createTask({
    title: "Negotiate bulk pricing with Steel Masters",
    description: "Completed negotiation for 15% volume discount on quarterly steel orders exceeding 50 tonnes.",
    ownerId: employee1.id, status: TaskStatus.COMPLETED_PENDING_REVIEW,
    priority: "URGENT_IMPORTANT", size: "DIFFICULT", kpiBucketId: kpi(0),
    assignedByType: "MANAGER", requiresReview: true, deadlineDaysFromNow: -1, completedDaysAgo: 1,
  });
  await createTask({
    title: "Create PO template for recurring orders",
    description: "Standardized purchase order template for recurring monthly supply orders.",
    ownerId: employee1.id, status: TaskStatus.COMPLETED_PENDING_REVIEW,
    priority: "NOT_URGENT_IMPORTANT", size: "EASY", kpiBucketId: kpi(1),
    requiresReview: true, deadlineDaysFromNow: 0, completedDaysAgo: 0,
  });

  // On Hold
  await createTask({
    title: "Evaluate cloud hosting proposals",
    description: "On hold — waiting for IT department to finalize infrastructure requirements.",
    ownerId: employee1.id, status: TaskStatus.ON_HOLD,
    priority: "NOT_URGENT_IMPORTANT", size: "MEDIUM", kpiBucketId: kpi(2),
    deadlineDaysFromNow: 14,
  });

  // Closed / Approved (recent)
  await createTask({
    title: "Process Q1 vendor performance reviews",
    description: "Compiled performance scorecards for all 12 active vendors based on delivery accuracy and quality metrics.",
    ownerId: employee1.id, status: TaskStatus.CLOSED_APPROVED,
    priority: "URGENT_IMPORTANT", size: "DIFFICULT", kpiBucketId: kpi(3),
    requiresReview: true, deadlineDaysFromNow: -5, completedDaysAgo: 6,
  });
  await createTask({
    title: "Set up automated reorder alerts",
    description: "Configured threshold-based reorder notifications for top 20 fast-moving SKUs.",
    ownerId: employee1.id, status: TaskStatus.CLOSED_APPROVED,
    priority: "NOT_URGENT_IMPORTANT", size: "MEDIUM", kpiBucketId: kpi(4),
    completedDaysAgo: 3, deadlineDaysFromNow: -2,
  });

  // ================================================================
  // EMPLOYEE 2 (Vikram Singh) — Additional tasks for team view
  // ================================================================
  console.log("Creating tasks for Employee 2 (Vikram)...");

  await createTask({
    title: "Audit warehouse inventory for discrepancies",
    description: "Physical count reconciliation for Warehouse North — 200+ SKUs to verify.",
    ownerId: employee2.id, status: TaskStatus.IN_PROGRESS,
    priority: "URGENT_IMPORTANT", size: "DIFFICULT", kpiBucketId: kpi(0),
    assignedByType: "MANAGER", deadlineDaysFromNow: -1, // overdue
  });
  await createTask({
    title: "Update supplier contact directory",
    description: "Refresh contact details for all 45 active suppliers in the vendor management system.",
    ownerId: employee2.id, status: TaskStatus.COMPLETED_PENDING_REVIEW,
    priority: "NOT_URGENT_NOT_IMPORTANT", size: "EASY", kpiBucketId: kpi(1),
    requiresReview: true, deadlineDaysFromNow: 1, completedDaysAgo: 0,
  });
  await createTask({
    title: "Compare freight rates across 3 new carriers",
    description: "Cost analysis comparing DHL Express, BlueDart, and Delhivery for standard parcel shipments.",
    ownerId: employee2.id, status: TaskStatus.IN_PROGRESS,
    priority: "NOT_URGENT_IMPORTANT", size: "MEDIUM", kpiBucketId: kpi(2),
    deadlineDaysFromNow: 4,
  });
  await createTask({
    title: "Draft SLA for Metro Materials contract renewal",
    description: "Prepare service level agreement with updated delivery timelines and penalty clauses.",
    ownerId: employee2.id, status: TaskStatus.ACCEPTED,
    priority: "URGENT_NOT_IMPORTANT", size: "MEDIUM", kpiBucketId: kpi(3),
    assignedByType: "MANAGER", deadlineDaysFromNow: 6,
  });

  // ================================================================
  // ANNOUNCEMENTS (visible on dashboard)
  // ================================================================
  console.log("Creating announcements...");

  // Tag announcements in title with invisible marker for cleanup
  // (title prefix won't show since dashboard truncates the content body)
  await prisma.announcement.createMany({
    data: [
      {
        title: "Q2 procurement freeze lifted",
        content: "The procurement freeze for non-essential items has been lifted effective immediately. Please resume pending purchase orders and submit new requests through the standard approval workflow.",
        type: "POLICY",
        priority: "HIGH",
        authorId: deptHead.id,
        isActive: true,
        expiresAt: new Date(Date.now() + 14 * 86400000),
      },
      {
        title: "Welcome Swati Kulkarni to the team!",
        content: "Please join us in welcoming Swati Kulkarni who joins our Procurement team as a Purchase Coordinator. Swati brings 3 years of supply chain experience from her previous role.",
        type: "GENERAL",
        priority: "NORMAL",
        authorId: admin.id,
        isActive: true,
        expiresAt: new Date(Date.now() + 7 * 86400000),
      },
      {
        title: "Vendor evaluation deadline — March 28",
        content: "All department heads must submit their quarterly vendor evaluation reports by March 28th. Templates are available in the shared drive under /Reports/Q1-2026/.",
        type: "EVENT",
        priority: "NORMAL",
        authorId: manager.id,
        isActive: true,
        expiresAt: new Date(Date.now() + 17 * 86400000),
      },
    ],
  });

  // ================================================================
  // DAILY PLANNING SESSION for today (for daily planning screenshot)
  // ================================================================
  console.log("Creating today's planning session...");

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Check if session already exists
  const existingSession = await prisma.dailyPlanningSession.findFirst({
    where: { userId: employee1.id, sessionDate: today },
  });

  if (!existingSession) {
    await prisma.dailyPlanningSession.create({
      data: {
        userId: employee1.id,
        sessionDate: today,
        morningCompleted: true,
        morningCompletedAt: new Date(today.getTime() + 8.5 * 3600000), // 8:30 AM
        eveningCompleted: false,
      },
    });
  }

  // ================================================================
  // USER STREAKS (for dashboard gamification)
  // ================================================================
  console.log("Upserting user streaks...");

  await prisma.userStreak.upsert({
    where: { userId: employee1.id },
    update: { currentStreak: 12, longestStreak: 18, lastActiveDate: new Date() },
    create: { userId: employee1.id, currentStreak: 12, longestStreak: 18, lastActiveDate: new Date() },
  });
  await prisma.userStreak.upsert({
    where: { userId: employee2.id },
    update: { currentStreak: 5, longestStreak: 9, lastActiveDate: new Date() },
    create: { userId: employee2.id, currentStreak: 5, longestStreak: 9, lastActiveDate: new Date() },
  });

  console.log("\n=== Demo seed complete ===");
  console.log("Run screenshots:  npx playwright test scripts/take-screenshots.ts");
  console.log("Cleanup:          npx tsx scripts/demo-cleanup.ts\n");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
