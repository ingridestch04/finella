import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import { env } from './env';

const config = new Configuration({
  basePath: PlaidEnvironments[env.PLAID_ENV as keyof typeof PlaidEnvironments] ?? PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': env.PLAID_CLIENT_ID,
      'PLAID-SECRET': env.PLAID_SECRET,
    },
  },
});

export const plaidClient = new PlaidApi(config);
