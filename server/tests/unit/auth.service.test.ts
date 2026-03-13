import { hashEmail } from '../../src/services/encryption.service';

// Set env vars before importing auth service
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.JWT_SECRET = 'test-jwt-secret-at-least-32-characters-long';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-at-least-32-chars!!';
process.env.ENCRYPTION_KEY = '0000000000000000000000000000000000000000000000000000000000000000';
process.env.HMAC_SECRET = 'test-hmac-secret-key-16';
process.env.NODE_ENV = 'test';

describe('encryption.service', () => {
  test('hashEmail produces consistent hmac', () => {
    const { hmac: h1 } = hashEmail('Alice@Example.COM');
    const { hmac: h2 } = hashEmail('alice@example.com');
    expect(h1).toBe(h2);
  });

  test('hashEmail produces different encrypted values (random IV)', () => {
    const { encrypted: e1 } = hashEmail('test@test.com');
    const { encrypted: e2 } = hashEmail('test@test.com');
    // IV is random so ciphertext differs
    expect(e1).not.toBe(e2);
  });

  test('encrypted email can be decrypted', () => {
    const { decrypt } = require('../../src/services/encryption.service');
    const { encrypted } = hashEmail('user@finella.app');
    expect(decrypt(encrypted)).toBe('user@finella.app');
  });
});

describe('categorization.service rules', () => {
  test('maps carrefour to Alimentation', async () => {
    // Mock prisma
    jest.mock('../../src/config/database', () => ({
      prisma: { category: { findMany: jest.fn().mockResolvedValue([
        { id: 'cat-1', name: 'Alimentation', userId: 'u1' },
      ])}},
    }));
    const { categorizeTransaction } = require('../../src/services/categorization.service');
    const r = await categorizeTransaction('u1', 'Carrefour Market Courses');
    expect(r.source).toBe('RULE');
    expect(r.confidence).toBeGreaterThan(0);
  });
});
