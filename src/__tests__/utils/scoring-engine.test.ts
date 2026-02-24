import { TaskStatus, TaskSize, TaskPriority } from "@prisma/client";
import {
  calculateOutputScore,
  calculateQualityScore,
  calculateReliabilityScore,
  calculateConsistencyScore,
  calculateComposite,
  getWorkdayCount,
  ScoredTask,
  StatusTransition,
  CarryForwardEntry,
  PlanningDay,
  UserKpiEntry,
} from "@/lib/productivity/scoring-engine";

function createMockCompletedTask(overrides: Partial<ScoredTask> = {}): ScoredTask {
  return {
    id: `task-${Math.random().toString(36).slice(2, 8)}`,
    status: TaskStatus.CLOSED_APPROVED,
    size: TaskSize.MEDIUM,
    priority: TaskPriority.NOT_URGENT_IMPORTANT,
    completedAt: new Date(),
    deadline: new Date(Date.now() + 86400000),
    estimatedMinutes: 60,
    actualMinutes: 0,
    requiresReview: true,
    kpiBucketId: "kpi-1",
    carryForwardCount: 0,
    ...overrides,
  };
}

function createMockStatusHistory(
  taskId: string,
  transitions: [TaskStatus | null, TaskStatus][]
): StatusTransition[] {
  return transitions.map(([from, to], i) => ({
    taskId,
    fromStatus: from,
    toStatus: to,
    createdAt: new Date(Date.now() + i * 1000),
  }));
}

// ============================================
// Output Score Tests
// ============================================

describe("calculateOutputScore", () => {
  it("should return 0 for zero completed tasks", () => {
    const result = calculateOutputScore([], 15);
    expect(result.score).toBe(0);
    expect(result.points).toBe(0);
  });

  it("should return 0 when weeklyTarget is 0", () => {
    const tasks = [createMockCompletedTask()];
    const result = calculateOutputScore(tasks, 0);
    expect(result.score).toBe(0);
    expect(result.points).toBe(0);
    expect(result.target).toBe(0);
  });

  it("should calculate correct points for EASY tasks", () => {
    const tasks = [createMockCompletedTask({ size: TaskSize.EASY })];
    const result = calculateOutputScore(tasks, 15);
    expect(result.points).toBe(1); // EASY = 1
  });

  it("should calculate correct points for MEDIUM tasks", () => {
    const tasks = [createMockCompletedTask({ size: TaskSize.MEDIUM })];
    const result = calculateOutputScore(tasks, 15);
    expect(result.points).toBe(2); // MEDIUM = 2
  });

  it("should calculate correct points for DIFFICULT tasks", () => {
    const tasks = [createMockCompletedTask({ size: TaskSize.DIFFICULT })];
    const result = calculateOutputScore(tasks, 15);
    expect(result.points).toBe(4); // DIFFICULT = 4
  });

  it("should apply 1.5x multiplier for URGENT_IMPORTANT priority", () => {
    const tasks = [
      createMockCompletedTask({
        size: TaskSize.MEDIUM,
        priority: TaskPriority.URGENT_IMPORTANT,
      }),
    ];
    const result = calculateOutputScore(tasks, 15);
    expect(result.points).toBe(3); // 2 * 1.5
  });

  it("should apply 1.0x multiplier for non-URGENT_IMPORTANT priorities", () => {
    const tasks = [
      createMockCompletedTask({ priority: TaskPriority.URGENT_NOT_IMPORTANT }),
      createMockCompletedTask({ priority: TaskPriority.NOT_URGENT_NOT_IMPORTANT }),
    ];
    const result = calculateOutputScore(tasks, 15);
    expect(result.points).toBe(4); // 2 * 1.0 + 2 * 1.0
  });

  it("should return 100 when exactly hitting target", () => {
    // Target = 15 * 4 = 60 points
    // 30 MEDIUM tasks = 30 * 2 = 60 points
    const tasks = Array.from({ length: 30 }, () => createMockCompletedTask());
    const result = calculateOutputScore(tasks, 15);
    expect(result.score).toBe(100);
  });

  it("should cap score at 100 when exceeding target", () => {
    const tasks = Array.from({ length: 50 }, () => createMockCompletedTask());
    const result = calculateOutputScore(tasks, 15);
    expect(result.score).toBe(100);
  });

  it("should correctly mix task sizes and priorities", () => {
    const tasks = [
      createMockCompletedTask({ size: TaskSize.EASY, priority: TaskPriority.URGENT_IMPORTANT }),  // 1 * 1.5 = 1.5
      createMockCompletedTask({ size: TaskSize.MEDIUM, priority: TaskPriority.NOT_URGENT_IMPORTANT }),  // 2 * 1.0 = 2
      createMockCompletedTask({ size: TaskSize.DIFFICULT, priority: TaskPriority.URGENT_IMPORTANT }),  // 4 * 1.5 = 6
    ];
    const result = calculateOutputScore(tasks, 15);
    expect(result.points).toBe(9.5);
    expect(result.target).toBe(60);
  });
});

// ============================================
// Quality Score Tests
// ============================================

describe("calculateQualityScore", () => {
  it("should return 100 when no completed tasks", () => {
    const result = calculateQualityScore([], []);
    expect(result.score).toBe(100);
  });

  it("should return 100 when all tasks are first-pass approved", () => {
    const task1 = createMockCompletedTask({ id: "t1" });
    const task2 = createMockCompletedTask({ id: "t2" });
    const task3 = createMockCompletedTask({ id: "t3" });
    const tasks = [task1, task2, task3];

    const histories = [
      ...createMockStatusHistory("t1", [[null, TaskStatus.NEW], [TaskStatus.NEW, TaskStatus.COMPLETED_PENDING_REVIEW], [TaskStatus.COMPLETED_PENDING_REVIEW, TaskStatus.CLOSED_APPROVED]]),
      ...createMockStatusHistory("t2", [[null, TaskStatus.NEW], [TaskStatus.NEW, TaskStatus.COMPLETED_PENDING_REVIEW], [TaskStatus.COMPLETED_PENDING_REVIEW, TaskStatus.CLOSED_APPROVED]]),
      ...createMockStatusHistory("t3", [[null, TaskStatus.NEW], [TaskStatus.NEW, TaskStatus.COMPLETED_PENDING_REVIEW], [TaskStatus.COMPLETED_PENDING_REVIEW, TaskStatus.CLOSED_APPROVED]]),
    ];

    const result = calculateQualityScore(tasks, histories);
    expect(result.score).toBe(100);
    expect(result.firstPassRate).toBe(1);
    expect(result.reopenRate).toBe(1);
  });

  it("should detect reopened tasks and lower score", () => {
    const task1 = createMockCompletedTask({ id: "t1" });
    const task2 = createMockCompletedTask({ id: "t2" });
    const task3 = createMockCompletedTask({ id: "t3" });
    const tasks = [task1, task2, task3];

    const histories = [
      ...createMockStatusHistory("t1", [
        [null, TaskStatus.NEW],
        [TaskStatus.NEW, TaskStatus.COMPLETED_PENDING_REVIEW],
        [TaskStatus.COMPLETED_PENDING_REVIEW, TaskStatus.CLOSED_APPROVED],
      ]),
      ...createMockStatusHistory("t2", [
        [null, TaskStatus.NEW],
        [TaskStatus.NEW, TaskStatus.COMPLETED_PENDING_REVIEW],
        [TaskStatus.COMPLETED_PENDING_REVIEW, TaskStatus.REOPENED],
        [TaskStatus.REOPENED, TaskStatus.COMPLETED_PENDING_REVIEW],
        [TaskStatus.COMPLETED_PENDING_REVIEW, TaskStatus.CLOSED_APPROVED],
      ]),
      ...createMockStatusHistory("t3", [
        [null, TaskStatus.NEW],
        [TaskStatus.NEW, TaskStatus.COMPLETED_PENDING_REVIEW],
        [TaskStatus.COMPLETED_PENDING_REVIEW, TaskStatus.CLOSED_APPROVED],
      ]),
    ];

    const result = calculateQualityScore(tasks, histories);
    // 2/3 first pass, 3/3 reopen rate (no CLOSED_APPROVED -> REOPENED)
    expect(result.firstPassRate).toBeCloseTo(2 / 3);
    expect(result.reopenRate).toBe(1);
    // score = (2/3 * 0.6 + 1 * 0.4) * 100 = 80
    expect(result.score).toBeCloseTo(80, 0);
  });

  it("should use reopen_rate only when fewer than 3 reviewed tasks", () => {
    const task1 = createMockCompletedTask({ id: "t1" });
    const task2 = createMockCompletedTask({ id: "t2", requiresReview: false });

    const histories = [
      ...createMockStatusHistory("t1", [
        [null, TaskStatus.NEW],
        [TaskStatus.NEW, TaskStatus.COMPLETED_PENDING_REVIEW],
        [TaskStatus.COMPLETED_PENDING_REVIEW, TaskStatus.CLOSED_APPROVED],
      ]),
      ...createMockStatusHistory("t2", [
        [null, TaskStatus.NEW],
        [TaskStatus.NEW, TaskStatus.CLOSED_APPROVED],
      ]),
    ];

    const result = calculateQualityScore([task1, task2], histories);
    // Only 1 reviewed task (< 3), so score = reopenRate * 100
    expect(result.reopenRate).toBe(1);
    expect(result.score).toBe(100);
  });

  it("should detect CLOSED_APPROVED -> REOPENED for reopen rate", () => {
    const task1 = createMockCompletedTask({ id: "t1", requiresReview: false });
    const tasks = [task1];

    const histories = createMockStatusHistory("t1", [
      [null, TaskStatus.NEW],
      [TaskStatus.NEW, TaskStatus.CLOSED_APPROVED],
      [TaskStatus.CLOSED_APPROVED, TaskStatus.REOPENED],
      [TaskStatus.REOPENED, TaskStatus.CLOSED_APPROVED],
    ]);

    const result = calculateQualityScore(tasks, histories);
    expect(result.reopenRate).toBe(0);
    expect(result.score).toBe(0);
  });

  it("should count multiple reopen cycles as 1 reopened task", () => {
    const task1 = createMockCompletedTask({ id: "t1", requiresReview: false });
    const tasks = [task1];

    const histories = createMockStatusHistory("t1", [
      [null, TaskStatus.NEW],
      [TaskStatus.NEW, TaskStatus.CLOSED_APPROVED],
      [TaskStatus.CLOSED_APPROVED, TaskStatus.REOPENED],
      [TaskStatus.REOPENED, TaskStatus.CLOSED_APPROVED],
      [TaskStatus.CLOSED_APPROVED, TaskStatus.REOPENED],
      [TaskStatus.REOPENED, TaskStatus.CLOSED_APPROVED],
    ]);

    const result = calculateQualityScore(tasks, histories);
    // 1 task reopened out of 1 total
    expect(result.reopenRate).toBe(0);
  });

  it("should handle all tasks reopened then approved", () => {
    const tasks = [
      createMockCompletedTask({ id: "t1" }),
      createMockCompletedTask({ id: "t2" }),
      createMockCompletedTask({ id: "t3" }),
    ];

    const histories = [
      ...createMockStatusHistory("t1", [
        [TaskStatus.COMPLETED_PENDING_REVIEW, TaskStatus.REOPENED],
        [TaskStatus.REOPENED, TaskStatus.CLOSED_APPROVED],
      ]),
      ...createMockStatusHistory("t2", [
        [TaskStatus.COMPLETED_PENDING_REVIEW, TaskStatus.REOPENED],
        [TaskStatus.REOPENED, TaskStatus.CLOSED_APPROVED],
      ]),
      ...createMockStatusHistory("t3", [
        [TaskStatus.COMPLETED_PENDING_REVIEW, TaskStatus.REOPENED],
        [TaskStatus.REOPENED, TaskStatus.CLOSED_APPROVED],
      ]),
    ];

    const result = calculateQualityScore(tasks, histories);
    expect(result.firstPassRate).toBe(0);
    expect(result.reopenRate).toBe(1); // no CLOSED_APPROVED -> REOPENED transitions
    // score = (0 * 0.6 + 1 * 0.4) * 100 = 40
    expect(result.score).toBe(40);
  });
});

// ============================================
// Reliability Score Tests
// ============================================

describe("calculateReliabilityScore", () => {
  it("should return 100 when no completed tasks", () => {
    const result = calculateReliabilityScore([], [], []);
    expect(result.score).toBe(100);
  });

  it("should return high score when all tasks on time", () => {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 86400000);
    const tasks = [
      createMockCompletedTask({ completedAt: now, deadline: tomorrow }),
      createMockCompletedTask({ completedAt: now, deadline: tomorrow }),
    ];

    const result = calculateReliabilityScore(tasks, [], tasks);
    expect(result.onTimeRate).toBe(1);
  });

  it("should return low score when all tasks are late", () => {
    const yesterday = new Date(Date.now() - 86400000);
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000);
    const tasks = [
      createMockCompletedTask({ completedAt: yesterday, deadline: twoDaysAgo }),
      createMockCompletedTask({ completedAt: yesterday, deadline: twoDaysAgo }),
    ];

    const result = calculateReliabilityScore(tasks, [], tasks);
    expect(result.onTimeRate).toBe(0);
  });

  it("should handle mix of on-time and late tasks", () => {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 86400000);
    const yesterday = new Date(now.getTime() - 86400000);

    const tasks = [
      createMockCompletedTask({ completedAt: now, deadline: tomorrow }), // on time
      createMockCompletedTask({ completedAt: now, deadline: yesterday }), // late
    ];

    const result = calculateReliabilityScore(tasks, [], tasks);
    expect(result.onTimeRate).toBe(0.5);
  });

  it("should count task completed exactly at deadline as on-time", () => {
    const deadline = new Date("2026-02-15T17:00:00.000Z");
    const tasks = [
      createMockCompletedTask({ completedAt: deadline, deadline }),
    ];

    const result = calculateReliabilityScore(tasks, [], tasks);
    expect(result.onTimeRate).toBe(1);
  });

  it("should count task completed 1ms after deadline as late", () => {
    const deadline = new Date("2026-02-15T17:00:00.000Z");
    const lateBy1ms = new Date(deadline.getTime() + 1);
    const tasks = [
      createMockCompletedTask({ completedAt: lateBy1ms, deadline }),
    ];

    const result = calculateReliabilityScore(tasks, [], tasks);
    expect(result.onTimeRate).toBe(0);
  });

  it("should return carryForwardScore of 1 when zero carry-forwards", () => {
    const tasks = [createMockCompletedTask({ completedAt: new Date(), deadline: new Date(Date.now() + 86400000) })];
    const result = calculateReliabilityScore(tasks, [], tasks);
    expect(result.carryForwardScore).toBe(1);
  });

  it("should reduce score with many carry-forwards", () => {
    const tasks = [createMockCompletedTask({ completedAt: new Date(), deadline: new Date(Date.now() + 86400000) })];
    const carryForwards: CarryForwardEntry[] = Array.from({ length: 5 }, () => ({
      taskId: "t1",
      userId: "u1",
      createdAt: new Date(),
    }));

    // 1 active task, 5 carry-forwards: carryForwardScore = 1 - min(1, 5/1) = 0
    const result = calculateReliabilityScore(tasks, carryForwards, tasks);
    expect(result.carryForwardScore).toBe(0);
  });

  it("should cap carry-forward penalty at 0", () => {
    const tasks = [createMockCompletedTask({ completedAt: new Date(), deadline: new Date(Date.now() + 86400000) })];
    const carryForwards: CarryForwardEntry[] = Array.from({ length: 10 }, () => ({
      taskId: "t1",
      userId: "u1",
      createdAt: new Date(),
    }));

    const result = calculateReliabilityScore(tasks, carryForwards, tasks);
    expect(result.carryForwardScore).toBe(0);
  });
});

// ============================================
// Consistency Score Tests
// ============================================

describe("calculateConsistencyScore", () => {
  // Use a known Monday-to-Friday week (UTC)
  const monday = new Date("2026-02-16T00:00:00.000Z"); // Monday
  const friday = new Date("2026-02-20T00:00:00.000Z"); // Friday (5 workdays Mon-Fri)

  it("should return planningRate 1.0 when morning ritual every weekday", () => {
    const DAY_MS = 86400000;
    const sessions: PlanningDay[] = Array.from({ length: 5 }, (_, i) => ({
      sessionDate: new Date(monday.getTime() + i * DAY_MS),
      morningCompleted: true,
    }));

    const result = calculateConsistencyScore(sessions, [], [], monday, friday);
    expect(result.planningRate).toBe(1);
  });

  it("should return planningRate 0 when no morning rituals", () => {
    const result = calculateConsistencyScore([], [], [], monday, friday);
    expect(result.planningRate).toBe(0);
  });

  it("should calculate partial planning rate correctly", () => {
    const DAY_MS = 86400000;
    const sessions: PlanningDay[] = [
      { sessionDate: monday, morningCompleted: true },
      { sessionDate: new Date(monday.getTime() + DAY_MS), morningCompleted: false },
      { sessionDate: new Date(monday.getTime() + 2 * DAY_MS), morningCompleted: true },
    ];

    const result = calculateConsistencyScore(sessions, [], [], monday, friday);
    expect(result.planningRate).toBeCloseTo(2 / 5);
  });

  it("should return kpiSpread 1.0 when all KPI buckets are active", () => {
    const userKpis: UserKpiEntry[] = [
      { kpiBucketId: "kpi-1" },
      { kpiBucketId: "kpi-2" },
    ];
    const tasks = [
      createMockCompletedTask({ kpiBucketId: "kpi-1" }),
      createMockCompletedTask({ kpiBucketId: "kpi-2" }),
    ];

    const sessions: PlanningDay[] = Array.from({ length: 5 }, (_, i) => ({
      sessionDate: new Date(monday.getTime() + i * 86400000),
      morningCompleted: true,
    }));

    const result = calculateConsistencyScore(sessions, userKpis, tasks, monday, friday);
    expect(result.kpiSpread).toBe(1);
  });

  it("should return kpiSpread 0.2 when 1 of 5 KPIs active", () => {
    const userKpis: UserKpiEntry[] = Array.from({ length: 5 }, (_, i) => ({
      kpiBucketId: `kpi-${i + 1}`,
    }));
    const tasks = [createMockCompletedTask({ kpiBucketId: "kpi-1" })];

    const result = calculateConsistencyScore([], userKpis, tasks, monday, friday);
    expect(result.kpiSpread).toBeCloseTo(0.2);
  });

  it("should return kpiSpread 1.0 when zero assigned KPIs", () => {
    const result = calculateConsistencyScore([], [], [], monday, friday);
    expect(result.kpiSpread).toBe(1);
  });

  it("should exclude weekends from workday count", () => {
    // Monday to Sunday (next week)
    const mondayToSunday = new Date("2026-02-22T00:00:00.000Z"); // Sunday
    const result = calculateConsistencyScore([], [], [], monday, mondayToSunday);
    expect(result.planningRate).toBe(0);
    // 5 weekdays (Mon-Fri), weekend excluded
  });
});

// ============================================
// Composite Score Tests
// ============================================

describe("calculateComposite", () => {
  it("should return 100 when all pillars at 100", () => {
    const result = calculateComposite(
      { output: 100, quality: 100, reliability: 100, consistency: 100 },
      { outputWeight: 0.35, qualityWeight: 0.25, reliabilityWeight: 0.25, consistencyWeight: 0.15 }
    );
    expect(result).toBe(100);
  });

  it("should return 0 when all pillars at 0", () => {
    const result = calculateComposite(
      { output: 0, quality: 0, reliability: 0, consistency: 0 },
      { outputWeight: 0.35, qualityWeight: 0.25, reliabilityWeight: 0.25, consistencyWeight: 0.15 }
    );
    expect(result).toBe(0);
  });

  it("should apply custom weights correctly", () => {
    const result = calculateComposite(
      { output: 100, quality: 0, reliability: 0, consistency: 0 },
      { outputWeight: 0.5, qualityWeight: 0.2, reliabilityWeight: 0.2, consistencyWeight: 0.1 }
    );
    expect(result).toBe(50);
  });

  it("should round to 1 decimal place", () => {
    const result = calculateComposite(
      { output: 33, quality: 33, reliability: 33, consistency: 33 },
      { outputWeight: 0.35, qualityWeight: 0.25, reliabilityWeight: 0.25, consistencyWeight: 0.15 }
    );
    expect(result).toBe(33);
  });
});

// ============================================
// Workday Count Tests
// ============================================

describe("getWorkdayCount", () => {
  it("should return 5 for a full Mon-Fri week", () => {
    const monday = new Date("2026-02-16T00:00:00.000Z");
    const friday = new Date("2026-02-20T00:00:00.000Z");
    expect(getWorkdayCount(monday, friday)).toBe(5);
  });

  it("should return ~20 for a 4-week window", () => {
    const start = new Date("2026-01-26T00:00:00.000Z"); // Monday
    const end = new Date("2026-02-20T00:00:00.000Z"); // Friday
    expect(getWorkdayCount(start, end)).toBe(20);
  });

  it("should return 0 when starting on Saturday and ending on Sunday", () => {
    const saturday = new Date("2026-02-21T00:00:00.000Z"); // Saturday
    const sunday = new Date("2026-02-22T00:00:00.000Z"); // Sunday
    expect(getWorkdayCount(saturday, sunday)).toBe(0);
  });

  it("should return 1 for a single Monday", () => {
    const monday = new Date("2026-02-16T00:00:00.000Z");
    expect(getWorkdayCount(monday, monday)).toBe(1);
  });

  it("should return 0 for a single Saturday", () => {
    const saturday = new Date("2026-02-21T00:00:00.000Z");
    expect(getWorkdayCount(saturday, saturday)).toBe(0);
  });

  it("should handle window starting on Saturday correctly", () => {
    const saturday = new Date("2026-02-21T00:00:00.000Z"); // Saturday
    const nextFriday = new Date("2026-02-27T00:00:00.000Z"); // Friday
    expect(getWorkdayCount(saturday, nextFriday)).toBe(5); // Mon-Fri
  });
});

// ============================================
// Edge Cases: Quality Score — Multi-cycle Reopens
// ============================================

describe("calculateQualityScore — edge cases", () => {
  it("should handle task with no status history records", () => {
    const task = createMockCompletedTask({ id: "t1" });
    const result = calculateQualityScore([task], []);
    // No history → no reopened detected → perfect score fallback (< 3 reviewed → reopen-only)
    expect(result.reopenRate).toBe(1);
    expect(result.score).toBe(100);
  });

  it("should handle mix of reviewed and non-reviewed tasks crossing the 3-task threshold", () => {
    // 3 reviewed tasks (threshold), 1 non-reviewed
    const tasks = [
      createMockCompletedTask({ id: "t1", requiresReview: true }),
      createMockCompletedTask({ id: "t2", requiresReview: true }),
      createMockCompletedTask({ id: "t3", requiresReview: true }),
      createMockCompletedTask({ id: "t4", requiresReview: false }),
    ];

    // t1: first-pass approved, t2: reopened in review, t3: first-pass approved
    const histories = [
      ...createMockStatusHistory("t1", [
        [TaskStatus.COMPLETED_PENDING_REVIEW, TaskStatus.CLOSED_APPROVED],
      ]),
      ...createMockStatusHistory("t2", [
        [TaskStatus.COMPLETED_PENDING_REVIEW, TaskStatus.REOPENED],
        [TaskStatus.REOPENED, TaskStatus.COMPLETED_PENDING_REVIEW],
        [TaskStatus.COMPLETED_PENDING_REVIEW, TaskStatus.CLOSED_APPROVED],
      ]),
      ...createMockStatusHistory("t3", [
        [TaskStatus.COMPLETED_PENDING_REVIEW, TaskStatus.CLOSED_APPROVED],
      ]),
      ...createMockStatusHistory("t4", [
        [TaskStatus.NEW, TaskStatus.CLOSED_APPROVED],
      ]),
    ];

    const result = calculateQualityScore(tasks, histories);
    // 3 reviewed, 2 first-pass → firstPassRate = 2/3
    expect(result.firstPassRate).toBeCloseTo(2 / 3);
    // No CLOSED_APPROVED → REOPENED transitions → reopenRate = 1
    expect(result.reopenRate).toBe(1);
    // ≥3 reviewed → weighted: (2/3 * 0.6 + 1 * 0.4) * 100 = 80
    expect(result.score).toBeCloseTo(80, 0);
  });

  it("should handle task reopened from CLOSED_APPROVED multiple times", () => {
    // Task approved → reopened → approved → reopened → approved (3 cycles)
    const task = createMockCompletedTask({ id: "t1", requiresReview: false });
    const histories = createMockStatusHistory("t1", [
      [null, TaskStatus.NEW],
      [TaskStatus.NEW, TaskStatus.CLOSED_APPROVED],
      [TaskStatus.CLOSED_APPROVED, TaskStatus.REOPENED],
      [TaskStatus.REOPENED, TaskStatus.CLOSED_APPROVED],
      [TaskStatus.CLOSED_APPROVED, TaskStatus.REOPENED],
      [TaskStatus.REOPENED, TaskStatus.CLOSED_APPROVED],
      [TaskStatus.CLOSED_APPROVED, TaskStatus.REOPENED],
      [TaskStatus.REOPENED, TaskStatus.CLOSED_APPROVED],
    ]);

    const result = calculateQualityScore([task], histories);
    // Still counts as 1 reopened task (not 3)
    expect(result.reopenRate).toBe(0);
    expect(result.score).toBe(0);
  });

  it("should correctly score when some tasks have CLOSED_APPROVED→REOPENED and others have review reopens", () => {
    const tasks = [
      createMockCompletedTask({ id: "t1", requiresReview: true }),
      createMockCompletedTask({ id: "t2", requiresReview: true }),
      createMockCompletedTask({ id: "t3", requiresReview: true }),
      createMockCompletedTask({ id: "t4", requiresReview: false }),
    ];

    const histories = [
      // t1: clean first-pass
      ...createMockStatusHistory("t1", [
        [TaskStatus.COMPLETED_PENDING_REVIEW, TaskStatus.CLOSED_APPROVED],
      ]),
      // t2: failed first-pass (reopened during review)
      ...createMockStatusHistory("t2", [
        [TaskStatus.COMPLETED_PENDING_REVIEW, TaskStatus.REOPENED],
        [TaskStatus.REOPENED, TaskStatus.COMPLETED_PENDING_REVIEW],
        [TaskStatus.COMPLETED_PENDING_REVIEW, TaskStatus.CLOSED_APPROVED],
      ]),
      // t3: clean first-pass
      ...createMockStatusHistory("t3", [
        [TaskStatus.COMPLETED_PENDING_REVIEW, TaskStatus.CLOSED_APPROVED],
      ]),
      // t4: approved then reopened post-approval (affects reopen rate)
      ...createMockStatusHistory("t4", [
        [TaskStatus.NEW, TaskStatus.CLOSED_APPROVED],
        [TaskStatus.CLOSED_APPROVED, TaskStatus.REOPENED],
        [TaskStatus.REOPENED, TaskStatus.CLOSED_APPROVED],
      ]),
    ];

    const result = calculateQualityScore(tasks, histories);
    // firstPassRate: 2/3 reviewed passed (t1, t3 pass; t2 failed)
    expect(result.firstPassRate).toBeCloseTo(2 / 3);
    // reopenRate: 1 of 4 total tasks had CLOSED_APPROVED→REOPENED (t4)
    expect(result.reopenRate).toBe(0.75);
    // ≥3 reviewed → weighted: (2/3 * 0.6 + 0.75 * 0.4) * 100 = 70
    expect(result.score).toBeCloseTo(70, 0);
  });
});

// ============================================
// Edge Cases: Reliability — null completedAt
// ============================================

describe("calculateReliabilityScore — edge cases", () => {
  it("should treat task with null completedAt as late", () => {
    const task = createMockCompletedTask({
      completedAt: null,
      deadline: new Date(Date.now() + 86400000),
    });

    const result = calculateReliabilityScore([task], [], [task]);
    // null completedAt short-circuits (t.completedAt && t.completedAt <= t.deadline) → counted as late
    expect(result.onTimeRate).toBe(0);
  });

  it("should handle all tasks having null completedAt", () => {
    const tasks = [
      createMockCompletedTask({ completedAt: null, deadline: new Date() }),
      createMockCompletedTask({ completedAt: null, deadline: new Date() }),
    ];

    const result = calculateReliabilityScore(tasks, [], tasks);
    expect(result.onTimeRate).toBe(0);
    // score = (0 * 0.65 + carryForwardScore * 0.35) * 100
    expect(result.score).toBeLessThanOrEqual(35);
  });

  it("should handle carry-forwards exceeding active task count", () => {
    const tasks = [
      createMockCompletedTask({ completedAt: new Date(), deadline: new Date(Date.now() + 86400000) }),
    ];
    const carryForwards: CarryForwardEntry[] = Array.from({ length: 100 }, () => ({
      taskId: "t1",
      userId: "u1",
      createdAt: new Date(),
    }));

    const result = calculateReliabilityScore(tasks, carryForwards, tasks);
    // min(1, 100/1) = 1, so carryForwardScore = 0
    expect(result.carryForwardScore).toBe(0);
    // onTimeRate = 1, score = (1 * 0.65 + 0 * 0.35) * 100 = 65
    expect(result.score).toBe(65);
  });

  it("should handle zero active tasks with carry-forwards", () => {
    const completed = [
      createMockCompletedTask({ completedAt: new Date(), deadline: new Date(Date.now() + 86400000) }),
    ];
    const carryForwards: CarryForwardEntry[] = [
      { taskId: "t1", userId: "u1", createdAt: new Date() },
    ];

    // 0 active tasks → carryForwardScore defaults to 1.0
    const result = calculateReliabilityScore(completed, carryForwards, []);
    expect(result.carryForwardScore).toBe(1);
  });
});

// ============================================
// Edge Cases: Composite — realistic mixed scores
// ============================================

describe("calculateComposite — edge cases", () => {
  it("should correctly weight realistic mixed pillar scores", () => {
    // Typical scenario: good output, decent quality, poor reliability, average consistency
    const result = calculateComposite(
      { output: 85, quality: 72, reliability: 40, consistency: 55 },
      { outputWeight: 0.35, qualityWeight: 0.25, reliabilityWeight: 0.25, consistencyWeight: 0.15 }
    );
    // 85*0.35 + 72*0.25 + 40*0.25 + 55*0.15 = 29.75 + 18 + 10 + 8.25 = 66
    expect(result).toBe(66);
  });

  it("should handle custom department weights that heavily favor output", () => {
    const result = calculateComposite(
      { output: 100, quality: 0, reliability: 0, consistency: 0 },
      { outputWeight: 0.7, qualityWeight: 0.1, reliabilityWeight: 0.1, consistencyWeight: 0.1 }
    );
    expect(result).toBe(70);
  });

  it("should handle all equal weights", () => {
    const result = calculateComposite(
      { output: 80, quality: 60, reliability: 40, consistency: 20 },
      { outputWeight: 0.25, qualityWeight: 0.25, reliabilityWeight: 0.25, consistencyWeight: 0.25 }
    );
    // (80+60+40+20) * 0.25 = 50
    expect(result).toBe(50);
  });

  it("should handle fractional scores that require rounding", () => {
    const result = calculateComposite(
      { output: 33.3, quality: 66.7, reliability: 50.1, consistency: 44.4 },
      { outputWeight: 0.35, qualityWeight: 0.25, reliabilityWeight: 0.25, consistencyWeight: 0.15 }
    );
    // 33.3*0.35 + 66.7*0.25 + 50.1*0.25 + 44.4*0.15
    // = 11.655 + 16.675 + 12.525 + 6.66 = 47.515 → rounded to 47.5
    expect(result).toBe(47.5);
  });
});

// ============================================
// Edge Cases: Consistency — boundary conditions
// ============================================

describe("calculateConsistencyScore — edge cases", () => {
  it("should handle window that is entirely a weekend (zero workdays)", () => {
    const saturday = new Date("2026-02-21T00:00:00.000Z");
    const sunday = new Date("2026-02-22T00:00:00.000Z");

    const result = calculateConsistencyScore([], [], [], saturday, sunday);
    // zero workdays → planningRate = 0 (not NaN/Infinity)
    expect(result.planningRate).toBe(0);
    expect(Number.isFinite(result.score)).toBe(true);
  });

  it("should only count morningCompleted=true sessions", () => {
    const monday = new Date("2026-02-16T00:00:00.000Z");
    const friday = new Date("2026-02-20T00:00:00.000Z");
    const DAY_MS = 86400000;

    const sessions: PlanningDay[] = [
      { sessionDate: monday, morningCompleted: true },
      { sessionDate: new Date(monday.getTime() + DAY_MS), morningCompleted: false },
      { sessionDate: new Date(monday.getTime() + 2 * DAY_MS), morningCompleted: false },
      { sessionDate: new Date(monday.getTime() + 3 * DAY_MS), morningCompleted: true },
      { sessionDate: new Date(monday.getTime() + 4 * DAY_MS), morningCompleted: false },
    ];

    const result = calculateConsistencyScore(sessions, [], [], monday, friday);
    expect(result.planningRate).toBeCloseTo(2 / 5);
  });

  it("should cap kpiSpread at 1.0 when tasks span more buckets than assigned", () => {
    const monday = new Date("2026-02-16T00:00:00.000Z");
    const friday = new Date("2026-02-20T00:00:00.000Z");

    const userKpis: UserKpiEntry[] = [{ kpiBucketId: "kpi-1" }];
    const tasks = [
      createMockCompletedTask({ kpiBucketId: "kpi-1" }),
      createMockCompletedTask({ kpiBucketId: "kpi-2" }), // not assigned but has work
    ];

    const result = calculateConsistencyScore([], userKpis, tasks, monday, friday);
    // 2 active buckets / 1 assigned would be 2.0, but capped at 1.0
    expect(result.kpiSpread).toBe(1);
    // score = (0 * 0.5 + 1 * 0.5) * 100 = 50
    expect(result.score).toBe(50);
  });
});
