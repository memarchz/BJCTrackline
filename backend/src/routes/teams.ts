import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { asyncHandler } from '../utils/asyncHandler';
import { HttpError } from '../middleware/errorHandler';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { toUserSummary } from './users';
import { resolveAllTeams, resolveUserProfiles, UserProfile } from '../utils/userResolver';
import { taskInclude, serializeTask, isOverdue, computeScore, rejectionCount, preloadProfilesForTasks, type TaskWithRelations } from '../utils/serializeTask';

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    // 1. Get all distinct team names from Master Data
    const teamNames = await resolveAllTeams();

    // 2. Count active, completed, late, and review tasks per team
    const totalCounts = await prisma.task.groupBy({
      by: ['team'],
      _count: { _all: true },
      where: { archived: false },
    });
    const totalMap = new Map(totalCounts.map((c) => [c.team, c._count._all]));

    const completedCounts = await prisma.task.groupBy({
      by: ['team'],
      _count: { _all: true },
      where: { archived: false, status: 'completed' },
    });
    const completedMap = new Map(completedCounts.map((c) => [c.team, c._count._all]));

    const lateCounts = await prisma.task.groupBy({
      by: ['team'],
      _count: { _all: true },
      where: { archived: false, late: true },
    });
    const lateMap = new Map(lateCounts.map((c) => [c.team, c._count._all]));

    const reviewCounts = await prisma.task.groupBy({
      by: ['team'],
      _count: { _all: true },
      where: { archived: false, status: 'submitted' },
    });
    const reviewMap = new Map(reviewCounts.map((c) => [c.team, c._count._all]));

    // 3. Count members per team from Master Data
    const gcpCounts = await prisma.masterDataGcp.groupBy({
      by: ['team'],
      _count: { _all: true },
      where: { NOT: { team: null } },
    });
    const userCounts = await prisma.masterDataUser.groupBy({
      by: ['team'],
      _count: { _all: true },
      where: { NOT: { team: null } },
    });

    const memberCountMap = new Map<string, number>();
    gcpCounts.forEach((c) => c.team && memberCountMap.set(c.team, c._count._all));
    userCounts.forEach((c) => {
      if (c.team) {
        const existing = memberCountMap.get(c.team) || 0;
        memberCountMap.set(c.team, existing + c._count._all);
      }
    });

    const teams = teamNames.map((name) => ({
      id: name,
      name: name,
      memberCount: memberCountMap.get(name) || 0,
      taskCount: totalMap.get(name) || 0,
      completedCount: completedMap.get(name) || 0,
      lateCount: lateMap.get(name) || 0,
      reviewCount: reviewMap.get(name) || 0,
    }));

    // Sort by task count descending
    teams.sort((a, b) => b.taskCount - a.taskCount);

    res.json({ teams });
  }),
);

router.post(
  '/',
  requireAdmin,
  asyncHandler(async () => {
    throw new HttpError(400, 'ฟังก์ชันสร้างทีมถูกปิดใช้งาน เนื่องจากใช้ระบบแผนกจาก Master Data');
  }),
);

router.delete(
  '/:id',
  requireAdmin,
  asyncHandler(async () => {
    throw new HttpError(400, 'ฟังก์ชันลบทีมถูกปิดใช้งาน เนื่องจากใช้ระบบแผนกจาก Master Data');
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const teamId = req.params.id; // Team ID is the team name string

    const gcps = await prisma.masterDataGcp.findMany({ where: { team: teamId }, orderBy: { name: 'asc' } });
    const users = await prisma.masterDataUser.findMany({ where: { team: teamId }, orderBy: { name: 'asc' } });
    const allMembers = [...gcps, ...users];

    const tracklineUsers = await prisma.user.findMany({
      where: { empNo: { in: allMembers.map((m) => m.empNo) } },
      select: { empNo: true, isAdmin: true },
    });
    const adminMap = new Map(tracklineUsers.map((u) => [u.empNo, u.isAdmin]));

    const members = allMembers.map((m) =>
      toUserSummary(
        { empNo: m.empNo, isAdmin: adminMap.get(m.empNo) || false },
        {
          name: m.name || m.empNo,
          email: m.email || '',
          position: m.position,
          team: m.team,
        },
      ),
    );

    res.json({ team: { id: teamId, name: teamId, members } });
  }),
);

router.get(
  '/:id/performance',
  asyncHandler(async (req, res) => {
    const teamId = req.params.id; // Team ID is the team name string

    // Fetch team members from Master Data
    const gcps = await prisma.masterDataGcp.findMany({ where: { team: teamId }, orderBy: { name: 'asc' } });
    const users = await prisma.masterDataUser.findMany({ where: { team: teamId }, orderBy: { name: 'asc' } });
    const allMembers = [...gcps, ...users];

    const tracklineUsers = await prisma.user.findMany({
      where: { empNo: { in: allMembers.map((m) => m.empNo) } },
      select: { empNo: true, isAdmin: true },
    });
    const adminMap = new Map(tracklineUsers.map((u) => [u.empNo, u.isAdmin]));
    
    const members = allMembers.map((m) => ({
      empNo: m.empNo,
      isAdmin: adminMap.get(m.empNo) || false,
      name: m.name || m.empNo,
      email: m.email || '',
      position: m.position,
      team: m.team,
    }));

    const tasks = await prisma.task.findMany({
      where: { team: teamId },
      include: taskInclude,
    });

    await preloadProfilesForTasks(tasks);

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

    const memberStats = members.map((m) => {
      const assigned = activeTasks.filter((t) => t.assignees.some((a) => a.userId === m.empNo));
      const memberCompleted = assigned.filter((t) => t.status === 'completed');
      const memberLateCount = assigned.filter((t) => t.late === true).length;
      const memberOpenCount = assigned.filter((t) => t.status === 'todo' || t.status === 'in_progress').length;
      const memberOnTimeEligible = assigned.filter((t) => t.late !== null);
      const memberOnTimeRate = memberOnTimeEligible.length
        ? Math.round((memberOnTimeEligible.filter((t) => t.late === false).length / memberOnTimeEligible.length) * 100)
        : 0;

      return {
        user: toUserSummary(
          { empNo: m.empNo, isAdmin: m.isAdmin },
          { name: m.name, email: m.email, position: m.position, team: m.team },
        ),
        assignedCount: assigned.length,
        completedCount: memberCompleted.length,
        lateCount: memberLateCount,
        openCount: memberOpenCount,
        onTimeRate: memberOnTimeRate,
        completionTrend: trendForMember(m.empNo),
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
      tasks: tasks.map((t) => serializeTask(t, req.user!.id, req.user!.isAdmin)),
    });
  }),
);

export default router;
