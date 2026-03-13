/**
 * Tests for Admin Department Management API Routes
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

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/auth-options", () => ({
  authOptions: {},
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    department: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      count: jest.fn(),
    },
  },
}));

jest.mock("@/lib/rate-limit", () => ({
  mutationLimiter: {
    check: jest.fn().mockReturnValue({ allowed: true, remaining: 9, retryAfterSeconds: 0 }),
  },
}));

import { GET, POST } from "@/app/api/admin/departments/route";
import {
  GET as getDeptById,
  PATCH,
  DELETE,
} from "@/app/api/admin/departments/[departmentId]/route";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { mutationLimiter } from "@/lib/rate-limit";

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockDeptFindMany = prisma.department.findMany as jest.MockedFunction<typeof prisma.department.findMany>;
const mockDeptFindFirst = prisma.department.findFirst as jest.MockedFunction<typeof prisma.department.findFirst>;
const mockDeptFindUnique = prisma.department.findUnique as jest.MockedFunction<typeof prisma.department.findUnique>;
const mockDeptCount = prisma.department.count as jest.MockedFunction<typeof prisma.department.count>;
const mockDeptCreate = prisma.department.create as jest.MockedFunction<typeof prisma.department.create>;
const mockDeptUpdate = prisma.department.update as jest.MockedFunction<typeof prisma.department.update>;
const mockUserFindUnique = prisma.user.findUnique as jest.MockedFunction<typeof prisma.user.findUnique>;
const mockUserCount = prisma.user.count as jest.MockedFunction<typeof prisma.user.count>;
const mockRateLimitCheck = mutationLimiter.check as jest.MockedFunction<typeof mutationLimiter.check>;

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

const mockDepartment = {
  id: "dept-1",
  name: "Engineering",
  description: "The engineering team",
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  head: { id: "head-1", firstName: "Head", lastName: "User" },
  _count: { users: 5 },
};

function createMockRequest(
  url: string,
  options: { method?: string; body?: Record<string, unknown> } = {}
): any {
  return {
    url: `http://localhost:3000${url}`,
    json: async () => options.body || {},
  };
}

function createMockParams(departmentId: string) {
  return { params: Promise.resolve({ departmentId }) };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRateLimitCheck.mockReturnValue({ allowed: true, remaining: 9, retryAfterSeconds: 0 });
});

describe("GET /api/admin/departments", () => {
  it("should return 401 for unauthenticated requests", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const req = createMockRequest("/api/admin/departments");
    const response = await GET(req);
    expect(response.status).toBe(401);
  });

  it("should return 403 for non-admin users", async () => {
    mockGetServerSession.mockResolvedValue(mockManagerSession as any);
    const req = createMockRequest("/api/admin/departments");
    const response = await GET(req);
    expect(response.status).toBe(403);
  });

  it("should return all departments without pagination params", async () => {
    mockGetServerSession.mockResolvedValue(mockAdminSession as any);
    mockDeptFindMany.mockResolvedValue([mockDepartment] as any);

    const req = createMockRequest("/api/admin/departments");
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.departments).toHaveLength(1);
    expect(data.pagination).toBeUndefined();
  });

  it("should return paginated departments with page param", async () => {
    mockGetServerSession.mockResolvedValue(mockAdminSession as any);
    mockDeptFindMany.mockResolvedValue([mockDepartment] as any);
    mockDeptCount.mockResolvedValue(1);

    const req = createMockRequest("/api/admin/departments?page=1&limit=20");
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.departments).toHaveLength(1);
    expect(data.pagination).toBeDefined();
    expect(data.pagination.page).toBe(1);
    expect(data.pagination.total).toBe(1);
  });

  it("should apply search filter", async () => {
    mockGetServerSession.mockResolvedValue(mockAdminSession as any);
    mockDeptFindMany.mockResolvedValue([]);
    mockDeptCount.mockResolvedValue(0);

    const req = createMockRequest("/api/admin/departments?page=1&search=eng");
    const response = await GET(req);

    expect(response.status).toBe(200);
    expect(mockDeptFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          name: { contains: "eng", mode: "insensitive" },
        }),
      })
    );
  });
});

describe("POST /api/admin/departments", () => {
  it("should return 401 for unauthenticated requests", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const req = createMockRequest("/api/admin/departments", {
      method: "POST",
      body: { name: "Test" },
    });
    const response = await POST(req);
    expect(response.status).toBe(401);
  });

  it("should return 403 for non-admin users", async () => {
    mockGetServerSession.mockResolvedValue(mockManagerSession as any);
    const req = createMockRequest("/api/admin/departments", {
      method: "POST",
      body: { name: "Test" },
    });
    const response = await POST(req);
    expect(response.status).toBe(403);
  });

  it("should create department with name only", async () => {
    mockGetServerSession.mockResolvedValue(mockAdminSession as any);
    mockDeptFindFirst.mockResolvedValue(null);
    mockDeptCreate.mockResolvedValue(mockDepartment as any);

    const req = createMockRequest("/api/admin/departments", {
      method: "POST",
      body: { name: "Engineering" },
    });
    const response = await POST(req);

    expect(response.status).toBe(201);
    expect(mockDeptCreate).toHaveBeenCalled();
  });

  it("should create department with all fields", async () => {
    mockGetServerSession.mockResolvedValue(mockAdminSession as any);
    // First call: name uniqueness check, second call: head already heading check
    mockDeptFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    mockUserFindUnique.mockResolvedValue({
      id: "head-1",
      isActive: true,
      role: "DEPARTMENT_HEAD",
    } as any);
    mockDeptCreate.mockResolvedValue(mockDepartment as any);

    const req = createMockRequest("/api/admin/departments", {
      method: "POST",
      body: {
        name: "Engineering",
        description: "The eng team",
        headId: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
      },
    });
    const response = await POST(req);
    expect(response.status).toBe(201);
  });

  it("should return 400 for invalid input", async () => {
    mockGetServerSession.mockResolvedValue(mockAdminSession as any);

    const req = createMockRequest("/api/admin/departments", {
      method: "POST",
      body: { name: "" },
    });
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it("should return 409 for duplicate name", async () => {
    mockGetServerSession.mockResolvedValue(mockAdminSession as any);
    mockDeptFindFirst.mockResolvedValue(mockDepartment as any);

    const req = createMockRequest("/api/admin/departments", {
      method: "POST",
      body: { name: "Engineering" },
    });
    const response = await POST(req);
    expect(response.status).toBe(409);
  });

  it("should return 400 when headId user not found", async () => {
    mockGetServerSession.mockResolvedValue(mockAdminSession as any);
    mockDeptFindFirst.mockResolvedValue(null);
    mockUserFindUnique.mockResolvedValue(null);

    const req = createMockRequest("/api/admin/departments", {
      method: "POST",
      body: { name: "Test", headId: "clxxxxxxxxxxxxxxxxxxxxxxxxx" },
    });
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it("should return 400 when headId user is inactive", async () => {
    mockGetServerSession.mockResolvedValue(mockAdminSession as any);
    mockDeptFindFirst.mockResolvedValue(null);
    mockUserFindUnique.mockResolvedValue({
      id: "head-1",
      isActive: false,
      role: "DEPARTMENT_HEAD",
    } as any);

    const req = createMockRequest("/api/admin/departments", {
      method: "POST",
      body: { name: "Test", headId: "clxxxxxxxxxxxxxxxxxxxxxxxxx" },
    });
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it("should return 400 when headId user has wrong role", async () => {
    mockGetServerSession.mockResolvedValue(mockAdminSession as any);
    mockDeptFindFirst.mockResolvedValue(null);
    mockUserFindUnique.mockResolvedValue({
      id: "head-1",
      isActive: true,
      role: "EMPLOYEE",
    } as any);

    const req = createMockRequest("/api/admin/departments", {
      method: "POST",
      body: { name: "Test", headId: "clxxxxxxxxxxxxxxxxxxxxxxxxx" },
    });
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it("should return 400 when head already heads another department", async () => {
    mockGetServerSession.mockResolvedValue(mockAdminSession as any);
    // First call: name uniqueness check returns null
    // Second call: head already heading another dept
    mockDeptFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(mockDepartment as any);
    mockUserFindUnique.mockResolvedValue({
      id: "head-1",
      isActive: true,
      role: "DEPARTMENT_HEAD",
    } as any);

    const req = createMockRequest("/api/admin/departments", {
      method: "POST",
      body: { name: "Test", headId: "clxxxxxxxxxxxxxxxxxxxxxxxxx" },
    });
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it("should return 429 when rate limited", async () => {
    mockGetServerSession.mockResolvedValue(mockAdminSession as any);
    mockRateLimitCheck.mockReturnValue({ allowed: false, remaining: 0, retryAfterSeconds: 6 });

    const req = createMockRequest("/api/admin/departments", {
      method: "POST",
      body: { name: "Test" },
    });
    const response = await POST(req);
    expect(response.status).toBe(429);
  });
});

describe("GET /api/admin/departments/[departmentId]", () => {
  it("should return department details", async () => {
    mockGetServerSession.mockResolvedValue(mockAdminSession as any);
    mockDeptFindUnique.mockResolvedValue(mockDepartment as any);

    const req = createMockRequest("/api/admin/departments/dept-1");
    const response = await getDeptById(req, createMockParams("dept-1"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.department.name).toBe("Engineering");
  });

  it("should return 404 for not found", async () => {
    mockGetServerSession.mockResolvedValue(mockAdminSession as any);
    mockDeptFindUnique.mockResolvedValue(null);

    const req = createMockRequest("/api/admin/departments/nonexistent");
    const response = await getDeptById(req, createMockParams("nonexistent"));
    expect(response.status).toBe(404);
  });

  it("should return 404 for soft-deleted department", async () => {
    mockGetServerSession.mockResolvedValue(mockAdminSession as any);
    mockDeptFindUnique.mockResolvedValue({
      ...mockDepartment,
      deletedAt: new Date(),
    } as any);

    const req = createMockRequest("/api/admin/departments/dept-1");
    const response = await getDeptById(req, createMockParams("dept-1"));
    expect(response.status).toBe(404);
  });
});

describe("PATCH /api/admin/departments/[departmentId]", () => {
  it("should update department name", async () => {
    mockGetServerSession.mockResolvedValue(mockAdminSession as any);
    mockDeptFindUnique.mockResolvedValue({ id: "dept-1", deletedAt: null } as any);
    mockDeptFindFirst.mockResolvedValue(null);
    mockDeptUpdate.mockResolvedValue({ ...mockDepartment, name: "Updated" } as any);

    const req = createMockRequest("/api/admin/departments/dept-1", {
      method: "PATCH",
      body: { name: "Updated" },
    });
    const response = await PATCH(req, createMockParams("dept-1"));
    expect(response.status).toBe(200);
  });

  it("should update description", async () => {
    mockGetServerSession.mockResolvedValue(mockAdminSession as any);
    mockDeptFindUnique.mockResolvedValue({ id: "dept-1", deletedAt: null } as any);
    mockDeptUpdate.mockResolvedValue(mockDepartment as any);

    const req = createMockRequest("/api/admin/departments/dept-1", {
      method: "PATCH",
      body: { description: "New desc" },
    });
    const response = await PATCH(req, createMockParams("dept-1"));
    expect(response.status).toBe(200);
  });

  it("should clear head with null", async () => {
    mockGetServerSession.mockResolvedValue(mockAdminSession as any);
    mockDeptFindUnique.mockResolvedValue({ id: "dept-1", deletedAt: null } as any);
    mockDeptUpdate.mockResolvedValue({ ...mockDepartment, head: null } as any);

    const req = createMockRequest("/api/admin/departments/dept-1", {
      method: "PATCH",
      body: { headId: null },
    });
    const response = await PATCH(req, createMockParams("dept-1"));
    expect(response.status).toBe(200);
  });

  it("should return 400 for no fields to update", async () => {
    mockGetServerSession.mockResolvedValue(mockAdminSession as any);
    mockDeptFindUnique.mockResolvedValue({ id: "dept-1", deletedAt: null } as any);

    const req = createMockRequest("/api/admin/departments/dept-1", {
      method: "PATCH",
      body: {},
    });
    const response = await PATCH(req, createMockParams("dept-1"));
    expect(response.status).toBe(400);
  });

  it("should return 404 for not found", async () => {
    mockGetServerSession.mockResolvedValue(mockAdminSession as any);
    mockDeptFindUnique.mockResolvedValue(null);

    const req = createMockRequest("/api/admin/departments/nonexistent", {
      method: "PATCH",
      body: { name: "Test" },
    });
    const response = await PATCH(req, createMockParams("nonexistent"));
    expect(response.status).toBe(404);
  });

  it("should return 409 for name conflict", async () => {
    mockGetServerSession.mockResolvedValue(mockAdminSession as any);
    mockDeptFindUnique.mockResolvedValue({ id: "dept-1", deletedAt: null } as any);
    mockDeptFindFirst.mockResolvedValue({ id: "dept-2", name: "Taken" } as any);

    const req = createMockRequest("/api/admin/departments/dept-1", {
      method: "PATCH",
      body: { name: "Taken" },
    });
    const response = await PATCH(req, createMockParams("dept-1"));
    expect(response.status).toBe(409);
  });
});

describe("DELETE /api/admin/departments/[departmentId]", () => {
  it("should soft delete department with no active users", async () => {
    mockGetServerSession.mockResolvedValue(mockAdminSession as any);
    mockDeptFindUnique.mockResolvedValue({ id: "dept-1", deletedAt: null } as any);
    mockUserCount.mockResolvedValue(0);
    mockDeptUpdate.mockResolvedValue({} as any);

    const req = createMockRequest("/api/admin/departments/dept-1", { method: "DELETE" });
    const response = await DELETE(req, createMockParams("dept-1"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe("Department deleted successfully");
    expect(mockDeptUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { deletedAt: expect.any(Date), headId: null },
      })
    );
  });

  it("should return 404 for not found", async () => {
    mockGetServerSession.mockResolvedValue(mockAdminSession as any);
    mockDeptFindUnique.mockResolvedValue(null);

    const req = createMockRequest("/api/admin/departments/nonexistent", { method: "DELETE" });
    const response = await DELETE(req, createMockParams("nonexistent"));
    expect(response.status).toBe(404);
  });

  it("should return 409 when department has active users", async () => {
    mockGetServerSession.mockResolvedValue(mockAdminSession as any);
    mockDeptFindUnique.mockResolvedValue({ id: "dept-1", deletedAt: null } as any);
    mockUserCount.mockResolvedValue(3);

    const req = createMockRequest("/api/admin/departments/dept-1", { method: "DELETE" });
    const response = await DELETE(req, createMockParams("dept-1"));
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toContain("3 active user(s)");
  });
});
