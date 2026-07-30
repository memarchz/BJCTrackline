import { Router } from 'express';
import { prisma } from '../db';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { ts: 'desc' },
      take: 50,
    });
    res.json({ notifications });
  }),
);

router.patch(
  '/:id/read',
  asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.user!.id },
      data: { read: true },
    });
    res.status(204).end();
  }),
);

router.post(
  '/read-all',
  asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({ where: { userId: req.user!.id, read: false }, data: { read: true } });
    res.status(204).end();
  }),
);

router.delete(
  '/',
  asyncHandler(async (req, res) => {
    await prisma.notification.deleteMany({ where: { userId: req.user!.id } });
    res.status(204).end();
  }),
);

export default router;
