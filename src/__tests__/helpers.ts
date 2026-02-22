import {
  Role,
  TaskStatus,
  TaskPriority,
  TaskSize,
  AssignedByType,
} from "@prisma/client";

export const mockUsers = {
  employee: {
    id: "emp-1",
    email: "employee@test.com",
    firstName: "John",
    lastName: "Doe",
    role: Role.EMPLOYEE,
    managerId: "mgr-1",
    departmentId: "dept-1",
  },
  manager: {
    id: "mgr-1",
    email: "manager@test.com",
    firstName: "Jane",
    lastName: "Smith",
    role: Role.MANAGER,
    managerId: null,
    departmentId: "dept-1",
  },
  admin: {
    id: "admin-1",
    email: "admin@test.com",
    firstName: "Admin",
    lastName: "User",
    role: Role.ADMIN,
    managerId: null,
    departmentId: "dept-1",
  },
};

export const mockTask = {
  id: "task-1",
  title: "Test Task",
  description: "Test description",
  ownerId: "emp-1",
  assignerId: null,
  assignedByType: AssignedByType.SELF,
  status: TaskStatus.NEW,
  priority: TaskPriority.URGENT_IMPORTANT,
  size: TaskSize.MEDIUM,
  kpiBucketId: "kpi-1",
  estimatedMinutes: 60,
  actualMinutes: 0,
  startDate: null,
  deadline: new Date("2025-01-15"),
  completedAt: null,
  onHoldReason: null,
  isCarriedForward: false,
  originalDeadline: null,
  carryForwardCount: 0,
  rejectionReason: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

export const mockKpiBucket = {
  id: "kpi-1",
  name: "Revenue Generation",
  description: "Tasks related to revenue",
  isActive: true,
  applicableRoles: [Role.EMPLOYEE, Role.MANAGER],
};

export function createMockSession(user: typeof mockUsers.employee) {
  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      managerId: user.managerId,
      departmentId: user.departmentId,
    },
    expires: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
  };
}

export function createMockRequest(
  url: string,
  options: {
    method?: string;
    body?: Record<string, unknown>;
    searchParams?: Record<string, string>;
  } = {}
) {
  const { method = "GET", body, searchParams } = options;

  const fullUrl = new URL(url, "http://localhost:3000");
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      fullUrl.searchParams.set(key, value);
    });
  }

  return new Request(fullUrl.toString(), {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    ...(body && { body: JSON.stringify(body) }),
  });
}

export function createMockCompletedTask(overrides: Record<string, unknown> = {}) {
  return {
    id: `task-${Math.random().toString(36).slice(2, 8)}`,
    status: TaskStatus.CLOSED_APPROVED,
    size: TaskSize.MEDIUM,
    priority: TaskPriority.NOT_URGENT_IMPORTANT,
    completedAt: new Date(),
    deadline: new Date(Date.now() + 86400000),
    estimatedMinutes: 60,
    actualMinutes: 0,
    requiresReview: true,
    kpiBucketId: "kpi-1",
    carryForwardCount: 0,
    ...overrides,
  };
}

export function createMockStatusHistory(
  taskId: string,
  transitions: [TaskStatus | null, TaskStatus][]
) {
  return transitions.map(([from, to], i) => ({
    taskId,
    fromStatus: from,
    toStatus: to,
    createdAt: new Date(Date.now() + i * 1000),
  }));
}
