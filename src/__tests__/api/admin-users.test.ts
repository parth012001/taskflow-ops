/**
 * Tests for Admin User Management API Routes
 *
 * Tests authentication, authorization, and CRUD operations.
 */

// Mock next/server before importing the routes
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

// Mock bcrypt
jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockResolvedValue("hashed-password"),
  compare: jest.fn().mockResolvedValue(true),
}));

// Mock prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    department: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

import { GET, POST } from "@/app/api/admin/users/route";
import { GET as getUserById, PATCH } from "@/app/api/admin/users/[id]/route";
import { POST as resetPassword } from "@/app/api/admin/users/[id]/reset-password/route";
import { GET as getPotentialManagers } from "@/app/api/admin/users/potential-managers/route";
import { GET as getDepartments } from "@/app/api/admin/departments/route";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

const mockGetServerSession = getServerSession as jest.MockedFunction<
  typeof getServerSession
>;
const mockPrismaUserFindUnique = prisma.user
  .findUnique as jest.MockedFunction<typeof prisma.user.findUnique>;
const mockPrismaUserFindMany = prisma.user.findMany as jest.MockedFunction<
  typeof prisma.user.findMany
>;
const mockPrismaUserCount = prisma.user.count as jest.MockedFunction<
  typeof prisma.user.count
>;
const mockPrismaUserCreate = prisma.user.create as jest.MockedFunction<
  typeof prisma.user.create
>;
const mockPrismaUserUpdate = prisma.user.update as jest.MockedFunction<
  typeof prisma.user.update
>;
const mockPrismaDeptFindUnique = prisma.department
  .findUnique as jest.MockedFunction<typeof prisma.department.findUnique>;
const mockPrismaDeptFindMany = prisma.department
  .findMany as jest.MockedFunction<typeof prisma.department.findMany>;

function createMockRequest(
  url: string,
  options: {
    method?: string;
    body?: Record<string, unknown>;
  } = {}
): any {
  return {
    url: `http://localhost:3000${url}`,
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
    departmentId: null,
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

const mockUser = {
  id: "user-1",
  email: "user@test.com",
  firstName: "Test",
  lastName: "User",
  role: "EMPLOYEE",
  isActive: true,
  createdAt: new Date(),
  lastLoginAt: null,
  mustChangePassword: false,
  department: { id: "dept-1", name: "Engineering" },
  manager: { id: "mgr-1", firstName: "Manager", lastName: "User" },
  _count: { subordinates: 0 },
};

describe("Admin User Management API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/admin/users", () => {
    describe("Authentication & Authorization", () => {
      it("should return 401 when not authenticated", async () => {
        mockGetServerSession.mockResolvedValue(null);

        const response = await GET(createMockRequest("/api/admin/users"));
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe("Unauthorized");
      });

      it("should return 403 when user is not admin", async () => {
        mockGetServerSession.mockResolvedValue(mockManagerSession as any);

        const response = await GET(createMockRequest("/api/admin/users"));
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.error).toContain("Admin access required");
      });
    });

    describe("List Users", () => {
      beforeEach(() => {
        mockGetServerSession.mockResolvedValue(mockAdminSession as any);
        mockPrismaUserCount.mockResolvedValue(1);
        mockPrismaUserFindMany.mockResolvedValue([mockUser] as any);
      });

      it("should return paginated users", async () => {
        const response = await GET(createMockRequest("/api/admin/users"));
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.users).toHaveLength(1);
        expect(data.pagination).toBeDefined();
        expect(data.pagination.total).toBe(1);
      });

      it("should apply search filter", async () => {
        await GET(createMockRequest("/api/admin/users?search=john"));

        expect(mockPrismaUserCount).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              OR: expect.arrayContaining([
                { firstName: { contains: "john", mode: "insensitive" } },
              ]),
            }),
          })
        );
      });

      it("should apply role filter", async () => {
        await GET(createMockRequest("/api/admin/users?role=MANAGER"));

        expect(mockPrismaUserCount).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              role: "MANAGER",
            }),
          })
        );
      });

      it("should apply department filter", async () => {
        await GET(createMockRequest("/api/admin/users?departmentId=dept-1"));

        expect(mockPrismaUserCount).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              departmentId: "dept-1",
            }),
          })
        );
      });

      it("should apply isActive filter", async () => {
        await GET(createMockRequest("/api/admin/users?isActive=true"));

        expect(mockPrismaUserCount).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              isActive: true,
            }),
          })
        );
      });
    });
  });

  describe("POST /api/admin/users", () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(mockAdminSession as any);
      mockPrismaUserFindUnique.mockResolvedValue(null); // No existing user
      mockPrismaUserCreate.mockResolvedValue(mockUser as any);
    });

    it("should return 401 when not authenticated", async () => {
      mockGetServerSession.mockResolvedValue(null);

      const response = await POST(
        createMockRequest("/api/admin/users", {
          method: "POST",
          body: {
            email: "new@test.com",
            firstName: "New",
            lastName: "User",
            role: "EMPLOYEE",
            autoGeneratePassword: true,
          },
        })
      );

      expect(response.status).toBe(401);
    });

    it("should return 403 when user is not admin", async () => {
      mockGetServerSession.mockResolvedValue(mockManagerSession as any);

      const response = await POST(
        createMockRequest("/api/admin/users", {
          method: "POST",
          body: {
            email: "new@test.com",
            firstName: "New",
            lastName: "User",
            role: "EMPLOYEE",
            autoGeneratePassword: true,
          },
        })
      );

      expect(response.status).toBe(403);
    });

    it("should create user with auto-generated password", async () => {
      const response = await POST(
        createMockRequest("/api/admin/users", {
          method: "POST",
          body: {
            email: "new@test.com",
            firstName: "New",
            lastName: "User",
            role: "EMPLOYEE",
            autoGeneratePassword: true,
          },
        })
      );
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.user).toBeDefined();
      expect(data.temporaryPassword).toBeDefined();
      expect(mockPrismaUserCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: "new@test.com",
            mustChangePassword: true,
          }),
        })
      );
    });

    it("should return 409 when email already exists", async () => {
      mockPrismaUserFindUnique.mockResolvedValue(mockUser as any);

      const response = await POST(
        createMockRequest("/api/admin/users", {
          method: "POST",
          body: {
            email: "existing@test.com",
            firstName: "New",
            lastName: "User",
            role: "EMPLOYEE",
            autoGeneratePassword: true,
          },
        })
      );
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain("already exists");
    });

    it("should validate manager role", async () => {
      mockPrismaUserFindUnique
        .mockResolvedValueOnce(null) // First call: email check
        .mockResolvedValueOnce({
          id: "emp-1",
          role: "EMPLOYEE",
          isActive: true,
        } as any); // Second call: manager check

      const response = await POST(
        createMockRequest("/api/admin/users", {
          method: "POST",
          body: {
            email: "new@test.com",
            firstName: "New",
            lastName: "User",
            role: "EMPLOYEE",
            managerId: "emp-1",
            autoGeneratePassword: true,
          },
        })
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("cannot be a manager");
    });
  });

  describe("GET /api/admin/users/[id]", () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(mockAdminSession as any);
    });

    it("should return user by id", async () => {
      mockPrismaUserFindUnique.mockResolvedValue(mockUser as any);

      const response = await getUserById(
        createMockRequest("/api/admin/users/user-1"),
        { params: Promise.resolve({ id: "user-1" }) }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe("user-1");
    });

    it("should return 404 when user not found", async () => {
      mockPrismaUserFindUnique.mockResolvedValue(null);

      const response = await getUserById(
        createMockRequest("/api/admin/users/nonexistent"),
        { params: Promise.resolve({ id: "nonexistent" }) }
      );
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("User not found");
    });
  });

  describe("PATCH /api/admin/users/[id]", () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(mockAdminSession as any);
      mockPrismaUserFindUnique.mockResolvedValue(mockUser as any);
      mockPrismaUserUpdate.mockResolvedValue(mockUser as any);
    });

    it("should update user details", async () => {
      const response = await PATCH(
        createMockRequest("/api/admin/users/user-1", {
          method: "PATCH",
          body: {
            firstName: "Updated",
            role: "MANAGER",
          },
        }),
        { params: Promise.resolve({ id: "user-1" }) }
      );

      expect(response.status).toBe(200);
      expect(mockPrismaUserUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            firstName: "Updated",
            role: "MANAGER",
          }),
        })
      );
    });

    it("should prevent admin from deactivating self", async () => {
      const response = await PATCH(
        createMockRequest("/api/admin/users/admin-1", {
          method: "PATCH",
          body: { isActive: false },
        }),
        { params: Promise.resolve({ id: "admin-1" }) }
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("cannot deactivate your own account");
    });

    it("should prevent admin from changing own role", async () => {
      mockPrismaUserFindUnique.mockResolvedValue({
        ...mockUser,
        id: "admin-1",
        role: "ADMIN",
      } as any);

      const response = await PATCH(
        createMockRequest("/api/admin/users/admin-1", {
          method: "PATCH",
          body: { role: "EMPLOYEE" },
        }),
        { params: Promise.resolve({ id: "admin-1" }) }
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("cannot change your own role");
    });

    it("should prevent user from being own manager", async () => {
      const response = await PATCH(
        createMockRequest("/api/admin/users/user-1", {
          method: "PATCH",
          body: { managerId: "user-1" },
        }),
        { params: Promise.resolve({ id: "user-1" }) }
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("cannot be their own manager");
    });
  });

  describe("POST /api/admin/users/[id]/reset-password", () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(mockAdminSession as any);
      mockPrismaUserFindUnique.mockResolvedValue(mockUser as any);
      mockPrismaUserUpdate.mockResolvedValue(mockUser as any);
    });

    it("should reset password with auto-generate", async () => {
      const response = await resetPassword(
        createMockRequest("/api/admin/users/user-1/reset-password", {
          method: "POST",
          body: { autoGenerate: true },
        }),
        { params: Promise.resolve({ id: "user-1" }) }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toContain("Password reset successfully");
      expect(data.temporaryPassword).toBeDefined();
      expect(mockPrismaUserUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            mustChangePassword: true,
          }),
        })
      );
    });

    it("should reset password with manual entry", async () => {
      const response = await resetPassword(
        createMockRequest("/api/admin/users/user-1/reset-password", {
          method: "POST",
          body: {
            newPassword: "NewSecurePass1",
            autoGenerate: false,
          },
        }),
        { params: Promise.resolve({ id: "user-1" }) }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.temporaryPassword).toBeUndefined();
    });

    it("should return 404 when user not found", async () => {
      mockPrismaUserFindUnique.mockResolvedValue(null);

      const response = await resetPassword(
        createMockRequest("/api/admin/users/nonexistent/reset-password", {
          method: "POST",
          body: { autoGenerate: true },
        }),
        { params: Promise.resolve({ id: "nonexistent" }) }
      );
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("User not found");
    });
  });

  describe("GET /api/admin/users/potential-managers", () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(mockAdminSession as any);
    });

    it("should return managers and above", async () => {
      const managers = [
        { id: "mgr-1", firstName: "Manager", lastName: "One", role: "MANAGER" },
        {
          id: "dh-1",
          firstName: "Dept",
          lastName: "Head",
          role: "DEPARTMENT_HEAD",
        },
      ];
      mockPrismaUserFindMany.mockResolvedValue(managers as any);

      const response = await getPotentialManagers();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.managers).toHaveLength(2);
      expect(mockPrismaUserFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            role: { in: ["MANAGER", "DEPARTMENT_HEAD", "ADMIN"] },
          }),
        })
      );
    });
  });

  describe("GET /api/admin/departments", () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(mockAdminSession as any);
    });

    it("should return all departments", async () => {
      const departments = [
        { id: "dept-1", name: "Engineering", _count: { users: 5 } },
        { id: "dept-2", name: "Sales", _count: { users: 3 } },
      ];
      mockPrismaDeptFindMany.mockResolvedValue(departments as any);

      const response = await getDepartments();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.departments).toHaveLength(2);
    });

    it("should return 403 for non-admin", async () => {
      mockGetServerSession.mockResolvedValue(mockManagerSession as any);

      const response = await getDepartments();
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain("Admin access required");
    });
  });
});
