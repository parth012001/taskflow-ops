import { prisma } from "@/lib/prisma";
import { TaskStatus } from "@prisma/client";
import type {
  ScoredTask,
  StatusTransition,
  CarryForwardEntry,
  PlanningDay,
  UserKpiEntry,
  ScoringWeights,
} from "./scoring-engine";
import { DEFAULT_WEIGHTS } from "./scoring-engine";

const taskSelect = {
  id: true,
  status: true,
  size: true,
  priority: true,
  completedAt: true,
  deadline: true,
  estimatedMinutes: true,
  actualMinutes: true,
  requiresReview: true,
  kpiBucketId: true,
  carryForwardCount: true,
} as const;

export interface ScoringData {
  completedTasks: ScoredTask[];
  activeTasks: ScoredTask[];
  statusHistories: StatusTransition[];
  carryForwards: CarryForwardEntry[];
  planningSessions: PlanningDay[];
  userKpis: UserKpiEntry[];
  weights: ScoringWeights;
  weeklyOutputTarget: number;
}

export async function fetchScoringDataForUser(
  userId: string,
  departmentId: string | null,
  windowStart: Date,
  windowEnd: Date
): Promise<ScoringData> {
  const [
    completedTasks,
    activeTasks,
    carryForwards,
    planningSessions,
    userKpis,
    scoringConfig,
  ] = await Promise.all([
    // Completed tasks in window
    prisma.task.findMany({
      where: {
        ownerId: userId,
        deletedAt: null,
        status: TaskStatus.CLOSED_APPROVED,
        completedAt: { gte: windowStart, lte: windowEnd },
      },
      select: taskSelect,
    }),

    // Active tasks in window
    prisma.task.findMany({
      where: {
        ownerId: userId,
        deletedAt: null,
        status: { notIn: [TaskStatus.NEW] },
        OR: [
          {
            createdAt: { lte: windowEnd },
            status: { not: TaskStatus.CLOSED_APPROVED },
          },
          { completedAt: { gte: windowStart, lte: windowEnd } },
        ],
      },
      select: taskSelect,
    }),

    // Carry-forward logs
    prisma.carryForwardLog.findMany({
      where: {
        userId,
        createdAt: { gte: windowStart, lte: windowEnd },
      },
      select: { taskId: true, userId: true, createdAt: true },
    }),

    // Daily planning sessions
    prisma.dailyPlanningSession.findMany({
      where: {
        userId,
        sessionDate: { gte: windowStart, lte: windowEnd },
      },
      select: { sessionDate: true, morningCompleted: true },
    }),

    // User KPI assignments
    prisma.userKpi.findMany({
      where: { userId },
      select: { kpiBucketId: true },
    }),

    // Scoring config (by department)
    departmentId
      ? prisma.scoringConfig.findUnique({
          where: { departmentId },
        })
      : null,
  ]);

  // Fetch status histories for completed tasks
  const completedTaskIds = completedTasks.map((t) => t.id);
  const statusHistories =
    completedTaskIds.length > 0
      ? await prisma.taskStatusHistory.findMany({
          where: { taskId: { in: completedTaskIds } },
          select: {
            taskId: true,
            fromStatus: true,
            toStatus: true,
            createdAt: true,
          },
          orderBy: { createdAt: "asc" },
        })
      : [];

  const weights: ScoringWeights = scoringConfig
    ? {
        outputWeight: scoringConfig.outputWeight,
        qualityWeight: scoringConfig.qualityWeight,
        reliabilityWeight: scoringConfig.reliabilityWeight,
        consistencyWeight: scoringConfig.consistencyWeight,
      }
    : DEFAULT_WEIGHTS;

  const weeklyOutputTarget = scoringConfig?.weeklyOutputTarget ?? 15;

  return {
    completedTasks: completedTasks as ScoredTask[],
    activeTasks: activeTasks as ScoredTask[],
    statusHistories: statusHistories as StatusTransition[],
    carryForwards: carryForwards as CarryForwardEntry[],
    planningSessions: planningSessions as PlanningDay[],
    userKpis: userKpis as UserKpiEntry[],
    weights,
    weeklyOutputTarget,
  };
}

export async function fetchAllUsersForScoring(): Promise<
  { id: string; departmentId: string | null }[]
> {
  return prisma.user.findMany({
    where: {
      isActive: true,
      deletedAt: null,
    },
    select: {
      id: true,
      departmentId: true,
    },
  });
}
