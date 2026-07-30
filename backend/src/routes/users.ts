import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../db';
import { asyncHandler } from '../utils/asyncHandler';
import { HttpError } from '../middleware/errorHandler';
import { requireAuth, requireAdmin } from '../middleware/auth';

export const userSummarySelect = {
  id: true,
  name: true,
  email: true,
  username: true,
  title: true,
  isAdmin: true,
  teamId: true,
  team: { select: { id: true, name: true } },
} as const;

type RawUser = {
  id: string;
  name: string;
  email: string;
  username: string | null;
  title: string | null;
  isAdmin: boolean;
  teamId: string | null;
  team: { id: string; name: string } | null;
};

export function toUserSummary(user: RawUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username,
    title: user.title,
    admin: user.isAdmin,
    team: user.team,
  };
}

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const unassignedOnly = req.query.unassigned === 'true';
    const users = await prisma.user.findMany({
      where: unassignedOnly ? { teamId: null } : undefined,
      select: userSummarySelect,
      orderBy: { name: 'asc' },
    });
    res.json({ users: users.map(toUserSummary) });
  }),
);

const createAccountSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  username: z.string().min(1).optional(),
  password: z.string().min(6),
  title: z.string().optional(),
  teamId: z.string().nullable().optional(),
  admin: z.boolean().optional(),
});

router.post(
  '/',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const body = createAccountSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        username: body.username,
        passwordHash,
        title: body.title,
        teamId: body.teamId ?? null,
        isAdmin: body.admin ?? false,
      },
      select: userSummarySelect,
    });
    res.status(201).json({ user: toUserSummary(user) });
  }),
);

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  title: z.string().optional(),
  teamId: z.string().nullable().optional(),
  admin: z.boolean().optional(),
});

router.patch(
  '/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const body = updateUserSchema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        name: body.name,
        title: body.title,
        teamId: body.teamId,
        isAdmin: body.admin,
      },
      select: userSummarySelect,
    });
    res.json({ user: toUserSummary(user) });
  }),
);

const updateCredentialsSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
});

router.patch(
  '/:id/credentials',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const body = updateCredentialsSchema.parse(req.body);
    if (!body.email && !body.password) throw new HttpError(400, 'Nothing to update');

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        email: body.email,
        passwordHash: body.password ? await bcrypt.hash(body.password, 10) : undefined,
      },
      select: userSummarySelect,
    });
    res.json({ user: toUserSummary(user) });
  }),
);

router.delete(
  '/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    if (req.params.id === req.user!.id) throw new HttpError(400, "You can't delete your own account");
    await prisma.user.delete({ where: { id: req.params.id } });
    res.status(204).end();
  }),
);

export default router;
