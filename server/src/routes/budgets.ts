import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validateBody, validateParams } from '../middleware/validate';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate);

const idParam = z.object({ id: z.string() });
const schema = z.object({
  categoryId: z.string(), limitAmount: z.number().positive(),
  period: z.enum(['WEEKLY','MONTHLY','QUARTERLY','YEARLY']),
  alertThreshold: z.number().min(0).max(1).default(0.8), rollover: z.boolean().default(false),
});

function periodDates(period: string) {
  const now = new Date();
  if (period === 'WEEKLY') { const s = new Date(now); s.setDate(now.getDate() - now.getDay()); const e = new Date(s); e.setDate(s.getDate() + 7); return { start: s, end: e }; }
  if (period === 'QUARTERLY') { const q = Math.floor(now.getMonth() / 3); return { start: new Date(now.getFullYear(), q * 3, 1), end: new Date(now.getFullYear(), q * 3 + 3, 0) }; }
  if (period === 'YEARLY') return { start: new Date(now.getFullYear(), 0, 1), end: new Date(now.getFullYear(), 11, 31) };
  return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth() + 1, 0) };
}

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const budgets = await prisma.budget.findMany({ where: { userId: req.userId!, isActive: true }, include: { category: true } });
    const result = await Promise.all(budgets.map(async (b) => {
      const { start, end } = periodDates(b.period);
      const agg = await prisma.transaction.aggregate({ where: { userId: req.userId!, categoryId: b.categoryId, date: { gte: start, lte: end }, amount: { lt: 0 } }, _sum: { amount: true } });
      const spent = Math.abs(Number(agg._sum.amount ?? 0));
      const limit = Number(b.limitAmount);
      const pct = limit > 0 ? (spent / limit) * 100 : 0;
      return { ...b, spent, percentage: Math.min(pct, 100), remaining: Math.max(limit - spent, 0), status: pct >= 100 ? 'exceeded' : pct >= Number(b.alertThreshold) * 100 ? 'warning' : 'ok' };
    }));
    res.json(result);
  } catch (e) { next(e); }
});

router.post('/', validateBody(schema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const b = await prisma.budget.create({ data: { ...req.body, userId: req.userId! }, include: { category: true } });
    res.status(201).json(b);
  } catch (e) { next(e); }
});

router.put('/:id', validateParams(idParam), validateBody(schema.partial()), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.budget.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!existing) throw new AppError(404, 'Budget not found');
    res.json(await prisma.budget.update({ where: { id: req.params.id }, data: req.body, include: { category: true } }));
  } catch (e) { next(e); }
});

router.delete('/:id', validateParams(idParam), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.budget.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!existing) throw new AppError(404, 'Budget not found');
    await prisma.budget.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ message: 'Budget deleted' });
  } catch (e) { next(e); }
});

export default router;
