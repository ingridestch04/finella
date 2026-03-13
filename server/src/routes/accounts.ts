import { Router } from 'express';
import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validateBody, validateParams } from '../middleware/validate';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { createLinkToken, exchangePublicToken, syncPlaidTransactions } from '../services/plaid.service';

const router = Router();
router.use(authenticate);

const idParam = z.object({ id: z.string() });

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const accounts = await prisma.bankAccount.findMany({ where: { userId: req.userId!, isActive: true }, orderBy: { createdAt: 'asc' } });
    const total = accounts.reduce((s, a) => s + Number(a.balance), 0);
    res.json({ accounts, total });
  } catch (e) { next(e); }
});

router.post('/', validateBody(z.object({
  provider: z.enum(['BNP','SOCIETE_GENERALE','CREDIT_AGRICOLE','BOURSORAMA','REVOLUT','N26','MANUAL','PLAID']),
  label: z.string().min(1).max(100), type: z.enum(['CHECKING','SAVINGS','INVESTMENT','CREDIT']),
  ibanMasked: z.string().optional(), currency: z.string().length(3).default('EUR'), balance: z.number().default(0),
})), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const acc = await prisma.bankAccount.create({ data: { ...req.body, userId: req.userId! } });
    res.status(201).json(acc);
  } catch (e) { next(e); }
});

router.patch('/:id', validateParams(idParam), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const acc = await prisma.bankAccount.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!acc) throw new AppError(404, 'Account not found');
    if (acc.provider !== 'MANUAL') throw new AppError(403, 'Only manual accounts editable');
    const updated = await prisma.bankAccount.update({ where: { id: req.params.id }, data: req.body });
    res.json(updated);
  } catch (e) { next(e); }
});

router.delete('/:id', validateParams(idParam), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const acc = await prisma.bankAccount.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!acc) throw new AppError(404, 'Account not found');
    await prisma.bankAccount.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ message: 'Account deactivated' });
  } catch (e) { next(e); }
});

router.post('/:id/sync', validateParams(idParam), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const acc = await prisma.bankAccount.findFirst({ where: { id: req.params.id, userId: req.userId!, isActive: true } });
    if (!acc) throw new AppError(404, 'Account not found');

    // Si c'est un compte Plaid, synchroniser via l'API
    if (acc.accessTokenEnc) {
      const result = await syncPlaidTransactions(acc.id, req.userId!);
      return res.json({ message: 'Plaid sync terminée', ...result, lastSyncedAt: new Date() });
    }

    // Compte manuel : juste mettre à jour lastSyncedAt
    await prisma.bankAccount.update({ where: { id: req.params.id }, data: { lastSyncedAt: new Date() } });
    await prisma.notification.create({ data: { userId: req.userId!, type: 'SYNC_DONE', title: 'Sync terminée', message: `${acc.label} synchronisé.` } });
    res.json({ message: 'Synced', lastSyncedAt: new Date() });
  } catch (e) { next(e); }
});

// ── Routes Plaid ────────────────────────────────────────────────────────────

/** Étape 1 : Créer un link_token pour ouvrir Plaid Link */
router.post('/plaid/link-token', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const linkToken = await createLinkToken(req.userId!);
    res.json({ link_token: linkToken });
  } catch (e) { next(e); }
});

/** Étape 2 : Échanger le public_token après connexion réussie */
router.post('/plaid/exchange', validateBody(z.object({
  public_token: z.string(),
  metadata: z.object({
    institution: z.object({ name: z.string().optional(), institution_id: z.string().optional() }).optional(),
    accounts: z.array(z.object({ id: z.string(), name: z.string(), type: z.string(), subtype: z.string(), mask: z.string().optional() })).optional(),
  }).optional(),
})), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const accounts = await exchangePublicToken(req.userId!, req.body.public_token, req.body.metadata ?? {});
    // Déclencher une 1ère sync immédiate
    for (const acc of accounts) {
      try { await syncPlaidTransactions(acc.id, req.userId!); } catch (_) { /* non bloquant */ }
    }
    res.status(201).json({ accounts, message: `${accounts.length} compte(s) Plaid connecté(s)` });
  } catch (e) { next(e); }
});

export default router;
