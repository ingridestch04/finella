import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { prisma } from '../config/database';
import { decrypt } from '../services/encryption.service';

const COOKIE = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' as const, maxAge: 7 * 86400_000 };

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.register(req.body);
    res.cookie('refresh_token', result.refreshToken, COOKIE);
    res.status(201).json({ accessToken: result.accessToken, user: result.user });
  } catch (e) { next(e); }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.login(req.body, req.ip);
    res.cookie('refresh_token', result.refreshToken, COOKIE);
    res.json({ accessToken: result.accessToken, user: result.user });
  } catch (e) { next(e); }
}

export async function refreshToken(req: Request, res: Response, next: NextFunction) {
  try {
    const rt = req.cookies?.refresh_token;
    if (!rt) throw new AppError(401, 'No refresh token');
    const tokens = await authService.refreshTokens(rt);
    res.cookie('refresh_token', tokens.refreshToken, COOKIE);
    res.json({ accessToken: tokens.accessToken });
  } catch (e) { next(e); }
}

export async function logout(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await authService.logout(req.userId!, req.headers.authorization!.split(' ')[1], req.cookies?.refresh_token);
    res.clearCookie('refresh_token');
    res.json({ message: 'Logged out' });
  } catch (e) { next(e); }
}

export async function getMe(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId! }, select: { id: true, emailEncrypted: true, fullName: true, currency: true, notificationPrefs: true, createdAt: true } });
    if (!user) throw new AppError(404, 'User not found');
    res.json({ ...user, email: decrypt(user.emailEncrypted), emailEncrypted: undefined });
  } catch (e) { next(e); }
}
