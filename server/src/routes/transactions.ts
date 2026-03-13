import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validateParams } from '../middleware/validate';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { categorizeTransaction } from '../services/categorization.service';
import { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { cursor, limit = '20', categoryId, accountId, dateFrom, dateTo } = req.query as Record<string, string>;
    const take = Math.min(parseInt(limit), 100);
    const where: Prisma.TransactionWhereInput = {
      userId: req.userId!,
      ...(categoryId && { categoryId }),
      ...(accountId && { accountId }),
      ...((dateFrom || dateTo) && { date: { ...(dateFrom && { gte: new Date(dateFrom) }), ...(dateTo && { lte: new Date(dateTo) }) } }),
    };
    const txs = await prisma.transaction.findMany({
      where, take: take + 1, ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy: { date: 'desc' },
      include: { category: true, account: { select: { label: true, provider: true } } },
    });
    const hasMore = txs.length > take;
    const data = hasMore ? txs.slice(0, take) : txs;
    res.json({ transactions: data, nextCursor: hasMore ? data[data.length - 1].id : null, hasMore });
  } catch (e) { next(e); }
});

router.get('/stats', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { period = 'month' } = req.query as { period?: string };
    const now = new Date();
    const dateFrom = period === 'week' ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
      : period === 'quarter' ? new Date(now.getFullYear(), now.getMonth() - 3, 1)
      : period === 'year' ? new Date(now.getFullYear(), 0, 1)
      : new Date(now.getFullYear(), now.getMonth(), 1);

    const [income, expense, byCategory] = await Promise.all([
      prisma.transaction.aggregate({ where: { userId: req.userId!, amount: { gt: 0 }, date: { gte: dateFrom } }, _sum: { amount: true } }),
      prisma.transaction.aggregate({ where: { userId: req.userId!, amount: { lt: 0 }, date: { gte: dateFrom } }, _sum: { amount: true } }),
      prisma.transaction.groupBy({ by: ['categoryId'], where: { userId: req.userId!, amount: { lt: 0 }, date: { gte: dateFrom } }, _sum: { amount: true }, orderBy: { _sum: { amount: 'asc' } }, take: 10 }),
    ]);

    const cats = await prisma.category.findMany({ where: { id: { in: byCategory.map((b) => b.categoryId).filter(Boolean) as string[] } } });
    const catMap = Object.fromEntries(cats.map((c) => [c.id, c]));

    res.json({
      income: Number(income._sum.amount ?? 0),
      expenses: Math.abs(Number(expense._sum.amount ?? 0)),
      balance: Number(income._sum.amount ?? 0) + Number(expense._sum.amount ?? 0),
      spendingByCategory: byCategory.map((b) => ({ category: b.categoryId ? catMap[b.categoryId] : null, total: Math.abs(Number(b._sum.amount ?? 0)) })),
      period, dateFrom,
    });
  } catch (e) { next(e); }
});

router.post('/import-csv', upload.single('file'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file) throw new AppError(400, 'No file uploaded');

    const accounts = await prisma.bankAccount.findMany({ where: { userId: req.userId!, isActive: true }, select: { id: true } });
    if (!accounts.length) throw new AppError(400, 'Créez d\'abord un compte bancaire dans l\'onglet Comptes');

    const batchId = uuidv4();
    const accountId = accounts[0].id;
    let imported = 0, skipped = 0;

    // Detect file type and parse rows
    const ext = req.file.originalname.split('.').pop()?.toLowerCase();
    let rows: Record<string, string>[] = [];

    if (ext === 'xlsx' || ext === 'xls') {
      const XLSX = await import('xlsx');
      const wb = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(ws, { defval: '' }) as Record<string, string>[];
    } else {
      const Papa = await import('papaparse');
      const result = Papa.default.parse(req.file.buffer.toString('utf-8'), { header: true, skipEmptyLines: true });
      rows = result.data as Record<string, string>[];
    }

    const importSource = (ext === 'xlsx' || ext === 'xls') ? 'XLSX' : 'CSV';

    for (const row of rows) {
      // Support multiple column name conventions
      const rawDate = String(row.date ?? row.Date ?? row.DATE ?? row['Date opération'] ?? row['date opération'] ?? '');
      const rawAmount = String(row.amount ?? row.Amount ?? row.AMOUNT ?? row.montant ?? row.Montant ?? '0');
      const label = String(row.label ?? row.Label ?? row.description ?? row.Description ?? row.libelle ?? row.Libellé ?? row.libellé ?? '').trim();

      // Parse date (handles JS Date objects from xlsx cellDates, ISO strings, and FR format)
      const date = rawDate instanceof Date ? rawDate : new Date(rawDate.replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$3-$2-$1'));
      const amount = parseFloat(String(rawAmount).replace(/\s/g, '').replace(',', '.'));

      if (isNaN(date.getTime()) || isNaN(amount) || !label) { skipped++; continue; }

      const externalId = `${importSource.toLowerCase()}-${batchId}-${label}-${date.toISOString()}-${amount}`;
      const exists = await prisma.transaction.findFirst({ where: { accountId, externalId } });
      if (exists) { skipped++; continue; }

      const { categoryId, source, confidence } = await categorizeTransaction(req.userId!, label);
      await prisma.transaction.create({
        data: { accountId, userId: req.userId!, externalId, date, amount, label, cleanLabel: label.toLowerCase(), categoryId, categorizationSource: source, confidenceScore: confidence, importSource, importBatchId: batchId },
      });
      imported++;
    }
    res.json({ imported, skipped, batchId });
  } catch (e) { next(e); }
});

router.patch('/:id/category', validateParams(z.object({ id: z.string() })), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tx = await prisma.transaction.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!tx) throw new AppError(404, 'Transaction not found');
    const updated = await prisma.transaction.update({ where: { id: req.params.id }, data: { categoryId: req.body.categoryId, categorizationSource: 'MANUAL' }, include: { category: true } });
    res.json(updated);
  } catch (e) { next(e); }
});

export default router;
