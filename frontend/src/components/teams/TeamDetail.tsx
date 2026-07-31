"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Task, Team, TeamPerformance, TeamRef } from "@/lib/types";
import { dueText, statusBadgeClass, statusLabel } from "@/lib/format";
import { TaskListWithPagination } from "@/components/tasks/TaskListWithPagination";
import { TaskDrawer } from "@/components/tasks/TaskDrawer";
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";
import { starTask, deleteTask, nudgeTask } from "@/lib/task-actions";
import { CompletionRateChart } from "@/components/dashboard/CompletionRateChart";
import { AvgScoreChart } from "@/components/dashboard/AvgScoreChart";
import { Toast, useToast } from "@/components/ui/Toast";
import { NudgeConfirmDialog } from "@/components/teams/NudgeConfirmDialog";
import { DeleteTaskConfirmDialog } from "@/components/teams/DeleteTaskConfirmDialog";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

// Scored for a specific member rather than the logged-in viewer: for a task
// with subtasks, a task-level assignee is scored on the average across all
// subtasks, while a subtask-only assignee is scored on just their own.
function memberTaskScore(task: Task, memberId: string): number | null {
  if (task.subtasks.length === 0) return task.score;
  const isTaskAssignee = task.assignees.some((a) => a.id === memberId);
  const relevant = isTaskAssignee ? task.subtasks : task.subtasks.filter((s) => s.assignee?.id === memberId);
  const scores = relevant.map((s) => s.score).filter((s): s is number => s != null);
  if (scores.length === 0) return null;
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100;
}

function taskRejectionCount(task: Task): number {
  return task.log.filter((l) => l.action === "rejected").length;
}

function scoreBadgeStyle(score: number): { bg: string; color: string } {
  if (score >= 8) return { bg: "#dcfce7", color: "#15803d" };
  if (score >= 5) return { bg: "#fef3c7", color: "#b45309" };
  return { bg: "#fee2e2", color: "#b91c1c" };
}

const STAT_META = {
  total: { label: "Total tasks", color: "#2563eb", darkText: "#1e3a8a", gradient: "linear-gradient(135deg,#eff6ff,#dbeafe)", borderColor: "#bfdbfe", iconPath: "M9 6h11M9 12h11M9 18h11" },
  completed: { label: "Completed", color: "#15803d", darkText: "#14532d", gradient: "linear-gradient(135deg,#f0fdf4,#dcfce7)", borderColor: "#bbf7d0", iconPath: "M20 6L9 17l-5-5" },
  inProgress: { label: "In progress", color: "#0284c7", darkText: "#075985", gradient: "linear-gradient(135deg,#f0f9ff,#e0f2fe)", borderColor: "#bae6fd", iconPath: "M12 2a10 10 0 1 0 0.01 0M12 7v5l3 2" },
  overdue: { label: "Overdue", color: "#b91c1c", darkText: "#7f1d1d", gradient: "linear-gradient(135deg,#fef2f2,#fee2e2)", borderColor: "#fecaca", iconPath: "M12 8v4M12 16h.01" },
} as const;

const MEDAL: Record<number, string> = { 1: "#eab308", 2: "#94a3b8", 3: "#c2743a" };
const RING: Record<number, string> = { 1: "linear-gradient(135deg,#f59e0b,#b45309)", 2: "linear-gradient(135deg,#94a3b8,#64748b)", 3: "linear-gradient(135deg,#d08a52,#a15c2b)" };
const BAR_H: Record<number, number> = { 1: 96, 2: 68, 3: 48 };

export function TeamDetail({ teamId, isUser, onBack }: { teamId: string; isUser: boolean; onBack?: () => void }) {
  const { user } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [perf, setPerf] = useState<TeamPerformance | null>(null);
  const [reviewQueue, setReviewQueue] = useState<Task[]>([]);
  const [assignedList, setAssignedList] = useState<Task[]>([]);
  const [tab, setTab] = useState<"team" | "review" | "perf">("team");
  const [statModal, setStatModal] = useState<keyof typeof STAT_META | null>(null);
  const [memberPage, setMemberPage] = useState(1);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [memberTab, setMemberTab] = useState<"inProgress" | "completed">("inProgress");
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [nudgeTarget, setNudgeTarget] = useState<Task | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const { toast, showToast, clearToast } = useToast();
  const MEMBER_PAGE_SIZE = 6;

  async function refresh() {
    const [teamRes, perfRes, reviewRes, assignedRes] = await Promise.all([
      api.get(`/teams/${encodeURIComponent(teamId)}`),
      api.get(`/teams/${encodeURIComponent(teamId)}/performance`),
      api.get("/tasks", { params: { createdById: user?.id, teamId, status: "submitted" } }),
      api.get("/tasks", { params: { createdById: user?.id, teamId, status: "todo,in_progress,submitted,rejected" } }),
    ]);
    setTeam(teamRes.data.team);
    setPerf(perfRes.data);
    setReviewQueue(reviewRes.data.tasks);
    setAssignedList(assignedRes.data.tasks);
  }

  useEffect(() => {
    if (!user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting drill state when the viewed team changes
    setSelectedMemberId(null);
    setTab("team");
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId, user?.id]);

  async function onToggleStar(task: Task) {
    const wasStarred = task.starred;
    const flip = (list: Task[]) => list.map((t) => (t.id === task.id ? { ...t, starred: !wasStarred } : t));
    setReviewQueue(flip);
    setAssignedList(flip);
    try {
      await starTask(task.id, wasStarred);
    } catch {
      const revert = (list: Task[]) => list.map((t) => (t.id === task.id ? { ...t, starred: wasStarred } : t));
      setReviewQueue(revert);
      setAssignedList(revert);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setActionBusy(true);
    try {
      await deleteTask(deleteTarget.id);
      showToast(`"${deleteTarget.title}" was deleted.`);
      setDeleteTarget(null);
      refresh();
    } catch {
      showToast("Couldn't delete this task — try again.", "error");
    } finally {
      setActionBusy(false);
    }
  }

  async function confirmNudge() {
    if (!nudgeTarget) return;
    setActionBusy(true);
    try {
      await nudgeTask(nudgeTarget.id);
      const names = nudgeTarget.assignees.map((a) => a.name).join(", ");
      showToast(`Nudge sent to ${names}.`);
      setNudgeTarget(null);
    } catch {
      showToast("Couldn't send the nudge — try again.", "error");
    } finally {
      setActionBusy(false);
    }
  }

  if (!team || !perf) return <div className="text-sm" style={{ color: "#5c6a67" }}>Loading…</div>;

  const selectedMember = selectedMemberId
    ? { user: team.members?.find((m) => m.id === selectedMemberId), stat: perf.members.find((m) => m.user.id === selectedMemberId) }
    : null;

  if (selectedMember?.user && selectedMember.stat) {
    // Includes archived tasks — archiving only ever applies to completed
    // work, so it never affects which tasks land in the "not completed"
    // bucket below.
    const memberTasks = perf.tasks.filter((t) => t.assignees.some((a) => a.id === selectedMemberId));
    const memberCompletedTasks = memberTasks.filter((t) => t.status === "completed");
    const memberInProgressTasks = memberTasks.filter((t) => t.status !== "completed");
    const stat = selectedMember.stat;
    const memberStatCards = [
      { label: "All Task", value: memberTasks.length, color: "#0284c7", dark: "#075985", bg: "#f0f9ff", border: "#bae6fd" },
      { label: "Completed", value: memberCompletedTasks.length, color: "#15803d", dark: "#14532d", bg: "#f0fdf4", border: "#bbf7d0" },
      { label: "Late", value: stat.lateCount, color: "#b91c1c", dark: "#7f1d1d", bg: "#fef2f2", border: "#fecaca" },
      { label: "On-time", value: `${stat.onTimeRate}%`, color: "#7c3aed", dark: "#5b21b6", bg: "#f5f3ff", border: "#ddd6fe" },
    ];
    const memberTabTasks = memberTab === "inProgress" ? memberInProgressTasks : memberCompletedTasks;
    const ringCirc = 2 * Math.PI * 50;
    return (
      <div>
        <button className="mb-3.5 bg-transparent border-none cursor-pointer font-semibold text-sm p-0" style={{ color: "#2563eb" }} onClick={() => setSelectedMemberId(null)}>
          ← Back to team
        </button>
        <div className="relative overflow-hidden rounded-[20px] text-white p-7 mb-4.5" style={{ background: "radial-gradient(120% 160% at 8% 0%,#1e3a8a,#152a63 60%,#0f1f45)" }}>
          <div className="relative z-10 flex items-center gap-5 flex-wrap">
            <div className="w-[72px] h-[72px] flex-none rounded-2xl flex items-center justify-center font-mono font-bold text-2xl" style={{ background: "linear-gradient(135deg,#3b82f6,#1e3a8a)" }}>
              {initials(selectedMember.user.name)}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="m-0 text-2xl text-white">{selectedMember.user.name}</h2>
              <div className="text-[13.5px] mt-1" style={{ color: "rgba(255,255,255,.66)" }}>{selectedMember.user.title}</div>
              <div className="flex gap-2 mt-3 flex-wrap">
                <span className="font-mono text-[11px] font-semibold rounded-full px-2.5 py-1" style={{ background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.16)" }}>
                  {stat.assignedCount} total tasks
                </span>
                <span className="font-mono text-[11px] font-semibold rounded-full px-2.5 py-1" style={{ background: "rgba(255,255,255,.12)" }}>{stat.onTimeRate}% on-time</span>
              </div>
            </div>
            <div className="flex-none relative" style={{ width: 118, height: 118 }}>
              <svg width="118" height="118" viewBox="0 0 118 118" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="59" cy="59" r="50" fill="none" stroke="rgba(255,255,255,.14)" strokeWidth={11} />
                <circle cx="59" cy="59" r="50" fill="none" stroke="#60a5fa" strokeWidth={11} strokeLinecap="round" strokeDasharray={`${(ringCirc * stat.onTimeRate) / 100} ${ringCirc}`} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="font-mono font-semibold text-2xl leading-none">{stat.onTimeRate}%</div>
                <div className="uppercase mt-1" style={{ fontSize: 9.5, color: "rgba(255,255,255,.6)", letterSpacing: ".06em" }}>On-time</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
          {memberStatCards.map((c) => (
            <div key={c.label} className="rounded-2xl p-4 flex items-center gap-3 border" style={{ borderColor: c.border, background: c.bg }}>
              <div>
                <div className="font-mono font-semibold text-2xl leading-none" style={{ color: c.dark }}>{c.value}</div>
                <div className="font-mono uppercase font-semibold mt-1" style={{ fontSize: 10, color: c.color, letterSpacing: ".05em" }}>{c.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-1.5 rounded-[11px] p-1 mb-3.5 w-fit" style={{ background: "#eef1f0" }}>
          <button onClick={() => setMemberTab("inProgress")} className="px-4 py-2 rounded-lg text-[12.5px] font-semibold border-none cursor-pointer" style={{ background: memberTab === "inProgress" ? "#fff" : "transparent", color: memberTab === "inProgress" ? "#1e3a8a" : "#8a968f", boxShadow: memberTab === "inProgress" ? "0 1px 2px rgba(0,0,0,.08)" : "none" }}>
            In Progress
          </button>
          <button onClick={() => setMemberTab("completed")} className="px-4 py-2 rounded-lg text-[12.5px] font-semibold border-none cursor-pointer" style={{ background: memberTab === "completed" ? "#fff" : "transparent", color: memberTab === "completed" ? "#1e3a8a" : "#8a968f", boxShadow: memberTab === "completed" ? "0 1px 2px rgba(0,0,0,.08)" : "none" }}>
            Completed
          </button>
        </div>

        <div className="card overflow-hidden mb-4.5">
          <div className="px-5 py-3.5 border-b font-bold text-[14.5px]" style={{ borderColor: "#f0f3f2" }}>
            {memberTab === "inProgress" ? "In progress tasks" : "Completed tasks"}
          </div>
          {memberTabTasks.map((t) => {
            const showAdminCols = memberTab === "completed" && user?.admin;
            const score = showAdminCols ? memberTaskScore(t, selectedMemberId!) : null;
            const rejections = showAdminCols ? taskRejectionCount(t) : 0;
            return (
              <div
                key={t.id}
                // Read-only here on purpose — this task belongs to the member
                // being inspected, not the person browsing the team page, so
                // there's no drawer/click-through to change its status from
                // this view (they'd only get that from their own task views).
                className="grid gap-3.5 px-5 py-3 border-b items-center"
                style={{ borderColor: "#f4f6f5", gridTemplateColumns: showAdminCols ? "1fr auto auto auto auto" : "1fr auto auto" }}
              >
                <div className="text-[13.5px] font-medium min-w-0 whitespace-nowrap overflow-hidden text-ellipsis">{t.title}</div>
                {showAdminCols && (
                  <div className="text-right" style={{ width: 92 }}>
                    {score != null ? (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-mono font-semibold" style={{ background: scoreBadgeStyle(score).bg, color: scoreBadgeStyle(score).color }} title="Task score">
                        {score.toFixed(2)}/10.00
                      </span>
                    ) : (
                      <span className="font-mono text-xs" style={{ color: "#96a19d" }}>—</span>
                    )}
                  </div>
                )}
                {showAdminCols && (
                  <div className="text-right font-mono text-xs" style={{ width: 78, color: rejections > 0 ? "#b91c1c" : "#96a19d" }} title="Times rejected">
                    {rejections} rejected
                  </div>
                )}
                <div className="capitalize text-[13px]" style={{ width: 80, color: "#5c6a67" }}>{t.priority}</div>
                <div className="text-right font-mono text-xs" style={{ width: 70, color: "#5c6a67" }}>{dueText(t.dueDate)}</div>
              </div>
            );
          })}
          {memberTabTasks.length === 0 && (
            <div className="p-6 text-center text-[13px]" style={{ color: "#8a968f" }}>
              {memberTab === "inProgress" ? "No in-progress tasks for this member." : "No completed tasks for this member yet."}
            </div>
          )}
        </div>

        {memberTab === "completed" && user?.admin && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <CompletionRateChart data={stat.completionTrend} title="Completion rate" subtitle={`${selectedMember.user.name} — trailing 8 weeks`} />
            <AvgScoreChart data={stat.completionTrend} title="Average task score" subtitle={`${selectedMember.user.name} — trailing 8 weeks`} />
          </div>
        )}
        <TaskDrawer taskId={openTaskId} onClose={() => setOpenTaskId(null)} onChanged={refresh} />
      </div>
    );
  }

  const memberPageCount = Math.max(1, Math.ceil(perf.members.length / MEMBER_PAGE_SIZE));
  const memberStart = (Math.min(memberPage, memberPageCount) - 1) * MEMBER_PAGE_SIZE;
  const pagedMembers = perf.members.slice(memberStart, memberStart + MEMBER_PAGE_SIZE);

  const modalTasks = statModal
    ? perf.tasks
        .filter((t) => (statModal === "total" ? true : statModal === "overdue" ? t.overdue : statModal === "inProgress" ? t.status === "in_progress" : t.status === "completed"))
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    : [];

  return (
    <div>
      {onBack && (
        <button className="mb-2.5 bg-transparent border-none cursor-pointer font-semibold text-sm p-0" style={{ color: "#2563eb" }} onClick={onBack}>
          ← All teams
        </button>
      )}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="m-0 mb-1 text-xl font-bold">{team.name}{isUser ? " — My Team" : ""}</h2>
          <div className="text-[13px]" style={{ color: "#5c6a67" }}>{perf.stats.completed}/{perf.stats.total} tasks completed · {perf.stats.lateCount} late</div>
        </div>
        <button className="btn btn-primary flex-none" onClick={() => { setEditingTask(null); setCreateOpen(true); }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M12 5v14M5 12h14" /></svg>
          New Task
        </button>
      </div>

      <div className="flex gap-1.5 rounded-[11px] p-1 mb-5.5 w-fit" style={{ background: "#eef1f0" }}>
        <button onClick={() => setTab("team")} className="px-4 py-2 rounded-lg text-[12.5px] font-semibold border-none cursor-pointer" style={{ background: tab === "team" ? "#fff" : "transparent", color: tab === "team" ? "#1e3a8a" : "#8a968f", boxShadow: tab === "team" ? "0 1px 2px rgba(0,0,0,.08)" : "none" }}>
          {isUser ? "My Team" : "Overview"}
        </button>
        <button onClick={() => setTab("review")} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12.5px] font-semibold border-none cursor-pointer" style={{ background: tab === "review" ? "#fff" : "transparent", color: tab === "review" ? "#1e3a8a" : "#8a968f", boxShadow: tab === "review" ? "0 1px 2px rgba(0,0,0,.08)" : "none" }}>
          Awaiting your review
          {reviewQueue.length > 0 && (
            <span className="font-mono text-[11px] font-semibold rounded-full px-2 py-0.5" style={{ color: "#ea9a0c", background: "#fef3c7" }}>{reviewQueue.length}</span>
          )}
        </button>
        <button onClick={() => setTab("perf")} className="px-4 py-2 rounded-lg text-[12.5px] font-semibold border-none cursor-pointer" style={{ background: tab === "perf" ? "#fff" : "transparent", color: tab === "perf" ? "#1e3a8a" : "#8a968f", boxShadow: tab === "perf" ? "0 1px 2px rgba(0,0,0,.08)" : "none" }}>
          Team Performance
        </button>
      </div>

      {tab === "perf" ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {(Object.keys(STAT_META) as (keyof typeof STAT_META)[]).map((key) => {
              const meta = STAT_META[key];
              const value = key === "total" ? perf.stats.total : key === "completed" ? perf.stats.completed : key === "inProgress" ? perf.stats.inProgress : perf.stats.overdue;
              return (
                <div key={key} onClick={() => setStatModal(key)} className="rounded-2xl p-5 flex items-center gap-4 border cursor-pointer hover:-translate-y-0.5" style={{ borderColor: meta.borderColor, background: meta.gradient }}>
                  <div className="w-13 h-13 flex-none rounded-2xl flex items-center justify-center text-white" style={{ width: 52, height: 52, background: meta.color }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d={meta.iconPath} /></svg>
                  </div>
                  <div>
                    <div className="font-mono font-semibold" style={{ fontSize: 36, lineHeight: 1, color: meta.darkText }}>{value}</div>
                    <div className="font-mono uppercase font-semibold" style={{ fontSize: 11, color: meta.color, marginTop: 6 }}>{meta.label}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {statModal && (
            <div className="backdrop-anim fixed inset-0 z-[60] flex items-center justify-center" style={{ background: "rgba(16,32,29,.45)" }} onClick={() => setStatModal(null)}>
              <div className="dialog-anim bg-white rounded-2xl flex flex-col overflow-hidden" style={{ width: 640, maxWidth: "92%", maxHeight: "78vh", boxShadow: "0 24px 60px rgba(10,30,26,.28)" }} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2.5 px-5.5 py-4 border-b" style={{ borderColor: "#eef1f0" }}>
                  <div className="font-bold text-base">{STAT_META[statModal].label}</div>
                  <span className="font-mono text-[11px] font-semibold rounded-full px-2.5 py-0.5" style={{ color: "#2563eb", background: "#dbeafe" }}>{modalTasks.length}</span>
                  <button onClick={() => setStatModal(null)} className="ml-auto w-8 h-8 rounded-lg border bg-white flex items-center justify-center cursor-pointer" style={{ borderColor: "#e3e8e6", color: "#5c6a67" }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M6 6l12 12M18 6L6 18" /></svg>
                  </button>
                </div>
                <div className="overflow-y-auto p-4 flex flex-col gap-2">
                  {modalTasks.map((t) => {
                    const names = t.assignees.map((a) => a.name);
                    return (
                      <div key={t.id} className="flex items-center gap-3.5 border rounded-[11px] px-4 py-3 cursor-pointer" style={{ borderColor: "#e3e8e6" }} onClick={() => { setOpenTaskId(t.id); setStatModal(null); }}>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-[13.5px] whitespace-nowrap overflow-hidden text-ellipsis">{t.title}</div>
                          <div className="text-[11.5px] mt-0.5" style={{ color: "#8a968f" }}>{names.length > 1 ? `${names[0]} +${names.length - 1}` : names[0] ?? "—"}</div>
                        </div>
                        <span className={statusBadgeClass(t.status)}>{statusLabel(t.status)}</span>
                        <div className="text-right font-mono text-xs flex-none" style={{ width: 96, color: "#3d4a47" }}>{dueText(t.dueDate)}</div>
                      </div>
                    );
                  })}
                  {modalTasks.length === 0 && <div className="rounded-xl border border-dashed p-7 text-center text-[13px]" style={{ borderColor: "#cdd7d3", color: "#8a968f" }}>No tasks in this category.</div>}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4 mb-4">
            <div className="card overflow-hidden">
              <div className="px-5 py-4 flex items-center gap-2.5 text-white" style={{ background: "linear-gradient(120deg,#1e3a8a,#2563eb)" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0V4z" /></svg>
                <span className="font-bold text-sm">Top performers</span>
              </div>
              <div className="flex items-end justify-center gap-4 py-6.5 px-5">
                {perf.top3.map((m) => {
                  const rank = perf.top3.indexOf(m) + 1;
                  return (
                    <div key={m.user.id} className="flex flex-col items-center gap-2" style={{ width: 130 }}>
                      <div className="relative">
                        <div
                          className="rounded-full flex items-center justify-center text-white font-mono font-semibold"
                          style={{ width: rank === 1 ? 76 : 62, height: rank === 1 ? 76 : 62, background: RING[rank], fontSize: rank === 1 ? 22 : 18, boxShadow: "0 6px 18px rgba(10,30,26,.16)" }}
                        >
                          {initials(m.user.name)}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-white font-mono font-bold text-xs" style={{ background: MEDAL[rank], border: "2px solid #fff" }}>{rank}</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-[12.5px] whitespace-nowrap overflow-hidden text-ellipsis" style={{ maxWidth: 120 }}>{m.user.name}</div>
                        <div className="text-[10.5px]" style={{ color: "#8a968f" }}>{m.completedCount} done · {m.onTimeRate}%</div>
                      </div>
                      <div className="w-full rounded-t-[10px] flex items-start justify-center pt-2 text-white font-mono font-bold text-[15px]" style={{ background: RING[rank], height: BAR_H[rank] }}>{rank}</div>
                    </div>
                  );
                })}
                {perf.top3.length === 0 && <div className="text-sm py-6" style={{ color: "#8a968f" }}>No completed tasks yet.</div>}
              </div>
            </div>

            <div className="card p-5 flex flex-col items-center justify-center gap-3.5">
              <div className="font-bold text-sm self-start">Completion rate</div>
              <div className="relative" style={{ width: 150, height: 150 }}>
                <svg width="150" height="150" viewBox="0 0 150 150">
                  <circle cx="75" cy="75" r="62" fill="none" stroke="#eef1f0" strokeWidth={14} />
                  <circle
                    cx="75" cy="75" r="62" fill="none" stroke="#15803d" strokeWidth={14} strokeLinecap="round"
                    strokeDasharray={`${perf.stats.total ? (2 * Math.PI * 62 * perf.stats.completed) / perf.stats.total : 0} ${2 * Math.PI * 62}`}
                    transform="rotate(-90 75 75)"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="font-mono font-semibold" style={{ fontSize: 34, color: "#14532d" }}>{perf.stats.total ? Math.round((perf.stats.completed / perf.stats.total) * 100) : 0}%</div>
                  <div className="font-mono" style={{ fontSize: 10.5, color: "#8a968f" }}>{perf.stats.completed}/{perf.stats.total} done</div>
                </div>
              </div>
              <div className="flex gap-2 w-full">
                <div className="flex-1 text-center rounded-[10px] p-2.5 border" style={{ background: "#f0f9ff", borderColor: "#bae6fd" }}>
                  <div className="font-mono font-semibold text-xl" style={{ color: "#075985" }}>{perf.stats.inProgress}</div>
                  <div className="font-mono uppercase" style={{ fontSize: 10, color: "#0284c7" }}>In progress</div>
                </div>
                <div className="flex-1 text-center rounded-[10px] p-2.5 border" style={{ background: "#fef2f2", borderColor: "#fecaca" }}>
                  <div className="font-mono font-semibold text-xl" style={{ color: "#7f1d1d" }}>{perf.stats.overdue}</div>
                  <div className="font-mono uppercase" style={{ fontSize: 10, color: "#b91c1c" }}>Overdue</div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <CompletionRateChart data={perf.completionTrend} title="Weekly completion rate" subtitle="Whole team, on-time vs. late" />
            <AvgScoreChart data={perf.completionTrend} title="Average task score" subtitle="Whole team, trailing 8 weeks" />
          </div>
        </>
      ) : tab === "review" ? (
        <div className="mb-2">
          <div className="flex items-center gap-2.5 mb-3">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#ea9a0c" }} />
            <span className="font-bold text-[15px]" style={{ color: "#92400e" }}>Awaiting your review</span>
            <span className="font-mono text-[11px] font-semibold rounded-full px-2.5 py-0.5" style={{ color: "#ea9a0c", background: "#fef3c7" }}>{reviewQueue.length}</span>
          </div>
          <TaskListWithPagination
            tasks={reviewQueue}
            stripColor="#ea9a0c"
            pillBg="#fef3c7"
            headerBorder="#fde68a"
            headerText="#92400e"
            emptyText="No tasks are waiting for your review."
            onOpen={setOpenTaskId}
            onToggleStar={onToggleStar}
          />
        </div>
      ) : (
        <div className="mb-2">
          <div className="flex items-center gap-2.5 mb-3">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#2563eb" }} />
            <span className="font-bold text-[15px]" style={{ color: "#1e3a8a" }}>Tasks you assigned</span>
            <span className="font-mono text-[11px] font-semibold rounded-full px-2.5 py-0.5" style={{ color: "#2563eb", background: "#dbeafe" }}>{assignedList.length}</span>
          </div>
          <TaskListWithPagination
            tasks={assignedList}
            stripColor="#2563eb"
            pillBg="#dbeafe"
            headerBorder="#bfdbfe"
            headerText="#1e3a8a"
            emptyText="You haven't assigned any tasks to teammates yet."
            onOpen={setOpenTaskId}
            onToggleStar={onToggleStar}
            onEdit={(t) => { setEditingTask(t); setCreateOpen(true); }}
            onDelete={(t) => setDeleteTarget(t)}
            onNudge={(t) => setNudgeTarget(t)}
            nudgeEnabled={(t) => t.status !== "completed" && t.assignees.length > 0}
          />
        </div>
      )}

      {tab === "perf" && (
        <>
          <div className="font-bold text-[15px] mt-6.5 mb-3.5">Team members</div>
          <div className="card overflow-hidden">
            <div className="grid gap-3 px-4.5 py-3 border-b font-mono uppercase" style={{ gridTemplateColumns: "2.2fr 1fr 1fr 1.4fr 0.8fr", background: "#f8faf9", borderColor: "#e3e8e6", fontSize: 10.5, fontWeight: 600, letterSpacing: ".05em", color: "#5c6a67" }}>
              <div>Member</div><div>Assigned</div><div>Completed</div><div>On-time</div><div className="text-right">Late</div>
            </div>
            {pagedMembers.map((m) => (
              <div key={m.user.id} className="grid gap-3 px-4.5 py-3.5 border-b items-center cursor-pointer hover:bg-[#f8faf9]" style={{ gridTemplateColumns: "2.2fr 1fr 1fr 1.4fr 0.8fr", borderColor: "#f0f3f2" }} onClick={() => { setSelectedMemberId(m.user.id); setMemberTab("inProgress"); }}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-[34px] h-[34px] flex-none rounded-full flex items-center justify-center font-mono font-semibold text-xs" style={{ background: m.completedCount > 0 ? "#dbeafe" : "#eef1f0", color: m.completedCount > 0 ? "#1e3a8a" : "#5c6a67" }}>
                    {initials(m.user.name)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-[13.5px] whitespace-nowrap overflow-hidden text-ellipsis">{m.user.name}</div>
                    <div className="text-[11px] whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: "#8a968f" }}>{m.user.title}</div>
                  </div>
                </div>
                <div className="font-mono font-semibold text-sm">{m.assignedCount}</div>
                <div className="font-mono font-semibold text-sm" style={{ color: "#15803d" }}>{m.completedCount}</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "#eef1f0", maxWidth: 90 }}>
                    <div className="h-full" style={{ background: m.onTimeRate >= 75 ? "#15803d" : m.onTimeRate >= 40 ? "#d97706" : "#b91c1c", width: `${m.onTimeRate}%` }} />
                  </div>
                  <span className="font-mono font-semibold" style={{ fontSize: 11.5, color: "#5c6a67" }}>{m.onTimeRate}%</span>
                </div>
                <div className="text-right">
                  {m.lateCount > 0 ? (
                    <span className="font-mono font-semibold text-[11.5px] rounded-full px-2 py-0.5" style={{ color: "#b91c1c", background: "#fee2e2" }}>{m.lateCount}</span>
                  ) : (
                    <span className="font-mono text-xs" style={{ color: "#96a19d" }}>{m.lateCount}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          {memberPageCount > 1 && (
            <div className="flex items-center justify-between mt-3.5">
              <div className="font-mono text-xs" style={{ color: "#8a968f" }}>{memberStart + 1}–{Math.min(memberStart + MEMBER_PAGE_SIZE, perf.members.length)} of {perf.members.length}</div>
              <div className="flex items-center gap-1.5">
                <button disabled={memberPage <= 1} onClick={() => setMemberPage((p) => Math.max(1, p - 1))} className="px-3 h-[30px] rounded-lg border text-[12.5px] font-semibold" style={{ borderColor: "#e3e8e6", color: memberPage <= 1 ? "#c2cbc8" : "#5c6a67" }}>Prev</button>
                {Array.from({ length: memberPageCount }, (_, i) => (
                  <button key={i} onClick={() => setMemberPage(i + 1)} className="rounded-lg border font-mono font-semibold" style={{ minWidth: 30, height: 30, padding: "0 8px", borderColor: i + 1 === memberPage ? "#1e3a8a" : "#e3e8e6", background: i + 1 === memberPage ? "#1e3a8a" : "#fff", color: i + 1 === memberPage ? "#fff" : "#5c6a67", fontSize: 12.5 }}>{i + 1}</button>
                ))}
                <button disabled={memberPage >= memberPageCount} onClick={() => setMemberPage((p) => Math.min(memberPageCount, p + 1))} className="px-3 h-[30px] rounded-lg border text-[12.5px] font-semibold" style={{ borderColor: "#e3e8e6", color: memberPage >= memberPageCount ? "#c2cbc8" : "#5c6a67" }}>Next</button>
              </div>
            </div>
          )}
        </>
      )}

      <TaskDrawer taskId={openTaskId} onClose={() => setOpenTaskId(null)} onChanged={refresh} />
      <CreateTaskDialog
        open={createOpen}
        teams={[{ id: team.id, name: team.name } as TeamRef]}
        defaultTeamId={team.id}
        editingTask={editingTask}
        onClose={() => setCreateOpen(false)}
        onSaved={() => {
          setCreateOpen(false);
          refresh();
        }}
      />
      <DeleteTaskConfirmDialog
        task={deleteTarget}
        busy={actionBusy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
      <NudgeConfirmDialog
        task={nudgeTarget}
        busy={actionBusy}
        onConfirm={confirmNudge}
        onCancel={() => setNudgeTarget(null)}
      />
      <Toast toast={toast} onClose={clearToast} />
    </div>
  );
}
