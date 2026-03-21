import { prisma } from "@/lib/prisma";
import type { PrismaClient } from "@prisma/client";

const MAX_MANAGERS = 5;

/**
 * Get all subordinate user IDs for a given manager.
 */
export async function getSubordinateIds(managerId: string): Promise<string[]> {
  const relations = await prisma.userManager.findMany({
    where: { managerId },
    select: { userId: true },
  });
  return relations.map((r) => r.userId);
}

/**
 * Get all manager IDs for a given user (employee).
 */
export async function getManagerIds(userId: string): Promise<string[]> {
  const relations = await prisma.userManager.findMany({
    where: { userId },
    select: { managerId: true },
  });
  return relations.map((r) => r.managerId);
}

/**
 * Check if managerId is a manager of userId.
 */
export async function isManagerOf(
  managerId: string,
  userId: string
): Promise<boolean> {
  const relation = await prisma.userManager.findUnique({
    where: { userId_managerId: { userId, managerId } },
  });
  return !!relation;
}

/**
 * Validate an array of manager IDs before assignment.
 * Deduplicates, enforces max 5, checks existence/active/role, prevents self-management and cycles.
 */
export async function validateManagerIds(
  managerIds: string[],
  targetUserId?: string
): Promise<{ valid: true; deduped: string[] } | { valid: false; error: string }> {
  const deduped = [...new Set(managerIds)];

  if (deduped.length === 0) {
    return { valid: true, deduped };
  }

  if (deduped.length > MAX_MANAGERS) {
    return { valid: false, error: `Maximum ${MAX_MANAGERS} managers allowed` };
  }

  if (targetUserId && deduped.includes(targetUserId)) {
    return { valid: false, error: "A user cannot be their own manager" };
  }

  const managers = await prisma.user.findMany({
    where: { id: { in: deduped }, deletedAt: null },
    select: { id: true, role: true, isActive: true },
  });

  if (managers.length !== deduped.length) {
    return { valid: false, error: "One or more managers not found" };
  }

  for (const mgr of managers) {
    if (!mgr.isActive) {
      return {
        valid: false,
        error: "One or more selected managers are inactive",
      };
    }
    if (mgr.role === "EMPLOYEE") {
      return {
        valid: false,
        error: "Selected user cannot be a manager (role too low)",
      };
    }
  }

  // Circular detection: check if targetUserId is a manager of any proposed manager
  if (targetUserId) {
    const circular = await prisma.userManager.findFirst({
      where: {
        userId: { in: deduped },
        managerId: targetUserId,
      },
    });
    if (circular) {
      return {
        valid: false,
        error: "Circular management relationship detected",
      };
    }
  }

  return { valid: true, deduped };
}

type TransactionClient = Parameters<
  Parameters<PrismaClient["$transaction"]>[0]
>[0];

/**
 * Replace all managers for a user. Full-replacement semantics.
 * Should be called inside a transaction.
 */
export async function replaceManagers(
  tx: TransactionClient,
  userId: string,
  managerIds: string[]
): Promise<void> {
  const deduped = [...new Set(managerIds)];

  await tx.userManager.deleteMany({ where: { userId } });

  if (deduped.length > 0) {
    await tx.userManager.createMany({
      data: deduped.map((managerId) => ({ userId, managerId })),
    });
  }
}
