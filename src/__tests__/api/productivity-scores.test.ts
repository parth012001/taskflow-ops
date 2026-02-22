/**
 * Tests for Productivity Scoring API Routes
 */

// Mock next/server
jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: async () => data,
      status: init?.status || 200,
    })),
  },
}));

// Mock next-auth
jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

// Mock auth options
jest.mock("@/lib/auth-options", () => ({
  authOptions: {},
}));

// Mock prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    productivityScore: {
      findMany: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
    },
    productivitySnapshot: {
      findMany: jest.fn(),
    },
    department: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    scoringConfig: {
      upsert: jest.fn(),
    },
    task: {
      findMany: jest.fn(),
    },
    taskStatusHistory: {
      findMany: jest.fn(),
    },
    carryForwardLog: {
      findMany: jest.fn(),
    },
    dailyPlanningSession: {
      findMany: jest.fn(),
    },
    userKpi: {
      findMany: jest.fn(),
    },
  },
}));

// Mock calculate module
jest.mock("@/lib/productivity/calculate", () => ({
  calculateAndSaveForAll: jest.fn(),
  calculateForUser: jest.fn(),
}));

import { POST as calculateAll } from "@/app/api/productivity/calculate/route";
import { GET as getScores } from "@/app/api/productivity/scores/route";
import { GET as getScoreByUser } from "@/app/api/productivity/scores/[userId]/route";
import { GET as getTrends } from "@/app/api/productivity/trends/route";
import { GET as getConfig } from "@/app/api/productivity/config/route";
import { PATCH as patchConfig } from "@/app/api/productivity/config/[departmentId]/route";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { calculateAndSaveForAll, calculateForUser } from "@/lib/productivity/calculate";

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockCalculateAndSaveForAll = calculateAndSaveForAll as jest.MockedFunction<typeof calculateAndSaveForAll>;
const mockCalculateForUser = calculateForUser as jest.MockedFunction<typeof calculateForUser>;

function createMockRequest(
  url: string,
  options: { method?: string; body?: Record<string, unknown> } = {}
): any {
  const fullUrl = new URL(url, "http://localhost:3000");
  return {
    url: fullUrl.toString(),
    nextUrl: fullUrl,
    json: async () => options.body || {},
  };
}

const mockAdminSession = {
  user: {
    id: "admin-1",
    email: "admin@test.com",
    firstName: "Admin",
    lastName: "User",
    role: "ADMIN",
    managerId: null,
    departmentId: "dept-1",
  },
};

const mockManagerSession = {
  user: {
    id: "mgr-1",
    email: "manager@test.com",
    firstName: "Manager",
    lastName: "User",
    role: "MANAGER",
    managerId: null,
    departmentId: "dept-1",
  },
};

const mockDeptHeadSession = {
  user: {
    id: "dh-1",
    email: "depthead@test.com",
    firstName: "Dept",
    lastName: "Head",
    role: "DEPARTMENT_HEAD",
    managerId: null,
    departmentId: "dept-1",
  },
};

const mockEmployeeSession = {
  user: {
    id: "emp-1",
    email: "employee@test.com",
    firstName: "John",
    lastName: "Doe",
    role: "EMPLOYEE",
    managerId: "mgr-1",
    departmentId: "dept-1",
  },
};

const mockProductivityResult = {
  output: 72,
  quality: 90,
  reliability: 65,
  consistency: 80,
  composite: 75.3,
  meta: {
    totalPoints: 43,
    targetPoints: 60,
    completedTaskCount: 15,
    reviewedTaskCount: 10,
    firstPassCount: 8,
    reopenedCount: 1,
    totalCompletedCount: 15,
    reviewRatio: 0.67,
    onTimeCount: 10,
    totalWithDeadline: 15,
    carryForwardTotal: 3,
    activeTaskCount: 8,
    plannedDays: 16,
    totalWorkdays: 20,
    activeKpiBuckets: 3,
    assignedKpiBuckets: 4,
  },
};

describe("Productivity Scoring API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // POST /api/productivity/calculate
  // ============================================
  describe("POST /api/productivity/calculate", () => {
    it("should return 401 when not authenticated", async () => {
      mockGetServerSession.mockResolvedValue(null);
      const response = await calculateAll();
      expect(response.status).toBe(401);
    });

    it("should return 403 when not admin", async () => {
      mockGetServerSession.mockResolvedValue(mockManagerSession as any);
      const response = await calculateAll();
      expect(response.status).toBe(403);
    });

    it("should return 403 for employees", async () => {
      mockGetServerSession.mockResolvedValue(mockEmployeeSession as any);
      const response = await calculateAll();
      expect(response.status).toBe(403);
    });

    it("should return 200 with processed count for admin", async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession as any);
      mockCalculateAndSaveForAll.mockResolvedValue({
        processed: 10,
        errors: [],
      });

      const response = await calculateAll();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.processed).toBe(10);
      expect(data.failed).toBe(0);
    });

    it("should handle individual user errors gracefully", async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession as any);
      mockCalculateAndSaveForAll.mockResolvedValue({
        processed: 8,
        errors: ["User u1: Some error"],
      });

      const response = await calculateAll();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.processed).toBe(8);
      expect(data.failed).toBe(1);
      expect(data.errors).toBeUndefined();
    });
  });

  // ============================================
  // GET /api/productivity/scores
  // ============================================
  describe("GET /api/productivity/scores", () => {
    it("should return 401 when not authenticated", async () => {
      mockGetServerSession.mockResolvedValue(null);
      const response = await getScores(
        createMockRequest("/api/productivity/scores")
      );
      expect(response.status).toBe(401);
    });

    it("should return 403 for employees", async () => {
      mockGetServerSession.mockResolvedValue(mockEmployeeSession as any);
      const response = await getScores(
        createMockRequest("/api/productivity/scores")
      );
      expect(response.status).toBe(403);
    });

    it("should return scores for manager (subordinates only)", async () => {
      mockGetServerSession.mockResolvedValue(mockManagerSession as any);
      (prisma.user.findMany as jest.Mock).mockResolvedValue([
        { id: "emp-1" },
        { id: "emp-2" },
      ]);
      (prisma.productivityScore.count as jest.Mock).mockResolvedValue(2);
      (prisma.productivityScore.findMany as jest.Mock).mockResolvedValue([
        {
          userId: "emp-1",
          output: 72,
          quality: 90,
          reliability: 65,
          consistency: 80,
          composite: 75.3,
          calculatedAt: new Date(),
          user: {
            id: "emp-1",
            firstName: "John",
            lastName: "Doe",
            role: "EMPLOYEE",
            department: { name: "Engineering" },
          },
        },
      ]);

      const response = await getScores(
        createMockRequest("/api/productivity/scores")
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.scores).toBeDefined();
      expect(data.pagination).toBeDefined();
    });

    it("should return scores for admin (all users)", async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession as any);
      (prisma.productivityScore.count as jest.Mock).mockResolvedValue(1);
      (prisma.productivityScore.findMany as jest.Mock).mockResolvedValue([
        {
          userId: "emp-1",
          output: 72,
          quality: 90,
          reliability: 65,
          consistency: 80,
          composite: 75.3,
          calculatedAt: new Date(),
          user: {
            id: "emp-1",
            firstName: "John",
            lastName: "Doe",
            role: "EMPLOYEE",
            department: { name: "Engineering" },
          },
        },
      ]);

      const response = await getScores(
        createMockRequest("/api/productivity/scores")
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.scores).toHaveLength(1);
      expect(data.pagination.total).toBe(1);
    });

    it("should support sorting by pillar", async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession as any);
      (prisma.productivityScore.count as jest.Mock).mockResolvedValue(0);
      (prisma.productivityScore.findMany as jest.Mock).mockResolvedValue([]);

      await getScores(
        createMockRequest("/api/productivity/scores?sortBy=output&sortOrder=asc")
      );

      expect(prisma.productivityScore.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { output: "asc" },
        })
      );
    });

    it("should support pagination", async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession as any);
      (prisma.productivityScore.count as jest.Mock).mockResolvedValue(45);
      (prisma.productivityScore.findMany as jest.Mock).mockResolvedValue([]);

      const response = await getScores(
        createMockRequest("/api/productivity/scores?page=2&limit=10")
      );
      const data = await response.json();

      expect(data.pagination.page).toBe(2);
      expect(data.pagination.limit).toBe(10);
      expect(data.pagination.total).toBe(45);
      expect(data.pagination.totalPages).toBe(5);

      expect(prisma.productivityScore.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      );
    });

    it("should filter by departmentId", async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession as any);
      (prisma.user.findMany as jest.Mock).mockResolvedValue([{ id: "emp-1" }]);
      (prisma.productivityScore.count as jest.Mock).mockResolvedValue(0);
      (prisma.productivityScore.findMany as jest.Mock).mockResolvedValue([]);

      await getScores(
        createMockRequest("/api/productivity/scores?departmentId=dept-1")
      );

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { departmentId: "dept-1" },
        })
      );
    });

    it("should ignore departmentId param for department heads and use own department", async () => {
      mockGetServerSession.mockResolvedValue(mockDeptHeadSession as any);
      (prisma.user.findMany as jest.Mock).mockResolvedValue([{ id: "emp-1" }]);
      (prisma.productivityScore.count as jest.Mock).mockResolvedValue(0);
      (prisma.productivityScore.findMany as jest.Mock).mockResolvedValue([]);

      await getScores(
        createMockRequest("/api/productivity/scores?departmentId=dept-other")
      );

      // Should query with the session's dept-1, not the requested dept-other
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { departmentId: "dept-1" },
        })
      );
    });

    it("should filter by role", async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession as any);
      (prisma.user.findMany as jest.Mock).mockResolvedValue([{ id: "emp-1" }]);
      (prisma.productivityScore.count as jest.Mock).mockResolvedValue(0);
      (prisma.productivityScore.findMany as jest.Mock).mockResolvedValue([]);

      await getScores(
        createMockRequest("/api/productivity/scores?role=EMPLOYEE")
      );

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ role: "EMPLOYEE" }),
        })
      );
    });
  });

  // ============================================
  // GET /api/productivity/scores/[userId]
  // ============================================
  describe("GET /api/productivity/scores/[userId]", () => {
    it("should return 401 when not authenticated", async () => {
      mockGetServerSession.mockResolvedValue(null);
      const response = await getScoreByUser(
        createMockRequest("/api/productivity/scores/emp-1"),
        { params: Promise.resolve({ userId: "emp-1" }) }
      );
      expect(response.status).toBe(401);
    });

    it("should return 403 when employee views another employee", async () => {
      mockGetServerSession.mockResolvedValue(mockEmployeeSession as any);
      const response = await getScoreByUser(
        createMockRequest("/api/productivity/scores/emp-2"),
        { params: Promise.resolve({ userId: "emp-2" }) }
      );
      expect(response.status).toBe(403);
    });

    it("should return 200 when employee views own score", async () => {
      mockGetServerSession.mockResolvedValue(mockEmployeeSession as any);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "emp-1",
        departmentId: "dept-1",
      });
      mockCalculateForUser.mockResolvedValue(mockProductivityResult as any);

      const response = await getScoreByUser(
        createMockRequest("/api/productivity/scores/emp-1"),
        { params: Promise.resolve({ userId: "emp-1" }) }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.composite).toBe(75.3);
      expect(data.meta).toBeDefined();
    });

    it("should return 200 when manager views subordinate", async () => {
      mockGetServerSession.mockResolvedValue(mockManagerSession as any);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: "emp-1" });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "emp-1",
        departmentId: "dept-1",
      });
      mockCalculateForUser.mockResolvedValue(mockProductivityResult as any);

      const response = await getScoreByUser(
        createMockRequest("/api/productivity/scores/emp-1"),
        { params: Promise.resolve({ userId: "emp-1" }) }
      );

      expect(response.status).toBe(200);
    });

    it("should return 403 when manager views non-subordinate", async () => {
      mockGetServerSession.mockResolvedValue(mockManagerSession as any);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      const response = await getScoreByUser(
        createMockRequest("/api/productivity/scores/emp-other"),
        { params: Promise.resolve({ userId: "emp-other" }) }
      );

      expect(response.status).toBe(403);
    });

    it("should return 200 for admin viewing anyone", async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession as any);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "emp-1",
        departmentId: "dept-1",
      });
      mockCalculateForUser.mockResolvedValue(mockProductivityResult as any);

      const response = await getScoreByUser(
        createMockRequest("/api/productivity/scores/emp-1"),
        { params: Promise.resolve({ userId: "emp-1" }) }
      );

      expect(response.status).toBe(200);
    });

    it("should return 404 when user not found", async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession as any);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await getScoreByUser(
        createMockRequest("/api/productivity/scores/nonexistent"),
        { params: Promise.resolve({ userId: "nonexistent" }) }
      );

      expect(response.status).toBe(404);
    });

    it("should return 200 when dept head views user in same department", async () => {
      mockGetServerSession.mockResolvedValue(mockDeptHeadSession as any);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: "emp-1" });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "emp-1",
        departmentId: "dept-1",
      });
      mockCalculateForUser.mockResolvedValue(mockProductivityResult as any);

      const response = await getScoreByUser(
        createMockRequest("/api/productivity/scores/emp-1"),
        { params: Promise.resolve({ userId: "emp-1" }) }
      );

      expect(response.status).toBe(200);
    });

    it("should return 403 when dept head views user in different department", async () => {
      mockGetServerSession.mockResolvedValue(mockDeptHeadSession as any);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      const response = await getScoreByUser(
        createMockRequest("/api/productivity/scores/emp-other-dept"),
        { params: Promise.resolve({ userId: "emp-other-dept" }) }
      );

      expect(response.status).toBe(403);
    });
  });

  // ============================================
  // GET /api/productivity/trends
  // ============================================
  describe("GET /api/productivity/trends", () => {
    it("should return 401 when not authenticated", async () => {
      mockGetServerSession.mockResolvedValue(null);
      const response = await getTrends(
        createMockRequest("/api/productivity/trends")
      );
      expect(response.status).toBe(401);
    });

    it("should return empty array for user with no snapshots", async () => {
      mockGetServerSession.mockResolvedValue(mockEmployeeSession as any);
      (prisma.productivitySnapshot.findMany as jest.Mock).mockResolvedValue([]);

      const response = await getTrends(
        createMockRequest("/api/productivity/trends")
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.trends).toEqual([]);
    });

    it("should return trends ordered by weekStartDate", async () => {
      mockGetServerSession.mockResolvedValue(mockEmployeeSession as any);
      (prisma.productivitySnapshot.findMany as jest.Mock).mockResolvedValue([
        {
          weekStartDate: new Date("2026-01-26"),
          output: 70,
          quality: 85,
          reliability: 60,
          consistency: 75,
          composite: 72,
        },
        {
          weekStartDate: new Date("2026-02-02"),
          output: 75,
          quality: 88,
          reliability: 65,
          consistency: 80,
          composite: 76,
        },
      ]);

      const response = await getTrends(
        createMockRequest("/api/productivity/trends")
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.trends).toHaveLength(2);
      expect(data.trends[0].weekStartDate).toBe("2026-01-26");
    });

    it("should return 403 for employee viewing another user", async () => {
      mockGetServerSession.mockResolvedValue(mockEmployeeSession as any);

      const response = await getTrends(
        createMockRequest("/api/productivity/trends?userId=emp-2")
      );

      expect(response.status).toBe(403);
    });

    it("should return 403 when dept head views trends for user in different department", async () => {
      mockGetServerSession.mockResolvedValue(mockDeptHeadSession as any);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      const response = await getTrends(
        createMockRequest("/api/productivity/trends?userId=emp-other-dept")
      );

      expect(response.status).toBe(403);
    });
  });

  // ============================================
  // GET /api/productivity/config
  // ============================================
  describe("GET /api/productivity/config", () => {
    it("should return 401 when not authenticated", async () => {
      mockGetServerSession.mockResolvedValue(null);
      const response = await getConfig();
      expect(response.status).toBe(401);
    });

    it("should return 403 when not admin", async () => {
      mockGetServerSession.mockResolvedValue(mockManagerSession as any);
      const response = await getConfig();
      expect(response.status).toBe(403);
    });

    it("should return configs with defaults for departments without config", async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession as any);
      (prisma.department.findMany as jest.Mock).mockResolvedValue([
        {
          id: "dept-1",
          name: "Engineering",
          scoringConfig: null,
        },
        {
          id: "dept-2",
          name: "Sales",
          scoringConfig: {
            weeklyOutputTarget: 20,
            outputWeight: 0.4,
            qualityWeight: 0.2,
            reliabilityWeight: 0.3,
            consistencyWeight: 0.1,
            updatedAt: new Date(),
          },
        },
      ]);

      const response = await getConfig();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.configs).toHaveLength(2);
      // Defaults for Engineering (no config)
      expect(data.configs[0].weeklyOutputTarget).toBe(15);
      expect(data.configs[0].outputWeight).toBe(0.35);
      // Custom for Sales
      expect(data.configs[1].weeklyOutputTarget).toBe(20);
      expect(data.configs[1].outputWeight).toBe(0.4);
    });
  });

  // ============================================
  // PATCH /api/productivity/config/[departmentId]
  // ============================================
  describe("PATCH /api/productivity/config/[departmentId]", () => {
    it("should return 401 when not authenticated", async () => {
      mockGetServerSession.mockResolvedValue(null);
      const response = await patchConfig(
        createMockRequest("/api/productivity/config/dept-1", {
          method: "PATCH",
          body: { weeklyOutputTarget: 20 },
        }),
        { params: Promise.resolve({ departmentId: "dept-1" }) }
      );
      expect(response.status).toBe(401);
    });

    it("should return 403 when not admin", async () => {
      mockGetServerSession.mockResolvedValue(mockManagerSession as any);
      const response = await patchConfig(
        createMockRequest("/api/productivity/config/dept-1", {
          method: "PATCH",
          body: { weeklyOutputTarget: 20 },
        }),
        { params: Promise.resolve({ departmentId: "dept-1" }) }
      );
      expect(response.status).toBe(403);
    });

    it("should return 400 when weights do not sum to 1", async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession as any);
      (prisma.department.findFirst as jest.Mock).mockResolvedValue({ id: "dept-1" });

      const response = await patchConfig(
        createMockRequest("/api/productivity/config/dept-1", {
          method: "PATCH",
          body: {
            outputWeight: 0.4,
            qualityWeight: 0.4,
            reliabilityWeight: 0.3,
            consistencyWeight: 0.1,
          },
        }),
        { params: Promise.resolve({ departmentId: "dept-1" }) }
      );
      expect(response.status).toBe(400);
    });

    it("should return 400 when partial weights provided", async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession as any);
      (prisma.department.findFirst as jest.Mock).mockResolvedValue({ id: "dept-1" });

      const response = await patchConfig(
        createMockRequest("/api/productivity/config/dept-1", {
          method: "PATCH",
          body: {
            outputWeight: 0.4,
            qualityWeight: 0.3,
          },
        }),
        { params: Promise.resolve({ departmentId: "dept-1" }) }
      );
      expect(response.status).toBe(400);
    });

    it("should create config if none exists (upsert)", async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession as any);
      (prisma.department.findFirst as jest.Mock).mockResolvedValue({ id: "dept-1" });
      (prisma.scoringConfig.upsert as jest.Mock).mockResolvedValue({
        id: "config-1",
        departmentId: "dept-1",
        weeklyOutputTarget: 20,
        outputWeight: 0.35,
        qualityWeight: 0.25,
        reliabilityWeight: 0.25,
        consistencyWeight: 0.15,
      });

      const response = await patchConfig(
        createMockRequest("/api/productivity/config/dept-1", {
          method: "PATCH",
          body: { weeklyOutputTarget: 20 },
        }),
        { params: Promise.resolve({ departmentId: "dept-1" }) }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.config).toBeDefined();
      expect(prisma.scoringConfig.upsert).toHaveBeenCalled();
    });

    it("should update existing config with valid weights", async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession as any);
      (prisma.department.findFirst as jest.Mock).mockResolvedValue({ id: "dept-1" });
      (prisma.scoringConfig.upsert as jest.Mock).mockResolvedValue({
        id: "config-1",
        departmentId: "dept-1",
        weeklyOutputTarget: 15,
        outputWeight: 0.4,
        qualityWeight: 0.2,
        reliabilityWeight: 0.3,
        consistencyWeight: 0.1,
      });

      const response = await patchConfig(
        createMockRequest("/api/productivity/config/dept-1", {
          method: "PATCH",
          body: {
            outputWeight: 0.4,
            qualityWeight: 0.2,
            reliabilityWeight: 0.3,
            consistencyWeight: 0.1,
          },
        }),
        { params: Promise.resolve({ departmentId: "dept-1" }) }
      );

      expect(response.status).toBe(200);
    });

    it("should return 404 when department not found", async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession as any);
      (prisma.department.findFirst as jest.Mock).mockResolvedValue(null);

      const response = await patchConfig(
        createMockRequest("/api/productivity/config/nonexistent", {
          method: "PATCH",
          body: { weeklyOutputTarget: 20 },
        }),
        { params: Promise.resolve({ departmentId: "nonexistent" }) }
      );

      expect(response.status).toBe(404);
    });
  });
});
