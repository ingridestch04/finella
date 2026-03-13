import Redis from 'ioredis';
import { env } from './env';
import { logger } from './logger';

export const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 3, lazyConnect: true });

redis.on('connect', () => logger.info('Redis connected'));
redis.on('error', (err) => logger.error({ error: err.message }, 'Redis error'));

export const blacklistToken = (token: string, ttl: number) => redis.set(`bl:${token}`, '1', 'EX', ttl);
export const isBlacklisted  = async (token: string)       => !!(await redis.get(`bl:${token}`));
export const storeRefresh   = (uid: string, token: string, ttl: number) => redis.set(`rt:${uid}`, token, 'EX', ttl);
export const getRefresh     = (uid: string) => redis.get(`rt:${uid}`);
export const deleteRefresh  = (uid: string) => redis.del(`rt:${uid}`);
