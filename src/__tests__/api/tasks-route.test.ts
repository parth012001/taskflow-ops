/**
 * Tests for GET /api/tasks endpoint
 *
 * Focuses on multi-ownerId filtering and role-based access control.
 */

// Mock next/server before importing the route
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
    },
    task: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

// Mock permissions
jest.mock("@/lib/utils/permissions", () => ({
  canViewTask: jest.fn(),
  canAssignTasks: jest.fn(),
}));

import { GET } from "@/app/api/tasks/route";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockPrismaUserFindMany = prisma.user.findMany as jest.MockedFunction<typeof prisma.user.findMany>;
const mockPrismaTaskFindMany = prisma.task.findMany as jest.MockedFunction<typeof prisma.task.findMany>;
const mockPrismaTaskCount = prisma.task.count as jest.MockedFunction<typeof prisma.task.count>;

/**
 * Creates a mock NextRequest-like object with a URL containing search params.
 * Supports multiple values for the same key (e.g., multiple ownerId values).
 */
function createMockNextRequest(
  params: Record<string, string | string[]> = {}
): any {
  const url = new URL("http://localhost:3000/api/tasks");
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      value.forEach((v) => url.searchParams.append(key, v));
    } else {
      url.searchParams.set(key, value);
    }
  }
  return { url: url.toString() };
}

describe("GET /api/tasks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrismaTaskCount.mockResolvedValue(0);
    mockPrismaTaskFindMany.mockResolvedValue([]);
  });

  describe("Authentication", () => {
    it("should return 401 when user is not authenticated", async () => {
      mockGetServerSession.mockResolvedValue(null);

      const response = await GET(createMockNextRequest());
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });

  describe("EMPLOYEE role - ownerId filtering", () => {
    it("should always filter to own tasks regardless of ownerIds param", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "emp-1", role: "EMPLOYEE" },
      } as any);

      await GET(createMockNextRequest({ ownerId: ["other-user"] }));

      // Employee should always see only their own tasks
      const countCall = mockPrismaTaskCount.mock.calls[0][0] as any;
      expect(countCall.where.ownerId).toBe("emp-1");
    });

    it("should not allow employees to see other users' tasks", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "emp-1", role: "EMPLOYEE" },
      } as any);

      await GET(createMockNextRequest());

      const countCall = mockPrismaTaskCount.mock.calls[0][0] as any;
      expect(countCall.where.ownerId).toBe("emp-1");
    });
  });

  describe("MANAGER role - ownerId filtering", () => {
    const managerId = "mgr-1";
    const subordinates = [
      { id: "emp-1" },
      { id: "emp-2" },
      { id: "emp-3" },
    ];

    beforeEach(() => {
      mockGetServerSession.mockResolvedValue({
        user: { id: managerId, role: "MANAGER" },
      } as any);
      mockPrismaUserFindMany.mockResolvedValue(subordinates as any);
    });

    it("should see own + subordinate tasks when no ownerIds specified", async () => {
      await GET(createMockNextRequest());

      const countCall = mockPrismaTaskCount.mock.calls[0][0] as any;
      expect(countCall.where.ownerId).toEqual({
        in: [managerId, "emp-1", "emp-2", "emp-3"],
      });
    });

    it("should filter to a single subordinate when one ownerId specified", async () => {
      await GET(createMockNextRequest({ ownerId: "emp-1" }));

      const countCall = mockPrismaTaskCount.mock.calls[0][0] as any;
      expect(countCall.where.ownerId).toEqual({ in: ["emp-1"] });
    });

    it("should filter to multiple subordinates when multiple ownerIds specified", async () => {
      await GET(createMockNextRequest({ ownerId: ["emp-1", "emp-2"] }));

      const countCall = mockPrismaTaskCount.mock.calls[0][0] as any;
      expect(countCall.where.ownerId).toEqual({ in: ["emp-1", "emp-2"] });
    });

    it("should allow manager to filter to self", async () => {
      await GET(createMockNextRequest({ ownerId: managerId }));

      const countCall = mockPrismaTaskCount.mock.calls[0][0] as any;
      expect(countCall.where.ownerId).toEqual({ in: [managerId] });
    });

    it("should allow manager to filter to self + subordinates", async () => {
      await GET(createMockNextRequest({ ownerId: [managerId, "emp-1"] }));

      const countCall = mockPrismaTaskCount.mock.calls[0][0] as any;
      expect(countCall.where.ownerId).toEqual({ in: [managerId, "emp-1"] });
    });

    it("should return 403 when manager requests unauthorized ownerId", async () => {
      const response = await GET(
        createMockNextRequest({ ownerId: "not-a-subordinate" })
      );
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should return 403 when any ownerId in the list is unauthorized", async () => {
      const response = await GET(
        createMockNextRequest({ ownerId: ["emp-1", "not-a-subordinate"] })
      );
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });
  });

  describe("DEPARTMENT_HEAD role - ownerId filtering", () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "dh-1", role: "DEPARTMENT_HEAD" },
      } as any);
    });

    it("should see all tasks when no ownerIds specified", async () => {
      await GET(createMockNextRequest());

      const countCall = mockPrismaTaskCount.mock.calls[0][0] as any;
      // No ownerId filter set - only deletedAt: null
      expect(countCall.where.ownerId).toBeUndefined();
      expect(countCall.where.deletedAt).toBeNull();
    });

    it("should filter to specific ownerIds when provided", async () => {
      await GET(createMockNextRequest({ ownerId: ["user-1", "user-2"] }));

      const countCall = mockPrismaTaskCount.mock.calls[0][0] as any;
      expect(countCall.where.ownerId).toEqual({ in: ["user-1", "user-2"] });
    });

    it("should filter to single ownerId when one provided", async () => {
      await GET(createMockNextRequest({ ownerId: "user-1" }));

      const countCall = mockPrismaTaskCount.mock.calls[0][0] as any;
      expect(countCall.where.ownerId).toEqual({ in: ["user-1"] });
    });
  });

  describe("ADMIN role - ownerId filtering", () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "admin-1", role: "ADMIN" },
      } as any);
    });

    it("should see all tasks when no ownerIds specified", async () => {
      await GET(createMockNextRequest());

      const countCall = mockPrismaTaskCount.mock.calls[0][0] as any;
      expect(countCall.where.ownerId).toBeUndefined();
      expect(countCall.where.deletedAt).toBeNull();
    });

    it("should filter to specific ownerIds when provided", async () => {
      await GET(createMockNextRequest({ ownerId: ["user-1", "user-2", "user-3"] }));

      const countCall = mockPrismaTaskCount.mock.calls[0][0] as any;
      expect(countCall.where.ownerId).toEqual({ in: ["user-1", "user-2", "user-3"] });
    });
  });

  describe("backward compatibility", () => {
    it("should handle single ownerId from my-tasks view (manager)", async () => {
      const managerId = "mgr-1";
      mockGetServerSession.mockResolvedValue({
        user: { id: managerId, role: "MANAGER" },
      } as any);
      mockPrismaUserFindMany.mockResolvedValue([{ id: "emp-1" }] as any);

      // Single ownerId = self (my tasks view)
      await GET(createMockNextRequest({ ownerId: managerId }));

      const countCall = mockPrismaTaskCount.mock.calls[0][0] as any;
      // getAll returns ["mgr-1"], so { in: ["mgr-1"] } which is equivalent to = "mgr-1"
      expect(countCall.where.ownerId).toEqual({ in: [managerId] });
    });

    it("should handle single ownerId from my-tasks view (admin)", async () => {
      const adminId = "admin-1";
      mockGetServerSession.mockResolvedValue({
        user: { id: adminId, role: "ADMIN" },
      } as any);

      await GET(createMockNextRequest({ ownerId: adminId }));

      const countCall = mockPrismaTaskCount.mock.calls[0][0] as any;
      expect(countCall.where.ownerId).toEqual({ in: [adminId] });
    });
  });
});
