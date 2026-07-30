-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'nudged';

-- AlterTable
ALTER TABLE "TaskAssignee" ADD COLUMN     "nudgedAt" TIMESTAMP(3);

