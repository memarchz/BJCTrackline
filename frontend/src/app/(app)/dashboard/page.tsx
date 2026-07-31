"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { CompletionTrendPoint, DashboardData } from "@/lib/types";
import { currentMonthStr, monthLabel, shiftMonth } from "@/lib/month";
import { dueText, priorityBadgeClass, capitalize, relativeTime, monthDay, statusLabel, daysUntil } from "@/lib/format";
import { StatCard, type StatCardData } from "@/components/dashboard/StatCard";
import { CompletionRateChart } from "@/components/dashboard/CompletionRateChart";
import { AvgScoreChart } from "@/components/dashboard/AvgScoreChart";
import { TaskDrawer } from "@/components/tasks/TaskDrawer";
import { LayersIcon, ClockIcon, AlarmIcon, WarningIcon, CheckCircleIcon, InboxIcon } from "@/components/stat-icons";
import { DashboardIcon } from "@/components/nav-icons";

const ACTION_META: Record<string, { bg: string; color: string; path: string; label: string }> = {
  created: { bg: "#dbeafe", color: "#2563eb", path: "M12 5v14M5 12h14", label: "Created" },
  started: { bg: "#e0f2fe", color: "#0284c7", path: "M5 3l14 9-14 9V3z", label: "Started" },
  submitted: { bg: "#fef3c7", color: "#b45309", path: "M5 12l14-7-4 16-4-6-6-3z", label: "Submitted" },
  cancelled: { bg: "#fef3c7", color: "#b45309", path: "M6 6l12 12M18 6L6 18", label: "Cancelled" },
  approved: { bg: "#dcfce7", color: "#15803d", path: "M20 6L9 17l-5-5", label: "Approved" },
  rejected: { bg: "#fee2e2", color: "#b91c1c", path: "M6 6l12 12M18 6L6 18", label: "Rejected" },
  reworked: { bg: "#fef3c7", color: "#b45309", path: "M3 12a9 9 0 1 0 3-6.7L3 8", label: "Reworked" },
  archived: { bg: "#eef1f0", color: "#5c6a67", path: "M3 7h18M6 7v13h12V7M9 7V4h6v3", label: "Archived" },
  commented: { bg: "#dbeafe", color: "#2563eb", path: "M4 5h16v11H8l-4 4V5z", label: "Commented" },
};

// Exact palette from the prototype shell's CARD object (Job Tracker.dc.html)
const CARD = {
  blue: { color: "#2563eb", darkText: "#1e3a8a", gradient: "linear-gradient(135deg,#eff6ff,#dbeafe)", borderColor: "#bfdbfe" },
  cyan: { color: "#0284c7", darkText: "#075985", gradient: "linear-gradient(135deg,#f0f9ff,#e0f2fe)", borderColor: "#bae6fd" },
  green: { color: "#15803d", darkText: "#14532d", gradient: "linear-gradient(135deg,#f0fdf4,#dcfce7)", borderColor: "#bbf7d0" },
  red: { color: "#b91c1c", darkText: "#7f1d1d", gradient: "linear-gradient(135deg,#fef2f2,#fee2e2)", borderColor: "#fecaca" },
  amber: { color: "#d97706", darkText: "#92400e", gradient: "linear-gradient(135deg,#fffbeb,#fef3c7)", borderColor: "#fde68a" },
} as const;

function adminStats(stats: Record<string, number>): StatCardData[] {
  return [
    { label: "Total", value: stats.total ?? 0, icon: <LayersIcon />, ...CARD.blue },
    { label: "In Progress", value: stats.inProgress ?? 0, icon: <ClockIcon />, ...CARD.cyan },
    { label: "Due Soon", value: stats.dueSoon ?? 0, icon: <AlarmIcon />, ...CARD.amber },
    { label: "Late / Overdue", value: stats.lateOverdue ?? 0, icon: <WarningIcon />, ...CARD.red },
  ];
}

function userStats(stats: Record<string, number>): StatCardData[] {
  return [
    { label: "All Tasks", value: stats.total ?? 0, icon: <LayersIcon />, ...CARD.blue },
    { label: "Due Soon", value: stats.dueSoon ?? 0, icon: <AlarmIcon />, ...CARD.amber },
    { label: "Awaiting Review", value: stats.awaitingReview ?? 0, icon: <InboxIcon />, ...CARD.cyan },
    { label: "Completed", value: stats.completedThisMonth ?? 0, icon: <CheckCircleIcon />, ...CARD.green },
  ];
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState(false);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [trendMonth, setTrendMonth] = useState(currentMonthStr());
  const [trend, setTrend] = useState<CompletionTrendPoint[]>([]);

  function refresh() {
    return api
      .get<DashboardData>("/dashboard")
      .then((res) => setData(res.data))
      .catch(() => setError(true));
  }

  useEffect(() => {
    let cancelled = false;
    api
      .get<DashboardData>("/dashboard")
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ month: string; completionTrend: CompletionTrendPoint[] }>("/dashboard/completion-trend", { params: { month: trendMonth } })
      .then((res) => {
        if (!cancelled) setTrend(res.data.completionTrend);
      })
      .catch(() => {
        if (!cancelled) setTrend([]);
      });
    return () => {
      cancelled = true;
    };
  }, [trendMonth]);

  if (error) return <div className="card p-8 text-center text-sm" style={{ color: "#b91c1c" }}>Couldn&apos;t load the dashboard. Please try again.</div>;
  if (!data || !user) return <div className="text-sm" style={{ color: "#5c6a67" }}>Loading…</div>;

  const stats = user.admin ? adminStats(data.stats) : userStats(data.stats);

  return (
    <div className="flex flex-col gap-6 max-w-[1200px]">
      <div
        className="rounded-2xl p-6 flex justify-between items-center text-white"
        style={{ background: "linear-gradient(120deg, #172554, #1d4ed8)" }}
      >
        <div>
          <h2 className="m-0 mb-1 text-white text-xl font-bold">{user.admin ? "Organization dashboard" : "My dashboard"}</h2>
          <div className="text-[13px] opacity-75">Progress across active work, updated live as tasks move.</div>
        </div>
        <DashboardIcon width={54} height={54} stroke="#93c5fd" strokeWidth={1.2} opacity={0.7} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <StatCard key={s.label} stat={s} />
        ))}
      </div>

      <div className="rounded-2xl overflow-hidden border" style={{ borderColor: "#fde68a", background: "#fffdf7" }}>
        <div className="flex items-center gap-2.5 px-5 py-3.5 border-b" style={{ borderColor: "#fdecc0", background: "linear-gradient(135deg,#fffbeb,#fef3c7)" }}>
          <AlarmIcon width={18} height={18} stroke="#d97706" strokeWidth={1.9} />
          <span className="font-bold text-sm" style={{ color: "#92400e" }}>Due soon</span>
          <span className="text-[11px]" style={{ color: "#a16207" }}>within 3 days</span>
          <span className="ml-auto font-mono text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ color: "#d97706", background: "#fef3c7" }}>
            {data.dueSoon.length}
          </span>
        </div>
        <div>
          {data.dueSoon.length === 0 && (
            <div className="p-5 text-center text-[13px]" style={{ color: "#a89b73" }}>Nothing due in the next 3 days.</div>
          )}
          {data.dueSoon.map((t) => {
            const due = t.viewerDueDate ?? t.dueDate;
            const urgent = daysUntil(due) <= 1;
            const title = t.viewerSubtaskTitle ? `${t.title} · ${t.viewerSubtaskTitle}` : t.title;
            return (
              <div
                key={t.id}
                onClick={() => setOpenTaskId(t.id)}
                className="flex items-center gap-3 px-5 py-3 border-b cursor-pointer hover:bg-[#fffdf5]"
                style={{ borderColor: "#fdf3d9" }}
              >
                <span className="w-2 h-2 rounded-full flex-none" style={{ background: urgent ? "#dc2626" : "#f59e0b" }} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-[13px] whitespace-nowrap overflow-hidden text-ellipsis">{title}</div>
                  <div className="text-[11.5px]" style={{ color: "#8a7a52" }}>{t.team.name} · {statusLabel(t.viewerStatus)}</div>
                </div>
                <span className={priorityBadgeClass(t.priority)}>{capitalize(t.priority)}</span>
                <span className="font-mono text-xs font-semibold whitespace-nowrap" style={{ color: urgent ? "#b91c1c" : "#d97706" }}>
                  {dueText(due)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTrendMonth((m) => shiftMonth(m, -1))}
              className="w-8 h-8 rounded-lg border flex items-center justify-center cursor-pointer hover:bg-[#f8faf9]"
              style={{ borderColor: "#e3e8e6" }}
              aria-label="Previous month"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M15 6l-6 6 6 6" /></svg>
            </button>
            <input
              type="month"
              className="input"
              style={{ width: "auto" }}
              value={trendMonth}
              max={currentMonthStr()}
              onChange={(e) => e.target.value && setTrendMonth(e.target.value)}
            />
            <button
              onClick={() => setTrendMonth((m) => shiftMonth(m, 1))}
              disabled={trendMonth >= currentMonthStr()}
              className="w-8 h-8 rounded-lg border flex items-center justify-center hover:bg-[#f8faf9] disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ borderColor: "#e3e8e6", cursor: trendMonth >= currentMonthStr() ? "default" : "pointer" }}
              aria-label="Next month"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 6l6 6-6 6" /></svg>
            </button>
            {trendMonth !== currentMonthStr() && (
              <button onClick={() => setTrendMonth(currentMonthStr())} className="bg-transparent border-none cursor-pointer text-xs font-semibold p-0" style={{ color: "#2563eb" }}>
                This month
              </button>
            )}
          </div>
          <CompletionRateChart data={trend} subtitle={`${monthLabel(trendMonth)} — on-time vs. late`} />
          <AvgScoreChart data={trend} subtitle={monthLabel(trendMonth)} />
        </div>
        <div className="card p-4">
          <div className="font-semibold text-[15px] mb-2.5">Priority mix</div>
          {(["high", "medium", "low"] as const).map((level) => {
            const count = data.priorityDistribution[level];
            const total = data.priorityDistribution.high + data.priorityDistribution.medium + data.priorityDistribution.low;
            const pct = total ? Math.round((count / total) * 100) : 0;
            return (
              <div key={level} className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="capitalize font-semibold">{level}</span>
                  <span style={{ color: "#5c6a67" }}>{count}</span>
                </div>
                <div className="h-1.5" style={{ background: "#eef1f0" }}>
                  <div className="h-full" style={{ background: "linear-gradient(90deg,#60a5fa,#1d4ed8)", width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="font-bold text-[15px] mb-3.5">Recent activity</div>
          <div className="flex flex-col">
            {data.recentActivity.length === 0 && <div className="text-sm" style={{ color: "#96a19d" }}>No recent activity.</div>}
            {data.recentActivity.map((a, i) => {
              const meta = ACTION_META[a.action] ?? ACTION_META.created;
              return (
                <div key={a.id} className="flex gap-3 pb-3.5">
                  <div className="flex flex-col items-center flex-none">
                    <div className="w-[30px] h-[30px] rounded-[9px] flex items-center justify-center" style={{ background: meta.bg, color: meta.color }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d={meta.path} />
                      </svg>
                    </div>
                    {i < data.recentActivity.length - 1 && <div className="w-0.5 flex-1" style={{ minHeight: 14, background: "#eef1f0", marginTop: 4 }} />}
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="text-[12.5px] leading-snug" style={{ color: "#10201d" }}>
                      <span className="font-semibold" style={{ color: meta.color }}>{meta.label}</span> — {a.task.title}
                    </div>
                    <div className="font-mono text-[11px] mt-0.5" style={{ color: "#96a19d" }}>{a.by.name} · {relativeTime(a.ts)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card p-5">
          <div className="font-bold text-[15px] mb-3.5">Upcoming for me</div>
          <div className="flex flex-col gap-2.5">
            {data.upcomingForMe.length === 0 && (
              <div className="rounded-[11px] border border-dashed p-5 text-center text-[13px]" style={{ borderColor: "#cdd7d3", color: "#96a19d" }}>
                Nothing upcoming.
              </div>
            )}
            {data.upcomingForMe.map((t) => {
              const due = t.viewerDueDate ?? t.dueDate;
              const { day, mon } = monthDay(due);
              const days = daysUntil(due);
              const dateColor = days <= 1 ? "#b91c1c" : days <= 3 ? "#d97706" : "#2563eb";
              const title = t.viewerSubtaskTitle ? `${t.title} · ${t.viewerSubtaskTitle}` : t.title;
              return (
                <div
                  key={t.id}
                  onClick={() => setOpenTaskId(t.id)}
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-[11px] border cursor-pointer hover:bg-[#f8faf9]"
                  style={{ borderColor: "#eef1f0" }}
                >
                  <div className="w-[42px] flex-none text-center border-r pr-2.5" style={{ borderColor: "#eef1f0" }}>
                    <div className="font-mono font-bold text-base leading-none" style={{ color: dateColor }}>{day}</div>
                    <div className="font-mono uppercase" style={{ fontSize: 9.5, color: "#96a19d", letterSpacing: ".05em" }}>{mon}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-[13px] whitespace-nowrap overflow-hidden text-ellipsis">{title}</div>
                    <div className="text-[11px]" style={{ color: "#96a19d" }}>{statusLabel(t.viewerStatus)}</div>
                  </div>
                  <span className={priorityBadgeClass(t.priority)}>{capitalize(t.priority)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <TaskDrawer taskId={openTaskId} onClose={() => setOpenTaskId(null)} onChanged={refresh} />
    </div>
  );
}
