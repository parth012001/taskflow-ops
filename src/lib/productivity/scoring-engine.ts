import { TaskStatus, TaskSize, TaskPriority } from "@prisma/client";

// ============================================
// Types
// ============================================

export interface ScoredTask {
  id: string;
  status: TaskStatus;
  size: TaskSize;
  priority: TaskPriority;
  completedAt: Date | null;
  deadline: Date;
  estimatedMinutes: number;
  actualMinutes: number;
  requiresReview: boolean;
  kpiBucketId: string;
  carryForwardCount: number;
}

export interface StatusTransition {
  taskId: string;
  fromStatus: TaskStatus | null;
  toStatus: TaskStatus;
  createdAt: Date;
}

export interface CarryForwardEntry {
  taskId: string;
  userId: string;
  createdAt: Date;
}

export interface PlanningDay {
  sessionDate: Date;
  morningCompleted: boolean;
}

export interface UserKpiEntry {
  kpiBucketId: string;
}

export interface ScoringWeights {
  outputWeight: number;
  qualityWeight: number;
  reliabilityWeight: number;
  consistencyWeight: number;
}

export interface PillarScores {
  output: number;
  quality: number;
  reliability: number;
  consistency: number;
}

export interface ProductivityResult {
  output: number;
  quality: number;
  reliability: number;
  consistency: number;
  composite: number;
  meta: {
    totalPoints: number;
    targetPoints: number;
    completedTaskCount: number;
    reviewedTaskCount: number;
    firstPassCount: number;
    reopenedCount: number;
    totalCompletedCount: number;
    reviewRatio: number;
    onTimeCount: number;
    totalWithDeadline: number;
    carryForwardTotal: number;
    activeTaskCount: number;
    plannedDays: number;
    totalWorkdays: number;
    activeKpiBuckets: number;
    assignedKpiBuckets: number;
  };
}

// ============================================
// Constants
// ============================================

const SIZE_WEIGHTS: Record<TaskSize, number> = {
  EASY: 1,
  MEDIUM: 2,
  DIFFICULT: 4,
};

const PRIORITY_MULTIPLIERS: Record<TaskPriority, number> = {
  URGENT_IMPORTANT: 1.5,
  URGENT_NOT_IMPORTANT: 1.0,
  NOT_URGENT_IMPORTANT: 1.0,
  NOT_URGENT_NOT_IMPORTANT: 1.0,
};

export const DEFAULT_WEIGHTS: ScoringWeights = {
  outputWeight: 0.35,
  qualityWeight: 0.25,
  reliabilityWeight: 0.25,
  consistencyWeight: 0.15,
};

// ============================================
// Output Score
// ============================================

export function calculateOutputScore(
  completedTasks: ScoredTask[],
  weeklyTarget: number
): { score: number; points: number; target: number } {
  if (weeklyTarget === 0) {
    return { score: 0, points: 0, target: 0 };
  }

  const points = completedTasks.reduce((sum, task) => {
    const sizeWeight = SIZE_WEIGHTS[task.size];
    const priorityMultiplier = PRIORITY_MULTIPLIERS[task.priority];
    return sum + sizeWeight * priorityMultiplier;
  }, 0);

  const target = weeklyTarget * 4; // 4-week window
  const score = Math.min(100, (points / target) * 100);

  return { score: Math.round(score * 10) / 10, points, target };
}

// ============================================
// Quality Score
// ============================================

export function calculateQualityScore(
  completedTasks: ScoredTask[],
  statusHistories: StatusTransition[]
): { score: number; firstPassRate: number; reopenRate: number } {
  if (completedTasks.length === 0) {
    return { score: 100, firstPassRate: 1, reopenRate: 1 };
  }

  // Group status histories by taskId
  const historyByTask = new Map<string, StatusTransition[]>();
  for (const h of statusHistories) {
    const list = historyByTask.get(h.taskId) || [];
    list.push(h);
    historyByTask.set(h.taskId, list);
  }

  // First-pass rate: only for reviewed tasks
  const reviewedTasks = completedTasks.filter((t) => t.requiresReview);
  let firstPassCount = 0;

  for (const task of reviewedTasks) {
    const history = historyByTask.get(task.id) || [];
    // Check if task was ever REOPENED between first COMPLETED_PENDING_REVIEW and final CLOSED_APPROVED
    const hasReopenedInReview = history.some(
      (h) => h.toStatus === TaskStatus.REOPENED
    );
    if (!hasReopenedInReview) {
      firstPassCount++;
    }
  }

  const firstPassRate =
    reviewedTasks.length > 0 ? firstPassCount / reviewedTasks.length : 1;

  // Reopen rate: for ALL completed tasks, check if ever REOPENED from CLOSED_APPROVED
  let reopenedCount = 0;
  const reopenedTaskIds = new Set<string>();

  for (const task of completedTasks) {
    const history = historyByTask.get(task.id) || [];
    const wasReopened = history.some(
      (h) =>
        h.fromStatus === TaskStatus.CLOSED_APPROVED &&
        h.toStatus === TaskStatus.REOPENED
    );
    if (wasReopened && !reopenedTaskIds.has(task.id)) {
      reopenedCount++;
      reopenedTaskIds.add(task.id);
    }
  }

  const reopenRate = 1 - reopenedCount / completedTasks.length;

  let score: number;
  if (reviewedTasks.length >= 3) {
    score = (firstPassRate * 0.6 + reopenRate * 0.4) * 100;
  } else {
    score = reopenRate * 100;
  }

  return {
    score: Math.round(score * 10) / 10,
    firstPassRate,
    reopenRate,
  };
}

// ============================================
// Reliability Score
// ============================================

export function calculateReliabilityScore(
  completedTasks: ScoredTask[],
  carryForwards: CarryForwardEntry[],
  activeTasks: ScoredTask[]
): { score: number; onTimeRate: number; carryForwardScore: number } {
  if (completedTasks.length === 0) {
    return { score: 100, onTimeRate: 1, carryForwardScore: 1 };
  }

  // On-time rate
  const onTimeCount = completedTasks.filter(
    (t) => t.completedAt && t.completedAt <= t.deadline
  ).length;
  const onTimeRate = onTimeCount / completedTasks.length;

  // Carry-forward score
  const carryForwardTotal = carryForwards.length;
  const activeTaskCount = activeTasks.length;
  const carryForwardScore =
    activeTaskCount > 0
      ? 1 - Math.min(1, carryForwardTotal / activeTaskCount)
      : 1;

  const score = (onTimeRate * 0.65 + carryForwardScore * 0.35) * 100;

  return {
    score: Math.round(score * 10) / 10,
    onTimeRate,
    carryForwardScore,
  };
}

// ============================================
// Consistency Score
// ============================================

export function calculateConsistencyScore(
  planningSessions: PlanningDay[],
  userKpis: UserKpiEntry[],
  completedTasks: ScoredTask[],
  windowStart: Date,
  windowEnd: Date
): { score: number; planningRate: number; kpiSpread: number } {
  const totalWorkdays = getWorkdayCount(windowStart, windowEnd);

  // Planning rate
  const daysWithMorning = planningSessions.filter(
    (s) => s.morningCompleted
  ).length;
  const planningRate = totalWorkdays > 0 ? daysWithMorning / totalWorkdays : 0;

  // KPI spread
  const assignedBuckets = userKpis.length;
  let kpiSpread: number;
  if (assignedBuckets === 0) {
    kpiSpread = 1.0;
  } else {
    const activeBucketIds = new Set(
      completedTasks.map((t) => t.kpiBucketId)
    );
    kpiSpread = activeBucketIds.size / assignedBuckets;
  }

  const score = (planningRate * 0.5 + kpiSpread * 0.5) * 100;

  return {
    score: Math.round(score * 10) / 10,
    planningRate,
    kpiSpread,
  };
}

// ============================================
// Composite Score
// ============================================

export function calculateComposite(
  pillars: PillarScores,
  weights: ScoringWeights
): number {
  const composite =
    pillars.output * weights.outputWeight +
    pillars.quality * weights.qualityWeight +
    pillars.reliability * weights.reliabilityWeight +
    pillars.consistency * weights.consistencyWeight;

  return Math.round(composite * 10) / 10;
}

// ============================================
// Helpers
// ============================================

export function getWorkdayCount(start: Date, end: Date): number {
  let count = 0;
  const current = new Date(start);
  current.setUTCHours(0, 0, 0, 0);

  const endDate = new Date(end);
  endDate.setUTCHours(0, 0, 0, 0);

  while (current <= endDate) {
    const day = current.getUTCDay();
    if (day !== 0 && day !== 6) {
      count++;
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return count;
}
