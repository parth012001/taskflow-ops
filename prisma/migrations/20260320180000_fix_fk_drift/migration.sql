-- Fix FK drift: ProductivityScore and ProductivitySnapshot FKs were changed
-- from CASCADE to RESTRICT via db push but migration history still says CASCADE.
-- This migration reconciles the drift.

-- ProductivityScore: drop CASCADE FK, add RESTRICT FK
ALTER TABLE "ProductivityScore" DROP CONSTRAINT IF EXISTS "ProductivityScore_userId_fkey";
ALTER TABLE "ProductivityScore" ADD CONSTRAINT "ProductivityScore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ProductivitySnapshot: drop CASCADE FK, add RESTRICT FK
ALTER TABLE "ProductivitySnapshot" DROP CONSTRAINT IF EXISTS "ProductivitySnapshot_userId_fkey";
ALTER TABLE "ProductivitySnapshot" ADD CONSTRAINT "ProductivitySnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
