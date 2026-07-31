/*
  Warnings:

  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `email` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `passwordHash` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `teamId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `username` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `Attachment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Conversation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ConversationRead` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Message` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Notification` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StarredTask` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Subtask` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Task` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TaskAssignee` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TaskLogEntry` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Team` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TorRequest` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `emp_no` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Attachment" DROP CONSTRAINT "Attachment_taskId_fkey";

-- DropForeignKey
ALTER TABLE "Attachment" DROP CONSTRAINT "Attachment_uploadedById_fkey";

-- DropForeignKey
ALTER TABLE "Conversation" DROP CONSTRAINT "Conversation_dmUserAId_fkey";

-- DropForeignKey
ALTER TABLE "Conversation" DROP CONSTRAINT "Conversation_dmUserBId_fkey";

-- DropForeignKey
ALTER TABLE "Conversation" DROP CONSTRAINT "Conversation_teamId_fkey";

-- DropForeignKey
ALTER TABLE "ConversationRead" DROP CONSTRAINT "ConversationRead_conversationId_fkey";

-- DropForeignKey
ALTER TABLE "ConversationRead" DROP CONSTRAINT "ConversationRead_userId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_conversationId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_fromId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_userId_fkey";

-- DropForeignKey
ALTER TABLE "StarredTask" DROP CONSTRAINT "StarredTask_taskId_fkey";

-- DropForeignKey
ALTER TABLE "StarredTask" DROP CONSTRAINT "StarredTask_userId_fkey";

-- DropForeignKey
ALTER TABLE "Subtask" DROP CONSTRAINT "Subtask_assigneeId_fkey";

-- DropForeignKey
ALTER TABLE "Subtask" DROP CONSTRAINT "Subtask_taskId_fkey";

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_teamId_fkey";

-- DropForeignKey
ALTER TABLE "TaskAssignee" DROP CONSTRAINT "TaskAssignee_taskId_fkey";

-- DropForeignKey
ALTER TABLE "TaskAssignee" DROP CONSTRAINT "TaskAssignee_userId_fkey";

-- DropForeignKey
ALTER TABLE "TaskLogEntry" DROP CONSTRAINT "TaskLogEntry_byId_fkey";

-- DropForeignKey
ALTER TABLE "TaskLogEntry" DROP CONSTRAINT "TaskLogEntry_subtaskId_fkey";

-- DropForeignKey
ALTER TABLE "TaskLogEntry" DROP CONSTRAINT "TaskLogEntry_taskId_fkey";

-- DropForeignKey
ALTER TABLE "TorRequest" DROP CONSTRAINT "TorRequest_requesterId_fkey";

-- DropForeignKey
ALTER TABLE "TorRequest" DROP CONSTRAINT "TorRequest_reviewerId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_teamId_fkey";

-- DropIndex
DROP INDEX "User_email_key";

-- DropIndex
DROP INDEX "User_username_key";

-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
DROP COLUMN "email",
DROP COLUMN "id",
DROP COLUMN "name",
DROP COLUMN "passwordHash",
DROP COLUMN "teamId",
DROP COLUMN "title",
DROP COLUMN "username",
ADD COLUMN     "emp_no" TEXT NOT NULL,
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("emp_no");

-- DropTable
DROP TABLE "Attachment";

-- DropTable
DROP TABLE "Conversation";

-- DropTable
DROP TABLE "ConversationRead";

-- DropTable
DROP TABLE "Message";

-- DropTable
DROP TABLE "Notification";

-- DropTable
DROP TABLE "StarredTask";

-- DropTable
DROP TABLE "Subtask";

-- DropTable
DROP TABLE "Task";

-- DropTable
DROP TABLE "TaskAssignee";

-- DropTable
DROP TABLE "TaskLogEntry";

-- DropTable
DROP TABLE "Team";

-- DropTable
DROP TABLE "TorRequest";

-- CreateTable
CREATE TABLE "Master_Data_GCP" (
    "emp_no" TEXT NOT NULL,
    "name" TEXT,
    "cobu_name" TEXT,
    "position" TEXT,
    "email" TEXT,
    "team" TEXT,

    CONSTRAINT "Master_Data_GCP_pkey" PRIMARY KEY ("emp_no")
);

-- CreateTable
CREATE TABLE "Master_Data_User" (
    "emp_no" TEXT NOT NULL,
    "name" TEXT,
    "cobu_name" TEXT,
    "position" TEXT,
    "email" TEXT,
    "team" TEXT,

    CONSTRAINT "Master_Data_User_pkey" PRIMARY KEY ("emp_no")
);

-- CreateTable
CREATE TABLE "TL_Task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" "Level" NOT NULL,
    "impact" "Level" NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'todo',
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "late" BOOLEAN,
    "teamId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "createdDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedDate" TIMESTAMP(3),
    "reviewDate" TIMESTAMP(3),
    "rejectReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TL_Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TL_TaskAssignee" (
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nudgedAt" TIMESTAMP(3),

    CONSTRAINT "TL_TaskAssignee_pkey" PRIMARY KEY ("taskId","userId")
);

-- CreateTable
CREATE TABLE "TL_Subtask" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'todo',
    "late" BOOLEAN,
    "taskId" TEXT NOT NULL,
    "assigneeId" TEXT,
    "dueDate" TIMESTAMP(3),
    "submittedDate" TIMESTAMP(3),
    "reviewDate" TIMESTAMP(3),
    "rejectReason" TEXT,

    CONSTRAINT "TL_Subtask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TL_TaskLogEntry" (
    "id" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" "TaskLogAction" NOT NULL,
    "note" TEXT,
    "taskId" TEXT NOT NULL,
    "subtaskId" TEXT,
    "byId" TEXT NOT NULL,

    CONSTRAINT "TL_TaskLogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TL_Attachment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "taskId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,

    CONSTRAINT "TL_Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TL_StarredTask" (
    "userId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "starredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TL_StarredTask_pkey" PRIMARY KEY ("userId","taskId")
);

-- CreateTable
CREATE TABLE "TL_TorRequest" (
    "id" TEXT NOT NULL,
    "project" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "dept" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "openedDate" TIMESTAMP(3) NOT NULL,
    "status" "TorStatus" NOT NULL,
    "step" INTEGER NOT NULL,
    "comment" TEXT,
    "rejected" BOOLEAN NOT NULL DEFAULT false,
    "requesterId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TL_TorRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TL_Conversation" (
    "id" TEXT NOT NULL,
    "kind" "ConversationKind" NOT NULL,
    "teamId" TEXT,
    "dmUserAId" TEXT,
    "dmUserBId" TEXT,

    CONSTRAINT "TL_Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TL_ConversationRead" (
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TL_ConversationRead_pkey" PRIMARY KEY ("conversationId","userId")
);

-- CreateTable
CREATE TABLE "TL_Message" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "conversationId" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,

    CONSTRAINT "TL_Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TL_Notification" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "text" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,

    CONSTRAINT "TL_Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TL_Task_teamId_idx" ON "TL_Task"("teamId");

-- CreateIndex
CREATE INDEX "TL_Task_status_idx" ON "TL_Task"("status");

-- CreateIndex
CREATE INDEX "TL_Task_dueDate_idx" ON "TL_Task"("dueDate");

-- CreateIndex
CREATE INDEX "TL_TaskLogEntry_taskId_idx" ON "TL_TaskLogEntry"("taskId");

-- CreateIndex
CREATE INDEX "TL_TaskLogEntry_subtaskId_idx" ON "TL_TaskLogEntry"("subtaskId");

-- CreateIndex
CREATE UNIQUE INDEX "TL_TorRequest_code_key" ON "TL_TorRequest"("code");

-- CreateIndex
CREATE UNIQUE INDEX "TL_Conversation_teamId_key" ON "TL_Conversation"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "TL_Conversation_dmUserAId_dmUserBId_key" ON "TL_Conversation"("dmUserAId", "dmUserBId");

-- CreateIndex
CREATE INDEX "TL_Message_conversationId_idx" ON "TL_Message"("conversationId");

-- CreateIndex
CREATE INDEX "TL_Notification_userId_idx" ON "TL_Notification"("userId");

-- AddForeignKey
ALTER TABLE "TL_TaskAssignee" ADD CONSTRAINT "TL_TaskAssignee_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "TL_Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TL_Subtask" ADD CONSTRAINT "TL_Subtask_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "TL_Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TL_TaskLogEntry" ADD CONSTRAINT "TL_TaskLogEntry_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "TL_Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TL_TaskLogEntry" ADD CONSTRAINT "TL_TaskLogEntry_subtaskId_fkey" FOREIGN KEY ("subtaskId") REFERENCES "TL_Subtask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TL_Attachment" ADD CONSTRAINT "TL_Attachment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "TL_Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TL_StarredTask" ADD CONSTRAINT "TL_StarredTask_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "TL_Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TL_ConversationRead" ADD CONSTRAINT "TL_ConversationRead_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "TL_Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TL_Message" ADD CONSTRAINT "TL_Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "TL_Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
