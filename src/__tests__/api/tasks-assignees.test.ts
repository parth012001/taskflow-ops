/**
 * Tests for /api/tasks/assignees endpoint
 *
 * This endpoint returns users that the current user can assign tasks to,
 * based on their role in the organization hierarchy.
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
      findUnique: jest.fn(),
    },
  },
}));

// Mock permissions
jest.mock("@/lib/utils/permissions", () => ({
  canAssignTasks: jest.fn(),
}));

import { GET } from "@/app/api/tasks/assignees/route";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { canAssignTasks } from "@/lib/utils/permissions";

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockCanAssignTasks = canAssignTasks as jest.MockedFunction<typeof canAssignTasks>;
const mockPrismaUserFindMany = prisma.user.findMany as jest.MockedFunction<typeof prisma.user.findMany>;
const mockPrismaUserFindUnique = prisma.user.findUnique as jest.MockedFunction<typeof prisma.user.findUnique>;

describe("GET /api/tasks/assignees", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Authentication", () => {
    it("should return 401 when user is not authenticated", async () => {
      mockGetServerSession.mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 401 when session has no user", async () => {
      mockGetServerSession.mockResolvedValue({ user: undefined } as any);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });

  describe("EMPLOYEE role", () => {
    it("should return empty array for EMPLOYEE (no assign permission)", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "employee-1", role: "EMPLOYEE" },
      } as any);
      mockCanAssignTasks.mockReturnValue(false);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual([]);
      expect(mockPrismaUserFindMany).not.toHaveBeenCalled();
    });
  });

  describe("MANAGER role", () => {
    it("should return only direct subordinates for MANAGER", async () => {
      const managerId = "manager-1";
      const subordinates = [
        { id: "emp-1", firstName: "John", lastName: "Doe", email: "john@test.com", role: "EMPLOYEE" },
        { id: "emp-2", firstName: "Jane", lastName: "Smith", email: "jane@test.com", role: "EMPLOYEE" },
      ];

      mockGetServerSession.mockResolvedValue({
        user: { id: managerId, role: "MANAGER" },
      } as any);
      mockCanAssignTasks.mockReturnValue(true);
      mockPrismaUserFindMany.mockResolvedValue(subordinates as any);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(2);
      expect(data[0].firstName).toBe("John");
      expect(data[1].firstName).toBe("Jane");

      // Verify the query filters by managerId
      expect(mockPrismaUserFindMany).toHaveBeenCalledWith({
        where: {
          managerId: managerId,
          isActive: true,
          deletedAt: null,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
        },
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      });
    });

    it("should return empty array if manager has no subordinates", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "manager-lonely", role: "MANAGER" },
      } as any);
      mockCanAssignTasks.mockReturnValue(true);
      mockPrismaUserFindMany.mockResolvedValue([]);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual([]);
    });
  });

  describe("DEPARTMENT_HEAD role", () => {
    it("should return all department members (excluding self) for DEPARTMENT_HEAD", async () => {
      const deptHeadId = "dept-head-1";
      const departmentId = "dept-engineering";
      const departmentMembers = [
        { id: "emp-1", firstName: "Alice", lastName: "Wong", email: "alice@test.com", role: "EMPLOYEE" },
        { id: "mgr-1", firstName: "Bob", lastName: "Chen", email: "bob@test.com", role: "MANAGER" },
      ];

      mockGetServerSession.mockResolvedValue({
        user: { id: deptHeadId, role: "DEPARTMENT_HEAD" },
      } as any);
      mockCanAssignTasks.mockReturnValue(true);
      mockPrismaUserFindUnique.mockResolvedValue({ departmentId } as any);
      mockPrismaUserFindMany.mockResolvedValue(departmentMembers as any);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(2);

      // Verify it looked up the user's department
      expect(mockPrismaUserFindUnique).toHaveBeenCalledWith({
        where: { id: deptHeadId },
        select: { departmentId: true },
      });

      // Verify the query filters by departmentId and excludes self
      expect(mockPrismaUserFindMany).toHaveBeenCalledWith({
        where: {
          departmentId: departmentId,
          isActive: true,
          deletedAt: null,
          id: { not: deptHeadId },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
        },
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      });
    });

    it("should return empty array if DEPARTMENT_HEAD has no departmentId", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "dept-head-orphan", role: "DEPARTMENT_HEAD" },
      } as any);
      mockCanAssignTasks.mockReturnValue(true);
      mockPrismaUserFindUnique.mockResolvedValue({ departmentId: null } as any);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual([]);
      expect(mockPrismaUserFindMany).not.toHaveBeenCalled();
    });
  });

  describe("ADMIN role", () => {
    it("should return all active users (excluding self) for ADMIN", async () => {
      const adminId = "admin-1";
      const allUsers = [
        { id: "emp-1", firstName: "Carol", lastName: "Davis", email: "carol@test.com", role: "EMPLOYEE" },
        { id: "mgr-1", firstName: "Dave", lastName: "Evans", email: "dave@test.com", role: "MANAGER" },
        { id: "dept-1", firstName: "Eve", lastName: "Foster", email: "eve@test.com", role: "DEPARTMENT_HEAD" },
      ];

      mockGetServerSession.mockResolvedValue({
        user: { id: adminId, role: "ADMIN" },
      } as any);
      mockCanAssignTasks.mockReturnValue(true);
      mockPrismaUserFindMany.mockResolvedValue(allUsers as any);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(3);

      // Verify the query excludes self and filters by active
      expect(mockPrismaUserFindMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          deletedAt: null,
          id: { not: adminId },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
        },
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      });
    });

    it("should not include the admin themselves in the results", async () => {
      const adminId = "admin-1";

      mockGetServerSession.mockResolvedValue({
        user: { id: adminId, role: "ADMIN" },
      } as any);
      mockCanAssignTasks.mockReturnValue(true);
      mockPrismaUserFindMany.mockResolvedValue([
        { id: "other-user", firstName: "Other", lastName: "User", email: "other@test.com", role: "EMPLOYEE" },
      ] as any);

      const response = await GET();
      const data = await response.json();

      // The query should have excluded adminId
      const queryCall = mockPrismaUserFindMany.mock.calls[0][0];
      expect(queryCall?.where?.id).toEqual({ not: adminId });
    });
  });

  describe("Response format", () => {
    it("should return users sorted by firstName then lastName", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "admin-1", role: "ADMIN" },
      } as any);
      mockCanAssignTasks.mockReturnValue(true);
      mockPrismaUserFindMany.mockResolvedValue([]);

      await GET();

      const queryCall = mockPrismaUserFindMany.mock.calls[0][0];
      expect(queryCall?.orderBy).toEqual([{ firstName: "asc" }, { lastName: "asc" }]);
    });

    it("should only return required fields (id, firstName, lastName, email, role)", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "admin-1", role: "ADMIN" },
      } as any);
      mockCanAssignTasks.mockReturnValue(true);
      mockPrismaUserFindMany.mockResolvedValue([]);

      await GET();

      const queryCall = mockPrismaUserFindMany.mock.calls[0][0];
      expect(queryCall?.select).toEqual({
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
      });
    });
  });

  describe("Error handling", () => {
    it("should return 500 on database error", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "admin-1", role: "ADMIN" },
      } as any);
      mockCanAssignTasks.mockReturnValue(true);
      mockPrismaUserFindMany.mockRejectedValue(new Error("Database connection failed"));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });
  });

  describe("Active user filtering", () => {
    it("should only return active users (isActive: true)", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "admin-1", role: "ADMIN" },
      } as any);
      mockCanAssignTasks.mockReturnValue(true);
      mockPrismaUserFindMany.mockResolvedValue([]);

      await GET();

      const queryCall = mockPrismaUserFindMany.mock.calls[0][0];
      expect(queryCall?.where?.isActive).toBe(true);
    });

    it("should exclude soft-deleted users (deletedAt: null)", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "admin-1", role: "ADMIN" },
      } as any);
      mockCanAssignTasks.mockReturnValue(true);
      mockPrismaUserFindMany.mockResolvedValue([]);

      await GET();

      const queryCall = mockPrismaUserFindMany.mock.calls[0][0];
      expect(queryCall?.where?.deletedAt).toBeNull();
    });
  });
});
