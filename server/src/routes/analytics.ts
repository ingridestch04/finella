import { Router } from 'express';
import { Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import {
  forecastSpending,
  assessBudgetRisks,
  detectAnomalies,
  forecastCashFlow,
  generateInsights,
} from '../services/analytics.service';

const router = Router();
router.use(authenticate);

router.get('/forecasts', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await forecastSpending(req.userId!);
    res.json(data);
  } catch (e) { next(e); }
});

router.get('/risks', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await assessBudgetRisks(req.userId!);
    res.json(data);
  } catch (e) { next(e); }
});

router.get('/anomalies', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await detectAnomalies(req.userId!);
    res.json(data);
  } catch (e) { next(e); }
});

router.get('/cashflow', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await forecastCashFlow(req.userId!);
    res.json(data);
  } catch (e) { next(e); }
});

router.get('/insights', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await generateInsights(req.userId!);
    res.json(data);
  } catch (e) { next(e); }
});

export default router;
