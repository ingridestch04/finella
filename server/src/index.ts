import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { logger } from './config/logger';
import { prisma } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import { globalLimiter } from './middleware/rateLimiter';
import authRoutes from './routes/auth';
import accountRoutes from './routes/accounts';
import transactionRoutes from './routes/transactions';
import budgetRoutes from './routes/budgets';
import goalRoutes from './routes/goals';
import notificationRoutes from './routes/notifications';
import categoryRoutes from './routes/categories';
import adminRoutes from './routes/admin';
import analyticsRoutes from './routes/analytics';

const app = express();

// Security
app.use(helmet());
const allowed = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());
app.use(cors({ origin: (o, cb) => (!o || allowed.includes(o) ? cb(null, true) : cb(new Error('CORS'))), credentials: true }));

// Body & cookies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Rate limit
app.use('/api/', globalLimiter);

// Health
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// Routes
const V1 = '/api/v1';
app.use(`${V1}/auth`,          authRoutes);
app.use(`${V1}/accounts`,      accountRoutes);
app.use(`${V1}/transactions`,  transactionRoutes);
app.use(`${V1}/budgets`,       budgetRoutes);
app.use(`${V1}/goals`,         goalRoutes);
app.use(`${V1}/notifications`, notificationRoutes);
app.use(`${V1}/categories`,    categoryRoutes);
app.use(`${V1}/admin`,         adminRoutes);
app.use(`${V1}/analytics`,    analyticsRoutes);

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
app.use(errorHandler);

async function main() {
  await prisma.$connect();
  logger.info('Database connected');
  app.listen(env.PORT, () => logger.info(`finella API on :${env.PORT}`));
}

main().catch((e) => { logger.error(e); process.exit(1); });
export default app;
