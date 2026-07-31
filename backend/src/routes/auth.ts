import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { signToken } from '../utils/jwt';
import { asyncHandler } from '../utils/asyncHandler';
import { HttpError } from '../middleware/errorHandler';
import { requireAuth } from '../middleware/auth';
import { verifyViaEhr, fetchEmployeeProfile } from '../utils/ehrAuth';
import { resolveUserProfile } from '../utils/userResolver';
import { toUserSummary } from './users';

const router = Router();

const loginSchema = z.object({
  identifier: z.string().min(1), // employee ID (empno)
  password: z.string().min(1),
  remember: z.boolean().optional(),
});

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { identifier, password, remember } = loginSchema.parse(req.body);
    const empNo = identifier.trim().toUpperCase();

    // 1. Authenticate via external EHR system
    const isValid = await verifyViaEhr(empNo, password);
    if (!isValid) {
      throw new HttpError(401, 'รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง');
    }

    // 2. Lookup employee in Master Data
    let foundEmp = null;
    const gcpEmp = await prisma.masterDataGcp.findUnique({ where: { empNo } });
    if (gcpEmp) {
      foundEmp = gcpEmp;
    } else {
      const userEmp = await prisma.masterDataUser.findUnique({ where: { empNo } });
      if (userEmp) {
        foundEmp = userEmp;
      }
    }

    // 3. Auto-provision user if they do not exist in Master Data
    if (!foundEmp) {
      console.log(`[auth] Auto-provisioning employee profile from EHR for ${empNo}`);
      const profile = await fetchEmployeeProfile(empNo);
      if (profile) {
        foundEmp = await prisma.masterDataUser.create({
          data: {
            empNo,
            name: profile.name,
            email: profile.email,
            position: profile.position,
            team: profile.team,
            cobuName: profile.cobuName,
          },
        });
      }
    }

    if (!foundEmp) {
      throw new HttpError(401, 'ไม่พบข้อมูลของท่านในระบบและไม่สามารถดึงข้อมูลโปรไฟล์ได้');
    }

    // 4. Find or create user in BJC Trackline database
    let user = await prisma.tlRole.findUnique({ where: { empNo } });
    if (!user) {
      // By default, first user can be admin or we default to false
      const count = await prisma.tlRole.count();
      user = await prisma.tlRole.create({
        data: {
          empNo,
          isAdmin: count === 0, // Make the first user admin
        },
      });
    }

    // 5. Generate JWT token
    const token = signToken({ sub: user.empNo });
    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: remember ? 30 * 24 * 60 * 60 * 1000 : undefined,
    });

    // Resolve profile details for response
    const profile = await resolveUserProfile(user.empNo);
    const summary = toUserSummary(profile);

    res.json({ token, user: summary });
  }),
);

router.post('/logout', (_req, res) => {
  res.clearCookie('token');
  res.status(204).end();
});

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    // req.user is already loaded by requireAuth middleware
    const user = req.user!;
    const summary = toUserSummary({
      empNo: user.id,
      name: user.name,
      email: user.email,
      position: user.position,
      team: user.teamId,
      isAdmin: user.isAdmin,
    });
    res.json({ user: summary });
  }),
);

export default router;
