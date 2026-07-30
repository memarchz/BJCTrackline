"use client";

import { Fragment, Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useTaskList } from "@/lib/use-task-list";
import { TaskDrawer } from "@/components/tasks/TaskDrawer";
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";
import type { TeamRef } from "@/lib/types";
import { dueText, priorityBadgeClass, statusBadgeClass, statusLabel, capitalize } from "@/lib/format";

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "todo", label: "To do" },
  { value: "in_progress", label: "In Progress" },
  { value: "submitted", label: "Submitted" },
  { value: "rejected", label: "Rejected" },
  { value: "completed", label: "Completed" },
];

function TasksInner() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("all");
  const [teamId, setTeamId] = useState("all");
  const [scope, setScope] = useState<"mine" | "team">("mine");
  const [priority, setPriority] = useState("all");
  const [teams, setTeams] = useState<TeamRef[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(searchParams.get("open"));
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    api.get<{ teams: TeamRef[] }>("/teams").then((res) => setTeams(res.data.teams));
  }, []);

  const params: Record<string, string | boolean | undefined> = {
    archivedAny: true,
    status: status === "all" ? undefined : status,
    priority: priority === "all" ? undefined : priority,
    q: searchParams.get("q") ?? undefined,
  };
  if (user?.admin) {
    if (teamId !== "all") params.teamId = teamId;
  } else if (scope === "mine") {
    params.assigneeId = user?.id;
  } else {
    params.teamId = user?.team?.id;
  }

  const { tasks, refresh } = useTaskList(params);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-4 max-w-[1280px]">
      <div className="flex items-center gap-1.5 border-b" style={{ borderColor: "#e3e8e6" }}>
        {STATUS_TABS.map((tab) => (
          <button key={tab.value} className={`tab-btn ${status === tab.value ? "active" : ""}`} onClick={() => setStatus(tab.value)}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {user?.admin ? (
          <select className="input" style={{ width: "auto", minWidth: 150 }} value={teamId} onChange={(e) => setTeamId(e.target.value)}>
            <option value="all">All teams</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        ) : (
          <div className="seg">
            <label className="seg-opt"><input type="radio" name="scope" checked={scope === "mine"} onChange={() => setScope("mine")} /> My tasks</label>
            <label className="seg-opt"><input type="radio" name="scope" checked={scope === "team"} onChange={() => setScope("team")} /> Team</label>
          </div>
        )}
        <select className="input" style={{ width: "auto", minWidth: 150 }} value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="all">All priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <div className="text-[12.5px] ml-auto" style={{ color: "#5c6a67" }}>
          {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
        </div>
        {user?.admin && (
          <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>+ New task</button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="table w-full text-left" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th className="pb-2" style={{ width: "34%" }}>Task</th>
              <th className="pb-2">Team</th>
              <th className="pb-2">Assignees</th>
              <th className="pb-2">Priority</th>
              <th className="pb-2">Impact</th>
              <th className="pb-2">Status</th>
              <th className="pb-2">Due</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => {
              const names = t.assignees.map((a) => a.name);
              const isExpanded = expanded.has(t.id);
              return (
                <Fragment key={t.id}>
                  <tr className="cursor-pointer" onClick={() => setOpenId(t.id)}>
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        {t.subtasks.length > 0 && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpand(t.id);
                            }}
                            style={{ display: "inline-flex", transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform .15s" }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 6l6 6-6 6" /></svg>
                          </span>
                        )}
                        <div>
                          <div className="font-semibold text-[13.5px]">{t.title}</div>
                          {t.subtasks.length > 0 && (
                            <div className="text-[11px]" style={{ color: "#8a968f" }}>{t.subtasks.filter((s) => s.status === "completed").length}/{t.subtasks.length} subtasks</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="text-[13px]">{t.team.name}</td>
                    <td className="text-[13px]">{names[0] ?? "—"}{names.length > 1 && ` +${names.length - 1}`}</td>
                    <td><span className={priorityBadgeClass(t.priority)}>{capitalize(t.priority)}</span></td>
                    <td><span className={priorityBadgeClass(t.impact)}>{capitalize(t.impact)}</span></td>
                    <td>
                      <div className="flex gap-1.5 items-center flex-wrap">
                        <span className={statusBadgeClass(t.status)}>{statusLabel(t.status)}</span>
                        {t.overdue && <span className="badge b-overdue">Overdue</span>}
                      </div>
                    </td>
                    <td className="text-[12.5px]" style={{ color: "#5c6a67" }}>{dueText(t.dueDate)}</td>
                  </tr>
                  {isExpanded && t.subtasks.length > 0 && (
                    <tr>
                      <td colSpan={7} style={{ background: "rgba(15,32,26,.03)", padding: 0 }}>
                        <div className="flex flex-col gap-1.5" style={{ padding: "8px 16px 12px 40px" }}>
                          {t.subtasks.map((sub) => (
                            <div key={sub.id} className="flex items-center gap-2.5 text-[12.5px]">
                              <input type="checkbox" checked={sub.status === "completed"} readOnly />
                              <span style={sub.status === "completed" ? { textDecoration: "line-through", opacity: 0.6 } : undefined}>{sub.title}</span>
                              <span className="ml-auto" style={{ color: "#5c6a67" }}>{sub.assignee?.name ?? ""}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
        {tasks.length === 0 && <div className="text-center text-[13px] py-8" style={{ color: "#8a968f" }}>No tasks match these filters.</div>}
      </div>

      <TaskDrawer taskId={openId} onClose={() => setOpenId(null)} onChanged={refresh} />
      <CreateTaskDialog
        open={createOpen}
        teams={teams}
        defaultTeamId={teamId !== "all" ? teamId : undefined}
        onClose={() => setCreateOpen(false)}
        onSaved={() => {
          setCreateOpen(false);
          refresh();
        }}
      />
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={null}>
      <TasksInner />
    </Suspense>
  );
}
