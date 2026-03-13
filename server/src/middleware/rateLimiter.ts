import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

export const globalLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS, max: env.RATE_LIMIT_MAX,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many requests' },
});

export const loginLimiter = rateLimit({
  windowMs: 60_000, max: 5,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many login attempts' },
});

export const registerLimiter = rateLimit({
  windowMs: 60_000, max: 3,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many registration attempts' },
});
