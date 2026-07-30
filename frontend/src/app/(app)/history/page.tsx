"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useTaskList } from "@/lib/use-task-list";
import { TaskBands, type BandDef } from "@/components/tasks/TaskBands";
import { TaskDrawer } from "@/components/tasks/TaskDrawer";
import { starTask } from "@/lib/task-actions";
import type { Task } from "@/lib/types";

function HistoryInner() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  // The backend already filters this to the viewer's own contextual status
  // (their subtask's status, if they're only assigned to a subtask).
  const { tasks, refresh, setTasks } = useTaskList({ assigneeId: user?.id, status: "completed", archivedAny: true });
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
      key: "history",
      label: "History",
      tasks,
      accent: "#15803d",
      gradient: "linear-gradient(135deg,#f0fdf4,#dcfce7)",
      borderColor: "#bbf7d0",
      darkText: "#14532d",
      pillBg: "#dcfce7",
      iconPath: "M3 12a9 9 0 1 0 3-6.7L3 8M3 4v4h4M12 8v4l3 2",
      emptyText: "Completed tasks will show up here.",
    },
  ];

  return (
    <>
      <TaskBands bands={bands} plain onOpen={setOpenId} onToggleStar={onToggleStar} />
      <TaskDrawer taskId={openId} onClose={() => setOpenId(null)} onChanged={refresh} />
    </>
  );
}

export default function HistoryPage() {
  return (
    <Suspense fallback={null}>
      <HistoryInner />
    </Suspense>
  );
}
