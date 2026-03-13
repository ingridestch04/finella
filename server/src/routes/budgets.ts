import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate);

const schema = z.object({
  category: z.string().min(1),
  limit: z.number().positive(),
});

router.get('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const budgets = await prisma.budget.findMany({ where: { userId: req.userId! }, orderBy: { createdAt: 'desc' } });
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const result = await Promise.all(budgets.map(async (b) => {
      const agg = await prisma.transaction.aggregate({
        where: { userId: req.userId!, category: b.category, type: 'EXPENSE', date: { gte: monthStart, lte: monthEnd } },
        _sum: { amount: true },
      });
      const spent = agg._sum.amount || 0;
      const pct = b.limit > 0 ? (spent / b.limit) * 100 : 0;
      return {
        ...b,
        spent,
        percentage: Math.min(Math.round(pct), 100),
        remaining: Math.max(b.limit - spent, 0),
        status: pct >= 100 ? 'exceeded' : pct >= 80 ? 'warning' : 'ok',
      };
    }));
    res.json(result);
  } catch (err) { next(err); }
});

router.post('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const data = schema.parse(req.body);
    const budget = await prisma.budget.create({ data: { ...data, userId: req.userId! } });
    res.status(201).json(budget);
  } catch (err) { next(err); }
});

router.put('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const data = schema.partial().parse(req.body);
    const existing = await prisma.budget.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!existing) throw new AppError(404, 'Budget non trouvé');
    const updated = await prisma.budget.update({ where: { id: req.params.id }, data });
    res.json(updated);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const existing = await prisma.budget.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!existing) throw new AppError(404, 'Budget non trouvé');
    await prisma.budget.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
