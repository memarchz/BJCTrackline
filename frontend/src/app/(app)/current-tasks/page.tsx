"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useTaskList } from "@/lib/use-task-list";
import { TaskBands, type BandDef } from "@/components/tasks/TaskBands";
import { TaskDrawer } from "@/components/tasks/TaskDrawer";
import { starTask, bulkStart, dismissNudge } from "@/lib/task-actions";
import type { Task } from "@/lib/types";

function CurrentTasksInner() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const { tasks, refresh, setTasks } = useTaskList({ assigneeId: user?.id, status: "todo,in_progress" });
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

  async function onDismissNudge(task: Task) {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, viewerNudgedAt: null } : t)));
    try {
      await dismissNudge(task.id);
    } catch {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, viewerNudgedAt: task.viewerNudgedAt } : t)));
    }
  }

  const bands: BandDef[] = [
    {
      key: "todo",
      label: "New Tasks",
      tasks: tasks.filter((t) => t.viewerStatus === "todo"),
      accent: "#d97706",
      gradient: "linear-gradient(135deg,#fffbeb,#fef3c7)",
      borderColor: "#fde68a",
      darkText: "#92400e",
      pillBg: "#fef3c7",
      iconPath: "M12 5v14M5 12h14",
      actionLabel: "Mark all as started",
      onAction: async (ids) => {
        await bulkStart(ids);
        refresh();
      },
      emptyText: "No new tasks — you're all caught up.",
    },
    {
      key: "in_progress",
      label: "In Progress",
      tasks: tasks.filter((t) => t.viewerStatus === "in_progress"),
      accent: "#0284c7",
      gradient: "linear-gradient(135deg,#f0f9ff,#e0f2fe)",
      borderColor: "#bae6fd",
      darkText: "#075985",
      pillBg: "#e0f2fe",
      iconPath: "M12 2a10 10 0 1 0 0.01 0M12 7v5l3 2",
      emptyText: "Nothing in progress right now.",
    },
  ];

  return (
    <>
      <TaskBands bands={bands} onOpen={setOpenId} onToggleStar={onToggleStar} onDismissNudge={onDismissNudge} />
      <TaskDrawer taskId={openId} onClose={() => setOpenId(null)} onChanged={refresh} />
    </>
  );
}

export default function CurrentTasksPage() {
  return (
    <Suspense fallback={null}>
      <CurrentTasksInner />
    </Suspense>
  );
}
