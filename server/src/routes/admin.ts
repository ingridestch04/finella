import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../config/database';
import { decrypt } from '../services/encryption.service';

const router = Router();
router.use(authenticate);

router.get('/export-data', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId! }, include: { accounts: true, transactions: { include: { category: true } }, budgets: { include: { category: true } }, goals: { include: { contributions: true } }, notifications: true } });
    if (!user) { res.status(404).json({ error: 'Not found' }); return; }
    const data = { exportedAt: new Date().toISOString(), user: { id: user.id, email: decrypt(user.emailEncrypted), fullName: user.fullName, currency: user.currency, gdprConsentAt: user.gdprConsentAt }, accounts: user.accounts, transactions: user.transactions, budgets: user.budgets, goals: user.goals, notifications: user.notifications };
    res.setHeader('Content-Disposition', 'attachment; filename="finella-export.json"');
    res.json(data);
  } catch (e) { next(e); }
});

router.delete('/account', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.user.update({ where: { id: req.userId! }, data: { deletedAt: new Date(), fullName: '[DELETED]', emailEncrypted: '[DELETED]', emailHmac: `deleted-${req.userId}` } });
    res.json({ message: 'Account scheduled for deletion' });
  } catch (e) { next(e); }
});

export default router;
