import { prisma } from "@/lib/prisma";
import {
  calculateOutputScore,
  calculateQualityScore,
  calculateReliabilityScore,
  calculateConsistencyScore,
  calculateComposite,
  type ProductivityResult,
  getWorkdayCount,
} from "./scoring-engine";
import {
  fetchScoringDataForUser,
  fetchAllUsersForScoring,
} from "./fetch-scoring-data";

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

  const data = await fetchScoringDataForUser(
    userId,
    departmentId,
    windowStart,
    windowEnd
  );

  const outputResult = calculateOutputScore(
    data.completedTasks,
    data.weeklyOutputTarget
  );

  const qualityResult = calculateQualityScore(
    data.completedTasks,
    data.statusHistories
  );

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
    ...pillars,
    composite,
    meta: {
      totalPoints: outputResult.points,
      targetPoints: outputResult.target,
      completedTaskCount: data.completedTasks.length,
      reviewedTaskCount: reviewedTasks.length,
      firstPassCount: Math.round(
        qualityResult.firstPassRate * reviewedTasks.length
      ),
      reopenedCount: Math.round(
        (1 - qualityResult.reopenRate) * data.completedTasks.length
      ),
      totalCompletedCount: data.completedTasks.length,
      reviewRatio:
        data.completedTasks.length > 0
          ? reviewedTasks.length / data.completedTasks.length
          : 0,
      onTimeCount: Math.round(
        reliabilityResult.onTimeRate * data.completedTasks.length
      ),
      totalWithDeadline: data.completedTasks.length,
      carryForwardTotal: data.carryForwards.length,
      activeTaskCount: data.activeTasks.length,
      plannedDays: data.planningSessions.filter((s) => s.morningCompleted)
        .length,
      totalWorkdays: getWorkdayCount(windowStart, windowEnd),
      activeKpiBuckets: new Set(
        data.completedTasks.map((t) => t.kpiBucketId)
      ).size,
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

  await prisma.productivityScore.upsert({
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
      const message =
        error instanceof Error ? error.message : "Unknown error";
      errors.push(`User ${user.id}: ${message}`);
    }
  }

  return { processed, errors };
}

export async function saveWeeklySnapshot(
  userId: string,
  weekStartDate: Date,
  result: ProductivityResult
): Promise<void> {
  await prisma.productivitySnapshot.upsert({
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
