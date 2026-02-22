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

// Consistent CUID test IDs
const EMP_1 = "cm7qk0b0a0000abcduserid01";
const EMP_2 = "cm7qk0b0a0000abcduserid02";
const EMP_3 = "cm7qk0b0a0000abcduserid03";
const MGR_1 = "cm7qk0b0a0000abcdmgrid001";
const DH_1 = "cm7qk0b0a0000abcduserid04";
const ADMIN_1 = "cm7qk0b0a0000abcduserid05";
const OTHER_USER = "cm7qk0b0a0000abcduserid06";
const UNAUTH_USER = "cm7qk0b0a0000abcduserid07";

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
        user: { id: EMP_1, role: "EMPLOYEE" },
      } as any);

      await GET(createMockNextRequest({ ownerId: [OTHER_USER] }));

      // Employee should always see only their own tasks
      const countCall = mockPrismaTaskCount.mock.calls[0][0] as any;
      expect(countCall.where.ownerId).toBe(EMP_1);
    });

    it("should not allow employees to see other users' tasks", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: EMP_1, role: "EMPLOYEE" },
      } as any);

      await GET(createMockNextRequest());

      const countCall = mockPrismaTaskCount.mock.calls[0][0] as any;
      expect(countCall.where.ownerId).toBe(EMP_1);
    });
  });

  describe("MANAGER role - ownerId filtering", () => {
    const managerId = MGR_1;
    const subordinates = [
      { id: EMP_1 },
      { id: EMP_2 },
      { id: EMP_3 },
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
        in: [managerId, EMP_1, EMP_2, EMP_3],
      });
    });

    it("should filter to a single subordinate when one ownerId specified", async () => {
      await GET(createMockNextRequest({ ownerId: EMP_1 }));

      const countCall = mockPrismaTaskCount.mock.calls[0][0] as any;
      expect(countCall.where.ownerId).toEqual({ in: [EMP_1] });
    });

    it("should filter to multiple subordinates when multiple ownerIds specified", async () => {
      await GET(createMockNextRequest({ ownerId: [EMP_1, EMP_2] }));

      const countCall = mockPrismaTaskCount.mock.calls[0][0] as any;
      expect(countCall.where.ownerId).toEqual({ in: [EMP_1, EMP_2] });
    });

    it("should allow manager to filter to self", async () => {
      await GET(createMockNextRequest({ ownerId: managerId }));

      const countCall = mockPrismaTaskCount.mock.calls[0][0] as any;
      expect(countCall.where.ownerId).toEqual({ in: [managerId] });
    });

    it("should allow manager to filter to self + subordinates", async () => {
      await GET(createMockNextRequest({ ownerId: [managerId, EMP_1] }));

      const countCall = mockPrismaTaskCount.mock.calls[0][0] as any;
      expect(countCall.where.ownerId).toEqual({ in: [managerId, EMP_1] });
    });

    it("should return 403 when manager requests unauthorized ownerId", async () => {
      const response = await GET(
        createMockNextRequest({ ownerId: UNAUTH_USER })
      );
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should return 403 when any ownerId in the list is unauthorized", async () => {
      const response = await GET(
        createMockNextRequest({ ownerId: [EMP_1, UNAUTH_USER] })
      );
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });
  });

  describe("DEPARTMENT_HEAD role - ownerId filtering", () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue({
        user: { id: DH_1, role: "DEPARTMENT_HEAD" },
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
      await GET(createMockNextRequest({ ownerId: [EMP_1, EMP_2] }));

      const countCall = mockPrismaTaskCount.mock.calls[0][0] as any;
      expect(countCall.where.ownerId).toEqual({ in: [EMP_1, EMP_2] });
    });

    it("should filter to single ownerId when one provided", async () => {
      await GET(createMockNextRequest({ ownerId: EMP_1 }));

      const countCall = mockPrismaTaskCount.mock.calls[0][0] as any;
      expect(countCall.where.ownerId).toEqual({ in: [EMP_1] });
    });
  });

  describe("ADMIN role - ownerId filtering", () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue({
        user: { id: ADMIN_1, role: "ADMIN" },
      } as any);
    });

    it("should see all tasks when no ownerIds specified", async () => {
      await GET(createMockNextRequest());

      const countCall = mockPrismaTaskCount.mock.calls[0][0] as any;
      expect(countCall.where.ownerId).toBeUndefined();
      expect(countCall.where.deletedAt).toBeNull();
    });

    it("should filter to specific ownerIds when provided", async () => {
      await GET(createMockNextRequest({ ownerId: [EMP_1, EMP_2, EMP_3] }));

      const countCall = mockPrismaTaskCount.mock.calls[0][0] as any;
      expect(countCall.where.ownerId).toEqual({ in: [EMP_1, EMP_2, EMP_3] });
    });
  });

  describe("backward compatibility", () => {
    it("should handle single ownerId from my-tasks view (manager)", async () => {
      const managerId = MGR_1;
      mockGetServerSession.mockResolvedValue({
        user: { id: managerId, role: "MANAGER" },
      } as any);
      mockPrismaUserFindMany.mockResolvedValue([{ id: EMP_1 }] as any);

      // Single ownerId = self (my tasks view)
      await GET(createMockNextRequest({ ownerId: managerId }));

      const countCall = mockPrismaTaskCount.mock.calls[0][0] as any;
      expect(countCall.where.ownerId).toEqual({ in: [managerId] });
    });

    it("should handle single ownerId from my-tasks view (admin)", async () => {
      const adminId = ADMIN_1;
      mockGetServerSession.mockResolvedValue({
        user: { id: adminId, role: "ADMIN" },
      } as any);

      await GET(createMockNextRequest({ ownerId: adminId }));

      const countCall = mockPrismaTaskCount.mock.calls[0][0] as any;
      expect(countCall.where.ownerId).toEqual({ in: [adminId] });
    });
  });
});
