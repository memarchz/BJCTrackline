"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useTaskList } from "@/lib/use-task-list";
import { TaskBands, type BandDef } from "@/components/tasks/TaskBands";
import { TaskDrawer } from "@/components/tasks/TaskDrawer";
import { starTask, bulkRework, bulkArchive } from "@/lib/task-actions";
import type { Task } from "@/lib/types";

function PendingReviewInner() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const { tasks, refresh, setTasks } = useTaskList({ assigneeId: user?.id, status: "submitted,rejected,completed" });
  const [openId, setOpenId] = useState<string | null>(searchParams.get("open"));

  async function onToggleStar(task: Task) {
    const wasStarred = task.starred;
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, starred: !wasStarred } : t)));
    try {
      await starTask(task.id, wasStarred);
    } catch {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, starred: wasStarred } : t)));
    }
  }

  const bands: BandDef[] = [
    {
      key: "submitted",
      label: "Submitted",
      tasks: tasks.filter((t) => t.viewerStatus === "submitted"),
      accent: "#ea9a0c",
      gradient: "linear-gradient(135deg,#fffbeb,#fef3c7)",
      borderColor: "#fde68a",
      darkText: "#92400e",
      pillBg: "#fef3c7",
      iconPath: "M5 12l14-7-4 16-4-6-6-3z",
      emptyText: "Nothing awaiting approval.",
    },
    {
      key: "rejected",
      label: "Rejected",
      tasks: tasks.filter((t) => t.viewerStatus === "rejected"),
      accent: "#b91c1c",
      gradient: "linear-gradient(135deg,#fef2f2,#fee2e2)",
      borderColor: "#fecaca",
      darkText: "#7f1d1d",
      pillBg: "#fee2e2",
      iconPath: "M6 6l12 12M18 6L6 18",
      actionLabel: "Move all to In Progress",
      onAction: async (ids) => {
        await bulkRework(ids);
        refresh();
      },
      emptyText: "Nothing rejected — nice work.",
    },
    {
      key: "completed",
      label: "Completed",
      tasks: tasks.filter((t) => t.viewerStatus === "completed"),
      accent: "#15803d",
      gradient: "linear-gradient(135deg,#f0fdf4,#dcfce7)",
      borderColor: "#bbf7d0",
      darkText: "#14532d",
      pillBg: "#dcfce7",
      iconPath: "M12 2a10 10 0 1 0 0.01 0M8.5 12.2l2.4 2.4 4.6-5",
      actionLabel: "Archive all",
      onAction: async (ids) => {
        await bulkArchive(ids);
        refresh();
      },
      emptyText: "Nothing completed yet.",
    },
  ];

  return (
    <>
      <TaskBands bands={bands} onOpen={setOpenId} onToggleStar={onToggleStar} />
      <TaskDrawer taskId={openId} onClose={() => setOpenId(null)} onChanged={refresh} />
    </>
  );
}

export default function PendingReviewPage() {
  return (
    <Suspense fallback={null}>
      <PendingReviewInner />
    </Suspense>
  );
}
