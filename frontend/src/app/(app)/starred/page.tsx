"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTaskList } from "@/lib/use-task-list";
import { TaskBands, type BandDef } from "@/components/tasks/TaskBands";
import { TaskDrawer } from "@/components/tasks/TaskDrawer";
import { starTask } from "@/lib/task-actions";
import type { Task } from "@/lib/types";

function StarredInner() {
  const searchParams = useSearchParams();
  const { tasks, refresh, setTasks } = useTaskList({ starred: true, archivedAny: true });
  const [openId, setOpenId] = useState<string | null>(searchParams.get("open"));

  async function onToggleStar(task: Task) {
    // This page only ever shows starred tasks, so toggling always means
    // unstarring — drop it from the list immediately instead of waiting on a
    // refetch, and put it back if the request fails.
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    try {
      await starTask(task.id, task.starred);
    } catch {
      setTasks((prev) => [task, ...prev]);
    }
  }

  const bands: BandDef[] = [
    {
      key: "starred",
      label: "Starred",
      tasks,
      accent: "#d97706",
      gradient: "linear-gradient(135deg,#fffbeb,#fef3c7)",
      borderColor: "#fde68a",
      darkText: "#92400e",
      pillBg: "#fef3c7",
      iconPath: "M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.3l6.1-.7z",
      emptyText: "Star a task from any list to pin it here.",
    },
  ];

  return (
    <>
      <TaskBands bands={bands} plain onOpen={setOpenId} onToggleStar={onToggleStar} />
      <TaskDrawer taskId={openId} onClose={() => setOpenId(null)} onChanged={refresh} />
    </>
  );
}

export default function StarredPage() {
  return (
    <Suspense fallback={null}>
      <StarredInner />
    </Suspense>
  );
}
