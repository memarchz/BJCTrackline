import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { asyncHandler } from '../utils/asyncHandler';
import { HttpError } from '../middleware/errorHandler';
import { requireAuth } from '../middleware/auth';
import { toUserSummary, userSummarySelect } from './users';

const router = Router();
router.use(requireAuth);

async function canAccessConversation(conversationId: string, userId: string, isAdmin: boolean) {
  const convo = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!convo) return null;
  if (convo.kind === 'dm') {
    if (convo.dmUserAId !== userId && convo.dmUserBId !== userId) return null;
  } else if (convo.kind === 'team') {
    if (!isAdmin) {
      const me = await prisma.user.findUnique({ where: { id: userId }, select: { teamId: true } });
      if (me?.teamId !== convo.teamId) return null;
    }
  }
  return convo;
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const user = req.user!;

    const teamConvos = await prisma.conversation.findMany({
      where: { kind: 'team', ...(user.isAdmin ? {} : { teamId: user.teamId ?? '__none__' }) },
      include: {
        team: true,
        // Bounded, not just the latest — unread counting needs to look back
        // further than a single "last message" preview does.
        messages: { orderBy: { ts: 'desc' }, take: 200, select: { id: true, text: true, ts: true, fromId: true, from: { select: userSummarySelect } } },
      },
    });

    const dmConvos = await prisma.conversation.findMany({
      where: { kind: 'dm', OR: [{ dmUserAId: user.id }, { dmUserBId: user.id }] },
      include: {
        dmUserA: { select: userSummarySelect },
        dmUserB: { select: userSummarySelect },
        messages: { orderBy: { ts: 'desc' }, take: 200, select: { id: true, text: true, ts: true, fromId: true, from: { select: userSummarySelect } } },
      },
    });

    const allConvoIds = [...teamConvos, ...dmConvos].map((c) => c.id);
    const reads = await prisma.conversationRead.findMany({ where: { conversationId: { in: allConvoIds } } });
    const myReadAt = new Map(reads.filter((r) => r.userId === user.id).map((r) => [r.conversationId, r.lastReadAt]));
    const readsByConvo = new Map<string, typeof reads>();
    for (const r of reads) {
      if (!readsByConvo.has(r.conversationId)) readsByConvo.set(r.conversationId, []);
      readsByConvo.get(r.conversationId)!.push(r);
    }

    function unreadCount(convoId: string, messages: { ts: Date; fromId: string }[]) {
      const lastRead = myReadAt.get(convoId);
      return messages.filter((m) => m.fromId !== user.id && (!lastRead || m.ts > lastRead)).length;
    }

    const conversations = [
      ...teamConvos.map((c) => ({
        id: c.id,
        kind: 'team' as const,
        name: c.team!.name,
        teamId: c.teamId,
        lastMessage: c.messages[0]
          ? { text: c.messages[0].text, ts: c.messages[0].ts, from: toUserSummary(c.messages[0].from) }
          : null,
        unreadCount: unreadCount(c.id, c.messages),
      })),
      ...dmConvos.map((c) => {
        const other = c.dmUserAId === user.id ? c.dmUserB : c.dmUserA;
        const otherId = other!.id;
        const otherRead = (readsByConvo.get(c.id) ?? []).find((r) => r.userId === otherId);
        return {
          id: c.id,
          kind: 'dm' as const,
          name: other!.name,
          userId: otherId,
          lastMessage: c.messages[0]
            ? { text: c.messages[0].text, ts: c.messages[0].ts, from: toUserSummary(c.messages[0].from) }
            : null,
          unreadCount: unreadCount(c.id, c.messages),
          otherReadAt: otherRead?.lastReadAt ?? null,
        };
      }),
    ];

    res.json({ conversations });
  }),
);

router.get(
  '/:id/messages',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const convo = await canAccessConversation(req.params.id, user.id, user.isAdmin);
    if (!convo) throw new HttpError(404, 'Conversation not found');

    const messages = await prisma.message.findMany({
      where: { conversationId: convo.id },
      include: { from: { select: userSummarySelect } },
      orderBy: { ts: 'asc' },
    });

    // Read receipts are only shown 1:1 in a DM — in a team channel "seen by
    // whom" is ambiguous, so we don't compute it there.
    let otherReadAt: Date | null = null;
    if (convo.kind === 'dm') {
      const otherId = convo.dmUserAId === user.id ? convo.dmUserBId : convo.dmUserAId;
      const read = otherId
        ? await prisma.conversationRead.findUnique({ where: { conversationId_userId: { conversationId: convo.id, userId: otherId } } })
        : null;
      otherReadAt = read?.lastReadAt ?? null;
    }

    res.json({
      messages: messages.map((m) => ({ id: m.id, text: m.text, ts: m.ts, from: toUserSummary(m.from) })),
      otherReadAt,
    });
  }),
);

router.post(
  '/:id/read',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const convo = await canAccessConversation(req.params.id, user.id, user.isAdmin);
    if (!convo) throw new HttpError(404, 'Conversation not found');

    await prisma.conversationRead.upsert({
      where: { conversationId_userId: { conversationId: convo.id, userId: user.id } },
      create: { conversationId: convo.id, userId: user.id },
      update: { lastReadAt: new Date() },
    });
    res.status(204).end();
  }),
);

const sendMessageSchema = z.object({ text: z.string().min(1) });

router.post(
  '/:id/messages',
  asyncHandler(async (req, res) => {
    const { text } = sendMessageSchema.parse(req.body);
    const convo = await canAccessConversation(req.params.id, req.user!.id, req.user!.isAdmin);
    if (!convo) throw new HttpError(404, 'Conversation not found');

    const message = await prisma.message.create({
      data: { conversationId: convo.id, fromId: req.user!.id, text },
      include: { from: { select: userSummarySelect } },
    });
    res.status(201).json({ message: { id: message.id, text: message.text, ts: message.ts, from: toUserSummary(message.from) } });
  }),
);

router.post(
  '/dm/:userId',
  asyncHandler(async (req, res) => {
    const me = req.user!;
    const otherId = req.params.userId;
    if (otherId === me.id) throw new HttpError(400, "You can't start a DM with yourself");

    const [aId, bId] = [me.id, otherId].sort();
    const convo = await prisma.conversation.upsert({
      where: { dmUserAId_dmUserBId: { dmUserAId: aId, dmUserBId: bId } },
      create: { kind: 'dm', dmUserAId: aId, dmUserBId: bId },
      update: {},
    });
    res.json({ conversationId: convo.id });
  }),
);

export default router;
