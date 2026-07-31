import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { asyncHandler } from '../utils/asyncHandler';
import { HttpError } from '../middleware/errorHandler';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { toUserSummary, userSummarySelect } from './users';
import { resolveUserProfileSync, resolveUserProfiles } from '../utils/userResolver';

const router = Router();
router.use(requireAuth);

function serializeTor(t: {
  id: string;
  project: string;
  code: string;
  dept: string;
  amount: unknown;
  openedDate: Date;
  status: string;
  step: number;
  comment: string | null;
  rejected: boolean;
  requesterId: string;
  reviewerId: string | null;
}) {
  return {
    id: t.id,
    project: t.project,
    code: t.code,
    dept: t.dept,
    amount: t.amount?.toString(),
    openedDate: t.openedDate,
    status: t.status,
    step: t.step,
    comment: t.comment,
    rejected: t.rejected,
    requester: toUserSummary(resolveUserProfileSync(t.requesterId)),
    reviewer: t.reviewerId ? toUserSummary(resolveUserProfileSync(t.reviewerId)) : null,
  };
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const requests = await prisma.torRequest.findMany({ orderBy: { openedDate: 'desc' } });
    
    // Preload requester and reviewer profiles
    const userIds = new Set<string>();
    requests.forEach((r) => {
      userIds.add(r.requesterId);
      if (r.reviewerId) userIds.add(r.reviewerId);
    });
    await resolveUserProfiles(Array.from(userIds));

    res.json({ requests: requests.map(serializeTor) });
  }),
);

const createTorSchema = z.object({
  project: z.string().min(1),
  code: z.string().min(1),
  dept: z.string().min(1),
  amount: z.number().positive(),
  openedDate: z.string(),
});

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = createTorSchema.parse(req.body);
    const request = await prisma.torRequest.create({
      data: {
        project: body.project,
        code: body.code,
        dept: body.dept,
        amount: body.amount,
        openedDate: new Date(body.openedDate),
        status: 'pending_chief_approval',
        step: 0,
        requesterId: req.user!.id,
      },
    });

    await resolveUserProfiles([request.requesterId]);

    res.status(201).json({ request: serializeTor(request) });
  }),
);

const reviewTorSchema = z.object({
  action: z.enum(['advance', 'reject']),
  comment: z.string().optional(),
});

// index = step (0..6): 0 pending chief approval, 1 TOR, 2 Bidding, 3 PTA, 4 PR, 5 PO, 6 Completed
const STEP_STATUS = ['pending_chief_approval', 'tor', 'bidding', 'pta', 'pr', 'po', 'completed'] as const;

router.patch(
  '/:id/review',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const body = reviewTorSchema.parse(req.body);
    const existing = await prisma.torRequest.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new HttpError(404, 'TOR request not found');

    if (body.action === 'reject') {
      if (!body.comment?.trim()) throw new HttpError(400, 'A comment is required to reject a request');
      const updated = await prisma.torRequest.update({
        where: { id: existing.id },
        data: { comment: body.comment, rejected: true, reviewerId: req.user!.id },
      });

      const userIds = [updated.requesterId];
      if (updated.reviewerId) userIds.push(updated.reviewerId);
      await resolveUserProfiles(userIds);

      return res.json({ request: serializeTor(updated) });
    }

    const nextStep = Math.min(existing.step + 1, 6);
    const updated = await prisma.torRequest.update({
      where: { id: existing.id },
      data: {
        step: nextStep,
        status: STEP_STATUS[nextStep],
        comment: body.comment,
        rejected: false,
        reviewerId: req.user!.id,
      },
    });

    const userIds = [updated.requesterId];
    if (updated.reviewerId) userIds.push(updated.reviewerId);
    await resolveUserProfiles(userIds);

    res.json({ request: serializeTor(updated) });
  }),
);

export default router;
