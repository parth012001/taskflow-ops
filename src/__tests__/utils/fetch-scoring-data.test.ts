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
import { fetchAllUsersForScoring } from "@/lib/productivity/fetch-scoring-data";

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
