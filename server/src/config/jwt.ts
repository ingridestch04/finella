import jwt from 'jsonwebtoken';
import { env } from './env';

export interface JwtPayload { userId: string; iat?: number; exp?: number; }

export const signAccessToken  = (userId: string) => jwt.sign({ userId }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions);
export const signRefreshToken = (userId: string) => jwt.sign({ userId }, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN } as jwt.SignOptions);
export const verifyAccessToken  = (token: string) => jwt.verify(token, env.JWT_SECRET) as JwtPayload;
export const verifyRefreshToken = (token: string) => jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;
export const decodeToken = (token: string): JwtPayload | null => { try { return jwt.decode(token) as JwtPayload; } catch { return null; } };
export const getTokenExpiry = (token: string) => decodeToken(token)?.exp ?? 0;
