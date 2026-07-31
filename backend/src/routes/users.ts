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

export function toUserSummary(profile: { empNo: string; name: string; email: string; position: string | null; team: string | null; isAdmin: boolean }) {
  return {
    id: profile.empNo,
    name: profile.name,
    email: profile.email,
    username: profile.empNo,
    title: profile.position,
    admin: profile.isAdmin,
    team: profile.team ? { id: profile.team, name: profile.team } : null,
  };
}

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const gcps = await prisma.masterDataGcp.findMany({ orderBy: { empNo: 'asc' } });
    const users = await prisma.masterDataUser.findMany({ orderBy: { empNo: 'asc' } });
    const allMembers = [...gcps, ...users];

    const tracklineUsers = await prisma.tlRole.findMany({
      select: { empNo: true, isAdmin: true },
    });
    const adminMap = new Map(tracklineUsers.map((u) => [u.empNo.toUpperCase(), u.isAdmin]));

    const summaries = allMembers.map((m) => {
      const empNoUpper = m.empNo.toUpperCase();
      return toUserSummary({
        empNo: m.empNo,
        name: m.name || m.empNo,
        email: m.email || '',
        position: m.position,
        team: m.team,
        isAdmin: adminMap.get(empNoUpper) || false,
      });
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
