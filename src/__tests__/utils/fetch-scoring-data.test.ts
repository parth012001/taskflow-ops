jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findMany: jest.fn() },
    task: { findMany: jest.fn() },
    carryForwardLog: { findMany: jest.fn() },
    dailyPlanningSession: { findMany: jest.fn() },
    userKpi: { findMany: jest.fn() },
    scoringConfig: { findUnique: jest.fn() },
    taskStatusHistory: { findMany: jest.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  fetchAllUsersForScoring,
  fetchScoringDataForUser,
} from "@/lib/productivity/fetch-scoring-data";

describe("fetchAllUsersForScoring", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.user.findMany as jest.Mock).mockResolvedValue([]);
  });

  it("should exclude ADMIN users from scoring", async () => {
    await fetchAllUsersForScoring();

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          role: { not: "ADMIN" },
        }),
      })
    );
  });

  it("should only fetch active, non-deleted users", async () => {
    await fetchAllUsersForScoring();

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isActive: true,
          deletedAt: null,
        }),
      })
    );
  });

  it("should select only id and departmentId", async () => {
    await fetchAllUsersForScoring();

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: { id: true, departmentId: true },
      })
    );
  });
});

describe("fetchScoringDataForUser — active tasks query", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.task.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.carryForwardLog.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.dailyPlanningSession.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.userKpi.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.scoringConfig.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.taskStatusHistory.findMany as jest.Mock).mockResolvedValue([]);
  });

  it("should exclude CLOSED_APPROVED from active tasks query", async () => {
    await fetchScoringDataForUser(
      "user-1",
      "dept-1",
      new Date("2026-02-01"),
      new Date("2026-03-01")
    );

    // task.findMany is called twice: completed tasks (1st) and active tasks (2nd)
    const activeTasksCall = (prisma.task.findMany as jest.Mock).mock.calls[1];
    const where = activeTasksCall[0].where;

    expect(where.status.notIn).toContain("CLOSED_APPROVED");
    expect(where.status.notIn).toContain("NEW");
  });

  it("should not use OR clause that leaks completed tasks into active list", async () => {
    await fetchScoringDataForUser(
      "user-1",
      "dept-1",
      new Date("2026-02-01"),
      new Date("2026-03-01")
    );

    const activeTasksCall = (prisma.task.findMany as jest.Mock).mock.calls[1];
    const where = activeTasksCall[0].where;

    // Should NOT have an OR clause — the old bug used OR to pull in completedAt tasks
    expect(where.OR).toBeUndefined();
  });
});
