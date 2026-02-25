import 'dotenv/config';
import { createHmac } from 'node:crypto';

import {
  AssetClass,
  AssetSubClass,
  DataSource,
  PrismaClient,
  Provider,
  Role,
  Type
} from '@prisma/client';

const prisma = new PrismaClient();

// ─── Constants ───────────────────────────────────────────────────────────────

const TAG_ID_DEMO = 'efa08cb3-9b9d-4974-ac68-db13a19c4874';
const TAG_ID_EMERGENCY_FUND = '4452656d-9fa4-4bd0-ba38-70492e31d180';
const TAG_ID_EXCLUDE_FROM_ANALYSIS = 'f2e868af-8333-459f-b161-cbc6544c24bd';

export const DEMO_USER_ID = '00000000-0000-4000-a000-000000000001';
export const DEMO_ACCOUNT_ID = '00000000-0000-4000-a000-000000000002';

/**
 * The plain-text access token testers use to log in via the access-token
 * dialog.  The hash of this value (computed with ACCESS_TOKEN_SALT) is stored
 * in User.accessToken.
 */
export const DEMO_ACCESS_TOKEN_PLAIN = 'ghostfolio-demo-access-token';

// ─── Helper ──────────────────────────────────────────────────────────────────

function hashAccessToken(plain: string, salt: string): string {
  return createHmac('sha512', salt).update(plain).digest('hex');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Seed standard tags ─────────────────────────────────────────────────────
  await prisma.tag.createMany({
    data: [
      { id: TAG_ID_EMERGENCY_FUND, name: 'EMERGENCY_FUND' },
      { id: TAG_ID_EXCLUDE_FROM_ANALYSIS, name: 'EXCLUDE_FROM_ANALYSIS' },
      { id: TAG_ID_DEMO, name: 'DEMO' }
    ],
    skipDuplicates: true
  });

  // 2. Demo user ───────────────────────────────────────────────────────────────
  const accessTokenSalt =
    process.env['ACCESS_TOKEN_SALT'] ??
    'sdfgbvcdrt7uihgfe4ujbvcdrtyuijhgfdrt7ujhgfdrtya';

  const hashedAccessToken = hashAccessToken(
    DEMO_ACCESS_TOKEN_PLAIN,
    accessTokenSalt
  );

  await prisma.user.upsert({
    create: {
      accessToken: hashedAccessToken,
      id: DEMO_USER_ID,
      provider: Provider.ANONYMOUS,
      role: Role.DEMO
    },
    update: {
      accessToken: hashedAccessToken,
      role: Role.DEMO
    },
    where: { id: DEMO_USER_ID }
  });

  // 3. Demo account ────────────────────────────────────────────────────────────
  // Account uses a composite PK [id, userId] so upsert targets both.
  const existingAccount = await prisma.account.findFirst({
    where: { id: DEMO_ACCOUNT_ID, userId: DEMO_USER_ID }
  });

  if (!existingAccount) {
    await prisma.account.create({
      data: {
        balance: 5000,
        currency: 'USD',
        id: DEMO_ACCOUNT_ID,
        name: 'Demo Portfolio',
        userId: DEMO_USER_ID
      }
    });
  } else {
    await prisma.account.update({
      data: { balance: 5000, currency: 'USD', name: 'Demo Portfolio' },
      where: { id_userId: { id: DEMO_ACCOUNT_ID, userId: DEMO_USER_ID } }
    });
  }

  // 4. Demo user settings ──────────────────────────────────────────────────────
  await prisma.settings.upsert({
    create: {
      settings: { baseCurrency: 'USD', language: 'en', viewMode: 'DEFAULT' },
      userId: DEMO_USER_ID
    },
    update: {
      settings: { baseCurrency: 'USD', language: 'en', viewMode: 'DEFAULT' }
    },
    where: { userId: DEMO_USER_ID }
  });

  // 5. Symbol profiles ─────────────────────────────────────────────────────────
  const symbolProfiles = [
    {
      assetClass: AssetClass.EQUITY,
      assetSubClass: AssetSubClass.STOCK,
      currency: 'USD',
      dataSource: DataSource.YAHOO,
      name: 'Apple Inc.',
      symbol: 'AAPL'
    },
    {
      assetClass: AssetClass.EQUITY,
      assetSubClass: AssetSubClass.STOCK,
      currency: 'USD',
      dataSource: DataSource.YAHOO,
      name: 'Microsoft Corp.',
      symbol: 'MSFT'
    },
    {
      assetClass: AssetClass.FIXED_INCOME,
      assetSubClass: AssetSubClass.ETF,
      currency: 'USD',
      dataSource: DataSource.YAHOO,
      name: 'Vanguard Total Bond Market ETF',
      symbol: 'BND'
    },
    {
      assetClass: AssetClass.EQUITY,
      assetSubClass: AssetSubClass.STOCK,
      currency: 'USD',
      dataSource: DataSource.YAHOO,
      name: 'Tesla Inc.',
      symbol: 'TSLA'
    },
    {
      assetClass: AssetClass.EQUITY,
      assetSubClass: AssetSubClass.STOCK,
      currency: 'USD',
      dataSource: DataSource.YAHOO,
      name: 'Alphabet Inc.',
      symbol: 'GOOGL'
    },
    {
      assetClass: AssetClass.EQUITY,
      assetSubClass: AssetSubClass.STOCK,
      currency: 'USD',
      dataSource: DataSource.YAHOO,
      name: 'Amazon.com Inc.',
      symbol: 'AMZN'
    },
    {
      assetClass: AssetClass.EQUITY,
      assetSubClass: AssetSubClass.STOCK,
      currency: 'USD',
      dataSource: DataSource.YAHOO,
      name: 'NVIDIA Corp.',
      symbol: 'NVDA'
    },
    {
      assetClass: AssetClass.EQUITY,
      assetSubClass: AssetSubClass.STOCK,
      currency: 'USD',
      dataSource: DataSource.YAHOO,
      name: 'Meta Platforms Inc.',
      symbol: 'META'
    }
  ];

  for (const sp of symbolProfiles) {
    await prisma.symbolProfile.upsert({
      create: sp,
      update: { assetClass: sp.assetClass, assetSubClass: sp.assetSubClass, name: sp.name },
      where: { dataSource_symbol: { dataSource: sp.dataSource, symbol: sp.symbol } }
    });
  }

  // 6. Demo orders (activities) ────────────────────────────────────────────────
  // Resolve symbol profile IDs
  const profiles = await prisma.symbolProfile.findMany({
    select: { id: true, symbol: true },
    where: {
      dataSource: DataSource.YAHOO,
      symbol: { in: symbolProfiles.map((s) => s.symbol) }
    }
  });

  const profileMap = Object.fromEntries(profiles.map((p) => [p.symbol, p.id]));

  const orders: {
    date: Date;
    fee: number;
    quantity: number;
    symbol: string;
    unitPrice: number;
  }[] = [
    { date: new Date('2024-01-15'), fee: 0, quantity: 100, symbol: 'AAPL', unitPrice: 150 },
    { date: new Date('2024-01-15'), fee: 0, quantity: 50, symbol: 'MSFT', unitPrice: 300 },
    { date: new Date('2024-01-15'), fee: 0, quantity: 200, symbol: 'BND', unitPrice: 73 },
    { date: new Date('2024-02-01'), fee: 0, quantity: 25, symbol: 'TSLA', unitPrice: 250 },
    { date: new Date('2024-02-01'), fee: 0, quantity: 30, symbol: 'GOOGL', unitPrice: 175 },
    { date: new Date('2024-02-01'), fee: 0, quantity: 20, symbol: 'AMZN', unitPrice: 185 },
    { date: new Date('2024-03-01'), fee: 0, quantity: 40, symbol: 'NVDA', unitPrice: 130 },
    { date: new Date('2024-03-01'), fee: 0, quantity: 15, symbol: 'META', unitPrice: 500 }
  ];

  // Delete existing demo user orders for idempotency, then recreate
  await prisma.order.deleteMany({ where: { userId: DEMO_USER_ID } });

  for (const order of orders) {
    const symbolProfileId = profileMap[order.symbol];
    if (!symbolProfileId) {
      console.warn(`Symbol profile not found for ${order.symbol}, skipping`);
      continue;
    }

    await prisma.order.create({
      data: {
        accountId: DEMO_ACCOUNT_ID,
        accountUserId: DEMO_USER_ID,
        date: order.date,
        fee: order.fee,
        quantity: order.quantity,
        symbolProfileId,
        tags: { connect: [{ id: TAG_ID_DEMO }] },
        type: Type.BUY,
        unitPrice: order.unitPrice,
        userId: DEMO_USER_ID
      }
    });
  }

  // 7. Properties (DEMO_USER_ID + DEMO_ACCOUNT_ID) ───────────────────────────
  await prisma.property.upsert({
    create: { key: 'DEMO_USER_ID', value: DEMO_USER_ID },
    update: { value: DEMO_USER_ID },
    where: { key: 'DEMO_USER_ID' }
  });

  await prisma.property.upsert({
    create: { key: 'DEMO_ACCOUNT_ID', value: DEMO_ACCOUNT_ID },
    update: { value: DEMO_ACCOUNT_ID },
    where: { key: 'DEMO_ACCOUNT_ID' }
  });

  // 8. OpenRouter API key (from OPENROUTER_API_KEY env var) ──────────────────
  // This allows Railway to inject the key at startup without storing it in code.
  const openRouterApiKey = process.env['OPENROUTER_API_KEY'];

  if (openRouterApiKey) {
    await prisma.property.upsert({
      create: { key: 'API_KEY_OPENROUTER', value: openRouterApiKey },
      update: { value: openRouterApiKey },
      where: { key: 'API_KEY_OPENROUTER' }
    });
    console.log('OpenRouter API key set from OPENROUTER_API_KEY env var.');
  } else {
    console.log(
      'OPENROUTER_API_KEY env var not set — skipping. Set it in Railway variables to enable the agent.'
    );
  }

  console.log('Seed completed successfully.');
  console.log(`Demo user ID:      ${DEMO_USER_ID}`);
  console.log(`Demo account ID:   ${DEMO_ACCOUNT_ID}`);
  console.log(`Demo access token: ${DEMO_ACCESS_TOKEN_PLAIN}`);
  console.log(`Demo login URL:    <base-url>/demo`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
