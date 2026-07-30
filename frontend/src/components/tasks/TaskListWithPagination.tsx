"use client";

import { useState } from "react";
import type { Task } from "@/lib/types";
import { TaskRowCard } from "./TaskRowCard";

const PAGE_SIZE = 5;

// Row buttons are: [edit?] [delete?] [nudge?] star chevron — each 34px except
// the trailing chevron (18px), with a 16px gap between every item (matches
// TaskRowCard's `flex items-center gap-4`). The header's trailing spacer is
// sized to match however many of the optional buttons this list actually
// renders, so it isn't just tuned for the plain star+chevron case.
function actionsColumnWidth(optionalButtonCount: number) {
  const widths = [...Array(optionalButtonCount).fill(34), 34, 18];
  return widths.reduce((a, b) => a + b, 0) + (widths.length - 1) * 16;
}

export function TaskListWithPagination({
  tasks,
  emptyText,
  stripColor,
  pillBg = "#f8faf9",
  headerBorder = "#eef1f0",
  headerText = "#5c6a67",
  onOpen,
  onToggleStar,
  onEdit,
  onDelete,
  onNudge,
  nudgeEnabled,
  onDismissNudge,
}: {
  tasks: Task[];
  emptyText: string;
  stripColor?: string;
  // Column header theming — defaults to the neutral gray used elsewhere;
  // pass the section's own accent colors to match its task cards.
  pillBg?: string;
  headerBorder?: string;
  headerText?: string;
  onOpen: (id: string) => void;
  onToggleStar: (task: Task) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  onNudge?: (task: Task) => void;
  // Per-task gate for showing the nudge button at all (e.g. hide it on
  // completed tasks, or ones with no assignees) — defaults to always shown.
  nudgeEnabled?: (task: Task) => boolean;
  onDismissNudge?: (task: Task) => void;
}) {
  const [page, setPage] = useState(0);

  if (tasks.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-5 text-center text-[13px]" style={{ borderColor: "#cdd7d3", color: "#8a968f" }}>
        {emptyText}
      </div>
    );
  }

  const pageCount = Math.max(1, Math.ceil(tasks.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const start = current * PAGE_SIZE;
  const pageTasks = tasks.slice(start, start + PAGE_SIZE);
  const optionalButtonCount = [onEdit, onDelete, onNudge].filter(Boolean).length;

  return (
    <div>
      <div
        className="flex items-center gap-4 px-4.5 py-2 rounded-[10px] border font-mono uppercase mb-2.5"
        style={{ background: pillBg, borderColor: headerBorder, fontSize: 10.5, fontWeight: 600, letterSpacing: ".06em", color: headerText }}
      >
        <div className="flex-1 min-w-0">Task</div>
        <div className="flex-none" style={{ width: 132 }}>Priority · Impact</div>
        <div className="flex-none text-right" style={{ width: 110 }}>Due date</div>
        <div className="flex-none" style={{ width: actionsColumnWidth(optionalButtonCount) }} />
      </div>

      <div className="flex flex-col gap-2.5">
        {pageTasks.map((t) => (
          <TaskRowCard
            key={t.id}
            task={t}
            stripColor={stripColor}
            onOpen={() => onOpen(t.id)}
            onToggleStar={() => onToggleStar(t)}
            onEdit={onEdit ? () => onEdit(t) : undefined}
            onDelete={onDelete ? () => onDelete(t) : undefined}
            onNudge={onNudge && (!nudgeEnabled || nudgeEnabled(t)) ? () => onNudge(t) : undefined}
            onDismissNudge={onDismissNudge ? () => onDismissNudge(t) : undefined}
          />
        ))}
      </div>

      {tasks.length > PAGE_SIZE && (
        <div className="flex items-center justify-end gap-2 mt-3">
          <span className="text-xs mr-1" style={{ color: "#5c6a67" }}>
            {start + 1}–{Math.min(start + PAGE_SIZE, tasks.length)} of {tasks.length}
          </span>
          <button
            disabled={current === 0}
            onClick={() => setPage(Math.max(0, current - 1))}
            className="w-[30px] h-[30px] rounded-[8px] border flex items-center justify-center font-mono text-xs font-semibold"
            style={{ borderColor: "#e3e8e6", color: current === 0 ? "#c2cbc7" : "#3d4a47", background: "#fff", cursor: current === 0 ? "default" : "pointer" }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M15 6l-6 6 6 6" /></svg>
          </button>
          {Array.from({ length: pageCount }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className="w-[30px] h-[30px] rounded-[8px] border font-mono text-xs font-semibold"
              style={{ borderColor: i === current ? "#1e3a8a" : "#e3e8e6", background: i === current ? "#1e3a8a" : "#fff", color: i === current ? "#fff" : "#3d4a47", cursor: "pointer" }}
            >
              {i + 1}
            </button>
          ))}
          <button
            disabled={current === pageCount - 1}
            onClick={() => setPage(Math.min(pageCount - 1, current + 1))}
            className="w-[30px] h-[30px] rounded-[8px] border flex items-center justify-center font-mono text-xs font-semibold"
            style={{ borderColor: "#e3e8e6", color: current === pageCount - 1 ? "#c2cbc7" : "#3d4a47", background: "#fff", cursor: current === pageCount - 1 ? "default" : "pointer" }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 6l6 6-6 6" /></svg>
          </button>
        </div>
      )}
    </div>
  );
}
