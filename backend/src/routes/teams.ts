import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { asyncHandler } from '../utils/asyncHandler';
import { HttpError } from '../middleware/errorHandler';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { userSummarySelect, toUserSummary } from './users';
import { taskInclude, serializeTask, isOverdue } from '../utils/serializeTask';

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

    const tasks = await prisma.task.findMany({
      where: { teamId, archived: false },
      include: taskInclude,
    });

    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'completed');
    const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
    const overdue = tasks.filter((t) => isOverdue(t)).length;
    const lateCount = tasks.filter((t) => t.late === true).length;
    const onTimeEligible = tasks.filter((t) => t.late !== null);
    const onTimeRate = onTimeEligible.length
      ? Math.round((onTimeEligible.filter((t) => t.late === false).length / onTimeEligible.length) * 100)
      : 0;

    // Matches the prototype exactly: a *cumulative* completed-count as of
    // each trailing week-ending date (not a per-period bucket), labeled
    // W1..W7, Now.
    const now = new Date();
    const trend: { label: string; completed: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const count = completed.filter((t) => (t.reviewDate ?? t.updatedAt) <= weekEnd).length;
      trend.push({ label: i === 0 ? 'Now' : `W${7 - i + 1}`, completed: count });
    }

    const memberStats = team.members.map((m) => {
      const assigned = tasks.filter((t) => t.assignees.some((a) => a.userId === m.id));
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
      };
    });

    const top3 = [...memberStats].sort((a, b) => b.completedCount - a.completedCount).slice(0, 3);

    res.json({
      stats: { total, completed: completed.length, inProgress, overdue, lateCount, onTimeRate },
      trend,
      top3,
      members: memberStats,
      tasks: tasks.map((t) => serializeTask(t, undefined, false)),
    });
  }),
);

export default router;
