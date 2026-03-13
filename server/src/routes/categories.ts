import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { prisma } from '../config/database';

const router = Router();
router.use(authenticate);

const schema = z.object({ name: z.string().min(1).max(50), emoji: z.string().default('💰'), color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#9b3dff') });

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const cats = await prisma.category.findMany({ where: { userId: req.userId! }, orderBy: [{ isSystem: 'desc' }, { name: 'asc' }] });
    res.json(cats);
  } catch (e) { next(e); }
});

router.post('/', validateBody(schema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.status(201).json(await prisma.category.create({ data: { ...req.body, userId: req.userId! } })); }
  catch (e) { next(e); }
});

router.put('/:id', validateBody(schema.partial()), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const c = await prisma.category.findFirst({ where: { id: req.params.id, userId: req.userId!, isSystem: false } });
    if (!c) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(await prisma.category.update({ where: { id: req.params.id }, data: req.body }));
  } catch (e) { next(e); }
});

router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const c = await prisma.category.findFirst({ where: { id: req.params.id, userId: req.userId!, isSystem: false } });
    if (!c) { res.status(404).json({ error: 'Not found' }); return; }
    await prisma.category.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

export default router;
