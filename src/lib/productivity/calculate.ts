import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  calculateOutputScore,
  calculateQualityScore,
  calculateReliabilityScore,
  calculateConsistencyScore,
  calculateComposite,
  type ProductivityResult,
  getWorkdayCount,
  MIN_COMPLETED_TASKS,
} from "./scoring-engine";
import { fetchScoringDataForUser, fetchAllUsersForScoring } from "./fetch-scoring-data";

type TxClient = Prisma.TransactionClient;

export async function calculateForUser(
  userId: string,
  departmentId: string | null,
  windowStart?: Date,
  windowEnd?: Date
): Promise<ProductivityResult> {
  if (!windowEnd) {
    windowEnd = new Date();
  }
  if (!windowStart) {
    windowStart = new Date(windowEnd);
    windowStart.setDate(windowStart.getDate() - 28);
  }

  const data = await fetchScoringDataForUser(userId, departmentId, windowStart, windowEnd);

  // Users below the minimum task threshold are unscorable — not enough
  // data for Quality/Reliability ratios to carry statistical meaning.
  if (data.completedTasks.length < MIN_COMPLETED_TASKS) {
    const reviewedTasks = data.completedTasks.filter((t) => t.requiresReview);
    const onTimeCount = data.completedTasks.filter(
      (t) => t.completedAt && t.completedAt <= t.deadline
    ).length;

    // Derive firstPassCount and reopenedCount from status histories
    const historyByTask = new Map<string, typeof data.statusHistories>();
    for (const h of data.statusHistories) {
      const list = historyByTask.get(h.taskId) || [];
      list.push(h);
      historyByTask.set(h.taskId, list);
    }

    let firstPassCount = 0;
    for (const task of reviewedTasks) {
      const history = historyByTask.get(task.id) || [];
      const wasReopened = history.some((h) => h.toStatus === "REOPENED");
      if (!wasReopened) firstPassCount++;
    }

    const reopenedTaskIds = new Set<string>();
    for (const task of data.completedTasks) {
      const history = historyByTask.get(task.id) || [];
      const wasReopenedFromApproved = history.some(
        (h) => h.fromStatus === "CLOSED_APPROVED" && h.toStatus === "REOPENED"
      );
      if (wasReopenedFromApproved) reopenedTaskIds.add(task.id);
    }

    return {
      scorable: false,
      output: 0,
      quality: 0,
      reliability: 0,
      consistency: 0,
      composite: 0,
      meta: {
        totalPoints: data.completedTasks.reduce((sum, t) => {
          const sizeW = t.size === "EASY" ? 1 : t.size === "MEDIUM" ? 2 : 4;
          const prioM = t.priority === "URGENT_IMPORTANT" ? 1.5 : 1;
          return sum + sizeW * prioM;
        }, 0),
        targetPoints: data.weeklyOutputTarget * 4,
        completedTaskCount: data.completedTasks.length,
        reviewedTaskCount: reviewedTasks.length,
        firstPassCount,
        reopenedCount: reopenedTaskIds.size,
        totalCompletedCount: data.completedTasks.length,
        reviewRatio:
          data.completedTasks.length > 0 ? reviewedTasks.length / data.completedTasks.length : 0,
        onTimeCount,
        totalWithDeadline: data.completedTasks.length,
        carryForwardTotal: data.carryForwards.length,
        activeTaskCount: data.activeTasks.length,
        plannedDays: data.planningSessions.filter((s) => s.morningCompleted).length,
        totalWorkdays: getWorkdayCount(windowStart, windowEnd),
        activeKpiBuckets: new Set(data.completedTasks.map((t) => t.kpiBucketId)).size,
        assignedKpiBuckets: data.userKpis.length,
      },
    };
  }

  const outputResult = calculateOutputScore(data.completedTasks, data.weeklyOutputTarget);

  const qualityResult = calculateQualityScore(data.completedTasks, data.statusHistories);

  const reliabilityResult = calculateReliabilityScore(
    data.completedTasks,
    data.carryForwards,
    data.activeTasks
  );

  const consistencyResult = calculateConsistencyScore(
    data.planningSessions,
    data.userKpis,
    data.completedTasks,
    windowStart,
    windowEnd
  );

  const pillars = {
    output: outputResult.score,
    quality: qualityResult.score,
    reliability: reliabilityResult.score,
    consistency: consistencyResult.score,
  };

  const composite = calculateComposite(pillars, data.weights);

  const reviewedTasks = data.completedTasks.filter((t) => t.requiresReview);

  return {
    scorable: true,
    ...pillars,
    composite,
    meta: {
      totalPoints: outputResult.points,
      targetPoints: outputResult.target,
      completedTaskCount: data.completedTasks.length,
      reviewedTaskCount: reviewedTasks.length,
      firstPassCount: Math.round(qualityResult.firstPassRate * reviewedTasks.length),
      reopenedCount: Math.round((1 - qualityResult.reopenRate) * data.completedTasks.length),
      totalCompletedCount: data.completedTasks.length,
      reviewRatio:
        data.completedTasks.length > 0 ? reviewedTasks.length / data.completedTasks.length : 0,
      onTimeCount: Math.round(reliabilityResult.onTimeRate * data.completedTasks.length),
      totalWithDeadline: data.completedTasks.length,
      carryForwardTotal: data.carryForwards.length,
      activeTaskCount: data.activeTasks.length,
      plannedDays: data.planningSessions.filter((s) => s.morningCompleted).length,
      totalWorkdays: getWorkdayCount(windowStart, windowEnd),
      activeKpiBuckets: new Set(data.completedTasks.map((t) => t.kpiBucketId)).size,
      assignedKpiBuckets: data.userKpis.length,
    },
  };
}

export async function calculateAndSaveForUser(
  userId: string,
  departmentId: string | null
): Promise<void> {
  const windowEnd = new Date();
  const windowStart = new Date(windowEnd);
  windowStart.setDate(windowStart.getDate() - 28);

  const result = await calculateForUser(userId, departmentId, windowStart, windowEnd);

  // Derive the week bucket from windowEnd (not a fresh clock read) so the
  // week boundary aligns with the scoring window.
  const dayOfWeek = windowEnd.getUTCDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const currentWeekStart = new Date(windowEnd);
  currentWeekStart.setUTCDate(currentWeekStart.getUTCDate() + mondayOffset);
  currentWeekStart.setUTCHours(0, 0, 0, 0);

  if (!result.scorable) {
    // Remove stale score and current week's snapshot if user dropped below threshold
    await prisma.$transaction([
      prisma.productivityScore.deleteMany({
        where: { userId },
      }),
      prisma.productivitySnapshot.deleteMany({
        where: { userId, weekStartDate: currentWeekStart },
      }),
    ]);
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.productivityScore.upsert({
      where: { userId },
      update: {
        output: result.output,
        quality: result.quality,
        reliability: result.reliability,
        consistency: result.consistency,
        composite: result.composite,
        windowStart,
        windowEnd,
        calculatedAt: new Date(),
      },
      create: {
        userId,
        output: result.output,
        quality: result.quality,
        reliability: result.reliability,
        consistency: result.consistency,
        composite: result.composite,
        windowStart,
        windowEnd,
      },
    });

    await saveWeeklySnapshot(userId, currentWeekStart, result, tx);
  });
}

export async function calculateAndSaveForAll(): Promise<{
  processed: number;
  errors: string[];
}> {
  const users = await fetchAllUsersForScoring();
  const errors: string[] = [];
  let processed = 0;

  for (const user of users) {
    try {
      await calculateAndSaveForUser(user.id, user.departmentId);
      processed++;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      errors.push(`User ${user.id}: ${message}`);
    }
  }

  return { processed, errors };
}

export async function saveWeeklySnapshot(
  userId: string,
  weekStartDate: Date,
  result: ProductivityResult,
  tx: TxClient = prisma
): Promise<void> {
  // Only persist scorable results so non-scorable data doesn't skew aggregates
  if (!result.scorable) return;

  await tx.productivitySnapshot.upsert({
    where: {
      userId_weekStartDate: { userId, weekStartDate },
    },
    update: {
      output: result.output,
      quality: result.quality,
      reliability: result.reliability,
      consistency: result.consistency,
      composite: result.composite,
      taskCount: result.meta.completedTaskCount,
      reviewedTaskCount: result.meta.reviewedTaskCount,
    },
    create: {
      userId,
      weekStartDate,
      output: result.output,
      quality: result.quality,
      reliability: result.reliability,
      consistency: result.consistency,
      composite: result.composite,
      taskCount: result.meta.completedTaskCount,
      reviewedTaskCount: result.meta.reviewedTaskCount,
    },
  });
}
