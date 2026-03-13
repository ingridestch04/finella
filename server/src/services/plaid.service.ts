import { CountryCode, Products } from 'plaid';
import { plaidClient } from '../config/plaid';
import { prisma } from '../config/database';
import { encrypt, decrypt } from './encryption.service';
import { categorizeTransaction } from './categorization.service';
import { v4 as uuidv4 } from 'uuid';

/** Crée un link_token pour initialiser Plaid Link côté frontend */
export async function createLinkToken(userId: string) {
  const response = await plaidClient.linkTokenCreate({
    user: { client_user_id: userId },
    client_name: 'finella',
    products: [Products.Transactions],
    country_codes: [CountryCode.Fr, CountryCode.Gb],
    language: 'fr',
    // Institutions supportées incluant Revolut
    institution_id: undefined,
  });
  return response.data.link_token;
}

/** Échange le public_token contre un access_token permanent et crée le compte en DB */
export async function exchangePublicToken(userId: string, publicToken: string, metadata: {
  institution?: { name?: string; institution_id?: string };
  accounts?: Array<{ id: string; name: string; type: string; subtype: string; mask?: string }>;
}) {
  const exchangeResponse = await plaidClient.itemPublicTokenExchange({ public_token: publicToken });
  const { access_token, item_id } = exchangeResponse.data;

  const institutionName = metadata.institution?.name ?? 'Banque Plaid';
  const plaidAccounts = metadata.accounts ?? [];

  const created = [];

  for (const acc of plaidAccounts) {
    // Vérifier si ce compte Plaid existe déjà
    const existing = await prisma.bankAccount.findFirst({
      where: { userId, externalId: acc.id } as never,
    });
    if (existing) continue;

    // Mapper le type Plaid vers notre enum
    const accountType = mapAccountType(acc.type, acc.subtype);
    const provider = detectProvider(institutionName);

    const newAccount = await prisma.bankAccount.create({
      data: {
        userId,
        provider,
        label: `${institutionName} — ${acc.name}`,
        type: accountType,
        ibanMasked: acc.mask ? `****${acc.mask}` : null,
        currency: 'EUR',
        balance: 0,
        accessTokenEnc: encrypt(access_token),
        isActive: true,
        metadata: { plaidItemId: item_id, plaidAccountId: acc.id },
      } as never,
    });
    created.push(newAccount);
  }

  // Si aucun compte dans metadata, créer un compte générique
  if (plaidAccounts.length === 0) {
    const newAccount = await prisma.bankAccount.create({
      data: {
        userId,
        provider: detectProvider(institutionName),
        label: institutionName,
        type: 'CHECKING',
        currency: 'EUR',
        balance: 0,
        accessTokenEnc: encrypt(access_token),
        isActive: true,
      },
    });
    created.push(newAccount);
  }

  return created;
}

/** Synchronise les transactions d'un compte Plaid */
export async function syncPlaidTransactions(accountId: string, userId: string) {
  const account = await prisma.bankAccount.findFirst({
    where: { id: accountId, userId },
  });
  if (!account || !account.accessTokenEnc) throw new Error('No Plaid access token for this account');

  const accessToken = decrypt(account.accessTokenEnc);

  // Récupérer les transactions des 90 derniers jours
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 90 * 86400 * 1000).toISOString().split('T')[0];

  const response = await plaidClient.transactionsGet({
    access_token: accessToken,
    start_date: startDate,
    end_date: endDate,
    options: { count: 500, offset: 0 },
  });

  const { transactions, accounts } = response.data;

  // Mettre à jour le solde du compte
  const plaidAccountId = (account as never as { metadata?: { plaidAccountId?: string } }).metadata?.plaidAccountId;
  const matchingAccount = accounts.find((a) => a.account_id === plaidAccountId);
  if (matchingAccount?.balances.current !== undefined) {
    await prisma.bankAccount.update({
      where: { id: accountId },
      data: { balance: matchingAccount.balances.current ?? 0, lastSyncedAt: new Date() },
    });
  }

  let imported = 0;
  let skipped = 0;

  for (const tx of transactions) {
    if (tx.pending) { skipped++; continue; } // Ignorer les transactions en attente

    const externalId = tx.transaction_id;
    const exists = await prisma.transaction.findFirst({ where: { accountId, externalId } });
    if (exists) { skipped++; continue; }

    const amount = -tx.amount; // Plaid: dépenses = positif, on inverse
    const label = tx.name;
    const date = new Date(tx.date);

    const { categoryId, source, confidence } = await categorizeTransaction(userId, label);

    await prisma.transaction.create({
      data: {
        accountId,
        userId,
        externalId,
        date,
        amount,
        currency: tx.iso_currency_code ?? 'EUR',
        label,
        cleanLabel: label.toLowerCase(),
        categoryId,
        categorizationSource: source,
        confidenceScore: confidence,
        importSource: 'PLAID',
        importBatchId: uuidv4(),
        metadata: {
          plaidCategory: tx.category ?? [],
          merchantName: tx.merchant_name ?? null,
          location: tx.location ?? null,
        },
      },
    });
    imported++;
  }

  // Créer une notification
  await prisma.notification.create({
    data: {
      userId,
      type: 'SYNC_DONE',
      title: 'Sync Plaid terminée',
      message: `${imported} nouvelle(s) transaction(s) importée(s) depuis ${account.label}.`,
    },
  });

  return { imported, skipped, total: transactions.length };
}

function mapAccountType(type: string, subtype: string): 'CHECKING' | 'SAVINGS' | 'INVESTMENT' | 'CREDIT' {
  if (type === 'credit') return 'CREDIT';
  if (subtype === 'savings' || subtype === 'money market') return 'SAVINGS';
  if (type === 'investment' || type === 'brokerage') return 'INVESTMENT';
  return 'CHECKING';
}

function detectProvider(name: string): 'REVOLUT' | 'BNP' | 'SOCIETE_GENERALE' | 'CREDIT_AGRICOLE' | 'BOURSORAMA' | 'N26' | 'PLAID' {
  const n = name.toLowerCase();
  if (n.includes('revolut')) return 'REVOLUT';
  if (n.includes('bnp')) return 'BNP';
  if (n.includes('société générale') || n.includes('societe generale')) return 'SOCIETE_GENERALE';
  if (n.includes('crédit agricole') || n.includes('credit agricole')) return 'CREDIT_AGRICOLE';
  if (n.includes('boursorama')) return 'BOURSORAMA';
  if (n.includes('n26')) return 'N26';
  return 'PLAID';
}
