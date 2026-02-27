/**
 * Validates that the demo account is correctly seeded in the database.
 *
 * Run with: npm run demo:validate
 */

import { PrismaClient } from '@prisma/client';

import { DEMO_ACCOUNT_ID, DEMO_USER_ID } from './seed.mjs';

const prisma = new PrismaClient();

const EXPECTED_SYMBOLS = [
  'AAPL',
  'MSFT',
  'BND',
  'TSLA',
  'GOOGL',
  'AMZN',
  'NVDA',
  'META'
];

type CheckResult = { label: string; pass: boolean; detail?: string };

function check(label: string, condition: boolean, detail?: string): CheckResult {
  return { detail, label, pass: condition };
}

async function main() {
  const results: CheckResult[] = [];

  // ── 1. Demo user ────────────────────────────────────────────────────────────
  const user = await prisma.user.findUnique({ where: { id: DEMO_USER_ID } });
  results.push(check('Demo user exists', !!user));
  results.push(
    check(
      'Demo user has DEMO role',
      user?.role === 'DEMO',
      `actual role: ${user?.role ?? 'N/A'}`
    )
  );
  results.push(
    check(
      'Demo user has ANONYMOUS provider',
      user?.provider === 'ANONYMOUS',
      `actual provider: ${user?.provider ?? 'N/A'}`
    )
  );
  results.push(
    check(
      'Demo user has accessToken set',
      !!user?.accessToken,
      user?.accessToken ? '[hashed — present]' : 'null'
    )
  );

  // ── 2. Demo account ─────────────────────────────────────────────────────────
  const account = await prisma.account.findFirst({
    where: { id: DEMO_ACCOUNT_ID, userId: DEMO_USER_ID }
  });
  results.push(check('Demo account exists', !!account));
  results.push(
    check(
      'Demo account currency is USD',
      account?.currency === 'USD',
      `actual currency: ${account?.currency ?? 'N/A'}`
    )
  );
  results.push(
    check(
      'Demo account balance is 5000',
      account?.balance === 5000,
      `actual balance: ${account?.balance ?? 'N/A'}`
    )
  );

  // ── 3. Demo settings ────────────────────────────────────────────────────────
  const settings = await prisma.settings.findUnique({
    where: { userId: DEMO_USER_ID }
  });
  results.push(check('Demo user settings exist', !!settings));

  // ── 4. Demo orders ──────────────────────────────────────────────────────────
  const orders = await prisma.order.findMany({
    include: { SymbolProfile: true },
    where: { userId: DEMO_USER_ID }
  });

  results.push(
    check(
      `${EXPECTED_SYMBOLS.length} BUY orders exist`,
      orders.length === EXPECTED_SYMBOLS.length,
      `actual count: ${orders.length}`
    )
  );

  for (const symbol of EXPECTED_SYMBOLS) {
    const order = orders.find((o) => o.SymbolProfile.symbol === symbol);
    results.push(
      check(
        `Order exists for ${symbol}`,
        !!order,
        order ? `qty: ${order.quantity}, price: ${order.unitPrice}` : 'missing'
      )
    );
    if (order) {
      results.push(
        check(
          `${symbol} order is type BUY`,
          order.type === 'BUY',
          `actual type: ${order.type}`
        )
      );
    }
  }

  // ── 5. Properties ───────────────────────────────────────────────────────────
  const demoUserIdProp = await prisma.property.findUnique({
    where: { key: 'DEMO_USER_ID' }
  });
  results.push(
    check(
      'Property DEMO_USER_ID is set',
      demoUserIdProp?.value === DEMO_USER_ID,
      `actual: ${demoUserIdProp?.value ?? 'N/A'}`
    )
  );

  const demoAccountIdProp = await prisma.property.findUnique({
    where: { key: 'DEMO_ACCOUNT_ID' }
  });
  results.push(
    check(
      'Property DEMO_ACCOUNT_ID is set',
      demoAccountIdProp?.value === DEMO_ACCOUNT_ID,
      `actual: ${demoAccountIdProp?.value ?? 'N/A'}`
    )
  );

  // ── 6. Demo tag ─────────────────────────────────────────────────────────────
  const demoTag = await prisma.tag.findUnique({
    where: { id: 'efa08cb3-9b9d-4974-ac68-db13a19c4874' }
  });
  results.push(check('Demo tag exists', !!demoTag, `name: ${demoTag?.name ?? 'N/A'}`));

  // ── Report ──────────────────────────────────────────────────────────────────
  console.log('\n=== Demo Account Validation ===\n');

  let passed = 0;
  let failed = 0;

  for (const r of results) {
    const icon = r.pass ? '✓' : '✗';
    const detail = r.detail ? `  (${r.detail})` : '';
    console.log(`  ${icon} ${r.label}${detail}`);
    r.pass ? passed++ : failed++;
  }

  console.log(`\n  ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    console.error('VALIDATION FAILED — run `npm run database:seed` to restore demo data.');
    process.exit(1);
  } else {
    console.log('VALIDATION PASSED — demo account is correctly seeded.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
