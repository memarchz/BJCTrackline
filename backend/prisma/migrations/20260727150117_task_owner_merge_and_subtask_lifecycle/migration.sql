-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_reviewerId_fkey";

-- AlterTable
ALTER TABLE "Subtask" DROP COLUMN "done",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "late" BOOLEAN,
ADD COLUMN     "rejectReason" TEXT,
ADD COLUMN     "reviewDate" TIMESTAMP(3),
ADD COLUMN     "status" "TaskStatus" NOT NULL DEFAULT 'todo',
ADD COLUMN     "submittedDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Task" DROP COLUMN "reviewerId";

-- AlterTable
ALTER TABLE "TaskLogEntry" ADD COLUMN     "subtaskId" TEXT;

-- CreateIndex
CREATE INDEX "TaskLogEntry_subtaskId_idx" ON "TaskLogEntry"("subtaskId");

-- AddForeignKey
ALTER TABLE "TaskLogEntry" ADD CONSTRAINT "TaskLogEntry_subtaskId_fkey" FOREIGN KEY ("subtaskId") REFERENCES "Subtask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

