import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../db';
import { signToken } from '../utils/jwt';
import { asyncHandler } from '../utils/asyncHandler';
import { HttpError } from '../middleware/errorHandler';
import { requireAuth } from '../middleware/auth';
import { userSummarySelect, toUserSummary } from './users';

const router = Router();

const loginSchema = z.object({
  identifier: z.string().min(1), // username or email
  password: z.string().min(1),
  remember: z.boolean().optional(),
});

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { identifier, password, remember } = loginSchema.parse(req.body);

    const user = await prisma.user.findFirst({
      where: { OR: [{ email: identifier }, { username: identifier }] },
      select: { ...userSummarySelect, passwordHash: true },
    });
    if (!user) throw new HttpError(401, 'Invalid username/email or password');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new HttpError(401, 'Invalid username/email or password');

    const token = signToken({ sub: user.id });
    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: remember ? 30 * 24 * 60 * 60 * 1000 : undefined,
    });

    res.json({ token, user: toUserSummary(user) });
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
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: userSummarySelect,
    });
    if (!user) throw new HttpError(404, 'User not found');
    res.json({ user: toUserSummary(user) });
  }),
);

export default router;
