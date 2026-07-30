"use client";

import type { Task } from "@/lib/types";
import { dueText, priorityBadgeClass, capitalize } from "@/lib/format";

const STATUS_COLOR: Record<string, string> = {
  todo: "#96a19d",
  in_progress: "#2563eb",
  submitted: "#2563eb",
  rejected: "#b91c1c",
  completed: "#15803d",
};

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

// A task with subtasks carries no score of its own (see Task.score in
// lib/types.ts) — the person responsible for the whole task is treated as
// responsible for every subtask, so their score is the average across all of
// them; a subtask-only assignee's score is just their own subtask's.
function rowScore(task: Task): number | null {
  if (task.subtasks.length === 0) return task.score;
  if (task.viewerSubtaskId) {
    return task.subtasks.find((s) => s.id === task.viewerSubtaskId)?.score ?? null;
  }
  const scores = task.subtasks.map((s) => s.score).filter((s): s is number => s != null);
  if (scores.length === 0) return null;
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100;
}

function scoreBadgeStyle(score: number): { bg: string; color: string } {
  if (score >= 8) return { bg: "#dcfce7", color: "#15803d" };
  if (score >= 5) return { bg: "#fef3c7", color: "#b45309" };
  return { bg: "#fee2e2", color: "#b91c1c" };
}

export function TaskRowCard({
  task,
  stripColor,
  onOpen,
  onToggleStar,
  onEdit,
  onDelete,
  onNudge,
  onDismissNudge,
}: {
  task: Task;
  stripColor?: string;
  onOpen: () => void;
  onToggleStar: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  // Shown on rows the viewer owns ("Tasks you assigned") — pokes the
  // assignee(s) to follow up on the task.
  onNudge?: () => void;
  // Shown on the viewer's own assigned rows when they've been nudged —
  // dismisses the badge below.
  onDismissNudge?: () => void;
}) {
  const band = stripColor ?? STATUS_COLOR[task.viewerStatus] ?? STATUS_COLOR[task.status] ?? "#2563eb";
  const assigneeNames = task.assignees.map((a) => a.name);
  const assigneeSummary = assigneeNames.length > 1 ? `${assigneeNames[0]} +${assigneeNames.length - 1}` : assigneeNames[0] ?? "—";
  const displayTitle = task.viewerSubtaskTitle ? `${task.title} · ${task.viewerSubtaskTitle}` : task.title;
  const displayDue = task.viewerDueDate ?? task.dueDate;
  const completedSubtaskCount = task.subtasks.filter((s) => s.status === "completed").length;
  const score = task.viewerStatus === "completed" ? rowScore(task) : null;

  return (
    <div
      onClick={onOpen}
      className="flex items-center gap-4 rounded-xl bg-white cursor-pointer border transition-all hover:-translate-y-0.5"
      style={{
        borderTopColor: "#e3e8e6",
        borderRightColor: "#e3e8e6",
        borderBottomColor: "#e3e8e6",
        borderLeftWidth: 4,
        borderLeftStyle: "solid",
        borderLeftColor: band,
        padding: "14px 18px",
        boxShadow: "none",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 8px 22px rgba(10,30,26,.12)")}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="font-semibold text-sm whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: "#10201d" }}>
            {displayTitle}
          </div>
          {task.viewerNudgedAt && (
            <span
              className="inline-flex items-center gap-1 flex-none rounded-full pl-2 pr-1 py-0.5 text-[10.5px] font-semibold"
              style={{ background: "#fef3c7", color: "#92400e" }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" /></svg>
              Nudged
              {onDismissNudge && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDismissNudge();
                  }}
                  title="Dismiss"
                  aria-label="Dismiss nudge"
                  className="flex-none w-3.5 h-3.5 rounded-full flex items-center justify-center cursor-pointer border-none bg-transparent"
                  style={{ color: "#92400e" }}
                >
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><path d="M6 6l12 12M18 6L6 18" /></svg>
                </button>
              )}
            </span>
          )}
          {score != null && (
            <span
              className="inline-flex items-center flex-none rounded-full px-2 py-0.5 text-[10.5px] font-mono font-semibold"
              style={{ background: scoreBadgeStyle(score).bg, color: scoreBadgeStyle(score).color }}
              title="Task score"
            >
              {score.toFixed(2)}/10.00
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1 text-xs" style={{ color: "#5c6a67" }}>
          <span>{task.team.name}</span>
          <span className="opacity-40">•</span>
          <span>{assigneeSummary}</span>
          {task.subtasks.length > 0 && (
            <>
              <span className="opacity-40">•</span>
              <span>{completedSubtaskCount}/{task.subtasks.length} subtasks</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-none" style={{ width: 132 }}>
        <span className={priorityBadgeClass(task.priority)}>{capitalize(task.priority)}</span>
        <span className={priorityBadgeClass(task.impact)}>{capitalize(task.impact)}</span>
      </div>

      <div className="flex-none text-right" style={{ width: 110 }}>
        <div className="font-mono text-xs" style={{ color: "#3d4a47" }}>{dueText(displayDue)}</div>
        {task.overdue && <div className="text-[10.5px] font-semibold mt-0.5" style={{ color: "#b91c1c" }}>Overdue</div>}
      </div>

      {onEdit && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          title="Edit task"
          aria-label="Edit task"
          className="row-edit flex-none w-[34px] h-[34px] rounded-[9px] border flex items-center justify-center cursor-pointer bg-white hover:bg-[#eff6ff]"
          style={{ borderColor: "#bfdbfe", color: "#2563eb" }}
        >
          <svg className="edit-glyph" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
          </svg>
        </button>
      )}
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Delete task"
          aria-label="Delete task"
          className="row-del flex-none w-[34px] h-[34px] rounded-[9px] border flex items-center justify-center cursor-pointer bg-white hover:bg-[#fef2f2]"
          style={{ borderColor: "#fca5a5", color: "#b91c1c" }}
        >
          <svg className="del-glyph" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
          </svg>
        </button>
      )}
      {onNudge && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNudge();
          }}
          title="Nudge assignee(s)"
          aria-label="Nudge assignee(s)"
          className="row-nudge flex-none w-[34px] h-[34px] rounded-[9px] border flex items-center justify-center cursor-pointer bg-white hover:bg-[#fffbeb]"
          style={{ borderColor: "#fde68a", color: "#b45309" }}
        >
          <svg className="nudge-glyph" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path d="M22 2L11 13" />
            <path d="M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        </button>
      )}

      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleStar();
        }}
        title={task.starred ? "Unpin task" : "Pin task"}
        aria-label={task.starred ? "Unpin task" : "Pin task"}
        className="star-btn flex-none w-[34px] h-[34px] rounded-[9px] border flex items-center justify-center cursor-pointer hover:border-[#eab308] hover:bg-[#fffbeb]"
        style={{ borderColor: task.starred ? "#fde68a" : "#e3e8e6", background: task.starred ? "#fffbeb" : "#fff" }}
      >
        <svg className="star-ic" width="17" height="17" viewBox="0 0 24 24" fill={task.starred ? "#f4b400" : "none"} stroke={task.starred ? "#e0a000" : "#b6c0bc"} strokeWidth={1.7} strokeLinejoin="round">
          <path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.3l6.1-.7z" />
        </svg>
      </button>

      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b6c0bc" strokeWidth={2} className="flex-none">
        <path d="M9 6l6 6-6 6" />
      </svg>
    </div>
  );
}

export function avatarInitials(name: string) {
  return initials(name);
}
