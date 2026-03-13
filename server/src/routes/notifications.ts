import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../config/database';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({ where: { userId: req.userId! }, orderBy: { createdAt: 'desc' }, take: 50 }),
      prisma.notification.count({ where: { userId: req.userId!, readAt: null } }),
    ]);
    res.json({ notifications, unreadCount });
  } catch (e) { next(e); }
});

router.patch('/:id/read', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.notification.updateMany({ where: { id: req.params.id, userId: req.userId! }, data: { readAt: new Date(), status: 'READ' } });
    res.json({ message: 'Marked as read' });
  } catch (e) { next(e); }
});

router.post('/read-all', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.notification.updateMany({ where: { userId: req.userId!, readAt: null }, data: { readAt: new Date(), status: 'READ' } });
    res.json({ message: 'All notifications read' });
  } catch (e) { next(e); }
});

export default router;
