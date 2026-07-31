import type { Level, Prisma, TaskStatus } from '@prisma/client';
import { toUserSummary, userSummarySelect } from '../routes/users';
import { resolveUserProfileSync, resolveUserProfiles, UserProfile } from './userResolver';

export const taskInclude = {
  assignees: true,
  subtasks: true,
  attachments: { orderBy: { uploadedAt: 'asc' as const } },
  log: { orderBy: { ts: 'asc' as const } },
  starredBy: { select: { userId: true } },
} satisfies Prisma.TaskInclude;

export type TaskWithRelations = Prisma.TaskGetPayload<{ include: typeof taskInclude }>;
type SubtaskWithRelations = TaskWithRelations['subtasks'][number];

export function isOverdue(task: Pick<TaskWithRelations, 'status' | 'dueDate'>): boolean {
  if (task.status === 'todo' || task.status === 'in_progress') return task.dueDate.getTime() < Date.now();
  return false;
}

// Least-advanced-first: if someone is assigned to more than one subtask of the
// same task, the one needing their attention soonest wins the tie-break.
const STATUS_RANK: Record<TaskStatus, number> = { todo: 0, in_progress: 1, rejected: 2, submitted: 3, completed: 4 };

function isParentAssignee(task: TaskWithRelations, viewerId?: string): boolean {
  return !!viewerId && task.assignees.some((a) => a.userId === viewerId);
}

function viewerSubtask(task: TaskWithRelations, viewerId?: string): SubtaskWithRelations | undefined {
  if (!viewerId) return undefined;
  const mine = task.subtasks.filter((s) => s.assigneeId === viewerId);
  if (mine.length === 0) return undefined;
  return mine.sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status])[0];
}

export function canSeeAllSubtasks(task: TaskWithRelations, viewerId?: string, viewerIsAdmin?: boolean): boolean {
  return !!viewerIsAdmin || task.createdById === viewerId || isParentAssignee(task, viewerId);
}

// Task score (0-10, 2 decimals): on-time-ness weighs heaviest (40%), priority
// and impact 20% each, and rejection count 20% — each rejection costs 2.5 of
// the 10 rejection-component points. Only meaningful once a unit of work
// (a whole task with no subtasks, or a single subtask) is completed.
const LEVEL_SCORE: Record<Level, number> = { low: 10 / 3, medium: 20 / 3, high: 10 };

export function rejectionCount(log: { action: string; subtaskId: string | null }[], subtaskId: string | null): number {
  return log.filter((l) => l.action === 'rejected' && l.subtaskId === subtaskId).length;
}

export function computeScore(opts: { late: boolean | null; priority: Level; impact: Level; rejections: number }): number {
  const onTimeScore = opts.late ? 0 : 10;
  const priorityScore = LEVEL_SCORE[opts.priority];
  const impactScore = LEVEL_SCORE[opts.impact];
  const rejectionScore = Math.max(0, 10 - opts.rejections * 2.5);
  const raw = onTimeScore * 0.4 + priorityScore * 0.2 + impactScore * 0.2 + rejectionScore * 0.2;
  return Math.round(raw * 100) / 100;
}

// The status/due-date relevant to a specific viewer: their own subtask's, if
// they're only assigned to a subtask (not the parent); the parent task's
// otherwise. Used both for serialization and for status-filtering task lists.
export function getViewerContext(task: TaskWithRelations, viewerId?: string) {
  const onlySubtask = !isParentAssignee(task, viewerId) ? viewerSubtask(task, viewerId) : undefined;
  return {
    status: (onlySubtask ? onlySubtask.status : task.status) as TaskStatus,
    dueDate: onlySubtask ? (onlySubtask.dueDate ?? task.dueDate) : task.dueDate,
    subtaskId: onlySubtask?.id ?? null,
    subtaskTitle: onlySubtask?.title ?? null,
  };
}

export function serializeTask(task: TaskWithRelations, viewerId?: string, viewerIsAdmin?: boolean) {
  const visibleSubtasks = canSeeAllSubtasks(task, viewerId, viewerIsAdmin)
    ? task.subtasks
    : task.subtasks.filter((s) => s.assigneeId === viewerId);

  const viewerCtx = getViewerContext(task, viewerId);
  const viewerAssignee = viewerId ? task.assignees.find((a) => a.userId === viewerId) : undefined;

  // A task with subtasks carries no score of its own — scoring lives on each
  // subtask instead, since that's the actual unit of completed work.
  const taskScore =
    task.subtasks.length === 0 && task.status === 'completed'
      ? computeScore({ late: task.late, priority: task.priority, impact: task.impact, rejections: rejectionCount(task.log, null) })
      : null;

  return {
    id: task.id,
    title: task.title,
    description: task.description,
    priority: task.priority,
    impact: task.impact,
    status: task.status,
    archived: task.archived,
    late: task.late,
    overdue: isOverdue(task),
    team: { id: task.team, name: task.team },
    createdBy: toUserSummary(resolveUserProfileSync(task.createdById)),
    assignees: task.assignees.map((a) => toUserSummary(resolveUserProfileSync(a.userId))),
    dueDate: task.dueDate,
    createdDate: task.createdDate,
    submittedDate: task.submittedDate,
    reviewDate: task.reviewDate,
    rejectReason: task.rejectReason,
    score: taskScore,
    // Contextual to the viewer: for someone who is only assigned to a subtask
    // (not the parent task), these reflect that subtask instead of the parent task —
    // that's what drives correct bucketing in Current Tasks / Pending Review /
    // Dashboard for subtask-only assignees.
    viewerStatus: viewerCtx.status,
    viewerDueDate: viewerCtx.dueDate,
    viewerSubtaskId: viewerCtx.subtaskId,
    viewerSubtaskTitle: viewerCtx.subtaskTitle,
    // Set only when the viewer is a direct (parent) assignee who's been
    // nudged and hasn't dismissed it yet.
    viewerNudgedAt: viewerAssignee?.nudgedAt ?? null,
    subtasks: visibleSubtasks.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      status: s.status,
      late: s.late,
      dueDate: s.dueDate ?? task.dueDate,
      submittedDate: s.submittedDate,
      reviewDate: s.reviewDate,
      rejectReason: s.rejectReason,
      assignee: s.assigneeId ? toUserSummary(resolveUserProfileSync(s.assigneeId)) : null,
      score:
        s.status === 'completed'
          ? computeScore({ late: s.late, priority: task.priority, impact: task.impact, rejections: rejectionCount(task.log, s.id) })
          : null,
    })),
    // no url here — the R2 bucket is private; the client fetches a short-lived
    // signed download URL on demand via GET /:id/attachments/:attachmentId/download-url
    attachments: task.attachments.map((a) => ({
      id: a.id,
      name: a.name,
      uploadedAt: a.uploadedAt,
      uploadedBy: toUserSummary(resolveUserProfileSync(a.uploadedById)),
    })),
    log: task.log.map((l) => ({ id: l.id, ts: l.ts, action: l.action, note: l.note, by: toUserSummary(resolveUserProfileSync(l.byId)) })),
    starred: viewerId ? task.starredBy.some((s) => s.userId === viewerId) : false,
  };
}

export async function preloadProfilesForTasks(tasks: TaskWithRelations[]) {
  const userIds = new Set<string>();
  for (const t of tasks) {
    userIds.add(t.createdById);
    for (const a of t.assignees) userIds.add(a.userId);
    for (const s of t.subtasks) if (s.assigneeId) userIds.add(s.assigneeId);
    for (const at of t.attachments) userIds.add(at.uploadedById);
    for (const l of t.log) userIds.add(l.byId);
  }
  await resolveUserProfiles(Array.from(userIds));
}
