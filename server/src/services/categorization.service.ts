import { prisma } from '../config/database';

const RULES: Array<{ patterns: RegExp[]; name: string }> = [
  { patterns: [/carrefour|leclerc|aldi|lidl|monoprix|franprix|supermarché|auchan/i], name: 'Alimentation' },
  { patterns: [/sncf|ratp|vélib|uber|taxi|parking|essence|total/i], name: 'Transport' },
  { patterns: [/cinema|netflix|spotify|amazon prime|disney|concert|théâtre/i], name: 'Loisirs' },
  { patterns: [/pharmacie|médecin|docteur|hopital|mutuelle/i], name: 'Santé' },
  { patterns: [/loyer|edf|gaz|internet|sfr|orange|bouygues|assurance/i], name: 'Logement' },
  { patterns: [/amazon|fnac|darty|decathlon|zara|h&m/i], name: 'Shopping' },
  { patterns: [/restaurant|brasserie|mcdonald|burger|pizza|kebab|sushi/i], name: 'Restaurants' },
];

export async function categorizeTransaction(userId: string, label: string): Promise<{ categoryId: string | null; source: 'RULE' | 'MANUAL'; confidence: number }> {
  const cats = await prisma.category.findMany({ where: { userId } });
  const map = Object.fromEntries(cats.map((c) => [c.name, c.id]));

  for (const rule of RULES) {
    if (rule.patterns.some((p) => p.test(label))) {
      return { categoryId: map[rule.name] ?? null, source: 'RULE', confidence: 0.85 };
    }
  }
  return { categoryId: null, source: 'MANUAL', confidence: 0 };
}

export async function ensureSystemCategories(userId: string): Promise<void> {
  const cats = [
    { name: 'Alimentation', emoji: '🛒', color: '#22c55e' }, { name: 'Transport', emoji: '🚗', color: '#3b82f6' },
    { name: 'Loisirs', emoji: '🎭', color: '#f59e0b' },      { name: 'Santé', emoji: '💊', color: '#ef4444' },
    { name: 'Logement', emoji: '🏠', color: '#8b5cf6' },     { name: 'Shopping', emoji: '🛍️', color: '#ec4899' },
    { name: 'Restaurants', emoji: '🍽️', color: '#f97316' }, { name: 'Revenus', emoji: '💰', color: '#10b981' },
    { name: 'Épargne', emoji: '🏦', color: '#6366f1' },      { name: 'Divers', emoji: '📦', color: '#6b7280' },
  ];

  await prisma.category.createMany({
    data: cats.map((c) => ({ ...c, userId, isSystem: true })),
    skipDuplicates: true,
  });
}
