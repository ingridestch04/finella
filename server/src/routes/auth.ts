import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { loginLimiter, registerLimiter } from '../middleware/rateLimiter';
import { register, login, refreshToken, logout, getMe } from '../controllers/authController';

const router = Router();

router.post('/register', registerLimiter, validateBody(z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Needs upper, lower, digit'),
  fullName: z.string().min(2).max(100),
  currency: z.string().length(3).default('EUR'),
  gdprConsent: z.literal(true, { errorMap: () => ({ message: 'GDPR consent required' }) }),
})), register);

router.post('/login', loginLimiter, validateBody(z.object({ email: z.string().email(), password: z.string().min(1) })), login);
router.post('/refresh', refreshToken);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);

export default router;
