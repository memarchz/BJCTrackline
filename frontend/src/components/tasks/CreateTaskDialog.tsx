"use client";

import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Level, Task, TeamRef, UserSummary } from "@/lib/types";
import { createTask, updateTask, type SubtaskInput } from "@/lib/task-actions";
import { TaskUpdatedDialog } from "./TaskUpdatedDialog";

const LEVEL_COLOR: Record<Level, [string, string, string]> = {
  high: ["#fee2e2", "#b91c1c", "#fca5a5"],
  medium: ["#fef3c7", "#b45309", "#fcd34d"],
  low: ["#eef1f0", "#5c6a67", "#d7dedb"],
};

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function todayPlus(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

type Mode = "individual" | "group";

interface Draft {
  title: string;
  description: string;
  teamId: string;
  dueDate: string;
  priority: Level;
  impact: Level;
  assigneeIds: string[];
  subtasks: (SubtaskInput & { key: string })[];
}

let keySeq = 0;
const nextKey = () => `s${keySeq++}`;

const emptyDraft = (defaultTeamId: string | undefined, teams: TeamRef[]): Draft => ({
  title: "",
  description: "",
  teamId: defaultTeamId ?? teams[0]?.id ?? "",
  dueDate: todayPlus(7),
  priority: "medium",
  impact: "medium",
  assigneeIds: [],
  subtasks: [],
});

export function CreateTaskDialog({
  open,
  teams,
  defaultTeamId,
  editingTask,
  onClose,
  onSaved,
}: {
  open: boolean;
  teams: TeamRef[];
  defaultTeamId?: string;
  editingTask?: Task | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [mode, setMode] = useState<Mode | null>(null);
  const [subtasksEnabled, setSubtasksEnabled] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft(defaultTeamId, teams));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedInfo, setSavedInfo] = useState<{ title: string; team: string; dueDate: string; assignees: string[] } | null>(null);

  useEffect(() => {
    if (!open) return;
    api.get<{ users: UserSummary[] }>("/users").then((res) => setUsers(res.data.users));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting form state when the dialog opens/target changes
    setError(null);
    setSavedInfo(null);
    if (editingTask) {
      // Editing an already-created task is always "group" shaped — the
      // individual/group split only matters at creation time, when it decides
      // whether to fan out into several independent tasks.
      setMode("group");
      setSubtasksEnabled(editingTask.subtasks.length > 0);
      setDraft({
        title: editingTask.title,
        description: editingTask.description ?? "",
        teamId: editingTask.team.id,
        dueDate: editingTask.dueDate.slice(0, 10),
        priority: editingTask.priority,
        impact: editingTask.impact,
        assigneeIds: editingTask.assignees.map((a) => a.id),
        subtasks: editingTask.subtasks.map((s) => ({
          key: nextKey(),
          id: s.id,
          title: s.title,
          description: s.description ?? "",
          assigneeId: s.assignee?.id,
        })),
      });
    } else {
      setMode(null);
      setSubtasksEnabled(false);
      setDraft(emptyDraft(defaultTeamId, teams));
    }
  }, [open, editingTask, defaultTeamId, teams]);

  if (!open) return null;

  if (savedInfo) {
    return (
      <TaskUpdatedDialog
        title={savedInfo.title}
        team={savedInfo.team}
        dueDate={savedInfo.dueDate}
        assignees={savedInfo.assignees}
        onDone={() => {
          setSavedInfo(null);
          onSaved();
        }}
      />
    );
  }

  const teamMembers = users.filter((u) => u.team?.id === draft.teamId);
  const fixedTeam = teams.find((t) => t.id === draft.teamId);

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function toggleAssignee(id: string) {
    setDraft((d) => ({
      ...d,
      assigneeIds: d.assigneeIds.includes(id) ? d.assigneeIds.filter((x) => x !== id) : [...d.assigneeIds, id],
    }));
  }

  function addSubtask() {
    setDraft((d) => ({ ...d, subtasks: [...d.subtasks, { key: nextKey(), title: "", description: "", assigneeId: undefined }] }));
  }
  function removeSubtask(key: string) {
    setDraft((d) => ({ ...d, subtasks: d.subtasks.filter((s) => s.key !== key) }));
  }
  function updateSubtaskTitle(key: string, title: string) {
    setDraft((d) => ({ ...d, subtasks: d.subtasks.map((s) => (s.key === key ? { ...s, title } : s)) }));
  }
  function updateSubtaskDescription(key: string, description: string) {
    setDraft((d) => ({ ...d, subtasks: d.subtasks.map((s) => (s.key === key ? { ...s, description } : s)) }));
  }
  function setSubtaskAssignee(key: string, assigneeId: string) {
    setDraft((d) => ({
      ...d,
      subtasks: d.subtasks.map((s) => (s.key === key ? { ...s, assigneeId: s.assigneeId === assigneeId ? undefined : assigneeId } : s)),
    }));
  }

  function resetToModeChoice() {
    setMode(null);
    setSubtasksEnabled(false);
    setDraft(emptyDraft(defaultTeamId, teams));
    setError(null);
  }

  async function submit() {
    if (!mode) return;
    if (!draft.title.trim()) return setError("Give the task a title.");
    if (!draft.teamId) return setError("Pick a team.");

    const activeSubtasks = subtasksEnabled ? draft.subtasks.filter((s) => s.title.trim()) : [];

    if (mode === "individual" && draft.assigneeIds.length === 0) {
      return setError("Assign at least one person.");
    }
    if (mode === "group" && draft.assigneeIds.length === 0 && !activeSubtasks.some((s) => s.assigneeId)) {
      return setError("Assign at least one person — to the task, or to a subtask.");
    }

    setSaving(true);
    setError(null);
    try {
      const common = {
        title: draft.title.trim(),
        description: draft.description.trim() || undefined,
        teamId: draft.teamId,
        priority: draft.priority,
        impact: draft.impact,
        dueDate: draft.dueDate,
      };

      if (editingTask) {
        await updateTask(editingTask.id, {
          ...common,
          assigneeIds: draft.assigneeIds,
          subtasks: subtasksEnabled
            ? activeSubtasks.map((s) => ({ id: s.id, title: s.title.trim(), description: s.description?.trim() || undefined, assigneeId: s.assigneeId }))
            : [],
        });
        setSavedInfo({
          title: common.title,
          team: teams.find((t) => t.id === draft.teamId)?.name ?? "",
          dueDate: new Date(draft.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          assignees: users.filter((u) => draft.assigneeIds.includes(u.id)).map((u) => u.name),
        });
        return;
      } else if (mode === "individual") {
        // Fan out: one independent task per selected assignee, not one task
        // shared by all of them.
        await Promise.all(draft.assigneeIds.map((id) => createTask({ ...common, assigneeIds: [id] })));
      } else {
        await createTask({
          ...common,
          assigneeIds: draft.assigneeIds,
          subtasks: subtasksEnabled
            ? activeSubtasks.map((s) => ({ title: s.title.trim(), description: s.description?.trim() || undefined, assigneeId: s.assigneeId }))
            : undefined,
        });
      }
      onSaved();
    } catch (err) {
      setError(apiErrorMessage(err, "Couldn't save this task"));
    } finally {
      setSaving(false);
    }
  }

  const pills = (current: Level, field: "priority" | "impact") =>
    (["high", "medium", "low"] as const).map((k) => {
      const on = current === k;
      const [bg, fg, bd] = LEVEL_COLOR[k];
      return { level: k, label: k.charAt(0).toUpperCase() + k.slice(1), on, style: on ? { background: bg, color: fg, borderColor: bd } : {}, field };
    });

  return (
    <div className="backdrop-anim fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: "rgba(9,20,17,.5)" }} onClick={onClose}>
      <div className="dialog-anim w-[600px] max-w-full max-h-[90vh] bg-white rounded-2xl flex flex-col overflow-hidden" style={{ boxShadow: "0 30px 70px rgba(9,20,17,.35)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3.5 px-6.5 py-5.5 border-b" style={{ borderColor: "#eef1f0" }}>
          <div className="w-11 h-11 flex-none rounded-xl flex items-center justify-center text-white" style={{ background: "linear-gradient(135deg,#2563eb,#1e3a8a)" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M12 5v14M5 12h14" /></svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-lg tracking-tight">{editingTask ? "Edit task" : "Create task"}</div>
            <div className="text-[12.5px] mt-0.5" style={{ color: "#5c6a67" }}>
              {mode ? "Fill in the details, assign owners, and set subtasks." : "Choose how this task should be created."}
            </div>
          </div>
          <button onClick={onClose} className="w-[34px] h-[34px] flex-none rounded-[9px] border bg-white flex items-center justify-center cursor-pointer" style={{ borderColor: "#e3e8e6", color: "#5c6a67" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        {!mode ? (
          <div className="px-6.5 py-6 flex flex-col gap-3.5">
            {error && (
              <div className="text-sm rounded-lg px-3 py-2" style={{ background: "#fee2e2", color: "#b91c1c", border: "1px solid #fca5a5" }}>{error}</div>
            )}
            <button
              type="button"
              onClick={() => setMode("individual")}
              className="text-left rounded-2xl border p-4.5 cursor-pointer hover:-translate-y-0.5 transition-all"
              style={{ borderColor: "#d7dedb" }}
            >
              <div className="font-bold text-[14.5px] mb-1">Individual task</div>
              <div className="text-[12.5px]" style={{ color: "#5c6a67" }}>
                Pick several people and create a separate copy of this task for each of them — every assignee gets their own task.
              </div>
            </button>
            <button
              type="button"
              onClick={() => setMode("group")}
              className="text-left rounded-2xl border p-4.5 cursor-pointer hover:-translate-y-0.5 transition-all"
              style={{ borderColor: "#d7dedb" }}
            >
              <div className="font-bold text-[14.5px] mb-1">Group task</div>
              <div className="text-[12.5px]" style={{ color: "#5c6a67" }}>
                One shared task for everyone assigned — anyone submitting it finishes it for the group. Optionally split it into subtasks
                with their own individual assignees.
              </div>
            </button>
          </div>
        ) : (
          <>
            <div className="px-6.5 py-5.5 overflow-y-auto flex flex-col gap-5">
              {!editingTask && (
                <button
                  type="button"
                  onClick={resetToModeChoice}
                  className="self-start inline-flex items-center gap-1.5 bg-transparent border-none cursor-pointer text-xs font-semibold p-0"
                  style={{ color: "#2563eb" }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M15 18l-6-6 6-6" /></svg>
                  {mode === "individual" ? "Individual task" : "Group task"} — change
                </button>
              )}

              {error && (
                <div className="text-sm rounded-lg px-3 py-2" style={{ background: "#fee2e2", color: "#b91c1c", border: "1px solid #fca5a5" }}>{error}</div>
              )}

              <div>
                <div style={labelStyle}>Task title</div>
                <input className="input w-full" value={draft.title} onChange={(e) => update("title", e.target.value)} placeholder="e.g. Draft Q3 rollout plan" />
              </div>
              <div>
                <div style={labelStyle}>Description</div>
                <textarea className="input w-full" style={{ minHeight: 78, resize: "vertical" }} value={draft.description} onChange={(e) => update("description", e.target.value)} placeholder="What needs to happen?" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div style={labelStyle}>Team</div>
                  {user?.admin ? (
                    <select className="input w-full" value={draft.teamId} onChange={(e) => update("teamId", e.target.value)}>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input className="input w-full" style={{ background: "#f4f6f5", color: "#5c6a67" }} value={fixedTeam?.name ?? ""} disabled />
                  )}
                </div>
                <div>
                  <div style={labelStyle}>Due date</div>
                  <input className="input w-full" type="date" value={draft.dueDate} onChange={(e) => update("dueDate", e.target.value)} />
                </div>
                <div>
                  <div style={labelStyle}>Priority</div>
                  <div className="flex gap-1.5">
                    {pills(draft.priority, "priority").map((p) => (
                      <button key={p.level} type="button" className="flex-1 text-center rounded-[9px] border py-2 text-xs font-semibold cursor-pointer" style={{ borderColor: "#d7dedb", ...p.style }} onClick={() => update("priority", p.level)}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={labelStyle}>Impact</div>
                  <div className="flex gap-1.5">
                    {pills(draft.impact, "impact").map((p) => (
                      <button key={p.level} type="button" className="flex-1 text-center rounded-[9px] border py-2 text-xs font-semibold cursor-pointer" style={{ borderColor: "#d7dedb", ...p.style }} onClick={() => update("impact", p.level)}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <div style={labelStyle}>{mode === "individual" ? "Assign to" : subtasksEnabled ? "Assign the overall task (optional)" : "Assignees"}</div>
                <div className="flex flex-wrap gap-2">
                  {teamMembers.map((m) => {
                    const checked = draft.assigneeIds.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleAssignee(m.id)}
                        className="inline-flex items-center gap-1.5 rounded-full border cursor-pointer text-xs font-medium"
                        style={{ padding: "6px 12px 6px 6px", borderColor: checked ? "#2563eb" : "#d7dedb", background: checked ? "#eff6ff" : "#fff", color: checked ? "#1e3a8a" : "#3d4a47" }}
                      >
                        <span className="w-[22px] h-[22px] rounded-full flex items-center justify-center font-mono font-semibold" style={{ fontSize: 10, background: checked ? "#2563eb" : "#eef1f0", color: checked ? "#fff" : "#5c6a67" }}>
                          {initials(m.name)}
                        </span>
                        {m.name}
                      </button>
                    );
                  })}
                  {teamMembers.length === 0 && <div className="text-xs" style={{ color: "#8a968f" }}>No members in this team yet.</div>}
                </div>
                {mode === "individual" && draft.assigneeIds.length > 1 && (
                  <div className="text-[11.5px] mt-2" style={{ color: "#5c6a67" }}>
                    This will create {draft.assigneeIds.length} separate tasks — one per person selected.
                  </div>
                )}
              </div>

              {mode === "group" && (
                <div>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={subtasksEnabled} onChange={(e) => setSubtasksEnabled(e.target.checked)} />
                    <span className="text-[13px] font-semibold">Break into subtasks</span>
                  </label>
                  <div className="text-[11.5px] mt-1" style={{ color: "#5c6a67" }}>
                    Each subtask gets its own assignee, description, and status. Someone assigned only to a subtask sees this task&apos;s
                    details plus just their own subtask.
                  </div>
                </div>
              )}

              {mode === "group" && subtasksEnabled && (
                <div>
                  <div style={labelStyle}>Subtasks</div>
                  <div className="flex flex-col gap-2">
                    {draft.subtasks.map((s) => (
                      <div key={s.key} className="flex flex-col gap-1.5 border rounded-[11px] p-2.5" style={{ borderColor: "#eef1f0" }}>
                        <div className="flex gap-2">
                          <input className="input flex-1" value={s.title} onChange={(e) => updateSubtaskTitle(s.key, e.target.value)} placeholder="Subtask title" />
                          <button type="button" onClick={() => removeSubtask(s.key)} className="flex-none w-[38px] rounded-[10px] border flex items-center justify-center cursor-pointer" style={{ borderColor: "#e3e8e6", color: "#8a968f" }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M6 6l12 12M18 6L6 18" /></svg>
                          </button>
                        </div>
                        <textarea
                          className="input w-full"
                          style={{ minHeight: 52, resize: "vertical" }}
                          value={s.description ?? ""}
                          onChange={(e) => updateSubtaskDescription(s.key, e.target.value)}
                          placeholder="Subtask description (optional)"
                        />
                        <div className="flex flex-wrap gap-1.5">
                          {teamMembers.map((m) => {
                            const checked = s.assigneeId === m.id;
                            return (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => setSubtaskAssignee(s.key, m.id)}
                                className="inline-flex items-center gap-1.5 rounded-full border cursor-pointer text-xs font-medium"
                                style={{ padding: "5px 10px 5px 5px", borderColor: checked ? "#2563eb" : "#d7dedb", background: checked ? "#eff6ff" : "#fff", color: checked ? "#1e3a8a" : "#3d4a47" }}
                              >
                                <span className="w-[20px] h-[20px] rounded-full flex items-center justify-center font-mono font-semibold" style={{ fontSize: 9.5, background: checked ? "#2563eb" : "#eef1f0", color: checked ? "#fff" : "#5c6a67" }}>
                                  {initials(m.name)}
                                </span>
                                {m.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    <button type="button" onClick={addSubtask} className="self-start rounded-[9px] px-3.5 py-2 text-xs font-semibold cursor-pointer" style={{ border: "1px dashed #b6c3be", background: "#f8faf9", color: "#3d4a47" }}>
                      + Add subtask
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2.5 px-6.5 py-4.5 border-t" style={{ borderColor: "#eef1f0", background: "#fbfcfc" }}>
              <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" disabled={saving} onClick={submit}>
                {saving ? "Saving…" : editingTask ? "Save changes" : "Create task"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Matches the plain sans-serif label style used everywhere else in the app
// (Login, TOR create dialog, etc.) — not the prototype's monospace .ct-label,
// which read as an out-of-place "coding font" next to the rest of the UI.
const labelStyle: React.CSSProperties = {
  fontSize: 12.5,
  fontWeight: 600,
  color: "#5c6a67",
  marginBottom: 6,
};
