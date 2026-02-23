import { PrismaClient, Role, TaskStatus, TaskPriority, TaskSize, AssignedByType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting seed...");

  // Clean up existing data
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
  await prisma.taskStatusHistory.deleteMany();
  await prisma.task.deleteMany();
  await prisma.userKpi.deleteMany();
  await prisma.kpiBucket.deleteMany();
  await prisma.productivitySnapshot.deleteMany();
  await prisma.productivityScore.deleteMany();
  await prisma.scoringConfig.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();

  console.log("Cleaned up existing data");

  // Hash password for all users (password: "password123")
  const passwordHash = await bcrypt.hash("password123", 10);

  // ============================================
  // 1. CREATE DEPARTMENT
  // ============================================
  const procurementDept = await prisma.department.create({
    data: {
      name: "Procurement",
      description: "Procurement and vendor management department",
    },
  });

  console.log("Created department:", procurementDept.name);

  // ============================================
  // 2. CREATE KPI BUCKETS (from PRD)
  // ============================================
  const kpiBuckets = await Promise.all([
    prisma.kpiBucket.create({
      data: {
        name: "PO Accuracy",
        description: "Accuracy of purchase orders created",
        applicableRoles: [Role.EMPLOYEE, Role.MANAGER],
      },
    }),
    prisma.kpiBucket.create({
      data: {
        name: "Vendor Onboarding",
        description: "New vendor registration and setup",
        applicableRoles: [Role.EMPLOYEE, Role.MANAGER],
      },
    }),
    prisma.kpiBucket.create({
      data: {
        name: "Purchase Master Update",
        description: "Maintaining and updating purchase master data",
        applicableRoles: [Role.EMPLOYEE],
      },
    }),
    prisma.kpiBucket.create({
      data: {
        name: "Bill Handling Accuracy",
        description: "Accuracy in processing vendor bills",
        applicableRoles: [Role.EMPLOYEE, Role.MANAGER],
      },
    }),
    prisma.kpiBucket.create({
      data: {
        name: "PI Follow-up Timeliness",
        description: "Timely follow-up on proforma invoices",
        applicableRoles: [Role.EMPLOYEE],
      },
    }),
    prisma.kpiBucket.create({
      data: {
        name: "Delivery Timeliness",
        description: "On-time delivery coordination",
        applicableRoles: [Role.EMPLOYEE, Role.MANAGER],
      },
    }),
    prisma.kpiBucket.create({
      data: {
        name: "Vendor Comparison",
        description: "Comparative analysis of vendors",
        applicableRoles: [Role.EMPLOYEE, Role.MANAGER],
      },
    }),
    prisma.kpiBucket.create({
      data: {
        name: "Negotiation Savings",
        description: "Cost savings achieved through negotiation",
        applicableRoles: [Role.MANAGER, Role.DEPARTMENT_HEAD],
      },
    }),
    prisma.kpiBucket.create({
      data: {
        name: "Credit Days Extension",
        description: "Extending payment terms with vendors",
        applicableRoles: [Role.MANAGER, Role.DEPARTMENT_HEAD],
      },
    }),
    prisma.kpiBucket.create({
      data: {
        name: "Monthly Vendor Reports",
        description: "Monthly reporting on vendor performance",
        applicableRoles: [Role.EMPLOYEE, Role.MANAGER, Role.DEPARTMENT_HEAD],
      },
    }),
  ]);

  console.log("Created", kpiBuckets.length, "KPI buckets");

  // ============================================
  // 3. CREATE USERS
  // ============================================

  // Admin user
  const admin = await prisma.user.create({
    data: {
      email: "admin@taskflow.com",
      passwordHash,
      firstName: "System",
      lastName: "Admin",
      role: Role.ADMIN,
      departmentId: procurementDept.id,
    },
  });

  // Department Head
  const deptHead = await prisma.user.create({
    data: {
      email: "head@taskflow.com",
      passwordHash,
      firstName: "Rajesh",
      lastName: "Kumar",
      role: Role.DEPARTMENT_HEAD,
      departmentId: procurementDept.id,
    },
  });

  // Update department with head
  await prisma.department.update({
    where: { id: procurementDept.id },
    data: { headId: deptHead.id },
  });

  // Managers
  const manager1 = await prisma.user.create({
    data: {
      email: "manager1@taskflow.com",
      passwordHash,
      firstName: "Priya",
      lastName: "Sharma",
      role: Role.MANAGER,
      departmentId: procurementDept.id,
      managerId: deptHead.id,
    },
  });

  const manager2 = await prisma.user.create({
    data: {
      email: "manager2@taskflow.com",
      passwordHash,
      firstName: "Amit",
      lastName: "Patel",
      role: Role.MANAGER,
      departmentId: procurementDept.id,
      managerId: deptHead.id,
    },
  });

  // Employees under Manager 1
  const employee1 = await prisma.user.create({
    data: {
      email: "employee1@taskflow.com",
      passwordHash,
      firstName: "Neha",
      lastName: "Gupta",
      role: Role.EMPLOYEE,
      departmentId: procurementDept.id,
      managerId: manager1.id,
    },
  });

  const employee2 = await prisma.user.create({
    data: {
      email: "employee2@taskflow.com",
      passwordHash,
      firstName: "Vikram",
      lastName: "Singh",
      role: Role.EMPLOYEE,
      departmentId: procurementDept.id,
      managerId: manager1.id,
    },
  });

  const employee3 = await prisma.user.create({
    data: {
      email: "employee3@taskflow.com",
      passwordHash,
      firstName: "Anjali",
      lastName: "Verma",
      role: Role.EMPLOYEE,
      departmentId: procurementDept.id,
      managerId: manager1.id,
    },
  });

  // Employees under Manager 2
  const employee4 = await prisma.user.create({
    data: {
      email: "employee4@taskflow.com",
      passwordHash,
      firstName: "Rahul",
      lastName: "Mehta",
      role: Role.EMPLOYEE,
      departmentId: procurementDept.id,
      managerId: manager2.id,
    },
  });

  const employee5 = await prisma.user.create({
    data: {
      email: "employee5@taskflow.com",
      passwordHash,
      firstName: "Sneha",
      lastName: "Reddy",
      role: Role.EMPLOYEE,
      departmentId: procurementDept.id,
      managerId: manager2.id,
    },
  });

  console.log("Created 9 users (1 admin, 1 dept head, 2 managers, 5 employees)");

  // ============================================
  // 4. ASSIGN KPIs TO USERS
  // ============================================
  const allEmployees = [employee1, employee2, employee3, employee4, employee5];
  const allManagers = [manager1, manager2];

  for (const employee of allEmployees) {
    // Assign first 7 KPIs to each employee
    for (let i = 0; i < 7; i++) {
      await prisma.userKpi.create({
        data: {
          userId: employee.id,
          kpiBucketId: kpiBuckets[i].id,
        },
      });
    }
  }

  for (const manager of allManagers) {
    // Assign all KPIs to managers
    for (const kpi of kpiBuckets) {
      await prisma.userKpi.create({
        data: {
          userId: manager.id,
          kpiBucketId: kpi.id,
        },
      });
    }
  }

  console.log("Assigned KPIs to users");

  // ============================================
  // 5. CREATE SAMPLE TASKS
  // ============================================
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Tasks for Employee 1
  const task1 = await prisma.task.create({
    data: {
      title: "Create PO for Office Supplies",
      description: "Generate purchase order for Q1 office supplies including stationery and printer cartridges",
      ownerId: employee1.id,
      assignerId: manager1.id,
      assignedByType: AssignedByType.MANAGER,
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.URGENT_IMPORTANT,
      size: TaskSize.MEDIUM,
      kpiBucketId: kpiBuckets[0].id, // PO Accuracy
      estimatedMinutes: 120,
      actualMinutes: 45,
      deadline: tomorrow,
      startDate: today,
    },
  });

  await prisma.task.create({
    data: {
      title: "Vendor Registration - ABC Corp",
      description: "Complete vendor onboarding documentation for ABC Corporation",
      ownerId: employee1.id,
      assignedByType: AssignedByType.SELF,
      status: TaskStatus.NEW,
      priority: TaskPriority.NOT_URGENT_IMPORTANT,
      size: TaskSize.EASY,
      kpiBucketId: kpiBuckets[1].id, // Vendor Onboarding
      estimatedMinutes: 60,
      deadline: nextWeek,
    },
  });

  await prisma.task.create({
    data: {
      title: "Update Purchase Master for IT Equipment",
      description: "Add new laptop models and pricing to purchase master",
      ownerId: employee1.id,
      assignedByType: AssignedByType.SELF,
      status: TaskStatus.COMPLETED_PENDING_REVIEW,
      priority: TaskPriority.URGENT_NOT_IMPORTANT,
      size: TaskSize.EASY,
      kpiBucketId: kpiBuckets[2].id, // Purchase Master Update
      estimatedMinutes: 30,
      actualMinutes: 25,
      deadline: today,
      completedAt: today,
    },
  });

  // Tasks for Employee 2
  await prisma.task.create({
    data: {
      title: "Process Vendor Bill - XYZ Ltd",
      description: "Verify and process invoice #INV-2024-001 from XYZ Ltd",
      ownerId: employee2.id,
      assignedByType: AssignedByType.SELF,
      status: TaskStatus.ON_HOLD,
      priority: TaskPriority.URGENT_IMPORTANT,
      size: TaskSize.MEDIUM,
      kpiBucketId: kpiBuckets[3].id, // Bill Handling Accuracy
      estimatedMinutes: 90,
      actualMinutes: 30,
      deadline: today,
      onHoldReason: "Waiting for additional documentation from vendor. Follow-up email sent.",
    },
  });

  await prisma.task.create({
    data: {
      title: "PI Follow-up - Import Order #123",
      description: "Follow up on proforma invoice for import order from international vendor",
      ownerId: employee2.id,
      assignerId: manager1.id,
      assignedByType: AssignedByType.MANAGER,
      status: TaskStatus.ACCEPTED,
      priority: TaskPriority.NOT_URGENT_IMPORTANT,
      size: TaskSize.EASY,
      kpiBucketId: kpiBuckets[4].id, // PI Follow-up Timeliness
      estimatedMinutes: 45,
      deadline: tomorrow,
    },
  });

  // Task for Employee 3 - Overdue/Carried Forward
  await prisma.task.create({
    data: {
      title: "Delivery Coordination - Site A",
      description: "Coordinate material delivery to construction site A",
      ownerId: employee3.id,
      assignedByType: AssignedByType.SELF,
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.URGENT_IMPORTANT,
      size: TaskSize.DIFFICULT,
      kpiBucketId: kpiBuckets[5].id, // Delivery Timeliness
      estimatedMinutes: 180,
      actualMinutes: 120,
      deadline: yesterday,
      isCarriedForward: true,
      originalDeadline: yesterday,
      carryForwardCount: 1,
    },
  });

  // Tasks for Employee 4
  await prisma.task.create({
    data: {
      title: "Vendor Comparison - Steel Suppliers",
      description: "Compare pricing and quality from 3 steel suppliers for Q2 requirements",
      ownerId: employee4.id,
      assignerId: manager2.id,
      assignedByType: AssignedByType.MANAGER,
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.NOT_URGENT_IMPORTANT,
      size: TaskSize.DIFFICULT,
      kpiBucketId: kpiBuckets[6].id, // Vendor Comparison
      estimatedMinutes: 240,
      actualMinutes: 100,
      deadline: nextWeek,
      startDate: today,
    },
  });

  // Task for Employee 5 - Reopened
  await prisma.task.create({
    data: {
      title: "Monthly Vendor Report - December",
      description: "Prepare monthly vendor performance report for December",
      ownerId: employee5.id,
      assignedByType: AssignedByType.SELF,
      status: TaskStatus.REOPENED,
      priority: TaskPriority.URGENT_NOT_IMPORTANT,
      size: TaskSize.MEDIUM,
      kpiBucketId: kpiBuckets[9].id, // Monthly Vendor Reports
      estimatedMinutes: 120,
      actualMinutes: 90,
      deadline: tomorrow,
      rejectionReason: "Report is missing vendor rating analysis and cost comparison section. Please add these and resubmit.",
    },
  });

  // Closed/Approved task
  await prisma.task.create({
    data: {
      title: "Negotiate Credit Terms - DEF Supplies",
      description: "Negotiate extended payment terms with DEF Supplies",
      ownerId: manager1.id,
      assignedByType: AssignedByType.SELF,
      status: TaskStatus.CLOSED_APPROVED,
      priority: TaskPriority.NOT_URGENT_IMPORTANT,
      size: TaskSize.DIFFICULT,
      kpiBucketId: kpiBuckets[8].id, // Credit Days Extension
      estimatedMinutes: 180,
      actualMinutes: 200,
      deadline: yesterday,
      completedAt: yesterday,
    },
  });

  console.log("Created 9 sample tasks across different statuses");

  // ============================================
  // 6. CREATE STATUS HISTORY FOR TASK 1
  // ============================================
  await prisma.taskStatusHistory.create({
    data: {
      taskId: task1.id,
      fromStatus: null,
      toStatus: TaskStatus.NEW,
      changedById: manager1.id,
      reason: "Task created and assigned",
    },
  });

  await prisma.taskStatusHistory.create({
    data: {
      taskId: task1.id,
      fromStatus: TaskStatus.NEW,
      toStatus: TaskStatus.ACCEPTED,
      changedById: employee1.id,
    },
  });

  await prisma.taskStatusHistory.create({
    data: {
      taskId: task1.id,
      fromStatus: TaskStatus.ACCEPTED,
      toStatus: TaskStatus.IN_PROGRESS,
      changedById: employee1.id,
    },
  });

  console.log("Created task status history");

  // ============================================
  // 7. CREATE USER STREAKS
  // ============================================
  await prisma.userStreak.create({
    data: {
      userId: employee1.id,
      currentStreak: 5,
      longestStreak: 12,
      lastActiveDate: today,
    },
  });

  await prisma.userStreak.create({
    data: {
      userId: employee2.id,
      currentStreak: 3,
      longestStreak: 8,
      lastActiveDate: today,
    },
  });

  console.log("Created user streaks");

  // ============================================
  // 8. CREATE SAMPLE NOTIFICATIONS
  // ============================================
  await prisma.notification.create({
    data: {
      userId: employee1.id,
      type: "TASK_ASSIGNED",
      title: "New Task Assigned",
      message: "Manager Priya Sharma has assigned you a new task: Create PO for Office Supplies",
      entityType: "TASK",
      entityId: task1.id,
    },
  });

  await prisma.notification.create({
    data: {
      userId: manager1.id,
      type: "TASK_PENDING_REVIEW",
      title: "Task Pending Review",
      message: "Neha Gupta has submitted 'Update Purchase Master for IT Equipment' for your review",
      entityType: "TASK",
    },
  });

  console.log("Created sample notifications");

  console.log("\n========================================");
  console.log("Seed completed successfully!");
  console.log("========================================");
  console.log("\nTest accounts (password: password123):");
  console.log("- Admin: admin@taskflow.com");
  console.log("- Dept Head: head@taskflow.com");
  console.log("- Manager 1: manager1@taskflow.com");
  console.log("- Manager 2: manager2@taskflow.com");
  console.log("- Employee 1: employee1@taskflow.com");
  console.log("- Employee 2: employee2@taskflow.com");
  console.log("- Employee 3: employee3@taskflow.com");
  console.log("- Employee 4: employee4@taskflow.com");
  console.log("- Employee 5: employee5@taskflow.com");
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
