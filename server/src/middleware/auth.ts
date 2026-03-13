import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../config/jwt';
import { isBlacklisted } from '../config/redis';
import { prisma } from '../config/database';
import { AppError } from './errorHandler';

export interface AuthRequest extends Request {
  userId?: string;
  user?: { id: string; fullName: string; currency: string };
}

export async function authenticate(req: AuthRequest, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) throw new AppError(401, 'Missing authorization token');

    if (await isBlacklisted(token)) throw new AppError(401, 'Token revoked');

    const { userId } = verifyAccessToken(token);
    const user = await prisma.user.findFirst({
      where: { id: userId, OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] },
      select: { id: true, fullName: true, currency: true },
    });
    if (!user) throw new AppError(401, 'User not found');

    req.userId = user.id;
    req.user = user;
    next();
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(401, 'Invalid or expired token'));
  }
}
