import { PrismaClient } from '@prisma/client';

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
      managerId: true,
    },
    orderBy: { role: 'asc' }
  });

  console.log('=== ALL USERS ===');
  console.log('Total:', users.length);
  console.log('');

  // Count by role
  const roleCounts: Record<string, number> = {};
  users.forEach(u => {
    roleCounts[u.role] = (roleCounts[u.role] || 0) + 1;
  });
  console.log('By Role:', roleCounts);
  console.log('');

  // Print all users
  users.forEach(u => {
    console.log(`- ${u.firstName} ${u.lastName} (${u.email}) | ${u.role} | Active: ${u.isActive} | ManagerId: ${u.managerId || 'None'}`);
  });

  console.log('');
  console.log('=== HIERARCHY TREE ===');

  // Build tree
  const roots = users.filter(u => u.managerId === null);

  function printTree(user: typeof users[0], indent = 0) {
    const prefix = '  '.repeat(indent) + (indent > 0 ? '└── ' : '');
    console.log(`${prefix}${user.firstName} ${user.lastName} (${user.role})`);
    const subs = users.filter(u => u.managerId === user.id);
    subs.forEach(sub => printTree(sub, indent + 1));
  }

  roots.forEach(r => printTree(r));
}

main().catch(console.error).finally(() => prisma.$disconnect());
