import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validateBody, validateParams } from '../middleware/validate';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate);
const idParam = z.object({ id: z.string() });

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const goals = await prisma.goal.findMany({ where: { userId: req.userId!, status: { in: ['ACTIVE','PAUSED'] } }, include: { contributions: { orderBy: { date: 'desc' }, take: 5 } } });
    const result = goals.map((g) => {
      const target = Number(g.targetAmount), current = Number(g.currentAmount);
      const pct = target > 0 ? (current / target) * 100 : 0;
      const days = g.endDate ? Math.max(0, Math.ceil((g.endDate.getTime() - Date.now()) / 86400_000)) : null;
      return { ...g, percentage: Math.min(pct, 100), daysRemaining: days, remaining: Math.max(target - current, 0) };
    });
    res.json(result);
  } catch (e) { next(e); }
});

router.post('/', validateBody(z.object({
  name: z.string().min(1).max(100), type: z.enum(['SAVINGS','DEBT_PAYOFF','INVESTMENT','EMERGENCY_FUND','PURCHASE']),
  targetAmount: z.number().positive(), startDate: z.string().transform((s) => new Date(s)),
  endDate: z.string().transform((s) => new Date(s)).optional(), icon: z.string().default('🎯'),
})), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.status(201).json(await prisma.goal.create({ data: { ...req.body, userId: req.userId! } })); }
  catch (e) { next(e); }
});

router.put('/:id', validateParams(idParam), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!await prisma.goal.findFirst({ where: { id: req.params.id, userId: req.userId! } })) throw new AppError(404, 'Goal not found');
    res.json(await prisma.goal.update({ where: { id: req.params.id }, data: req.body }));
  } catch (e) { next(e); }
});

router.delete('/:id', validateParams(idParam), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!await prisma.goal.findFirst({ where: { id: req.params.id, userId: req.userId! } })) throw new AppError(404, 'Goal not found');
    await prisma.goal.update({ where: { id: req.params.id }, data: { status: 'CANCELLED' } });
    res.json({ message: 'Goal cancelled' });
  } catch (e) { next(e); }
});

router.post('/:id/contribute', validateParams(idParam), validateBody(z.object({ amount: z.number().positive(), note: z.string().optional() })), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const goal = await prisma.goal.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!goal) throw new AppError(404, 'Goal not found');
    const [contrib, updated] = await prisma.$transaction([
      prisma.goalContribution.create({ data: { goalId: goal.id, amount: req.body.amount, note: req.body.note } }),
      prisma.goal.update({ where: { id: goal.id }, data: { currentAmount: { increment: req.body.amount } } }),
    ]);
    if (Number(goal.currentAmount) + req.body.amount >= Number(goal.targetAmount)) {
      await prisma.goal.update({ where: { id: goal.id }, data: { status: 'COMPLETED' } });
      await prisma.notification.create({ data: { userId: req.userId!, type: 'GOAL_REACHED', title: '🎯 Objectif atteint !', message: `Bravo ! Votre objectif "${goal.name}" est atteint.` } });
    }
    res.status(201).json({ contribution: contrib, goal: updated });
  } catch (e) { next(e); }
});

export default router;
