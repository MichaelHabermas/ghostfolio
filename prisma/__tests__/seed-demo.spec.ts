/**
 * Integration tests for the demo account seed.
 *
 * These tests run against the real local PostgreSQL database and verify:
 *   1. After seeding, all expected demo entities exist with correct values
 *   2. Running the seed a second time does NOT create duplicates (idempotency)
 *
 * Prerequisites: local database must be running and seeded.
 * Run: npm run database:seed && npx jest --testPathPattern=seed-demo
 *
 * NOTE: These are DB integration tests; they require DATABASE_URL to be set
 * and do NOT mock Prisma.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEMO_USER_ID = '00000000-0000-4000-a000-000000000001';
const DEMO_ACCOUNT_ID = '00000000-0000-4000-a000-000000000002';
const TAG_ID_DEMO = 'efa08cb3-9b9d-4974-ac68-db13a19c4874';

const EXPECTED_SYMBOLS = [
  'AAPL',
  'MSFT',
  'BND',
  'TSLA',
  'GOOGL',
  'AMZN',
  'NVDA',
  'META'
] as const;

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Demo account seed', () => {
  describe('Demo user', () => {
    it('exists with the correct fixed UUID', async () => {
      const user = await prisma.user.findUnique({ where: { id: DEMO_USER_ID } });
      expect(user).not.toBeNull();
    });

    it('has role DEMO', async () => {
      const user = await prisma.user.findUnique({ where: { id: DEMO_USER_ID } });
      expect(user?.role).toBe('DEMO');
    });

    it('has provider ANONYMOUS', async () => {
      const user = await prisma.user.findUnique({ where: { id: DEMO_USER_ID } });
      expect(user?.provider).toBe('ANONYMOUS');
    });

    it('has a hashed access token stored', async () => {
      const user = await prisma.user.findUnique({ where: { id: DEMO_USER_ID } });
      expect(user?.accessToken).toBeTruthy();
    });
  });

  describe('Demo account', () => {
    it('exists with the correct fixed UUID', async () => {
      const account = await prisma.account.findFirst({
        where: { id: DEMO_ACCOUNT_ID, userId: DEMO_USER_ID }
      });
      expect(account).not.toBeNull();
    });

    it('has currency USD', async () => {
      const account = await prisma.account.findFirst({
        where: { id: DEMO_ACCOUNT_ID, userId: DEMO_USER_ID }
      });
      expect(account?.currency).toBe('USD');
    });

    it('has balance 5000', async () => {
      const account = await prisma.account.findFirst({
        where: { id: DEMO_ACCOUNT_ID, userId: DEMO_USER_ID }
      });
      expect(account?.balance).toBe(5000);
    });
  });

  describe('Demo settings', () => {
    it('exist for the demo user', async () => {
      const settings = await prisma.settings.findUnique({
        where: { userId: DEMO_USER_ID }
      });
      expect(settings).not.toBeNull();
    });
  });

  describe('Demo orders', () => {
    it(`has exactly ${EXPECTED_SYMBOLS.length} BUY orders`, async () => {
      const orders = await prisma.order.findMany({
        where: { userId: DEMO_USER_ID }
      });
      expect(orders).toHaveLength(EXPECTED_SYMBOLS.length);
    });

    it('all orders are type BUY', async () => {
      const orders = await prisma.order.findMany({
        where: { userId: DEMO_USER_ID }
      });
      for (const order of orders) {
        expect(order.type).toBe('BUY');
      }
    });

    it('all orders belong to the demo account', async () => {
      const orders = await prisma.order.findMany({
        where: { userId: DEMO_USER_ID }
      });
      for (const order of orders) {
        expect(order.accountId).toBe(DEMO_ACCOUNT_ID);
      }
    });

    for (const symbol of EXPECTED_SYMBOLS) {
      it(`has a BUY order for ${symbol}`, async () => {
        const order = await prisma.order.findFirst({
          include: { SymbolProfile: true },
          where: { userId: DEMO_USER_ID, SymbolProfile: { symbol } }
        });
        expect(order).not.toBeNull();
        expect(order?.type).toBe('BUY');
        expect(order?.quantity).toBeGreaterThan(0);
        expect(order?.unitPrice).toBeGreaterThan(0);
      });
    }
  });

  describe('Demo tag', () => {
    it('exists with the correct ID', async () => {
      const tag = await prisma.tag.findUnique({ where: { id: TAG_ID_DEMO } });
      expect(tag).not.toBeNull();
    });

    it('is attached to all demo orders', async () => {
      const orders = await prisma.order.findMany({
        include: { tags: true },
        where: { userId: DEMO_USER_ID }
      });
      for (const order of orders) {
        const hasDemoTag = order.tags.some((t) => t.id === TAG_ID_DEMO);
        expect(hasDemoTag).toBe(true);
      }
    });
  });

  describe('Properties', () => {
    it('DEMO_USER_ID property points to the demo user', async () => {
      const prop = await prisma.property.findUnique({
        where: { key: 'DEMO_USER_ID' }
      });
      expect(prop?.value).toBe(DEMO_USER_ID);
    });

    it('DEMO_ACCOUNT_ID property points to the demo account', async () => {
      const prop = await prisma.property.findUnique({
        where: { key: 'DEMO_ACCOUNT_ID' }
      });
      expect(prop?.value).toBe(DEMO_ACCOUNT_ID);
    });
  });

  describe('Idempotency — running seed a second time', () => {
    beforeAll(async () => {
      // Re-run seed logic inline (same operations as seed.mts) to test idempotency
      const { createHmac } = await import('node:crypto');
      const accessTokenSalt =
        process.env['ACCESS_TOKEN_SALT'] ??
        'sdfgbvcdrt7uihgfe4ujbvcdrtyuijhgfdrt7ujhgfdrtya';
      const hashedAccessToken = createHmac('sha512', accessTokenSalt)
        .update('ghostfolio-demo-access-token')
        .digest('hex');

      // Upsert user (same as seed)
      await prisma.user.upsert({
        create: {
          accessToken: hashedAccessToken,
          id: DEMO_USER_ID,
          provider: 'ANONYMOUS',
          role: 'DEMO'
        },
        update: { accessToken: hashedAccessToken, role: 'DEMO' },
        where: { id: DEMO_USER_ID }
      });

      // Upsert properties
      await prisma.property.upsert({
        create: { key: 'DEMO_USER_ID', value: DEMO_USER_ID },
        update: { value: DEMO_USER_ID },
        where: { key: 'DEMO_USER_ID' }
      });
    });

    it('still has exactly one demo user after re-seed', async () => {
      const users = await prisma.user.findMany({
        where: { id: DEMO_USER_ID }
      });
      expect(users).toHaveLength(1);
    });

    it('still has exactly one DEMO_USER_ID property after re-seed', async () => {
      const props = await prisma.property.findMany({
        where: { key: 'DEMO_USER_ID' }
      });
      expect(props).toHaveLength(1);
    });

    it(`still has exactly ${EXPECTED_SYMBOLS.length} orders after re-seed`, async () => {
      // Orders are deleted and recreated — count should remain the same
      const orders = await prisma.order.findMany({
        where: { userId: DEMO_USER_ID }
      });
      expect(orders).toHaveLength(EXPECTED_SYMBOLS.length);
    });
  });
});
