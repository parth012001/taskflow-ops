import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting seed...");

  // Clean up existing data (order matters for foreign keys)
  await prisma.escalationLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.userRecognition.deleteMany();
  await prisma.userStreak.deleteMany();
  await prisma.weeklyReflection.deleteMany();
  await prisma.dailySessionTask.deleteMany();
  await prisma.dailyPlanningSession.deleteMany();
  await prisma.carryForwardLog.deleteMany();
  await prisma.taskAttachment.deleteMany();
  await prisma.taskComment.deleteMany();
  await prisma.taskEditHistory.deleteMany();
  await prisma.taskStatusHistory.deleteMany();
  await prisma.task.deleteMany();
  await prisma.userKpi.deleteMany();
  await prisma.kpiBucket.deleteMany();
  await prisma.productivitySnapshot.deleteMany();
  await prisma.productivityScore.deleteMany();
  await prisma.scoringConfig.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();

  console.log("Cleaned up all existing data");

  // Create admin account
  const passwordHash = await bcrypt.hash("password123", 10);

  await prisma.user.create({
    data: {
      email: "admin@taskflow.com",
      passwordHash,
      firstName: "System",
      lastName: "Admin",
      role: Role.ADMIN,
    },
  });

  console.log("\n========================================");
  console.log("Seed completed successfully!");
  console.log("========================================");
  console.log("\nAdmin account (password: password123):");
  console.log("  admin@taskflow.com");
  console.log("\nThe admin can now:");
  console.log("  1. Create departments");
  console.log("  2. Create KPI buckets");
  console.log("  3. Create user accounts");
  console.log("  4. Assign KPIs to users");
  console.log("========================================\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
