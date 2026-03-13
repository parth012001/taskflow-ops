/**
 * Removes all demo records created by demo-seed.ts.
 * Tasks are tagged with [DEMO] in their description field.
 * Announcements are matched by their exact titles.
 *
 * Run:  npx tsx scripts/demo-cleanup.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DEMO_TAG = "[DEMO]";

const DEMO_ANNOUNCEMENT_TITLES = [
  "Q2 procurement freeze lifted",
  "Welcome Swati Kulkarni to the team!",
  "Vendor evaluation deadline — March 28",
];

async function main() {
  console.log("=== Demo Cleanup ===\n");

  // 1. Find demo task IDs (tagged with [DEMO] in description)
  const demoTasks = await prisma.task.findMany({
    where: { description: { startsWith: DEMO_TAG } },
    select: { id: true },
  });
  const taskIds = demoTasks.map((t) => t.id);

  if (taskIds.length > 0) {
    const delHistory = await prisma.taskStatusHistory.deleteMany({ where: { taskId: { in: taskIds } } });
    const delComments = await prisma.taskComment.deleteMany({ where: { taskId: { in: taskIds } } });
    const delAttachments = await prisma.taskAttachment.deleteMany({ where: { taskId: { in: taskIds } } });
    const delCarryForward = await prisma.carryForwardLog.deleteMany({ where: { taskId: { in: taskIds } } });
    const delSessionTasks = await prisma.dailySessionTask.deleteMany({ where: { taskId: { in: taskIds } } });
    const delTasks = await prisma.task.deleteMany({ where: { id: { in: taskIds } } });
    console.log(`Deleted ${delTasks.count} demo tasks (+ ${delHistory.count} history, ${delComments.count} comments, ${delAttachments.count} attachments, ${delCarryForward.count} carry-forwards, ${delSessionTasks.count} session tasks)`);
  } else {
    console.log("No demo tasks found.");
  }

  // 2. Delete demo announcements by exact title
  const delAnnouncements = await prisma.announcement.deleteMany({
    where: { title: { in: DEMO_ANNOUNCEMENT_TITLES } },
  });
  console.log(`Deleted ${delAnnouncements.count} demo announcements`);

  console.log("\n=== Cleanup complete ===\n");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
