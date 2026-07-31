import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import crypto from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { asyncHandler } from '../utils/asyncHandler';
import { HttpError } from '../middleware/errorHandler';
import { requireAuth } from '../middleware/auth';
import { taskInclude, serializeTask, isOverdue, getViewerContext, preloadProfilesForTasks, type TaskWithRelations } from '../utils/serializeTask';
import { resolveUserProfileSync } from '../utils/userResolver';
import { uploadAttachment, deleteAttachment, attachmentFilePath } from '../utils/fileStorage';
import { sendMail, nudgeEmailHtml } from '../utils/mailer';
import { env } from '../env';

const router = Router();
router.use(requireAuth);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const NUDGE_STATUS_LABEL: Record<string, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  submitted: 'Submitted for review',
  rejected: 'Needs rework',
  completed: 'Completed',
};

const listQuerySchema = z.object({
  assigneeId: z.string().optional(),
  createdById: z.string().optional(),
  teamId: z.string().optional(),
  status: z.string().optional(), // csv
  priority: z.string().optional(), // csv
  starred: z.coerce.boolean().optional(),
  archived: z.coerce.boolean().optional(),
  archivedAny: z.coerce.boolean().optional(),
  overdue: z.coerce.boolean().optional(),
  dueBefore: z.string().optional(),
  dueAfter: z.string().optional(),
  q: z.string().optional(),
});

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = listQuerySchema.parse(req.query);
    const user = req.user!;

    const where: Prisma.TaskWhereInput = query.archivedAny ? {} : { archived: query.archived ?? false };

    if (query.assigneeId) {
      where.OR = [{ assignees: { some: { userId: query.assigneeId } } }, { subtasks: { some: { assigneeId: query.assigneeId } } }];
    }
    if (query.createdById) where.createdById = query.createdById;
    if (query.teamId) where.team = query.teamId;
    // Status filtering always happens in JS below, not as a DB `where` clause —
    // a task with subtasks doesn't have one single "status" that means the
    // same thing to every viewer (see the two branches below).
    if (query.priority) (where as Record<string, unknown>).priority = { in: query.priority.split(',') };
    if (query.starred) where.starredBy = { some: { userId: user.id } };
    if (query.q) where.title = { contains: query.q, mode: 'insensitive' };
    if (query.dueBefore || query.dueAfter) {
      where.dueDate = {
        ...(query.dueBefore ? { lte: new Date(query.dueBefore) } : {}),
        ...(query.dueAfter ? { gte: new Date(query.dueAfter) } : {}),
      };
    }

    // Non-admins may only see tasks in their own visibility scope, regardless
    // of what filters they pass — this is intersected with the filters above.
    if (!user.isAdmin) {
      const visibility: Prisma.TaskWhereInput[] = [
        { assignees: { some: { userId: user.id } } },
        { subtasks: { some: { assigneeId: user.id } } },
        { createdById: user.id },
      ];
      if (user.teamId) visibility.push({ team: user.teamId });
      where.AND = [{ OR: visibility }];
    }

    let tasks = await prisma.task.findMany({
      where,
      include: taskInclude,
      orderBy: { dueDate: 'asc' },
    });

    await preloadProfilesForTasks(tasks);

    if (query.overdue) tasks = tasks.filter((t) => isOverdue(t));

    if (query.status) {
      const statuses = query.status.split(',');
      if (query.assigneeId) {
        // Personal views: the one status relevant to this specific viewer —
        // their own subtask's, if they're only assigned to a subtask.
        tasks = tasks.filter((t) => statuses.includes(getViewerContext(t, query.assigneeId!).status));
      } else {
        // Owner/browse views: does *any* part of this task — the parent, or
        // any subtask — sit in one of the requested statuses? A task with one
        // submitted subtask still needs the owner's review even though the
        // parent itself is still "in_progress".
        tasks = tasks.filter((t) => statuses.includes(t.status) || t.subtasks.some((s) => statuses.includes(s.status)));
      }
    }

    res.json({ tasks: tasks.map((t) => serializeTask(t, user.id, user.isAdmin)) });
  }),
);

function canViewTask(task: TaskWithRelations, user: { id: string; isAdmin: boolean; teamId: string | null }): boolean {
  if (user.isAdmin) return true;
  if (task.createdById === user.id) return true;
  if (task.assignees.some((a) => a.userId === user.id)) return true;
  if (task.subtasks.some((s) => s.assigneeId === user.id)) return true;
  if (user.teamId && task.team === user.teamId) return true;
  return false;
}

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const task = await prisma.task.findUnique({ where: { id: req.params.id }, include: taskInclude });
    if (!task) throw new HttpError(404, 'Task not found');
    if (!canViewTask(task, req.user!)) throw new HttpError(403, "You don't have access to this task");
    res.json({ task: serializeTask(task, req.user!.id, req.user!.isAdmin) });
  }),
);

const subtaskInputSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  assigneeId: z.string().optional(),
});

const createTaskSchema = z
  .object({
    title: z.string().min(1),
    description: z.string().optional(),
    teamId: z.string(),
    priority: z.enum(['low', 'medium', 'high']),
    impact: z.enum(['low', 'medium', 'high']),
    dueDate: z.string(),
    assigneeIds: z.array(z.string()).optional(),
    subtasks: z.array(subtaskInputSchema).optional(),
  })
  .refine(
    (body) => (body.assigneeIds && body.assigneeIds.length > 0) || (body.subtasks ?? []).some((s) => s.assigneeId),
    { message: 'Assign at least one person — to the task or to a subtask.', path: ['assigneeIds'] },
  );

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = createTaskSchema.parse(req.body);
    const user = req.user!;

    const task = await prisma.task.create({
      data: {
        title: body.title,
        description: body.description,
        team: body.teamId,
        priority: body.priority,
        impact: body.impact,
        dueDate: new Date(body.dueDate),
        createdById: user.id,
        assignees: { create: (body.assigneeIds ?? []).map((userId) => ({ userId })) },
        subtasks: body.subtasks
          ? { create: body.subtasks.map((s) => ({ title: s.title, description: s.description, assigneeId: s.assigneeId })) }
          : undefined,
        log: { create: { action: 'created', byId: user.id, note: 'Task created' } },
      },
      include: taskInclude,
    });

    await preloadProfilesForTasks([task]);

    for (const a of task.assignees) {
      await prisma.notification.create({
        data: { userId: a.userId, type: 'assigned', text: `You were assigned "${task.title}"` },
      });
    }
    for (const s of task.subtasks) {
      if (s.assigneeId) {
        await prisma.notification.create({
          data: { userId: s.assigneeId, type: 'assigned', text: `You were assigned a subtask on "${task.title}"` },
        });
      }
    }

    res.status(201).json({ task: serializeTask(task, user.id, user.isAdmin) });
  }),
);

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  teamId: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  impact: z.enum(['low', 'medium', 'high']).optional(),
  dueDate: z.string().optional(),
  assigneeIds: z.array(z.string()).optional(),
  subtasks: z.array(subtaskInputSchema).optional(),
});

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const body = updateTaskSchema.parse(req.body);
    const taskId = req.params.id;

    const existing = await prisma.task.findUnique({ where: { id: taskId } });
    if (!existing) throw new HttpError(404, 'Task not found');
    if (!req.user!.isAdmin && existing.createdById !== req.user!.id) {
      throw new HttpError(403, 'Only the creator or an admin can edit this task');
    }

    await prisma.$transaction(async (tx) => {
      if (body.assigneeIds) {
        await tx.taskAssignee.deleteMany({ where: { taskId } });
        await tx.taskAssignee.createMany({ data: body.assigneeIds.map((userId) => ({ taskId, userId })) });
      }
      if (body.subtasks) {
        // Upsert by id — never touch status/dates of an existing subtask here,
        // only title/description/assignee. A wholesale delete+recreate would
        // silently wipe in-flight progress every time the task is edited.
        const keepIds = body.subtasks.filter((s) => s.id).map((s) => s.id!);
        await tx.subtask.deleteMany({ where: { taskId, id: { notIn: keepIds } } });
        for (const s of body.subtasks) {
          if (s.id) {
            await tx.subtask.update({
              where: { id: s.id },
              data: { title: s.title, description: s.description, assigneeId: s.assigneeId },
            });
          } else {
            await tx.subtask.create({
              data: { taskId, title: s.title, description: s.description, assigneeId: s.assigneeId },
            });
          }
        }
      }
      await tx.task.update({
        where: { id: taskId },
        data: {
          title: body.title,
          description: body.description,
          team: body.teamId,
          priority: body.priority,
          impact: body.impact,
          dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
        },
      });
    });

    const task = await prisma.task.findUniqueOrThrow({ where: { id: taskId }, include: taskInclude });
    await preloadProfilesForTasks([task]);
    res.json({ task: serializeTask(task, req.user!.id, req.user!.isAdmin) });
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!task) throw new HttpError(404, 'Task not found');
    if (!req.user!.isAdmin && task.createdById !== req.user!.id) {
      throw new HttpError(403, 'Only the creator or an admin can delete this task');
    }
    await prisma.task.delete({ where: { id: req.params.id } });
    res.status(204).end();
  }),
);

async function requireTask(taskId: string) {
  const task = await prisma.task.findUnique({ where: { id: taskId }, include: taskInclude });
  if (!task) throw new HttpError(404, 'Task not found');
  await preloadProfilesForTasks([task]);
  return task;
}

function isAssignee(task: { assignees: { userId: string }[] }, userId: string) {
  return task.assignees.some((a) => a.userId === userId);
}

function findSubtask(task: TaskWithRelations, subtaskId: string) {
  const subtask = task.subtasks.find((s) => s.id === subtaskId);
  if (!subtask) throw new HttpError(404, 'Subtask not found');
  return subtask;
}

router.post(
  '/:id/attachments',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const task = await requireTask(req.params.id);
    const user = req.user!;
    const canUpload = isAssignee(task, user.id) || task.subtasks.some((s) => s.assigneeId === user.id);
    if (!canUpload) throw new HttpError(403, "Only an assignee can upload this task's work files");
    if (!req.file) throw new HttpError(400, 'No file uploaded');

    const key = `tasks/${task.id}/${crypto.randomUUID()}-${req.file.originalname}`;
    await uploadAttachment(key, req.file.buffer);

    await prisma.attachment.create({
      data: { taskId: task.id, name: req.file.originalname, key, uploadedById: user.id },
    });
    res.status(201).json({ task: serializeTask(await requireTask(task.id), user.id, user.isAdmin) });
  }),
);

// RFC 6266 inline disposition with a UTF-8 filename fallback — `res.download`
// always forces `Content-Disposition: attachment`, which makes the browser
// silently save the file instead of showing it in the tab window.open()
// navigated to (the whole point for an image/PDF preview).
function inlineDisposition(filename: string): string {
  const asciiFallback = filename.replace(/["\\]/g, '_').replace(/[^\x20-\x7E]/g, '_');
  return `inline; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

// Streams the file straight from disk — checked on every request (not a
// signed one-time URL), since a plain file path has no built-in expiry.
router.get(
  '/:id/attachments/:attachmentId/download',
  asyncHandler(async (req, res) => {
    const task = await requireTask(req.params.id);
    if (!canViewTask(task, req.user!)) throw new HttpError(403, "You don't have access to this task");
    const attachment = task.attachments.find((a) => a.id === req.params.attachmentId);
    if (!attachment) throw new HttpError(404, 'Attachment not found');

    res.setHeader('Content-Disposition', inlineDisposition(attachment.name));
    res.sendFile(attachmentFilePath(attachment.key), (err) => {
      if (err && !res.headersSent) res.status(404).json({ error: 'File not found on disk' });
    });
  }),
);

router.delete(
  '/:id/attachments/:attachmentId',
  asyncHandler(async (req, res) => {
    const task = await requireTask(req.params.id);
    const user = req.user!;
    const attachment = task.attachments.find((a) => a.id === req.params.attachmentId);
    if (!attachment) throw new HttpError(404, 'Attachment not found');
    if (attachment.uploadedById !== user.id && !user.isAdmin) {
      throw new HttpError(403, 'Only the uploader or an admin can remove this attachment');
    }

    await deleteAttachment(attachment.key).catch(() => undefined);
    await prisma.attachment.delete({ where: { id: attachment.id } });
    res.json({ task: serializeTask(await requireTask(task.id), user.id, user.isAdmin) });
  }),
);

router.post(
  '/:id/star',
  asyncHandler(async (req, res) => {
    await prisma.starredTask.upsert({
      where: { userId_taskId: { userId: req.user!.id, taskId: req.params.id } },
      create: { userId: req.user!.id, taskId: req.params.id },
      update: {},
    });
    res.status(204).end();
  }),
);

router.delete(
  '/:id/star',
  asyncHandler(async (req, res) => {
    await prisma.starredTask
      .delete({ where: { userId_taskId: { userId: req.user!.id, taskId: req.params.id } } })
      .catch(() => undefined);
    res.status(204).end();
  }),
);

router.post(
  '/:id/start',
  asyncHandler(async (req, res) => {
    const task = await requireTask(req.params.id);
    const user = req.user!;
    if (!isAssignee(task, user.id)) throw new HttpError(403, 'Only an assignee can start this task');
    if (task.status !== 'todo') throw new HttpError(400, 'Task is not in the todo state');

    await prisma.task.update({
      where: { id: task.id },
      data: {
        status: 'in_progress',
        log: { create: { action: 'started', byId: user.id, note: 'Marked in progress' } },
      },
    });
    res.json({ task: serializeTask(await requireTask(task.id), user.id, user.isAdmin) });
  }),
);

router.post(
  '/:id/submit',
  asyncHandler(async (req, res) => {
    const task = await requireTask(req.params.id);
    const user = req.user!;
    if (!isAssignee(task, user.id)) throw new HttpError(403, 'Only an assignee can submit this task');
    if (task.status !== 'in_progress') throw new HttpError(400, 'Task is not in progress');

    await prisma.task.update({
      where: { id: task.id },
      data: {
        status: 'submitted',
        submittedDate: new Date(),
        log: { create: { action: 'submitted', byId: user.id, note: 'Submitted for review' } },
      },
    });
    res.json({ task: serializeTask(await requireTask(task.id), user.id, user.isAdmin) });
  }),
);

router.post(
  '/:id/cancel',
  asyncHandler(async (req, res) => {
    const task = await requireTask(req.params.id);
    const user = req.user!;
    if (!isAssignee(task, user.id) && !user.isAdmin) throw new HttpError(403, 'Only an assignee can cancel this submission');
    if (task.status !== 'submitted') throw new HttpError(400, 'Task is not awaiting review');

    await prisma.task.update({
      where: { id: task.id },
      data: {
        status: 'in_progress',
        submittedDate: null,
        log: { create: { action: 'cancelled', byId: user.id, note: 'Submission cancelled — back to in progress' } },
      },
    });
    res.json({ task: serializeTask(await requireTask(task.id), user.id, user.isAdmin) });
  }),
);

const reviewSchema = z.object({ reason: z.string().optional() });

router.post(
  '/:id/approve',
  asyncHandler(async (req, res) => {
    const task = await requireTask(req.params.id);
    const user = req.user!;
    if (task.createdById !== user.id && !user.isAdmin) throw new HttpError(403, 'Only the task owner can approve this task');
    if (task.status !== 'submitted') throw new HttpError(400, 'Task is not awaiting review');

    const reviewDate = new Date();
    const late = task.submittedDate ? task.submittedDate.getTime() > task.dueDate.getTime() : false;

    await prisma.task.update({
      where: { id: task.id },
      data: {
        status: 'completed',
        reviewDate,
        late,
        log: { create: { action: 'approved', byId: user.id, note: 'Approved — nice work' } },
      },
    });
    for (const a of task.assignees) {
      await prisma.notification.create({
        data: { userId: a.userId, type: 'approved', text: `"${task.title}" was approved` },
      });
    }
    res.json({ task: serializeTask(await requireTask(task.id), user.id, user.isAdmin) });
  }),
);

router.post(
  '/:id/reject',
  asyncHandler(async (req, res) => {
    const { reason } = reviewSchema.parse(req.body);
    const task = await requireTask(req.params.id);
    const user = req.user!;
    if (task.createdById !== user.id && !user.isAdmin) throw new HttpError(403, 'Only the task owner can reject this task');
    if (task.status !== 'submitted') throw new HttpError(400, 'Task is not awaiting review');
    if (!reason) throw new HttpError(400, 'A rejection reason is required');

    await prisma.task.update({
      where: { id: task.id },
      data: {
        status: 'rejected',
        reviewDate: new Date(),
        rejectReason: reason,
        late: true,
        log: { create: { action: 'rejected', byId: user.id, note: reason } },
      },
    });
    for (const a of task.assignees) {
      await prisma.notification.create({
        data: { userId: a.userId, type: 'rejected', text: `"${task.title}" was rejected — see reviewer notes` },
      });
    }
    res.json({ task: serializeTask(await requireTask(task.id), user.id, user.isAdmin) });
  }),
);

router.post(
  '/:id/rework',
  asyncHandler(async (req, res) => {
    const task = await requireTask(req.params.id);
    const user = req.user!;
    if (!isAssignee(task, user.id)) throw new HttpError(403, 'Only an assignee can rework this task');
    if (task.status !== 'rejected') throw new HttpError(400, 'Only rejected tasks can be moved back to in progress');

    await prisma.task.update({
      where: { id: task.id },
      data: {
        status: 'in_progress',
        submittedDate: null,
        reviewDate: null,
        late: null,
        log: { create: { action: 'reworked', byId: user.id, note: 'Moved back to in progress for rework' } },
      },
    });
    res.json({ task: serializeTask(await requireTask(task.id), user.id, user.isAdmin) });
  }),
);

router.post(
  '/:id/archive',
  asyncHandler(async (req, res) => {
    const task = await requireTask(req.params.id);
    const user = req.user!;
    const isSubtaskAssignee = task.subtasks.some((s) => s.assigneeId === user.id);
    if (!isAssignee(task, user.id) && !isSubtaskAssignee) {
      throw new HttpError(403, 'Only an assignee can archive this task');
    }
    if (task.status !== 'completed') throw new HttpError(400, 'Only completed tasks can be archived');

    await prisma.task.update({
      where: { id: task.id },
      data: { archived: true, log: { create: { action: 'archived', byId: user.id, note: 'Archived' } } },
    });
    res.json({ task: serializeTask(await requireTask(task.id), user.id, user.isAdmin) });
  }),
);

router.post(
  '/:id/nudge',
  asyncHandler(async (req, res) => {
    const task = await requireTask(req.params.id);
    const user = req.user!;
    if (task.createdById !== user.id && !user.isAdmin) throw new HttpError(403, 'Only the task owner can nudge assignees');
    if (task.assignees.length === 0) throw new HttpError(400, 'This task has no assignees to nudge');

    const now = new Date();
    await prisma.taskAssignee.updateMany({ where: { taskId: task.id }, data: { nudgedAt: now } });

    const taskUrl = `${env.frontendUrl.replace(/\/$/, '')}/tasks?open=${task.id}`;
    const dueDateText = task.dueDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    const daysUntilDue = Math.round((task.dueDate.getTime() - now.getTime()) / 86400000);
    const dueRelativeText =
      daysUntilDue > 0 ? `(in ${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'})` : daysUntilDue === 0 ? '(due today)' : `(${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) === 1 ? '' : 's'} overdue)`;
    const statusLabel = NUDGE_STATUS_LABEL[task.status];

    await Promise.all(
      task.assignees.map(async (a) => {
        await prisma.notification.create({
          data: { userId: a.userId, type: 'nudged', text: `${user.name} is checking in on "${task.title}"` },
        });
        const assigneeProfile = resolveUserProfileSync(a.userId);
        await sendMail({
          to: assigneeProfile.email,
          subject: `Reminder: "${task.title}"`,
          text: `${user.name} is checking in on "${task.title}" — please take a look when you can.\n\nDue: ${dueDateText}\n\nOpen it here: ${taskUrl}`,
          html: nudgeEmailHtml({
            recipientName: assigneeProfile.name,
            actorName: user.name,
            actorTitle: user.position || null,
            taskTitle: task.title,
            teamName: task.team,
            priority: task.priority,
            dueDateText,
            dueRelativeText,
            dueSoon: daysUntilDue <= 1,
            statusLabel,
            brief: task.description?.trim() || 'No description was added for this task.',
            taskUrl,
          }),
        });
      }),
    );

    res.json({ task: serializeTask(await requireTask(task.id), user.id, user.isAdmin) });
  }),
);

router.post(
  '/:id/nudge/dismiss',
  asyncHandler(async (req, res) => {
    const task = await requireTask(req.params.id);
    const user = req.user!;
    await prisma.taskAssignee.updateMany({ where: { taskId: task.id, userId: user.id }, data: { nudgedAt: null } });
    res.json({ task: serializeTask(await requireTask(task.id), user.id, user.isAdmin) });
  }),
);

// --- Subtask lifecycle -----------------------------------------------------
// Mirrors the task-level start/submit/approve/reject/rework actions above, but
// scoped to a single subtask. start/submit/rework require either the
// subtask's own assignee OR the parent task's own assignee — someone assigned
// the whole task is treated as a co-owner of every subtask under it, not just
// a viewer. approve/reject remain exclusive to the task owner (createdBy).
function canWorkOnSubtask(task: TaskWithRelations, subtask: { assigneeId: string | null }, userId: string) {
  return subtask.assigneeId === userId || isAssignee(task, userId);
}

router.post(
  '/:id/subtasks/:subtaskId/start',
  asyncHandler(async (req, res) => {
    const task = await requireTask(req.params.id);
    const user = req.user!;
    const subtask = findSubtask(task, req.params.subtaskId);
    if (!canWorkOnSubtask(task, subtask, user.id)) throw new HttpError(403, 'Only the subtask assignee or the overall task assignee can start it');
    if (subtask.status !== 'todo') throw new HttpError(400, 'Subtask is not in the todo state');

    await prisma.$transaction([
      prisma.subtask.update({ where: { id: subtask.id }, data: { status: 'in_progress' } }),
      prisma.taskLogEntry.create({
        data: { taskId: task.id, subtaskId: subtask.id, action: 'started', byId: user.id, note: `Started subtask "${subtask.title}"` },
      }),
      ...(task.status === 'todo' ? [prisma.task.update({ where: { id: task.id }, data: { status: 'in_progress' as const } })] : []),
    ]);
    res.json({ task: serializeTask(await requireTask(task.id), user.id, user.isAdmin) });
  }),
);

router.post(
  '/:id/subtasks/:subtaskId/submit',
  asyncHandler(async (req, res) => {
    const task = await requireTask(req.params.id);
    const user = req.user!;
    const subtask = findSubtask(task, req.params.subtaskId);
    if (!canWorkOnSubtask(task, subtask, user.id)) throw new HttpError(403, 'Only the subtask assignee or the overall task assignee can submit it');
    if (subtask.status !== 'in_progress') throw new HttpError(400, 'Subtask is not in progress');

    await prisma.$transaction([
      prisma.subtask.update({ where: { id: subtask.id }, data: { status: 'submitted', submittedDate: new Date() } }),
      prisma.taskLogEntry.create({
        data: { taskId: task.id, subtaskId: subtask.id, action: 'submitted', byId: user.id, note: `Submitted subtask "${subtask.title}" for review` },
      }),
    ]);
    res.json({ task: serializeTask(await requireTask(task.id), user.id, user.isAdmin) });
  }),
);

router.post(
  '/:id/subtasks/:subtaskId/rework',
  asyncHandler(async (req, res) => {
    const task = await requireTask(req.params.id);
    const user = req.user!;
    const subtask = findSubtask(task, req.params.subtaskId);
    if (!canWorkOnSubtask(task, subtask, user.id)) throw new HttpError(403, 'Only the subtask assignee or the overall task assignee can rework it');
    if (subtask.status !== 'rejected') throw new HttpError(400, 'Only rejected subtasks can be moved back to in progress');

    await prisma.$transaction([
      prisma.subtask.update({
        where: { id: subtask.id },
        data: { status: 'in_progress', submittedDate: null, reviewDate: null, late: null },
      }),
      prisma.taskLogEntry.create({
        data: { taskId: task.id, subtaskId: subtask.id, action: 'reworked', byId: user.id, note: `Reworking subtask "${subtask.title}"` },
      }),
    ]);
    res.json({ task: serializeTask(await requireTask(task.id), user.id, user.isAdmin) });
  }),
);

router.post(
  '/:id/subtasks/:subtaskId/approve',
  asyncHandler(async (req, res) => {
    const task = await requireTask(req.params.id);
    const user = req.user!;
    const subtask = findSubtask(task, req.params.subtaskId);
    if (task.createdById !== user.id && !user.isAdmin) throw new HttpError(403, 'Only the task owner can approve a subtask');
    if (subtask.status !== 'submitted') throw new HttpError(400, 'Subtask is not awaiting review');

    const reviewDate = new Date();
    const late = subtask.submittedDate ? subtask.submittedDate.getTime() > (subtask.dueDate ?? task.dueDate).getTime() : false;

    await prisma.subtask.update({ where: { id: subtask.id }, data: { status: 'completed', reviewDate, late } });
    await prisma.taskLogEntry.create({
      data: { taskId: task.id, subtaskId: subtask.id, action: 'approved', byId: user.id, note: `Approved subtask "${subtask.title}"` },
    });
    if (subtask.assigneeId) {
      await prisma.notification.create({
        data: { userId: subtask.assigneeId, type: 'approved', text: `"${subtask.title}" was approved` },
      });
    }

    const siblings = await prisma.subtask.findMany({ where: { taskId: task.id } });
    if (siblings.length > 0 && siblings.every((s) => s.id === subtask.id || s.status === 'completed')) {
      await prisma.task.update({
        where: { id: task.id },
        data: {
          status: 'completed',
          reviewDate: new Date(),
          late: siblings.some((s) => s.late === true),
          log: { create: { action: 'approved', byId: user.id, note: 'All subtasks completed' } },
        },
      });
      for (const a of task.assignees) {
        await prisma.notification.create({
          data: { userId: a.userId, type: 'approved', text: `"${task.title}" is complete — all subtasks were approved` },
        });
      }
    }

    res.json({ task: serializeTask(await requireTask(task.id), user.id, user.isAdmin) });
  }),
);

router.post(
  '/:id/subtasks/:subtaskId/reject',
  asyncHandler(async (req, res) => {
    const { reason } = reviewSchema.parse(req.body);
    const task = await requireTask(req.params.id);
    const user = req.user!;
    const subtask = findSubtask(task, req.params.subtaskId);
    if (task.createdById !== user.id && !user.isAdmin) throw new HttpError(403, 'Only the task owner can reject a subtask');
    if (subtask.status !== 'submitted') throw new HttpError(400, 'Subtask is not awaiting review');
    if (!reason) throw new HttpError(400, 'A rejection reason is required');

    await prisma.subtask.update({
      where: { id: subtask.id },
      data: { status: 'rejected', reviewDate: new Date(), rejectReason: reason, late: true },
    });
    await prisma.taskLogEntry.create({
      data: { taskId: task.id, subtaskId: subtask.id, action: 'rejected', byId: user.id, note: reason },
    });
    if (subtask.assigneeId) {
      await prisma.notification.create({
        data: { userId: subtask.assigneeId, type: 'rejected', text: `"${subtask.title}" was rejected — see reviewer notes` },
      });
    }
    res.json({ task: serializeTask(await requireTask(task.id), user.id, user.isAdmin) });
  }),
);

const bulkIdsSchema = z.object({ ids: z.array(z.string()).min(1) });

router.post(
  '/bulk/start',
  asyncHandler(async (req, res) => {
    const { ids } = bulkIdsSchema.parse(req.body);
    const user = req.user!;
    const tasks = await prisma.task.findMany({
      where: { id: { in: ids }, status: 'todo', assignees: { some: { userId: user.id } } },
    });
    await prisma.$transaction(
      tasks.map((t) =>
        prisma.task.update({
          where: { id: t.id },
          data: { status: 'in_progress', log: { create: { action: 'started', byId: user.id, note: 'Marked in progress' } } },
        }),
      ),
    );
    res.json({ updated: tasks.length });
  }),
);

router.post(
  '/bulk/rework',
  asyncHandler(async (req, res) => {
    const { ids } = bulkIdsSchema.parse(req.body);
    const user = req.user!;
    const tasks = await prisma.task.findMany({
      where: { id: { in: ids }, status: 'rejected', assignees: { some: { userId: user.id } } },
    });
    await prisma.$transaction(
      tasks.map((t) =>
        prisma.task.update({
          where: { id: t.id },
          data: {
            status: 'in_progress',
            submittedDate: null,
            reviewDate: null,
            late: null,
            log: { create: { action: 'reworked', byId: user.id, note: 'Moved back to in progress for rework' } },
          },
        }),
      ),
    );
    res.json({ updated: tasks.length });
  }),
);

router.post(
  '/bulk/archive',
  asyncHandler(async (req, res) => {
    const { ids } = bulkIdsSchema.parse(req.body);
    const user = req.user!;
    const tasks = await prisma.task.findMany({
      where: { id: { in: ids }, status: 'completed', assignees: { some: { userId: user.id } } },
    });
    await prisma.$transaction(
      tasks.map((t) =>
        prisma.task.update({
          where: { id: t.id },
          data: { archived: true, log: { create: { action: 'archived', byId: user.id, note: 'Archived' } } },
        }),
      ),
    );
    res.json({ updated: tasks.length });
  }),
);

export default router;
