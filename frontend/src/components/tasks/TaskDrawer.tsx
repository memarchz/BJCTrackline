"use client";

import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Subtask, Task } from "@/lib/types";
import { priorityBadgeClass, statusBadgeClass, statusLabel, capitalize, relativeTime } from "@/lib/format";
import {
  startTask,
  submitTask,
  approveTask,
  rejectTask,
  reworkTask,
  cancelSubmission,
  archiveTask,
  uploadAttachment,
  startSubtask,
  submitSubtask,
  approveSubtask,
  rejectSubtask,
  reworkSubtask,
  getAttachmentDownloadUrl,
} from "@/lib/task-actions";

const TIMELINE_META: Record<string, { dot: string; ring: string; badgeClass: string; text: string }> = {
  created: { dot: "#93c5fd", ring: "#dbeafe", badgeClass: "badge b-todo", text: "Created" },
  started: { dot: "#2563eb", ring: "#dbeafe", badgeClass: "badge b-progress", text: "In Progress" },
  submitted: { dot: "#2563eb", ring: "#dbeafe", badgeClass: "badge b-submitted", text: "Submitted" },
  cancelled: { dot: "#d97706", ring: "#fef3c7", badgeClass: "badge b-progress", text: "Cancelled" },
  approved: { dot: "#15803d", ring: "#dcfce7", badgeClass: "badge b-completed", text: "Approved" },
  rejected: { dot: "#b91c1c", ring: "#fee2e2", badgeClass: "badge b-rejected", text: "Rejected" },
  reworked: { dot: "#2563eb", ring: "#dbeafe", badgeClass: "badge b-progress", text: "Reworked" },
  archived: { dot: "#96a19d", ring: "#eef1f0", badgeClass: "badge b-todo", text: "Archived" },
  commented: { dot: "#93c5fd", ring: "#dbeafe", badgeClass: "badge b-todo", text: "Comment" },
};

export function TaskDrawer({
  taskId,
  onClose,
  onChanged,
}: {
  taskId: string | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { user } = useAuth();
  const [task, setTask] = useState<Task | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [subtaskRejectReason, setSubtaskRejectReason] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!taskId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- closing the drawer clears the loaded task
      setTask(null);
      return;
    }
    setError(null);
    setRejectReason("");
    setSubtaskRejectReason({});
    api
      .get(`/tasks/${taskId}`)
      .then((res) => setTask(res.data.task))
      .catch(() => setError("Couldn't load this task."));
  }, [taskId]);

  if (!taskId) return null;

  async function run(action: () => Promise<Task>) {
    setBusy(true);
    setError(null);
    try {
      const updated = await action();
      setTask(updated);
      onChanged();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (!task) {
    return (
      <div className="backdrop-anim fixed inset-0 z-40 flex justify-end" style={{ background: "rgba(15,32,26,.45)" }} onClick={onClose}>
        <div className="drawer-anim w-[460px] max-w-full h-full bg-white p-6 overflow-y-auto" style={{ boxShadow: "var(--shadow-lg)" }} onClick={(e) => e.stopPropagation()}>
          {error ? <div className="text-sm" style={{ color: "#b91c1c" }}>{error}</div> : <div className="text-sm" style={{ color: "#5c6a67" }}>Loading…</div>}
        </div>
      </div>
    );
  }

  const isAssignee = user ? task.assignees.some((a) => a.id === user.id) : false;
  const isOwner = user ? task.createdBy.id === user.id : false;
  const canReview = (user?.admin || isOwner) && task.status === "submitted";
  const canAct = isAssignee || user?.admin;
  // Starting, uploading deliverables, submitting, and archiving are the
  // assignee's own actions — admins and the task owner review and
  // approve/reject, but don't do the work or file on the assignee's behalf.
  const canWork = isAssignee;
  const canArchive = isAssignee || task.subtasks.some((s) => s.assignee?.id === user?.id);
  const hasSubtasks = task.subtasks.length > 0;

  const assignerFiles = task.attachments.filter((a) => a.uploadedBy.id === task.createdBy.id);
  const deliverables = task.attachments.filter((a) => a.uploadedBy.id !== task.createdBy.id);

  const chrono = [...task.log].reverse();

  return (
    <div className="backdrop-anim fixed inset-0 z-40 flex justify-end" style={{ background: "rgba(15,32,26,.45)" }} onClick={onClose}>
      <div className="drawer-anim w-[460px] max-w-full h-full bg-white border-l overflow-y-auto p-6" style={{ borderColor: "#e3e8e6", boxShadow: "var(--shadow-lg)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="uppercase text-[11px]" style={{ color: "#5c6a67", letterSpacing: ".08em" }}>{task.team.name}</div>
            <h3 className="mt-0.5 mb-0 text-lg font-bold">{task.title}</h3>
          </div>
          <button className="btn btn-secondary" style={{ width: 34, height: 34, padding: 0 }} onClick={onClose} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="flex gap-2 flex-wrap mb-4">
          <span className={statusBadgeClass(task.status)}>{statusLabel(task.status)}</span>
          {task.overdue && <span className="badge b-overdue">Overdue</span>}
          <span className={priorityBadgeClass(task.priority)}>Priority · {capitalize(task.priority)}</span>
          <span className={priorityBadgeClass(task.impact)}>Impact · {capitalize(task.impact)}</span>
        </div>

        {task.description && <p className="text-[13.5px] leading-relaxed mb-4">{task.description}</p>}

        <div className="grid grid-cols-2 gap-3 text-[12.5px] mb-4">
          <div>
            <div style={{ color: "#5c6a67" }}>Assignees</div>
            <div>{task.assignees.map((a) => a.name).join(", ") || "—"}</div>
          </div>
          <div>
            <div style={{ color: "#5c6a67" }}>Due</div>
            <div>{new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
          </div>
        </div>

        {error && (
          <div className="text-sm rounded-lg px-3 py-2 mb-4" style={{ background: "#fee2e2", color: "#b91c1c", border: "1px solid #fca5a5" }}>
            {error}
          </div>
        )}

        {hasSubtasks && (
          <div className="mb-4 flex flex-col gap-2.5">
            <div className="font-semibold text-[13px]">Subtasks</div>
            {task.subtasks.map((s) => (
              <SubtaskCard
                key={s.id}
                subtask={s}
                busy={busy}
                canWork={(s.assignee?.id === user?.id || isAssignee) ?? false}
                canReview={(user?.admin || isOwner) ?? false}
                reason={subtaskRejectReason[s.id] ?? ""}
                onReasonChange={(v) => setSubtaskRejectReason((prev) => ({ ...prev, [s.id]: v }))}
                onStart={() => run(() => startSubtask(task.id, s.id))}
                onSubmit={() => run(() => submitSubtask(task.id, s.id))}
                onApprove={() => run(() => approveSubtask(task.id, s.id))}
                onReject={() => run(() => rejectSubtask(task.id, s.id, (subtaskRejectReason[s.id] ?? "").trim()))}
                onRework={() => run(() => reworkSubtask(task.id, s.id))}
                onUpload={(file) => run(() => uploadAttachment(task.id, file))}
              />
            ))}
          </div>
        )}

        {!hasSubtasks && canReview && (
          <div className="card p-3.5 mb-4">
            <div className="font-semibold text-[13px] mb-2">Review submission</div>
            <textarea
              className="input w-full mb-2"
              placeholder="Reason if rejecting..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                className="btn btn-secondary flex-1"
                disabled={busy || !rejectReason.trim()}
                onClick={() => run(() => rejectTask(task.id, rejectReason.trim()))}
              >
                Reject
              </button>
              <button className="btn btn-success flex-1" disabled={busy} onClick={() => run(() => approveTask(task.id))}>
                Approve
              </button>
            </div>
          </div>
        )}

        {assignerFiles.length > 0 && (
          <div className="rounded-xl border p-4 mb-4" style={{ borderColor: "#e3e8e6", background: "#f8faf9" }}>
            <div className="font-semibold text-[13px] mb-2.5">Files from assigner</div>
            {assignerFiles.map((a) => (
              <AttachmentRow key={a.id} taskId={task.id} attachmentId={a.id} name={a.name} ts={a.uploadedAt} />
            ))}
          </div>
        )}

        {deliverables.length > 0 && (
          <div className="rounded-xl border p-4 mb-4" style={{ borderColor: "#e3e8e6", background: "#f8faf9" }}>
            <div className="font-semibold text-[13px] mb-2.5">Deliverables</div>
            {deliverables.map((a) => (
              <AttachmentRow key={a.id} taskId={task.id} attachmentId={a.id} name={a.name} ts={a.uploadedAt} />
            ))}
          </div>
        )}

        {!hasSubtasks && task.status === "todo" && canWork && (
          <div className="rounded-xl p-4 mb-4 flex items-center gap-3.5" style={{ border: "1px solid #fde68a", background: "#fffbeb" }}>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-[13px]" style={{ color: "#92400e" }}>Ready to start?</div>
              <div className="text-xs mt-0.5" style={{ color: "#a16207" }}>Review the details above, then begin work on this task.</div>
            </div>
            <button className="btn flex-none text-white" style={{ background: "#d97706" }} disabled={busy} onClick={() => run(() => startTask(task.id))}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M5 3l14 9-14 9V3z" /></svg>
              Start task
            </button>
          </div>
        )}

        {!hasSubtasks && task.status === "in_progress" && canWork && (
          <div className="rounded-xl border p-4 mb-4" style={{ borderColor: "#e3e8e6", background: "#f8faf9" }}>
            <div className="font-semibold text-[13px] mb-2.5">Submit your work</div>
            <label
              className="flex items-center justify-center gap-2 rounded-[9px] p-3.5 cursor-pointer text-[12.5px] font-semibold"
              style={{ border: "1.5px dashed #b6c3be", color: "#2563eb" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 17v3h16v-3" /></svg>
              Upload work file
              <input
                type="file"
                className="hidden"
                disabled={busy}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) run(() => uploadAttachment(task.id, file));
                  e.target.value = "";
                }}
              />
            </label>
            {deliverables.length === 0 && <div className="text-center text-[11.5px] mt-2" style={{ color: "#5c6a67" }}>No files uploaded yet.</div>}
            <button className="btn btn-primary w-full mt-3" disabled={busy} onClick={() => run(() => submitTask(task.id))}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M5 12l14-7-4 16-4-6-6-3z" /></svg>
              Submit for review
            </button>
          </div>
        )}

        {!hasSubtasks && task.status === "rejected" && (
          <div className="rounded-xl p-4 mb-4" style={{ border: "1px solid #fecaca", background: "#fef2f2" }}>
            <div className="font-semibold text-[13px] mb-1" style={{ color: "#7f1d1d" }}>Rejection note</div>
            <div className="text-[12.5px] leading-relaxed mb-3" style={{ color: "#991b1b" }}>{task.rejectReason}</div>
            {canWork && (
              <button className="btn w-full text-white" style={{ background: "#0284c7" }} disabled={busy} onClick={() => run(() => reworkTask(task.id))}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 4v4h4" /></svg>
                Rework — move to In Progress
              </button>
            )}
          </div>
        )}

        {!hasSubtasks && task.status === "submitted" && !canReview && (
          <div className="rounded-xl p-4 mb-4 flex items-center gap-3.5" style={{ border: "1px solid #fde68a", background: "#fffbeb" }}>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-[13px]" style={{ color: "#92400e" }}>Awaiting approval</div>
              <div className="text-xs mt-0.5" style={{ color: "#a16207" }}>Cancel to pull it back to In Progress.</div>
            </div>
            {canAct && (
              <button className="btn btn-secondary flex-none" style={{ borderColor: "#dc2626", color: "#b91c1c" }} disabled={busy} onClick={() => run(() => cancelSubmission(task.id))}>
                Cancel
              </button>
            )}
          </div>
        )}

        {task.status === "completed" && !task.archived && (
          <div className="rounded-xl p-4 mb-4 flex items-center gap-3.5" style={{ border: "1px solid #bbf7d0", background: "#f0fdf4" }}>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-[13px]" style={{ color: "#14532d" }}>Approved &amp; complete</div>
              <div className="text-xs mt-0.5" style={{ color: "#15803d" }}>File this away into History.</div>
            </div>
            {canArchive && (
              <button className="btn btn-success flex-none" disabled={busy} onClick={() => run(() => archiveTask(task.id))}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M3 4h18v4H3zM5 8v12h14V8" /><path d="M10 12h4" /></svg>
                Archive
              </button>
            )}
          </div>
        )}

        <div>
          <div className="font-semibold text-[13px] mb-3">History</div>
          <div className="flex flex-col">
            {chrono.map((l, i) => {
              const meta = TIMELINE_META[l.action] ?? TIMELINE_META.created;
              return (
                <div key={l.id} className="flex gap-3.5">
                  <div className="flex flex-col items-center flex-none pt-0.5">
                    <div className="w-[13px] h-[13px] rounded-full flex-none" style={{ background: meta.dot, boxShadow: `0 0 0 4px ${meta.ring}` }} />
                    {i < chrono.length - 1 && <div className="w-0.5 flex-1" style={{ minHeight: 24, background: "#e3e8e6", margin: "3px 0" }} />}
                  </div>
                  <div className="pb-4 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-semibold capitalize">{l.action}</span>
                      <span className={meta.badgeClass}>{meta.text}</span>
                    </div>
                    <div className="text-[11.5px] mt-0.5" style={{ color: "#5c6a67" }}>{l.by.name} · {relativeTime(l.ts)}</div>
                    {l.note && <div className="text-xs mt-0.5 leading-snug" style={{ color: "#3d4a47" }}>{l.note}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function SubtaskCard({
  subtask,
  busy,
  canWork,
  canReview,
  reason,
  onReasonChange,
  onStart,
  onSubmit,
  onApprove,
  onReject,
  onRework,
  onUpload,
}: {
  subtask: Subtask;
  busy: boolean;
  // The subtask's own assignee, or the overall task's assignee (a co-owner of
  // every subtask under it) — not admin, not the task owner.
  canWork: boolean;
  canReview: boolean;
  reason: string;
  onReasonChange: (v: string) => void;
  onStart: () => void;
  onSubmit: () => void;
  onApprove: () => void;
  onReject: () => void;
  onRework: () => void;
  onUpload: (file: File) => void;
}) {
  return (
    <div className="rounded-xl border p-3.5" style={{ borderColor: "#e3e8e6", background: "#f8faf9" }}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="font-semibold text-[13px] min-w-0">{subtask.title}</div>
        <span className={statusBadgeClass(subtask.status)}>{statusLabel(subtask.status)}</span>
      </div>
      {subtask.description && <div className="text-[12px] leading-relaxed mb-2" style={{ color: "#5c6a67" }}>{subtask.description}</div>}
      <div className="text-[11.5px] mb-2" style={{ color: "#8a968f" }}>{subtask.assignee?.name ?? "Unassigned"}</div>

      {subtask.status === "todo" && canWork && (
        <button className="btn btn-primary w-full" disabled={busy} onClick={onStart}>Start subtask</button>
      )}

      {subtask.status === "in_progress" && canWork && (
        <div className="flex flex-col gap-2">
          <label
            className="flex items-center justify-center gap-2 rounded-[9px] p-2.5 cursor-pointer text-[12px] font-semibold"
            style={{ border: "1.5px dashed #b6c3be", color: "#2563eb" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 17v3h16v-3" /></svg>
            Upload work file
            <input
              type="file"
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUpload(file);
                e.target.value = "";
              }}
            />
          </label>
          <button className="btn btn-primary w-full" disabled={busy} onClick={onSubmit}>Submit for review</button>
        </div>
      )}

      {subtask.status === "submitted" && canReview && (
        <div className="flex flex-col gap-2">
          <textarea className="input w-full" placeholder="Reason if rejecting..." value={reason} onChange={(e) => onReasonChange(e.target.value)} />
          <div className="flex gap-2">
            <button className="btn btn-secondary flex-1" disabled={busy || !reason.trim()} onClick={onReject}>Reject</button>
            <button className="btn btn-success flex-1" disabled={busy} onClick={onApprove}>Approve</button>
          </div>
        </div>
      )}
      {subtask.status === "submitted" && !canReview && (
        <div className="text-[11.5px] font-semibold" style={{ color: "#92400e" }}>Awaiting the task owner&apos;s review.</div>
      )}

      {subtask.status === "rejected" && (
        <div>
          <div className="text-[12px] leading-relaxed mb-2" style={{ color: "#991b1b" }}>{subtask.rejectReason}</div>
          {canWork && (
            <button className="btn w-full text-white" style={{ background: "#0284c7" }} disabled={busy} onClick={onRework}>
              Rework — move to In Progress
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function AttachmentRow({ taskId, attachmentId, name, ts }: { taskId: string; attachmentId: string; name: string; ts: string }) {
  const [loading, setLoading] = useState(false);

  async function open() {
    // Open the tab synchronously (within the click gesture) so popup blockers
    // don't intervene, then navigate it once the signed URL resolves.
    const tab = window.open("", "_blank");
    if (tab) tab.opener = null;
    setLoading(true);
    try {
      const url = await getAttachmentDownloadUrl(taskId, attachmentId);
      if (tab) tab.location.href = url;
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={open}
      disabled={loading}
      className="flex items-center gap-2.5 px-2.5 py-2 bg-white border rounded-[9px] mb-2 w-full text-left cursor-pointer"
      style={{ borderColor: "#e3e8e6" }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth={1.6}><path d="M14 3v5h5" /><path d="M6 3h8l5 5v13H6z" /></svg>
      <span className="text-[12.5px] min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{name}</span>
      <span className="font-mono ml-auto" style={{ fontSize: 10.5, color: "#96a19d" }}>{loading ? "Opening…" : relativeTime(ts)}</span>
    </button>
  );
}
