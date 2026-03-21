import { getSubordinateIds, getManagerIds, isManagerOf, validateManagerIds } from "@/lib/utils/manager-helpers";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    userManager: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

const mockUserManager = prisma.userManager as jest.Mocked<typeof prisma.userManager>;
const mockUser = prisma.user as jest.Mocked<typeof prisma.user>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("getSubordinateIds", () => {
  it("returns user IDs for a manager's subordinates", async () => {
    (mockUserManager.findMany as jest.Mock).mockResolvedValue([
      { userId: "emp-1" },
      { userId: "emp-2" },
    ]);

    const result = await getSubordinateIds("mgr-1");
    expect(result).toEqual(["emp-1", "emp-2"]);
    expect(mockUserManager.findMany).toHaveBeenCalledWith({
      where: { managerId: "mgr-1" },
      select: { userId: true },
    });
  });

  it("returns empty array when no subordinates", async () => {
    (mockUserManager.findMany as jest.Mock).mockResolvedValue([]);
    const result = await getSubordinateIds("mgr-1");
    expect(result).toEqual([]);
  });
});

describe("getManagerIds", () => {
  it("returns manager IDs for a user", async () => {
    (mockUserManager.findMany as jest.Mock).mockResolvedValue([
      { managerId: "mgr-1" },
      { managerId: "mgr-2" },
    ]);

    const result = await getManagerIds("emp-1");
    expect(result).toEqual(["mgr-1", "mgr-2"]);
    expect(mockUserManager.findMany).toHaveBeenCalledWith({
      where: { userId: "emp-1" },
      select: { managerId: true },
    });
  });

  it("returns empty array when user has no managers", async () => {
    (mockUserManager.findMany as jest.Mock).mockResolvedValue([]);
    const result = await getManagerIds("emp-1");
    expect(result).toEqual([]);
  });
});

describe("isManagerOf", () => {
  it("returns true when relationship exists", async () => {
    (mockUserManager.findUnique as jest.Mock).mockResolvedValue({ id: "rel-1" });

    const result = await isManagerOf("mgr-1", "emp-1");
    expect(result).toBe(true);
    expect(mockUserManager.findUnique).toHaveBeenCalledWith({
      where: { userId_managerId: { userId: "emp-1", managerId: "mgr-1" } },
    });
  });

  it("returns false when relationship does not exist", async () => {
    (mockUserManager.findUnique as jest.Mock).mockResolvedValue(null);
    const result = await isManagerOf("mgr-1", "emp-1");
    expect(result).toBe(false);
  });
});

describe("validateManagerIds", () => {
  it("allows empty array (no managers)", async () => {
    const result = await validateManagerIds([]);
    expect(result).toEqual({ valid: true, deduped: [] });
  });

  it("rejects more than 5 managers", async () => {
    const result = await validateManagerIds(["a", "b", "c", "d", "e", "f"]);
    expect(result).toEqual({ valid: false, error: "Maximum 5 managers allowed" });
  });

  it("rejects self-management", async () => {
    const result = await validateManagerIds(["mgr-1"], "mgr-1");
    expect(result).toEqual({ valid: false, error: "A user cannot be their own manager" });
  });

  it("deduplicates manager IDs", async () => {
    (mockUser.findMany as jest.Mock).mockResolvedValue([
      { id: "mgr-1", role: "MANAGER", isActive: true },
    ]);
    (mockUserManager.findFirst as jest.Mock).mockResolvedValue(null);

    const result = await validateManagerIds(["mgr-1", "mgr-1"], "emp-1");
    expect(result).toEqual({ valid: true, deduped: ["mgr-1"] });
  });

  it("rejects when manager not found", async () => {
    (mockUser.findMany as jest.Mock).mockResolvedValue([]);
    const result = await validateManagerIds(["nonexistent"]);
    expect(result).toEqual({ valid: false, error: "One or more managers not found" });
  });

  it("rejects inactive manager", async () => {
    (mockUser.findMany as jest.Mock).mockResolvedValue([
      { id: "mgr-1", role: "MANAGER", isActive: false },
    ]);
    const result = await validateManagerIds(["mgr-1"]);
    expect(result).toEqual({ valid: false, error: "One or more selected managers are inactive" });
  });

  it("rejects EMPLOYEE role as manager", async () => {
    (mockUser.findMany as jest.Mock).mockResolvedValue([
      { id: "emp-1", role: "EMPLOYEE", isActive: true },
    ]);
    const result = await validateManagerIds(["emp-1"]);
    expect(result).toEqual({
      valid: false,
      error: "Selected user cannot be a manager (role too low)",
    });
  });

  it("detects circular management", async () => {
    (mockUser.findMany as jest.Mock).mockResolvedValue([
      { id: "mgr-1", role: "MANAGER", isActive: true },
    ]);
    (mockUserManager.findFirst as jest.Mock).mockResolvedValue({
      id: "rel-1",
      userId: "mgr-1",
      managerId: "emp-1",
    });

    const result = await validateManagerIds(["mgr-1"], "emp-1");
    expect(result).toEqual({
      valid: false,
      error: "Circular management relationship detected",
    });
  });

  it("accepts valid managers", async () => {
    (mockUser.findMany as jest.Mock).mockResolvedValue([
      { id: "mgr-1", role: "MANAGER", isActive: true },
      { id: "mgr-2", role: "DEPARTMENT_HEAD", isActive: true },
    ]);
    (mockUserManager.findFirst as jest.Mock).mockResolvedValue(null);

    const result = await validateManagerIds(["mgr-1", "mgr-2"], "emp-1");
    expect(result).toEqual({ valid: true, deduped: ["mgr-1", "mgr-2"] });
  });
});
