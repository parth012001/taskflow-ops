-- CreateTable
CREATE TABLE "UserManager" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserManager_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserManager_userId_idx" ON "UserManager"("userId");

-- CreateIndex
CREATE INDEX "UserManager_managerId_idx" ON "UserManager"("managerId");

-- CreateIndex
CREATE UNIQUE INDEX "UserManager_userId_managerId_key" ON "UserManager"("userId", "managerId");

-- AddForeignKey
ALTER TABLE "UserManager" ADD CONSTRAINT "UserManager_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserManager" ADD CONSTRAINT "UserManager_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DataMigration: Copy existing managerId relationships into UserManager join table
INSERT INTO "UserManager" ("id", "userId", "managerId", "createdAt")
SELECT gen_random_uuid(), "id", "managerId", NOW()
FROM "User"
WHERE "managerId" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_managerId_fkey";

-- DropIndex
DROP INDEX "User_managerId_idx";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "managerId";
