import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { createHmac, createCipheriv, randomBytes } from 'crypto';

const prisma = new PrismaClient();
const ENC_KEY = process.env.ENCRYPTION_KEY ?? '0000000000000000000000000000000000000000000000000000000000000000';
const HMAC_SECRET = process.env.HMAC_SECRET ?? 'demo-hmac-secret-key';

function encryptEmail(text: string) {
  const key = Buffer.from(ENC_KEY.replace(/[^0-9a-fA-F]/g, '').padEnd(64, '0').slice(0, 64), 'hex');
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([c.update(text, 'utf8'), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), enc]).toString('base64url');
}

function hmac(v: string) {
  return createHmac('sha256', HMAC_SECRET).update(v.toLowerCase().trim()).digest('hex');
}

async function main() {
  console.log('🌱 Seeding finella...');

  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.goalContribution.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.category.deleteMany();
  await prisma.bankAccount.deleteMany();
  await prisma.user.deleteMany();

  const email = 'alice@finella.app';
  const user = await prisma.user.create({
    data: {
      emailHmac: hmac(email),
      emailEncrypted: encryptEmail(email),
      passwordHash: await argon2.hash('Demo1234!', { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 4 }),
      fullName: 'Alice Dupont',
      currency: 'EUR',
      gdprConsentAt: new Date('2024-01-01'),
    },
  });

  const cats = [
    { name: 'Alimentation', emoji: '🛒', color: '#22c55e' }, { name: 'Transport', emoji: '🚗', color: '#3b82f6' },
    { name: 'Loisirs', emoji: '🎭', color: '#f59e0b' },      { name: 'Santé', emoji: '💊', color: '#ef4444' },
    { name: 'Logement', emoji: '🏠', color: '#8b5cf6' },     { name: 'Shopping', emoji: '🛍️', color: '#ec4899' },
    { name: 'Restaurants', emoji: '🍽️', color: '#f97316' }, { name: 'Revenus', emoji: '💰', color: '#10b981' },
    { name: 'Épargne', emoji: '🏦', color: '#6366f1' },
  ];
  const catMap: Record<string, string> = {};
  for (const cat of cats) {
    const c = await prisma.category.create({ data: { ...cat, userId: user.id, isSystem: true } });
    catMap[cat.name] = c.id;
  }

  const bnp = await prisma.bankAccount.create({ data: { userId: user.id, provider: 'BNP', label: 'BNP Compte Courant', type: 'CHECKING', balance: 2847.50, ibanMasked: 'FR76 **** **** 4521', lastSyncedAt: new Date() } });
  const livret = await prisma.bankAccount.create({ data: { userId: user.id, provider: 'BNP', label: 'Livret A', type: 'SAVINGS', balance: 8400, lastSyncedAt: new Date() } });
  const bourso = await prisma.bankAccount.create({ data: { userId: user.id, provider: 'BOURSORAMA', label: 'Boursorama CCP', type: 'CHECKING', balance: 1203.75, lastSyncedAt: new Date() } });

  const now = new Date();
  const txs = [
    { accountId: bnp.id, d: 85, amt: 2800,   label: 'Salaire Novembre',       cat: 'Revenus' },
    { accountId: bnp.id, d: 84, amt: -850,   label: 'Loyer Novembre',          cat: 'Logement' },
    { accountId: bnp.id, d: 83, amt: -92.5,  label: 'EDF Électricité',         cat: 'Logement' },
    { accountId: bnp.id, d: 80, amt: -124.3, label: 'Carrefour Market',        cat: 'Alimentation' },
    { accountId: bnp.id, d: 78, amt: -45.8,  label: 'SNCF TGV Paris',         cat: 'Transport' },
    { accountId: bnp.id, d: 75, amt: -67.2,  label: 'Monoprix courses',        cat: 'Alimentation' },
    { accountId: bnp.id, d: 72, amt: -15.99, label: 'Netflix abonnement',      cat: 'Loisirs' },
    { accountId: bnp.id, d: 70, amt: -38.5,  label: 'Pharmacie Santé Plus',   cat: 'Santé' },
    { accountId: bnp.id, d: 68, amt: -200,   label: 'Virement Livret A',       cat: 'Épargne' },
    { accountId: bnp.id, d: 55, amt: 2800,   label: 'Salaire Décembre',        cat: 'Revenus' },
    { accountId: bnp.id, d: 54, amt: -850,   label: 'Loyer Décembre',          cat: 'Logement' },
    { accountId: bnp.id, d: 52, amt: -145.6, label: 'Lidl courses',            cat: 'Alimentation' },
    { accountId: bnp.id, d: 50, amt: -28.5,  label: 'RATP Pass Navigo',        cat: 'Transport' },
    { accountId: bnp.id, d: 48, amt: -79,    label: 'Restaurant Le Bistrot',   cat: 'Restaurants' },
    { accountId: bnp.id, d: 45, amt: -9.99,  label: 'Spotify Premium',         cat: 'Loisirs' },
    { accountId: bnp.id, d: 43, amt: -156.8, label: 'Zara vêtements',          cat: 'Shopping' },
    { accountId: bnp.id, d: 40, amt: -200,   label: 'Virement Livret A',       cat: 'Épargne' },
    { accountId: bnp.id, d: 38, amt: -55.2,  label: 'Carrefour Market',        cat: 'Alimentation' },
    { accountId: bnp.id, d: 35, amt: -120,   label: 'Mutuelle santé',          cat: 'Santé' },
    { accountId: bnp.id, d: 33, amt: -42,    label: 'Uber Eats livraison',     cat: 'Restaurants' },
    { accountId: bnp.id, d: 20, amt: 2800,   label: 'Salaire Janvier',         cat: 'Revenus' },
    { accountId: bnp.id, d: 19, amt: -850,   label: 'Loyer Janvier',           cat: 'Logement' },
    { accountId: bnp.id, d: 18, amt: -92.5,  label: 'EDF Électricité',         cat: 'Logement' },
    { accountId: bnp.id, d: 17, amt: -110.4, label: 'Auchan courses',          cat: 'Alimentation' },
    { accountId: bnp.id, d: 15, amt: -28.5,  label: 'RATP Pass Navigo',        cat: 'Transport' },
    { accountId: bnp.id, d: 14, amt: -65,    label: 'Cinéma UGC sortie',       cat: 'Loisirs' },
    { accountId: bnp.id, d: 12, amt: -15.99, label: 'Netflix abonnement',      cat: 'Loisirs' },
    { accountId: bnp.id, d: 11, amt: -87.3,  label: 'Leclerc courses',         cat: 'Alimentation' },
    { accountId: bnp.id, d:  9, amt: -54,    label: 'Restaurant Sushi',        cat: 'Restaurants' },
    { accountId: bnp.id, d:  7, amt: -200,   label: 'Virement Livret A',       cat: 'Épargne' },
    { accountId: bnp.id, d:  6, amt: -35.8,  label: 'Pharmacie ordonnance',    cat: 'Santé' },
    { accountId: bnp.id, d:  5, amt: -45,    label: 'FNAC livre',              cat: 'Shopping' },
    { accountId: bnp.id, d:  4, amt: -9.99,  label: 'Spotify Premium',         cat: 'Loisirs' },
    { accountId: bnp.id, d:  3, amt: -23.5,  label: 'Boulangerie Paul',        cat: 'Alimentation' },
    { accountId: bnp.id, d:  2, amt: -120,   label: 'Assurance habitation',    cat: 'Logement' },
    { accountId: bnp.id, d:  1, amt: -18,    label: 'McDonald déjeuner',       cat: 'Restaurants' },
    { accountId: bnp.id, d:  0, amt: -67.5,  label: 'Carrefour Market',        cat: 'Alimentation' },
    { accountId: bnp.id, d:  0, amt: -40,    label: 'Concert musique',         cat: 'Loisirs' },
    { accountId: bourso.id, d: 20, amt: 500,  label: 'Virement reçu',          cat: 'Revenus' },
    { accountId: bourso.id, d: 10, amt: -30,  label: 'Amazon Prime',           cat: 'Shopping' },
    { accountId: livret.id, d: 55, amt: 200,  label: 'Virement BNP',           cat: 'Épargne' },
    { accountId: livret.id, d: 30, amt: 200,  label: 'Virement BNP',           cat: 'Épargne' },
    { accountId: livret.id, d:  7, amt: 200,  label: 'Virement BNP',           cat: 'Épargne' },
    { accountId: livret.id, d:  5, amt: 5.2,  label: 'Intérêts Livret A',     cat: 'Revenus' },
  ];

  for (const t of txs) {
    const date = new Date(now); date.setDate(now.getDate() - t.d);
    await prisma.transaction.create({
      data: { accountId: t.accountId, userId: user.id, date, amount: t.amt, label: t.label, cleanLabel: t.label.toLowerCase(), categoryId: catMap[t.cat], categorizationSource: 'RULE', confidenceScore: 0.9, importSource: 'MANUAL', isRecurring: /loyer|salaire|netflix|spotify|navigo/i.test(t.label) },
    });
  }

  await prisma.budget.createMany({ data: [
    { userId: user.id, categoryId: catMap['Alimentation'], limitAmount: 400, period: 'MONTHLY', alertThreshold: 0.8 },
    { userId: user.id, categoryId: catMap['Transport'],    limitAmount: 150, period: 'MONTHLY', alertThreshold: 0.8 },
    { userId: user.id, categoryId: catMap['Loisirs'],      limitAmount: 200, period: 'MONTHLY', alertThreshold: 0.9 },
    { userId: user.id, categoryId: catMap['Restaurants'],  limitAmount: 150, period: 'MONTHLY', alertThreshold: 0.8 },
    { userId: user.id, categoryId: catMap['Shopping'],     limitAmount: 300, period: 'MONTHLY', alertThreshold: 0.85 },
  ]});

  const vacances = await prisma.goal.create({ data: { userId: user.id, name: 'Vacances Grèce', type: 'SAVINGS', targetAmount: 2500, currentAmount: 1550, startDate: new Date('2024-01-01'), endDate: new Date('2024-07-01'), icon: '🏖️' } });
  const urgence  = await prisma.goal.create({ data: { userId: user.id, name: "Fond d'urgence", type: 'EMERGENCY_FUND', targetAmount: 10000, currentAmount: 8400, startDate: new Date('2023-06-01'), icon: '🛡️' } });

  for (let i = 6; i >= 1; i--) {
    const d = new Date(now); d.setMonth(now.getMonth() - i);
    await prisma.goalContribution.createMany({ data: [
      { goalId: vacances.id, amount: 250 + i * 10, date: d },
      { goalId: urgence.id,  amount: 200,           date: d },
    ]});
  }

  await prisma.notification.createMany({ data: [
    { userId: user.id, type: 'BUDGET_ALERT',  title: '⚠️ Budget Alimentation à 87%',   message: 'Il vous reste 52€ sur votre budget alimentation.', status: 'SENT', sentAt: new Date() },
    { userId: user.id, type: 'GOAL_REACHED',  title: "🎯 Fond d'urgence bientôt atteint !", message: "Votre fond d'urgence est à 84%. Encore 1 600€ !", status: 'SENT', sentAt: new Date(now.getTime() - 2 * 86400_000) },
    { userId: user.id, type: 'SYNC_DONE',     title: '✅ Synchronisation terminée',       message: '3 comptes sync — 12 nouvelles transactions.', status: 'READ', readAt: new Date(now.getTime() - 86400_000), sentAt: new Date(now.getTime() - 86400_000) },
  ]});

  console.log('✅ Seed done!');
  console.log('👤 alice@finella.app / Demo1234!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
