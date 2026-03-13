import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate);

const schema = z.object({
  name: z.string().min(1),
  type: z.enum(['SAVINGS', 'DEBT', 'PURCHASE', 'RETIREMENT']),
  targetAmount: z.number().positive(),
  currentAmount: z.number().default(0),
  targetDate: z.string().optional(),
});

function withProgress(g: { id: string; name: string; type: string; targetAmount: number; currentAmount: number; targetDate: Date | null; createdAt: Date; updatedAt: Date; userId: string }) {
  const pct = g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0;
  const daysLeft = g.targetDate
    ? Math.max(0, Math.ceil((g.targetDate.getTime() - Date.now()) / 86400000))
    : null;
  return { ...g, percentage: Math.min(Math.round(pct), 100), remaining: Math.max(g.targetAmount - g.currentAmount, 0), daysLeft };
}

router.get('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const goals = await prisma.goal.findMany({ where: { userId: req.userId! }, orderBy: { createdAt: 'desc' } });
    res.json(goals.map(withProgress));
  } catch (err) { next(err); }
});

router.post('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const data = schema.parse(req.body);
    const goal = await prisma.goal.create({
      data: { ...data, targetDate: data.targetDate ? new Date(data.targetDate) : null, userId: req.userId! },
    });
    res.status(201).json(withProgress(goal));
  } catch (err) { next(err); }
});

router.put('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const data = schema.partial().parse(req.body);
    const existing = await prisma.goal.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!existing) throw new AppError(404, 'Objectif non trouvé');
    const updated = await prisma.goal.update({
      where: { id: req.params.id },
      data: { ...data, ...(data.targetDate ? { targetDate: new Date(data.targetDate) } : {}) },
    });
    res.json(withProgress(updated));
  } catch (err) { next(err); }
});

router.delete('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const existing = await prisma.goal.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!existing) throw new AppError(404, 'Objectif non trouvé');
    await prisma.goal.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) { next(err); }
});

router.post('/:id/contribute', async (req: AuthRequest, res: Response, next) => {
  try {
    const { amount } = z.object({ amount: z.number().positive() }).parse(req.body);
    const goal = await prisma.goal.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!goal) throw new AppError(404, 'Objectif non trouvé');
    const updated = await prisma.goal.update({ where: { id: req.params.id }, data: { currentAmount: { increment: amount } } });
    res.json(withProgress(updated));
  } catch (err) { next(err); }
});

export default router;
