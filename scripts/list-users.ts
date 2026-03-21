import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      isActive: true,
      managerRelations: {
        select: {
          manager: { select: { id: true, firstName: true, lastName: true } },
        },
      },
      subordinateRelations: {
        select: { userId: true },
      },
    },
    orderBy: { role: "asc" },
  });

  console.log("=== ALL USERS ===");
  console.log("Total:", users.length);
  console.log("");

  // Count by role
  const roleCounts: Record<string, number> = {};
  users.forEach((u) => {
    roleCounts[u.role] = (roleCounts[u.role] || 0) + 1;
  });
  console.log("By Role:", roleCounts);
  console.log("");

  // Print all users
  users.forEach((u) => {
    const managerNames = u.managerRelations
      .map((r) => `${r.manager.firstName} ${r.manager.lastName}`)
      .join(", ");
    console.log(
      `- ${u.firstName} ${u.lastName} (${u.email}) | ${u.role} | Active: ${u.isActive} | Managers: ${managerNames || "None"}`
    );
  });

  console.log("");
  console.log("=== HIERARCHY TREE ===");

  // Build tree using subordinateRelations
  const roots = users.filter((u) => u.managerRelations.length === 0);

  function printTree(user: (typeof users)[0], indent = 0) {
    const prefix = "  ".repeat(indent) + (indent > 0 ? "└── " : "");
    console.log(`${prefix}${user.firstName} ${user.lastName} (${user.role})`);
    const subIds = user.subordinateRelations.map((r) => r.userId);
    const subs = users.filter((u) => subIds.includes(u.id));
    subs.forEach((sub) => printTree(sub, indent + 1));
  }

  roots.forEach((r) => printTree(r));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
