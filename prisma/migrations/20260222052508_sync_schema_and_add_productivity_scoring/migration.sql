/*
  Warnings:

  - A unique constraint covering the columns `[userId,type]` on the table `UserRecognition` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "deletedById" TEXT,
ADD COLUMN     "requiresReview" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "reviewerId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "organizationId" VARCHAR(50),
ADD COLUMN     "passwordChangedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "TaskEditHistory" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "editedById" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskEditHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'GENERAL',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "authorId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductivityScore" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "output" DOUBLE PRECISION NOT NULL,
    "quality" DOUBLE PRECISION NOT NULL,
    "reliability" DOUBLE PRECISION NOT NULL,
    "consistency" DOUBLE PRECISION NOT NULL,
    "composite" DOUBLE PRECISION NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "windowEnd" TIMESTAMP(3) NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductivityScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductivitySnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStartDate" DATE NOT NULL,
    "output" DOUBLE PRECISION NOT NULL,
    "quality" DOUBLE PRECISION NOT NULL,
    "reliability" DOUBLE PRECISION NOT NULL,
    "consistency" DOUBLE PRECISION NOT NULL,
    "composite" DOUBLE PRECISION NOT NULL,
    "taskCount" INTEGER NOT NULL DEFAULT 0,
    "reviewedTaskCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductivitySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoringConfig" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "weeklyOutputTarget" INTEGER NOT NULL DEFAULT 15,
    "outputWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.35,
    "qualityWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.25,
    "reliabilityWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.25,
    "consistencyWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.15,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScoringConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskEditHistory_taskId_idx" ON "TaskEditHistory"("taskId");

-- CreateIndex
CREATE INDEX "TaskEditHistory_editedById_idx" ON "TaskEditHistory"("editedById");

-- CreateIndex
CREATE INDEX "TaskEditHistory_createdAt_idx" ON "TaskEditHistory"("createdAt");

-- CreateIndex
CREATE INDEX "Announcement_authorId_idx" ON "Announcement"("authorId");

-- CreateIndex
CREATE INDEX "Announcement_isActive_expiresAt_idx" ON "Announcement"("isActive", "expiresAt");

-- CreateIndex
CREATE INDEX "Announcement_createdAt_idx" ON "Announcement"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProductivityScore_userId_key" ON "ProductivityScore"("userId");

-- CreateIndex
CREATE INDEX "ProductivityScore_userId_idx" ON "ProductivityScore"("userId");

-- CreateIndex
CREATE INDEX "ProductivityScore_composite_idx" ON "ProductivityScore"("composite");

-- CreateIndex
CREATE INDEX "ProductivitySnapshot_userId_idx" ON "ProductivitySnapshot"("userId");

-- CreateIndex
CREATE INDEX "ProductivitySnapshot_weekStartDate_idx" ON "ProductivitySnapshot"("weekStartDate");

-- CreateIndex
CREATE UNIQUE INDEX "ProductivitySnapshot_userId_weekStartDate_key" ON "ProductivitySnapshot"("userId", "weekStartDate");

-- CreateIndex
CREATE UNIQUE INDEX "ScoringConfig_departmentId_key" ON "ScoringConfig"("departmentId");

-- CreateIndex
CREATE INDEX "ScoringConfig_departmentId_idx" ON "ScoringConfig"("departmentId");

-- CreateIndex
CREATE INDEX "Task_reviewerId_idx" ON "Task"("reviewerId");

-- CreateIndex
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "UserRecognition_userId_type_key" ON "UserRecognition"("userId", "type");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskEditHistory" ADD CONSTRAINT "TaskEditHistory_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskEditHistory" ADD CONSTRAINT "TaskEditHistory_editedById_fkey" FOREIGN KEY ("editedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductivityScore" ADD CONSTRAINT "ProductivityScore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductivitySnapshot" ADD CONSTRAINT "ProductivitySnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoringConfig" ADD CONSTRAINT "ScoringConfig_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
