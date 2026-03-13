import * as argon2 from 'argon2';
import { prisma } from '../config/database';
import { signAccessToken, signRefreshToken, verifyRefreshToken, getTokenExpiry } from '../config/jwt';
import { blacklistToken, isBlacklisted, storeRefresh, getRefresh, deleteRefresh } from '../config/redis';
import { hashEmail, hmac, decrypt } from './encryption.service';
import { AppError } from '../middleware/errorHandler';

const ARGON_OPTS = { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 4, raw: false } as const;

export async function register(input: { email: string; password: string; fullName: string; currency?: string; gdprConsent: boolean }) {
  if (!input.gdprConsent) throw new AppError(400, 'GDPR consent required');

  const { hmac: emailHmac, encrypted: emailEncrypted } = hashEmail(input.email);
  if (await prisma.user.findUnique({ where: { emailHmac } })) throw new AppError(409, 'Email already registered');

  const passwordHash = await argon2.hash(input.password, ARGON_OPTS);
  const user = await prisma.user.create({
    data: { emailHmac, emailEncrypted, passwordHash, fullName: input.fullName, currency: input.currency ?? 'EUR', gdprConsentAt: new Date() },
  });

  const [at, rt] = [signAccessToken(user.id), signRefreshToken(user.id)];
  await storeRefresh(user.id, rt, 7 * 86400);
  return { accessToken: at, refreshToken: rt, user: { id: user.id, fullName: user.fullName, currency: user.currency, email: input.email } };
}

export async function login(input: { email: string; password: string }, ip?: string) {
  const emailHmac = hmac(input.email.toLowerCase().trim());
  const user = await prisma.user.findFirst({ where: { emailHmac, OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] } });
  if (!user || !(await argon2.verify(user.passwordHash, input.password, ARGON_OPTS))) {
    throw new AppError(401, 'Invalid email or password');
  }

  await prisma.auditLog.create({ data: { userId: user.id, action: 'LOGIN', entityType: 'User', ipAddress: ip ?? 'unknown', metadata: {} } });

  const [at, rt] = [signAccessToken(user.id), signRefreshToken(user.id)];
  await storeRefresh(user.id, rt, 7 * 86400);
  return { accessToken: at, refreshToken: rt, user: { id: user.id, fullName: user.fullName, currency: user.currency, email: decrypt(user.emailEncrypted) } };
}

export async function refreshTokens(incoming: string) {
  if (await isBlacklisted(incoming)) throw new AppError(401, 'Refresh token revoked');
  const { userId } = verifyRefreshToken(incoming);
  if ((await getRefresh(userId)) !== incoming) throw new AppError(401, 'Token mismatch');

  const rem = getTokenExpiry(incoming) - Math.floor(Date.now() / 1000);
  if (rem > 0) await blacklistToken(incoming, rem);

  const [at, rt] = [signAccessToken(userId), signRefreshToken(userId)];
  await storeRefresh(userId, rt, 7 * 86400);
  return { accessToken: at, refreshToken: rt };
}

export async function logout(userId: string, accessToken: string, refreshToken?: string) {
  const rem = getTokenExpiry(accessToken) - Math.floor(Date.now() / 1000);
  if (rem > 0) await blacklistToken(accessToken, rem);
  if (refreshToken) await blacklistToken(refreshToken, 7 * 86400);
  await deleteRefresh(userId);
}
