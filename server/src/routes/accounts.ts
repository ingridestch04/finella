import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate);

const schema = z.object({
  name: z.string().min(1),
  type: z.enum(['CHECKING', 'SAVINGS', 'INVESTMENT', 'CREDIT']),
  balance: z.number().default(0),
  currency: z.string().default('EUR'),
});

router.get('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const accounts = await prisma.account.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'desc' },
    });
    const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
    res.json({ accounts, totalBalance });
  } catch (err) { next(err); }
});

router.post('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const data = schema.parse(req.body);
    const account = await prisma.account.create({ data: { ...data, userId: req.userId! } });
    res.status(201).json(account);
  } catch (err) { next(err); }
});

router.put('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const data = schema.partial().parse(req.body);
    const existing = await prisma.account.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!existing) throw new AppError(404, 'Compte non trouvé');
    const updated = await prisma.account.update({ where: { id: req.params.id }, data });
    res.json(updated);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const existing = await prisma.account.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!existing) throw new AppError(404, 'Compte non trouvé');
    await prisma.account.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
