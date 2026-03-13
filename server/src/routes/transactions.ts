import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate);

const schema = z.object({
  accountId: z.string().optional(),
  amount: z.number().positive(),
  type: z.enum(['INCOME', 'EXPENSE']),
  category: z.string().min(1),
  description: z.string().optional(),
  date: z.string(),
});

router.get('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const { accountId, type, category, page = '1', limit = '20' } = req.query as Record<string, string>;
    const where: Record<string, unknown> = { userId: req.userId! };
    if (accountId) where.accountId = accountId;
    if (type) where.type = type;
    if (category) where.category = category;
    const p = parseInt(page), l = parseInt(limit);
    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where, orderBy: { date: 'desc' }, skip: (p - 1) * l, take: l,
        include: { account: { select: { name: true } } },
      }),
      prisma.transaction.count({ where }),
    ]);
    res.json({ transactions, total, page: p, totalPages: Math.ceil(total / l) });
  } catch (err) { next(err); }
});

router.get('/stats', async (req: AuthRequest, res: Response, next) => {
  try {
    const { startDate, endDate } = req.query as Record<string, string>;
    const where: Record<string, unknown> = { userId: req.userId! };
    if (startDate || endDate) {
      where.date = {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) }),
      };
    }
    const txs = await prisma.transaction.findMany({ where });
    const income = txs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
    const expenses = txs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
    const byCategory = txs.reduce((acc: Record<string, number>, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});
    res.json({ income, expenses, balance: income - expenses, byCategory });
  } catch (err) { next(err); }
});

router.post('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const data = schema.parse(req.body);
    if (data.accountId) {
      const acc = await prisma.account.findFirst({ where: { id: data.accountId, userId: req.userId! } });
      if (!acc) throw new AppError(404, 'Compte non trouvé');
    }
    const tx = await prisma.transaction.create({
      data: { ...data, date: new Date(data.date), userId: req.userId! },
      include: { account: { select: { name: true } } },
    });
    if (data.accountId) {
      const delta = data.type === 'INCOME' ? data.amount : -data.amount;
      await prisma.account.update({ where: { id: data.accountId }, data: { balance: { increment: delta } } });
    }
    res.status(201).json(tx);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const tx = await prisma.transaction.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!tx) throw new AppError(404, 'Transaction non trouvée');
    await prisma.transaction.delete({ where: { id: req.params.id } });
    if (tx.accountId) {
      const delta = tx.type === 'INCOME' ? -tx.amount : tx.amount;
      await prisma.account.update({ where: { id: tx.accountId }, data: { balance: { increment: delta } } });
    }
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
