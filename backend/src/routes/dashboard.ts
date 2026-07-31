import { Router } from 'express';
import { prisma } from '../db';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { taskInclude, serializeTask, getViewerContext, computeScore, rejectionCount, preloadProfilesForTasks } from '../utils/serializeTask';
import { toUserSummary, userSummarySelect } from './users';
import { resolveUserProfileSync, resolveUserProfiles } from '../utils/userResolver';
import type { Prisma } from '@prisma/client';

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    // Dashboard is always personal — admins see their own assigned work here
    // too, never an org-wide total. (Admins get org-wide views elsewhere, e.g.
    // the Teams pages.)
    const scopedWhere: Prisma.TaskWhereInput = {
      archived: false,
      OR: [{ assignees: { some: { userId: user.id } } }, { subtasks: { some: { assigneeId: user.id } } }],
    };

    const tasks = await prisma.task.findMany({ where: scopedWhere, include: taskInclude });
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Completed-task stats count archived tasks too — filing a completed task
    // away into History shouldn't make it stop counting as completed. Kept
    // separate from `tasks` (which excludes archived) used everywhere else.
    const completedTasksAll = await prisma.task.findMany({
      where: {
        status: 'completed',
        OR: [{ assignees: { some: { userId: user.id } } }, { subtasks: { some: { assigneeId: user.id } } }],
      },
      select: { reviewDate: true },
    });

    // Contextual to this viewer: for a subtask-only assignee, this is their
    // subtask's status/due date, not the parent task's.
    const ctx = tasks.map((t) => ({ task: t, ...getViewerContext(t, user.id) }));
    const viewerOverdue = (c: (typeof ctx)[number]) =>
      (c.status === 'todo' || c.status === 'in_progress') && c.dueDate.getTime() < now.getTime();

    const dueSoonCtx = ctx
      .filter((c) => ['todo', 'in_progress'].includes(c.status) && c.dueDate >= now && c.dueDate <= in7Days)
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    const overdueOrLate = ctx.filter((c) => viewerOverdue(c) || c.task.late === true);

    let stats: Record<string, number>;
    if (user.isAdmin) {
      stats = {
        total: tasks.length,
        inProgress: ctx.filter((c) => c.status === 'in_progress').length,
        dueSoon: dueSoonCtx.length,
        lateOverdue: overdueOrLate.length,
      };
    } else {
      const completedThisMonth = completedTasksAll.filter(
        (t) => t.reviewDate && t.reviewDate.getMonth() === now.getMonth() && t.reviewDate.getFullYear() === now.getFullYear(),
      ).length;
      stats = {
        total: tasks.length,
        dueSoon: dueSoonCtx.length,
        awaitingReview: ctx.filter((c) => c.status === 'submitted').length,
        completedThisMonth,
      };
    }

    const priorityDistribution = {
      high: tasks.filter((t) => t.priority === 'high').length,
      medium: tasks.filter((t) => t.priority === 'medium').length,
      low: tasks.filter((t) => t.priority === 'low').length,
    };

    // Per-week (non-cumulative) chart data — completion rate and average
    // score — both over 8 trailing 7-day windows labeled W1..W7, Now.
    // Bucketed at the unit-of-work level — a whole task with no subtasks, or
    // a single subtask — since that's the level a score exists at (see
    // computeScore in serializeTask.ts). Someone assigned the whole task is
    // treated as responsible for every subtask under it, not just their own;
    // a subtask-only assignee is only responsible for their own.
    interface WorkUnit {
      dueDate: Date;
      completed: boolean;
      reviewDate: Date | null;
      late: boolean | null;
      score: number | null;
    }
    type TaskForUnits = {
      dueDate: Date;
      reviewDate: Date | null;
      status: string;
      late: boolean | null;
      priority: 'low' | 'medium' | 'high';
      impact: 'low' | 'medium' | 'high';
      assignees: { userId: string }[];
      subtasks: { id: string; status: string; late: boolean | null; dueDate: Date | null; reviewDate: Date | null; assigneeId: string | null }[];
      log: { action: string; subtaskId: string | null }[];
    };
    function unitsForTask(task: TaskForUnits): WorkUnit[] {
      const isTaskAssignee = task.assignees.some((a) => a.userId === user.id);
      if (task.subtasks.length === 0) {
        if (!isTaskAssignee) return [];
        const completed = task.status === 'completed';
        return [
          {
            dueDate: task.dueDate,
            completed,
            reviewDate: task.reviewDate,
            late: task.late,
            score: completed
              ? computeScore({ late: task.late, priority: task.priority, impact: task.impact, rejections: rejectionCount(task.log, null) })
              : null,
          },
        ];
      }
      const relevant = isTaskAssignee ? task.subtasks : task.subtasks.filter((s) => s.assigneeId === user.id);
      return relevant.map((s) => {
        const completed = s.status === 'completed';
        return {
          dueDate: s.dueDate ?? task.dueDate,
          completed,
          reviewDate: s.reviewDate,
          late: s.late,
          score: completed
            ? computeScore({ late: s.late, priority: task.priority, impact: task.impact, rejections: rejectionCount(task.log, s.id) })
            : null,
        };
      });
    }

    const allMyTasks = await prisma.task.findMany({
      where: { OR: [{ assignees: { some: { userId: user.id } } }, { subtasks: { some: { assigneeId: user.id } } }] },
      select: {
        dueDate: true,
        reviewDate: true,
        status: true,
        late: true,
        priority: true,
        impact: true,
        assignees: { select: { userId: true } },
        subtasks: { select: { id: true, status: true, late: true, dueDate: true, reviewDate: true, assigneeId: true } },
        log: { select: { action: true, subtaskId: true } },
      },
    });
    const units = allMyTasks.flatMap(unitsForTask);

    // On-time rate and late rate are both against the same denominator (units
    // due that week), so the two segments stack to show the full picture —
    // but the late slice is purely visual context: it's never folded into
    // "completion rate," which only credits on-time work.
    const completionTrend: { label: string; onTimeRate: number; lateRate: number; avgScore: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const bucketEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const bucketStart = new Date(bucketEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
      const dueInBucket = units.filter((u) => u.dueDate > bucketStart && u.dueDate <= bucketEnd);
      const completedInBucket = units.filter(
        (u) => u.completed && u.reviewDate && u.reviewDate > bucketStart && u.reviewDate <= bucketEnd,
      );
      const onTimeInBucket = completedInBucket.filter((u) => u.late === false);
      const lateInBucket = completedInBucket.filter((u) => u.late === true);
      const onTimeRate = dueInBucket.length ? Math.round((onTimeInBucket.length / dueInBucket.length) * 1000) / 10 : 0;
      const lateRate = dueInBucket.length ? Math.round((lateInBucket.length / dueInBucket.length) * 1000) / 10 : 0;
      const scored = completedInBucket.map((u) => u.score).filter((s): s is number => s != null);
      const avgScore = scored.length ? Math.round((scored.reduce((a, b) => a + b, 0) / scored.length) * 100) / 100 : 0;
      completionTrend.push({ label: i === 0 ? 'Now' : `W${7 - i + 1}`, onTimeRate, lateRate, avgScore });
    }

    const recentLog = await prisma.taskLogEntry.findMany({
      where: {
        task: { OR: [{ assignees: { some: { userId: user.id } } }, { subtasks: { some: { assigneeId: user.id } } }] },
      },
      include: { task: { select: { id: true, title: true } } },
      orderBy: { ts: 'desc' },
      take: 10,
    });

    const upcomingForMe = ctx
      .filter((c) => ['todo', 'in_progress'].includes(c.status))
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
      .slice(0, 6);

    // Preload all profiles
    await preloadProfilesForTasks(tasks);
    await preloadProfilesForTasks(dueSoonCtx.map((c) => c.task));
    await preloadProfilesForTasks(upcomingForMe.map((c) => c.task));
    await resolveUserProfiles(recentLog.map((l) => l.byId));

    res.json({
      stats,
      priorityDistribution,
      completionTrend,
      dueSoon: dueSoonCtx.slice(0, 8).map((c) => serializeTask(c.task, user.id, user.isAdmin)),
      recentActivity: recentLog.map((l) => ({
        id: l.id,
        ts: l.ts,
        action: l.action,
        note: l.note,
        by: toUserSummary(resolveUserProfileSync(l.byId)),
        task: l.task,
      })),
      upcomingForMe: upcomingForMe.map((c) => serializeTask(c.task, user.id, user.isAdmin)),
    });
  }),
);

export default router;
