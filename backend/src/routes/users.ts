import { Router } from 'express';
import { prisma } from '../db';
import { asyncHandler } from '../utils/asyncHandler';
import { HttpError } from '../middleware/errorHandler';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { resolveUserProfile, resolveUserProfiles } from '../utils/userResolver';

export const userSummarySelect = {
  empNo: true,
  isAdmin: true,
} as const;

export function toUserSummary(dbUser: { empNo: string; isAdmin: boolean }, profile?: { name: string; email: string; position: string | null; team: string | null }) {
  const resolved = profile || {
    name: dbUser.empNo,
    email: `${dbUser.empNo.toLowerCase()}@bjc.co.th`,
    position: null,
    team: null,
  };

  return {
    id: dbUser.empNo,
    name: resolved.name,
    email: resolved.email,
    username: dbUser.empNo,
    title: resolved.position,
    admin: dbUser.isAdmin,
    team: resolved.team ? { id: resolved.team, name: resolved.team } : null,
  };
}

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const users = await prisma.user.findMany({
      select: userSummarySelect,
      orderBy: { empNo: 'asc' },
    });

    const profiles = await resolveUserProfiles(users.map(u => u.empNo));
    const summaries = users.map(u => {
      const p = profiles.get(u.empNo);
      return toUserSummary(u, p);
    });

    res.json({ users: summaries });
  }),
);

router.post(
  '/',
  requireAdmin,
  asyncHandler(async () => {
    throw new HttpError(400, 'ฟังก์ชันสร้างผู้ใช้ถูกปิดใช้งาน เนื่องจากใช้ระบบดึงข้อมูลจาก Master Data');
  }),
);

router.patch(
  '/:id',
  requireAdmin,
  asyncHandler(async () => {
    throw new HttpError(400, 'ฟังก์ชันแก้ไขสิทธิ์ผู้ใช้ถูกปิดใช้งาน เนื่องจากใช้ระบบดึงข้อมูลจาก Master Data');
  }),
);

router.patch(
  '/:id/credentials',
  requireAdmin,
  asyncHandler(async () => {
    throw new HttpError(400, 'ฟังก์ชันแก้ไขข้อมูลความปลอดภัยถูกปิดใช้งาน เนื่องจากใช้ระบบดึงข้อมูลจาก Master Data');
  }),
);

router.delete(
  '/:id',
  requireAdmin,
  asyncHandler(async () => {
    throw new HttpError(400, 'ฟังก์ชันลบผู้ใช้ถูกปิดใช้งาน เนื่องจากใช้ระบบดึงข้อมูลจาก Master Data');
  }),
);

export default router;
