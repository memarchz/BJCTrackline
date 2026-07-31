import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { asyncHandler } from '../utils/asyncHandler';
import { HttpError } from '../middleware/errorHandler';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { userSummarySelect, toUserSummary } from './users';
import { taskInclude, serializeTask, isOverdue, computeScore, rejectionCount, type TaskWithRelations } from '../utils/serializeTask';

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const teams = await prisma.team.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { members: true, tasks: true } } },
    });
    res.json({
      teams: teams.map((t) => ({ id: t.id, name: t.name, memberCount: t._count.members, taskCount: t._count.tasks })),
    });
  }),
);

const createTeamSchema = z.object({ name: z.string().min(1) });

router.post(
  '/',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { name } = createTeamSchema.parse(req.body);
    const team = await prisma.team.create({ data: { name } });
    res.status(201).json({ team });
  }),
);

router.delete(
  '/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    await prisma.team.delete({ where: { id: req.params.id } });
    res.status(204).end();
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const team = await prisma.team.findUnique({
      where: { id: req.params.id },
      include: { members: { select: userSummarySelect, orderBy: { name: 'asc' } } },
    });
    if (!team) throw new HttpError(404, 'Team not found');
    res.json({ team: { id: team.id, name: team.name, members: team.members.map(toUserSummary) } });
  }),
);

router.get(
  '/:id/performance',
  asyncHandler(async (req, res) => {
    const teamId = req.params.id;
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { members: { select: userSummarySelect, orderBy: { name: 'asc' } } },
    });
    if (!team) throw new HttpError(404, 'Team not found');

    // Fetched without an `archived` filter so archived tasks stay available
    // for the per-member drill-down (its Completed tab folds archived work
    // back in). `activeTasks` mirrors the old archived-excluded query and
    // feeds every team-wide figure below, unchanged from before.
    const tasks = await prisma.task.findMany({
      where: { teamId },
      include: taskInclude,
    });
    const activeTasks = tasks.filter((t) => !t.archived);

    const total = activeTasks.length;
    const completed = activeTasks.filter((t) => t.status === 'completed');
    const inProgress = activeTasks.filter((t) => t.status === 'in_progress').length;
    const overdue = activeTasks.filter((t) => isOverdue(t)).length;
    const lateCount = activeTasks.filter((t) => t.late === true).length;
    const onTimeEligible = activeTasks.filter((t) => t.late !== null);
    const onTimeRate = onTimeEligible.length
      ? Math.round((onTimeEligible.filter((t) => t.late === false).length / onTimeEligible.length) * 100)
      : 0;

    const now = new Date();

    // Per-member weekly trend (on-time rate / late rate / avg score), same
    // trailing-8-week bucketing as the personal dashboard — used by the
    // admin-only charts on a member's drill-down page. Built from `tasks`
    // (archived included) so archived-completed work still counts.
    interface WorkUnit {
      dueDate: Date;
      completed: boolean;
      reviewDate: Date | null;
      late: boolean | null;
      score: number | null;
    }
    function unitsForMember(task: TaskWithRelations, memberId: string): WorkUnit[] {
      const isTaskAssignee = task.assignees.some((a) => a.userId === memberId);
      if (task.subtasks.length === 0) {
        if (!isTaskAssignee) return [];
        const isCompleted = task.status === 'completed';
        return [
          {
            dueDate: task.dueDate,
            completed: isCompleted,
            reviewDate: task.reviewDate,
            late: task.late,
            score: isCompleted
              ? computeScore({ late: task.late, priority: task.priority, impact: task.impact, rejections: rejectionCount(task.log, null) })
              : null,
          },
        ];
      }
      const relevant = isTaskAssignee ? task.subtasks : task.subtasks.filter((s) => s.assigneeId === memberId);
      return relevant.map((s) => {
        const isCompleted = s.status === 'completed';
        return {
          dueDate: s.dueDate ?? task.dueDate,
          completed: isCompleted,
          reviewDate: s.reviewDate,
          late: s.late,
          score: isCompleted
            ? computeScore({ late: s.late, priority: task.priority, impact: task.impact, rejections: rejectionCount(task.log, s.id) })
            : null,
        };
      });
    }
    function trendForMember(memberId: string): { label: string; onTimeRate: number; lateRate: number; avgScore: number }[] {
      const units = tasks.flatMap((t) => unitsForMember(t, memberId));
      const points: { label: string; onTimeRate: number; lateRate: number; avgScore: number }[] = [];
      for (let i = 7; i >= 0; i--) {
        const bucketEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
        const bucketStart = new Date(bucketEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
        const dueInBucket = units.filter((u) => u.dueDate > bucketStart && u.dueDate <= bucketEnd);
        const completedInBucket = units.filter((u) => u.completed && u.reviewDate && u.reviewDate > bucketStart && u.reviewDate <= bucketEnd);
        const onTimeInBucket = completedInBucket.filter((u) => u.late === false);
        const lateInBucket = completedInBucket.filter((u) => u.late === true);
        const bucketOnTimeRate = dueInBucket.length ? Math.round((onTimeInBucket.length / dueInBucket.length) * 1000) / 10 : 0;
        const bucketLateRate = dueInBucket.length ? Math.round((lateInBucket.length / dueInBucket.length) * 1000) / 10 : 0;
        const scored = completedInBucket.map((u) => u.score).filter((s): s is number => s != null);
        const avgScore = scored.length ? Math.round((scored.reduce((a, b) => a + b, 0) / scored.length) * 100) / 100 : 0;
        points.push({ label: i === 0 ? 'Now' : `W${7 - i + 1}`, onTimeRate: bucketOnTimeRate, lateRate: bucketLateRate, avgScore });
      }
      return points;
    }

    const memberStats = team.members.map((m) => {
      const assigned = activeTasks.filter((t) => t.assignees.some((a) => a.userId === m.id));
      const memberCompleted = assigned.filter((t) => t.status === 'completed');
      const memberLateCount = assigned.filter((t) => t.late === true).length;
      const memberOpenCount = assigned.filter((t) => t.status === 'todo' || t.status === 'in_progress').length;
      const memberOnTimeEligible = assigned.filter((t) => t.late !== null);
      const memberOnTimeRate = memberOnTimeEligible.length
        ? Math.round((memberOnTimeEligible.filter((t) => t.late === false).length / memberOnTimeEligible.length) * 100)
        : 0;
      return {
        user: toUserSummary(m),
        assignedCount: assigned.length,
        completedCount: memberCompleted.length,
        lateCount: memberLateCount,
        openCount: memberOpenCount,
        onTimeRate: memberOnTimeRate,
        completionTrend: trendForMember(m.id),
      };
    });

    const top3 = [...memberStats].sort((a, b) => b.completedCount - a.completedCount).slice(0, 3);

    // Per-week (non-cumulative) team-wide chart data — same shape and
    // definitions as the personal Dashboard's completion-rate/avg-score
    // charts, just aggregated across every unit of work belonging to this
    // team instead of one user. A whole task with no subtasks is one unit;
    // a task with subtasks contributes one unit per subtask (that's the
    // level a score exists at — see computeScore in serializeTask.ts).
    interface WorkUnit {
      dueDate: Date;
      completed: boolean;
      reviewDate: Date | null;
      late: boolean | null;
      score: number | null;
    }
    function unitsForTask(task: TaskWithRelations): WorkUnit[] {
      if (task.subtasks.length === 0) {
        const unitCompleted = task.status === 'completed';
        return [
          {
            dueDate: task.dueDate,
            completed: unitCompleted,
            reviewDate: task.reviewDate,
            late: task.late,
            score: unitCompleted
              ? computeScore({ late: task.late, priority: task.priority, impact: task.impact, rejections: rejectionCount(task.log, null) })
              : null,
          },
        ];
      }
      return task.subtasks.map((s) => {
        const unitCompleted = s.status === 'completed';
        return {
          dueDate: s.dueDate ?? task.dueDate,
          completed: unitCompleted,
          reviewDate: s.reviewDate,
          late: s.late,
          score: unitCompleted
            ? computeScore({ late: s.late, priority: task.priority, impact: task.impact, rejections: rejectionCount(task.log, s.id) })
            : null,
        };
      });
    }

    const units = tasks.flatMap(unitsForTask);
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
      const bucketOnTimeRate = dueInBucket.length ? Math.round((onTimeInBucket.length / dueInBucket.length) * 1000) / 10 : 0;
      const bucketLateRate = dueInBucket.length ? Math.round((lateInBucket.length / dueInBucket.length) * 1000) / 10 : 0;
      const scored = completedInBucket.map((u) => u.score).filter((s): s is number => s != null);
      const bucketAvgScore = scored.length ? Math.round((scored.reduce((a, b) => a + b, 0) / scored.length) * 100) / 100 : 0;
      completionTrend.push({ label: i === 0 ? 'Now' : `W${7 - i + 1}`, onTimeRate: bucketOnTimeRate, lateRate: bucketLateRate, avgScore: bucketAvgScore });
    }

    res.json({
      stats: { total, completed: completed.length, inProgress, overdue, lateCount, onTimeRate },
      completionTrend,
      top3,
      members: memberStats,
      tasks: tasks.map((t) => serializeTask(t, undefined, false)),
    });
  }),
);

export default router;
