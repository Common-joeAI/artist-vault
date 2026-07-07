-- AlterTable: User — add PRO member ID fields
-- (proOrg column already exists from previous migration)
ALTER TABLE "User" ADD COLUMN "proWriterId" TEXT;
ALTER TABLE "User" ADD COLUMN "proPublisherId" TEXT;
ALTER TABLE "User" ADD COLUMN "ipiNumber" TEXT;
ALTER TABLE "User" ADD COLUMN "proSetupComplete" BOOLEAN NOT NULL DEFAULT false;
