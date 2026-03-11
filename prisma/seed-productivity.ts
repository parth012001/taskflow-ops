import {
  PrismaClient,
  Role,
  TaskStatus,
  TaskPriority,
  TaskSize,
  AssignedByType,
} from "@prisma/client";
import { faker } from "@faker-js/faker";
import bcrypt from "bcryptjs";

// Reproducible random data
faker.seed(42);

const prisma = new PrismaClient();

// ============================================
// Types & Constants
// ============================================

type Archetype =
  | "star"
  | "solid"
  | "speed_demon"
  | "careful"
  | "struggling"
  | "inactive";

interface UserProfile {
  archetype: Archetype;
  completedTaskCount: [number, number]; // [min, max]
  activeTaskCount: [number, number];
  reviewRate: number; // % of tasks requiring review
  firstPassRate: number; // % that pass review first time
  reopenRate: number; // % reopened from CLOSED_APPROVED
  onTimeRate: number; // % completed on or before deadline
  carryForwardCount: [number, number];
  planningRate: number; // % of workdays with morningCompleted
  sizeDistribution: Record<TaskSize, number>; // weights
  priorityDistribution: Record<TaskPriority, number>;
  kpiSpreadFactor: number; // 0-1, how many assigned KPIs they actually work across
}

const PROFILES: Record<Archetype, UserProfile> = {
  star: {
    archetype: "star",
    completedTaskCount: [14, 18],
    activeTaskCount: [3, 5],
    reviewRate: 0.7,
    firstPassRate: 0.9,
    reopenRate: 0.05,
    onTimeRate: 0.9,
    carryForwardCount: [0, 1],
    planningRate: 0.9,
    sizeDistribution: { EASY: 0.2, MEDIUM: 0.5, DIFFICULT: 0.3 },
    priorityDistribution: {
      URGENT_IMPORTANT: 0.3,
      URGENT_NOT_IMPORTANT: 0.2,
      NOT_URGENT_IMPORTANT: 0.35,
      NOT_URGENT_NOT_IMPORTANT: 0.15,
    },
    kpiSpreadFactor: 0.85,
  },
  solid: {
    archetype: "solid",
    completedTaskCount: [9, 13],
    activeTaskCount: [2, 4],
    reviewRate: 0.65,
    firstPassRate: 0.75,
    reopenRate: 0.1,
    onTimeRate: 0.7,
    carryForwardCount: [1, 2],
    planningRate: 0.7,
    sizeDistribution: { EASY: 0.3, MEDIUM: 0.5, DIFFICULT: 0.2 },
    priorityDistribution: {
      URGENT_IMPORTANT: 0.2,
      URGENT_NOT_IMPORTANT: 0.25,
      NOT_URGENT_IMPORTANT: 0.35,
      NOT_URGENT_NOT_IMPORTANT: 0.2,
    },
    kpiSpreadFactor: 0.65,
  },
  speed_demon: {
    archetype: "speed_demon",
    completedTaskCount: [14, 18],
    activeTaskCount: [4, 7],
    reviewRate: 0.6,
    firstPassRate: 0.45,
    reopenRate: 0.2,
    onTimeRate: 0.55,
    carryForwardCount: [2, 4],
    planningRate: 0.4,
    sizeDistribution: { EASY: 0.4, MEDIUM: 0.45, DIFFICULT: 0.15 },
    priorityDistribution: {
      URGENT_IMPORTANT: 0.4,
      URGENT_NOT_IMPORTANT: 0.3,
      NOT_URGENT_IMPORTANT: 0.2,
      NOT_URGENT_NOT_IMPORTANT: 0.1,
    },
    kpiSpreadFactor: 0.5,
  },
  careful: {
    archetype: "careful",
    completedTaskCount: [5, 8],
    activeTaskCount: [1, 3],
    reviewRate: 0.75,
    firstPassRate: 0.95,
    reopenRate: 0.0,
    onTimeRate: 0.85,
    carryForwardCount: [0, 1],
    planningRate: 0.8,
    sizeDistribution: { EASY: 0.15, MEDIUM: 0.4, DIFFICULT: 0.45 },
    priorityDistribution: {
      URGENT_IMPORTANT: 0.15,
      URGENT_NOT_IMPORTANT: 0.15,
      NOT_URGENT_IMPORTANT: 0.5,
      NOT_URGENT_NOT_IMPORTANT: 0.2,
    },
    kpiSpreadFactor: 0.7,
  },
  struggling: {
    archetype: "struggling",
    completedTaskCount: [3, 6],
    activeTaskCount: [3, 6],
    reviewRate: 0.6,
    firstPassRate: 0.35,
    reopenRate: 0.25,
    onTimeRate: 0.35,
    carryForwardCount: [3, 5],
    planningRate: 0.25,
    sizeDistribution: { EASY: 0.5, MEDIUM: 0.35, DIFFICULT: 0.15 },
    priorityDistribution: {
      URGENT_IMPORTANT: 0.15,
      URGENT_NOT_IMPORTANT: 0.25,
      NOT_URGENT_IMPORTANT: 0.25,
      NOT_URGENT_NOT_IMPORTANT: 0.35,
    },
    kpiSpreadFactor: 0.3,
  },
  inactive: {
    archetype: "inactive",
    completedTaskCount: [0, 2],
    activeTaskCount: [1, 3],
    reviewRate: 0.5,
    firstPassRate: 0.5,
    reopenRate: 0.0,
    onTimeRate: 0.5,
    carryForwardCount: [0, 1],
    planningRate: 0.1,
    sizeDistribution: { EASY: 0.6, MEDIUM: 0.3, DIFFICULT: 0.1 },
    priorityDistribution: {
      URGENT_IMPORTANT: 0.1,
      URGENT_NOT_IMPORTANT: 0.2,
      NOT_URGENT_IMPORTANT: 0.3,
      NOT_URGENT_NOT_IMPORTANT: 0.4,
    },
    kpiSpreadFactor: 0.1,
  },
};

// 20 users: 4 per archetype
const USER_ARCHETYPES: Archetype[] = [
  "star", "star", "star", "star",
  "solid", "solid", "solid", "solid",
  "speed_demon", "speed_demon", "speed_demon", "speed_demon",
  "careful", "careful", "careful", "careful",
  "struggling", "struggling", "inactive", "inactive",
];


const SIZES: TaskSize[] = ["EASY", "MEDIUM", "DIFFICULT"];
const PRIORITIES: TaskPriority[] = [
  "URGENT_IMPORTANT",
  "URGENT_NOT_IMPORTANT",
  "NOT_URGENT_IMPORTANT",
  "NOT_URGENT_NOT_IMPORTANT",
];
const ACTIVE_STATUSES: TaskStatus[] = [
  "ACCEPTED",
  "IN_PROGRESS",
  "IN_PROGRESS",
  "ON_HOLD",
  "COMPLETED_PENDING_REVIEW",
];
const ASSIGNED_BY_TYPES: AssignedByType[] = ["SELF", "SELF", "MANAGER", "MANAGER", "EA"];

// ============================================
// Helpers
// ============================================

function randInt(min: number, max: number): number {
  return faker.number.int({ min, max });
}

function pickWeighted<T extends string>(distribution: Record<T, number>): T {
  const entries = Object.entries(distribution) as [T, number][];
  const total = entries.reduce((s, [, w]) => s + (w as number), 0);
  let r = faker.number.float({ min: 0, max: total });
  for (const [key, weight] of entries) {
    r -= weight as number;
    if (r <= 0) return key;
  }
  return entries[entries.length - 1][0];
}

function pickRandom<T>(arr: T[]): T {
  return arr[faker.number.int({ min: 0, max: arr.length - 1 })];
}

function randomDate(start: Date, end: Date): Date {
  return faker.date.between({ from: start, to: end });
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function getWorkdays(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const current = new Date(start);
  current.setUTCHours(0, 0, 0, 0);
  const endDate = new Date(end);
  endDate.setUTCHours(0, 0, 0, 0);
  while (current <= endDate) {
    const day = current.getUTCDay();
    if (day !== 0 && day !== 6) {
      days.push(new Date(current));
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return days;
}

function getMondaysGoingBack(weeksBack: number): Date[] {
  const mondays: Date[] = [];
  const now = new Date();
  for (let i = weeksBack; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    // Adjust to Monday
    const day = d.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setUTCHours(0, 0, 0, 0);
    mondays.push(d);
  }
  // Deduplicate by date string
  const seen = new Set<string>();
  return mondays.filter((m) => {
    const key = m.toISOString().split("T")[0];
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Procurement-themed task titles
const TASK_TEMPLATES = [
  "Create PO for {item}",
  "Process vendor bill from {vendor}",
  "Update purchase master for {item}",
  "Follow up on PI #{number}",
  "Coordinate delivery to {location}",
  "Compare vendors for {item}",
  "Negotiate credit terms with {vendor}",
  "Prepare monthly vendor report",
  "Onboard new vendor: {vendor}",
  "Audit PO accuracy for {period}",
  "Review vendor pricing for {item}",
  "Handle bill discrepancy for {vendor}",
  "Schedule delivery inspection at {location}",
  "Update vendor compliance docs for {vendor}",
  "Process urgent PO for {item}",
  "Reconcile vendor statements for {period}",
  "Evaluate vendor performance for {vendor}",
  "Request quotes for {item}",
];

const ITEMS = [
  "office supplies", "IT equipment", "raw materials", "steel beams",
  "electrical components", "safety gear", "furniture", "plumbing fixtures",
  "HVAC parts", "concrete mix", "paint supplies", "roofing materials",
];
const VENDORS = [
  "ABC Corp", "XYZ Ltd", "DEF Supplies", "Global Trade Co", "Metro Materials",
  "Prime Vendors", "Quality Parts Inc", "Steel Masters", "TechSource",
  "BuildRight Supplies", "FastTrack Logistics", "ValuePro Trading",
];
const LOCATIONS = [
  "Site A", "Site B", "Warehouse North", "Warehouse South",
  "Factory Floor", "HQ Office", "Regional Office", "Distribution Center",
];
const PERIODS = ["January", "February", "Q1", "Q2", "March", "H1"];

function generateTaskTitle(): string {
  const template = pickRandom(TASK_TEMPLATES);
  return template
    .replace("{item}", pickRandom(ITEMS))
    .replace("{vendor}", pickRandom(VENDORS))
    .replace("{location}", pickRandom(LOCATIONS))
    .replace("{period}", pickRandom(PERIODS))
    .replace("{number}", String(randInt(100, 999)));
}

// ============================================
// Main seed function
// ============================================

async function main() {
  console.log("=== Productivity Seed Script ===\n");

  // 1. Clean productivity-related data (but NOT base seed data)
  console.log("Cleaning productivity data...");
  await prisma.productivitySnapshot.deleteMany();
  await prisma.productivityScore.deleteMany();
  await prisma.scoringConfig.deleteMany();
  await prisma.dailySessionTask.deleteMany();
  await prisma.dailyPlanningSession.deleteMany();
  await prisma.carryForwardLog.deleteMany();
  await prisma.taskStatusHistory.deleteMany();
  // Delete tasks that were created by this script (keep base seed tasks)
  // We'll delete ALL tasks and recreate — simpler and the base seed has only 9
  await prisma.taskAttachment.deleteMany();
  await prisma.taskComment.deleteMany();
  await prisma.task.deleteMany();

  // 2. Fetch existing data from base seed
  const existingDepartment = await prisma.department.findFirst();
  if (!existingDepartment) {
    throw new Error("No department found. Run base seed first: npm run db:seed");
  }

  const kpiBuckets = await prisma.kpiBucket.findMany();
  if (kpiBuckets.length === 0) {
    throw new Error("No KPI buckets found. Run base seed first: npm run db:seed");
  }

  const existingUsers = await prisma.user.findMany({
    where: { isActive: true, deletedAt: null },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Found ${existingUsers.length} existing users, ${kpiBuckets.length} KPI buckets`);

  // 2b. Create additional departments (Engineering, Marketing)
  // Ensure existing department is named Procurement (idempotent)
  let procurementDept = await prisma.department.findUnique({ where: { name: "Procurement" } });
  if (!procurementDept) {
    procurementDept = await prisma.department.update({
      where: { id: existingDepartment.id },
      data: { name: "Procurement" },
    });
  }

  const engineeringDept = await prisma.department.upsert({
    where: { name: "Engineering" },
    update: {},
    create: { name: "Engineering", description: "Software Engineering" },
  });

  const marketingDept = await prisma.department.upsert({
    where: { name: "Marketing" },
    update: {},
    create: { name: "Marketing", description: "Marketing & Communications" },
  });

  const departments = [
    procurementDept,
    engineeringDept,
    marketingDept,
  ];

  console.log(`Departments: ${departments.map((d) => d.name).join(", ")}`);

  // 3. Create additional users to reach 20, distributed across departments
  const passwordHash = await bcrypt.hash("password123", 10);
  const additionalNames = [
    // Engineering dept head + employees
    { first: "Vikram", last: "Singh", role: Role.DEPARTMENT_HEAD, deptIdx: 1 },
    { first: "Kavita", last: "Nair", role: Role.MANAGER, deptIdx: 1 },
    { first: "Deepa", last: "Joshi", role: Role.EMPLOYEE, deptIdx: 1 },
    { first: "Arjun", last: "Rao", role: Role.EMPLOYEE, deptIdx: 1 },
    { first: "Meera", last: "Pillai", role: Role.EMPLOYEE, deptIdx: 1 },
    { first: "Rohan", last: "Desai", role: Role.EMPLOYEE, deptIdx: 1 },
    // Marketing dept head + employees
    { first: "Suresh", last: "Iyer", role: Role.DEPARTMENT_HEAD, deptIdx: 2 },
    { first: "Pooja", last: "Bhat", role: Role.MANAGER, deptIdx: 2 },
    { first: "Karan", last: "Malhotra", role: Role.EMPLOYEE, deptIdx: 2 },
    { first: "Divya", last: "Saxena", role: Role.EMPLOYEE, deptIdx: 2 },
    { first: "Nikhil", last: "Tiwari", role: Role.EMPLOYEE, deptIdx: 2 },
    // Additional Procurement employee (deptIdx: 0)
    { first: "Swati", last: "Kulkarni", role: Role.EMPLOYEE, deptIdx: 0 },
  ];

  // Find existing managers and dept head for hierarchy
  const existingManagers = existingUsers.filter((u) => u.role === "MANAGER");
  const existingDeptHead = existingUsers.find((u) => u.role === "DEPARTMENT_HEAD");

  // Track dept heads for manager assignment
  const deptHeadIds: (string | null)[] = [
    existingDeptHead?.id ?? null,
    null, // will be filled
    null, // will be filled
  ];

  const newUsers: typeof existingUsers = [];
  for (let i = 0; i < additionalNames.length; i++) {
    const { first, last, role, deptIdx } = additionalNames[i];
    const email = `${first.toLowerCase()}.${last.toLowerCase()}@taskflow.com`;
    const dept = departments[deptIdx];

    // Determine manager
    let managerId: string | null = null;
    if (role === "DEPARTMENT_HEAD") {
      // Dept heads report to no one in seed
      managerId = null;
    } else if (role === "MANAGER") {
      managerId = deptHeadIds[deptIdx] ?? null;
    } else {
      // Employees: find a manager in the same department
      const deptManagers = [
        ...existingManagers.filter((u) => u.departmentId === dept.id),
        ...newUsers.filter((u) => u.role === "MANAGER" && u.departmentId === dept.id),
      ];
      if (deptManagers.length > 0) {
        managerId = deptManagers[i % deptManagers.length].id;
      } else if (deptHeadIds[deptIdx]) {
        managerId = deptHeadIds[deptIdx];
      }
    }

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        firstName: first,
        lastName: last,
        role,
        departmentId: dept.id,
        managerId,
      },
      create: {
        email,
        passwordHash,
        firstName: first,
        lastName: last,
        role,
        departmentId: dept.id,
        managerId,
      },
    });
    newUsers.push(user);

    // Track dept heads
    if (role === "DEPARTMENT_HEAD") {
      deptHeadIds[deptIdx] = user.id;
      // Also set as department head
      await prisma.department.update({
        where: { id: dept.id },
        data: { headId: user.id },
      });
    }
  }

  console.log(`Created ${newUsers.length} additional users`);

  // 4. Assign KPIs to new users
  for (const user of newUsers) {
    if (user.role === "DEPARTMENT_HEAD") continue; // dept heads don't get scored
    const count = user.role === "MANAGER" ? kpiBuckets.length : 7;
    const buckets = user.role === "MANAGER"
      ? kpiBuckets
      : faker.helpers.arrayElements(kpiBuckets, Math.min(count, kpiBuckets.length));

    for (const bucket of buckets) {
      const existing = await prisma.userKpi.findUnique({
        where: { userId_kpiBucketId: { userId: user.id, kpiBucketId: bucket.id } },
      });
      if (!existing) {
        await prisma.userKpi.create({
          data: { userId: user.id, kpiBucketId: bucket.id },
        });
      }
    }
  }

  console.log("Assigned KPIs to new users");

  // 5. Create ScoringConfig for each department
  const deptScoringConfig: Record<string, {
    weeklyOutputTarget: number;
    outputWeight: number;
    qualityWeight: number;
    reliabilityWeight: number;
    consistencyWeight: number;
  }> = {
    Engineering: { weeklyOutputTarget: 12, outputWeight: 0.30, qualityWeight: 0.30, reliabilityWeight: 0.25, consistencyWeight: 0.15 },
    Marketing: { weeklyOutputTarget: 10, outputWeight: 0.25, qualityWeight: 0.25, reliabilityWeight: 0.25, consistencyWeight: 0.25 },
    Default: { weeklyOutputTarget: 15, outputWeight: 0.35, qualityWeight: 0.25, reliabilityWeight: 0.25, consistencyWeight: 0.15 },
  };

  for (const dept of departments) {
    const config = deptScoringConfig[dept.name] || deptScoringConfig.Default;
    await prisma.scoringConfig.upsert({
      where: { departmentId: dept.id },
      update: {},
      create: {
        departmentId: dept.id,
        ...config,
      },
    });
  }

  console.log("Created scoring config");

  // 6. Generate productivity data for all 20 users
  const allUsers = [...existingUsers, ...newUsers].filter(
    (u) => u.role !== "ADMIN" && u.role !== "DEPARTMENT_HEAD" // Skip admin and dept heads for scoring
  );

  // If we have more than 20 non-admin users, trim. If fewer, use what we have.
  const scorableUsers = allUsers.slice(0, 20);

  const windowEnd = new Date();
  const windowStart = addDays(windowEnd, -28);

  console.log(`\nGenerating data for ${scorableUsers.length} users...`);
  console.log(`Window: ${windowStart.toISOString().split("T")[0]} to ${windowEnd.toISOString().split("T")[0]}\n`);

  const workdays = getWorkdays(windowStart, windowEnd);

  for (let idx = 0; idx < scorableUsers.length; idx++) {
    const user = scorableUsers[idx];
    const archetype = USER_ARCHETYPES[idx] || "solid";
    const profile = PROFILES[archetype];

    // Get user's KPI assignments
    const userKpis = await prisma.userKpi.findMany({
      where: { userId: user.id },
      select: { kpiBucketId: true },
    });
    const assignedBucketIds = userKpis.map((k) => k.kpiBucketId);
    const kpiBucketsToUse = assignedBucketIds.length > 0
      ? assignedBucketIds
      : kpiBuckets.map((k) => k.id);

    // How many distinct KPIs to spread tasks across
    const kpiSpreadCount = Math.max(
      1,
      Math.round(kpiBucketsToUse.length * profile.kpiSpreadFactor)
    );
    const activeKpiBuckets = faker.helpers.arrayElements(kpiBucketsToUse, kpiSpreadCount);

    // --- COMPLETED TASKS ---
    const completedCount = randInt(...profile.completedTaskCount);
    const completedTaskIds: string[] = [];
    const reviewedTaskIds: string[] = [];

    for (let t = 0; t < completedCount; t++) {
      const completedAt = randomDate(windowStart, windowEnd);
      const isOnTime = faker.number.float({ min: 0, max: 1 }) < profile.onTimeRate;
      const deadline = isOnTime
        ? addDays(completedAt, randInt(0, 3)) // deadline after completion = on time
        : addDays(completedAt, -randInt(1, 5)); // deadline before completion = late

      const size = pickWeighted(profile.sizeDistribution);
      const priority = pickWeighted(profile.priorityDistribution);
      const requiresReview = faker.number.float({ min: 0, max: 1 }) < profile.reviewRate;
      const kpiBucketId = pickRandom(activeKpiBuckets);
      const estimatedMinutes = size === "EASY" ? randInt(15, 60) : size === "MEDIUM" ? randInt(60, 180) : randInt(120, 360);

      const task = await prisma.task.create({
        data: {
          title: generateTaskTitle(),
          description: faker.lorem.sentence(),
          ownerId: user.id,
          assignedByType: pickRandom(ASSIGNED_BY_TYPES),
          status: TaskStatus.CLOSED_APPROVED,
          priority,
          size,
          kpiBucketId,
          estimatedMinutes,
          actualMinutes: Math.round(estimatedMinutes * faker.number.float({ min: 0.6, max: 1.5 })),
          deadline,
          completedAt,
          startDate: addDays(completedAt, -randInt(1, 7)),
          requiresReview,
        },
      });

      completedTaskIds.push(task.id);
      if (requiresReview) reviewedTaskIds.push(task.id);

      // --- STATUS HISTORY for completed tasks ---
      const baseDate = addDays(completedAt, -randInt(3, 10));
      const shouldReopen =
        requiresReview &&
        faker.number.float({ min: 0, max: 1 }) > profile.firstPassRate;

      // Standard lifecycle
      const historyEntries: {
        taskId: string;
        fromStatus: TaskStatus | null;
        toStatus: TaskStatus;
        changedById: string;
        createdAt: Date;
      }[] = [
        { taskId: task.id, fromStatus: null, toStatus: TaskStatus.NEW, changedById: user.id, createdAt: baseDate },
        { taskId: task.id, fromStatus: TaskStatus.NEW, toStatus: TaskStatus.ACCEPTED, changedById: user.id, createdAt: addDays(baseDate, 0.5) },
        { taskId: task.id, fromStatus: TaskStatus.ACCEPTED, toStatus: TaskStatus.IN_PROGRESS, changedById: user.id, createdAt: addDays(baseDate, 1) },
        { taskId: task.id, fromStatus: TaskStatus.IN_PROGRESS, toStatus: TaskStatus.COMPLETED_PENDING_REVIEW, changedById: user.id, createdAt: addDays(completedAt, -1) },
      ];

      if (shouldReopen) {
        // Reviewer reopens it
        historyEntries.push(
          { taskId: task.id, fromStatus: TaskStatus.COMPLETED_PENDING_REVIEW, toStatus: TaskStatus.REOPENED, changedById: user.id, createdAt: addDays(completedAt, -0.5) },
          { taskId: task.id, fromStatus: TaskStatus.REOPENED, toStatus: TaskStatus.IN_PROGRESS, changedById: user.id, createdAt: addDays(completedAt, -0.3) },
          { taskId: task.id, fromStatus: TaskStatus.IN_PROGRESS, toStatus: TaskStatus.COMPLETED_PENDING_REVIEW, changedById: user.id, createdAt: addDays(completedAt, -0.1) },
        );
      }

      // Final approval
      historyEntries.push(
        { taskId: task.id, fromStatus: TaskStatus.COMPLETED_PENDING_REVIEW, toStatus: TaskStatus.CLOSED_APPROVED, changedById: user.id, createdAt: completedAt },
      );

      // Also add CLOSED_APPROVED → REOPENED entries for the reopenRate (separate from firstPassRate)
      const shouldReopenFromClosed =
        faker.number.float({ min: 0, max: 1 }) < profile.reopenRate;
      if (shouldReopenFromClosed && !shouldReopen) {
        // This was approved but then reopened later
        historyEntries.push(
          { taskId: task.id, fromStatus: TaskStatus.CLOSED_APPROVED, toStatus: TaskStatus.REOPENED, changedById: user.id, createdAt: addDays(completedAt, 0.5) },
          { taskId: task.id, fromStatus: TaskStatus.REOPENED, toStatus: TaskStatus.IN_PROGRESS, changedById: user.id, createdAt: addDays(completedAt, 0.7) },
          { taskId: task.id, fromStatus: TaskStatus.IN_PROGRESS, toStatus: TaskStatus.COMPLETED_PENDING_REVIEW, changedById: user.id, createdAt: addDays(completedAt, 1) },
          { taskId: task.id, fromStatus: TaskStatus.COMPLETED_PENDING_REVIEW, toStatus: TaskStatus.CLOSED_APPROVED, changedById: user.id, createdAt: addDays(completedAt, 1.2) },
        );
      }

      await prisma.taskStatusHistory.createMany({ data: historyEntries });
    }

    // --- ACTIVE TASKS (not completed) ---
    const activeCount = randInt(...profile.activeTaskCount);
    const activeTaskIds: string[] = [];

    for (let t = 0; t < activeCount; t++) {
      const status = pickRandom(ACTIVE_STATUSES);
      const kpiBucketId = pickRandom(kpiBucketsToUse);
      const deadline = addDays(windowEnd, randInt(-5, 14));

      const task = await prisma.task.create({
        data: {
          title: generateTaskTitle(),
          description: faker.lorem.sentence(),
          ownerId: user.id,
          assignedByType: pickRandom(ASSIGNED_BY_TYPES),
          status,
          priority: pickWeighted(profile.priorityDistribution),
          size: pickWeighted(profile.sizeDistribution),
          kpiBucketId,
          estimatedMinutes: randInt(30, 240),
          actualMinutes: status === "IN_PROGRESS" ? randInt(10, 120) : 0,
          deadline,
          startDate: status !== "ACCEPTED" ? addDays(deadline, -randInt(3, 14)) : undefined,
          onHoldReason: status === "ON_HOLD" ? faker.lorem.sentence() : undefined,
        },
      });

      activeTaskIds.push(task.id);

      // Minimal status history for active tasks
      await prisma.taskStatusHistory.createMany({
        data: [
          { taskId: task.id, fromStatus: null, toStatus: TaskStatus.NEW, changedById: user.id, createdAt: addDays(deadline, -randInt(7, 14)) },
          { taskId: task.id, fromStatus: TaskStatus.NEW, toStatus: TaskStatus.ACCEPTED, changedById: user.id, createdAt: addDays(deadline, -randInt(5, 10)) },
        ],
      });
    }

    // --- CARRY FORWARD LOGS ---
    const cfCount = randInt(...profile.carryForwardCount);
    const cfTaskPool = [...activeTaskIds, ...completedTaskIds.slice(0, 3)];
    for (let c = 0; c < cfCount && cfTaskPool.length > 0; c++) {
      const taskId = pickRandom(cfTaskPool);
      const fromDate = randomDate(windowStart, addDays(windowEnd, -7));
      await prisma.carryForwardLog.create({
        data: {
          taskId,
          userId: user.id,
          fromDate,
          toDate: addDays(fromDate, 1),
          reason: faker.helpers.arrayElement([
            "Blocked by vendor response",
            "Higher priority task came in",
            "Waiting on manager approval",
            "Needed additional information",
            "Unexpected meeting schedule",
            "Dependencies not ready",
          ]),
          createdAt: fromDate,
        },
      });
    }

    // --- DAILY PLANNING SESSIONS ---
    for (const day of workdays) {
      const morningCompleted = faker.number.float({ min: 0, max: 1 }) < profile.planningRate;
      const eveningCompleted = morningCompleted && faker.number.float({ min: 0, max: 1 }) < 0.6;

      await prisma.dailyPlanningSession.create({
        data: {
          userId: user.id,
          sessionDate: startOfDay(day),
          morningCompleted,
          morningCompletedAt: morningCompleted
            ? new Date(day.getTime() + randInt(7, 10) * 3600000) // 7-10am
            : undefined,
          eveningCompleted,
          eveningCompletedAt: eveningCompleted
            ? new Date(day.getTime() + randInt(17, 19) * 3600000) // 5-7pm
            : undefined,
        },
      });
    }

    console.log(
      `  [${idx + 1}/20] ${user.firstName} ${user.lastName} (${archetype}): ` +
      `${completedCount} completed, ${activeCount} active, ${cfCount} carry-forwards`
    );
  }

  // 7. Seed historical snapshots (12 weeks) for trend charts
  console.log("\nGenerating 12 weeks of historical snapshots...");

  const mondays = getMondaysGoingBack(11);

  for (const user of scorableUsers) {
    const idx = scorableUsers.indexOf(user);
    const archetype = USER_ARCHETYPES[idx] || "solid";
    const profile = PROFILES[archetype];

    // Base scores for the archetype with some random jitter
    const baseOutput = archetype === "star" ? 85 : archetype === "solid" ? 65 : archetype === "speed_demon" ? 85 : archetype === "careful" ? 40 : 25;
    const baseQuality = archetype === "star" ? 92 : archetype === "solid" ? 75 : archetype === "speed_demon" ? 55 : archetype === "careful" ? 95 : 48;
    const baseReliability = archetype === "star" ? 88 : archetype === "solid" ? 72 : archetype === "speed_demon" ? 60 : archetype === "careful" ? 85 : 38;
    const baseConsistency = archetype === "star" ? 85 : archetype === "solid" ? 65 : archetype === "speed_demon" ? 42 : archetype === "careful" ? 75 : 28;

    // Trend direction: stars improve, struggling declines, others stable with noise
    const trendFactor = archetype === "star" ? 0.5 : archetype === "struggling" ? -0.5 : 0;

    for (let w = 0; w < mondays.length; w++) {
      const weekProgress = w / mondays.length; // 0 to 1
      const trend = trendFactor * weekProgress * 10; // -5 to +5 over 12 weeks
      const jitter = () => faker.number.float({ min: -8, max: 8 });

      const output = Math.max(0, Math.min(100, baseOutput + trend + jitter()));
      const quality = Math.max(0, Math.min(100, baseQuality + trend + jitter()));
      const reliability = Math.max(0, Math.min(100, baseReliability + trend + jitter()));
      const consistency = Math.max(0, Math.min(100, baseConsistency + trend + jitter()));
      // Historical snapshots use fixed Procurement/Default weights (0.35/0.25/0.25/0.15)
      // rather than per-department ScoringConfig, since these represent synthetic past
      // data seeded before department-specific configs existed.
      const composite = output * 0.35 + quality * 0.25 + reliability * 0.25 + consistency * 0.15;

      await prisma.productivitySnapshot.create({
        data: {
          userId: user.id,
          weekStartDate: mondays[w],
          output: Math.round(output * 10) / 10,
          quality: Math.round(quality * 10) / 10,
          reliability: Math.round(reliability * 10) / 10,
          consistency: Math.round(consistency * 10) / 10,
          composite: Math.round(composite * 10) / 10,
          taskCount: randInt(3, 18),
          reviewedTaskCount: randInt(2, 10),
        },
      });
    }
  }

  console.log(`Created ${scorableUsers.length * mondays.length} weekly snapshots`);

  // 8. Summary
  console.log("\n========================================");
  console.log("Productivity seed completed!");
  console.log("========================================\n");
  console.log("User archetypes:");
  for (let i = 0; i < scorableUsers.length; i++) {
    const u = scorableUsers[i];
    const a = USER_ARCHETYPES[i] || "solid";
    const emoji = a === "star" ? "★" : a === "solid" ? "●" : a === "speed_demon" ? "⚡" : a === "careful" ? "◆" : "▼";
    console.log(`  ${emoji} ${u.firstName} ${u.lastName} — ${a}`);
  }
  console.log("\nNext steps:");
  console.log("  1. Log in as admin@taskflow.com (password: password123)");
  console.log("  2. Go to /productivity");
  console.log("  3. Click 'Recalculate' to compute live scores");
  console.log("  4. Browse leaderboard, click users for scorecards, check trends");
  console.log("========================================\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
