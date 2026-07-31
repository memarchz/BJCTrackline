import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../db';
import { verifyToken } from '../utils/jwt';

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice('Bearer '.length);
  if (req.cookies?.token) return req.cookies.token as string;
  return null;
}

import { resolveUserProfile } from '../utils/userResolver';

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ error: 'Not authenticated' });

    const payload = verifyToken(token);
    const user = await prisma.tlRole.findUnique({
      where: { empNo: payload.sub },
      select: { empNo: true, isAdmin: true },
    });
    if (!user) return res.status(401).json({ error: 'Not authenticated' });

    const profile = await resolveUserProfile(user.empNo);
    req.user = {
      id: user.empNo, // Map empNo to id for backward compatibility
      name: profile.name,
      email: profile.email,
      position: profile.position,
      isAdmin: user.isAdmin,
      teamId: profile.team,
    };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user?.isAdmin) return res.status(403).json({ error: 'Admin access required' });
  next();
}
