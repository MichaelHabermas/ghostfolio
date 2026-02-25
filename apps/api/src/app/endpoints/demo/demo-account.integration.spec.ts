/**
 * Integration tests for the demo account — API layer.
 *
 * These tests hit the running local API server (http://localhost:3333) and verify:
 *   1. /api/v1/info returns a valid demo JWT
 *   2. The JWT decodes to the expected demo user ID
 *   3. The demo JWT can authenticate against portfolio/holdings
 *   4. The demo JWT can authenticate against the agent endpoint
 *
 * Prerequisites:
 *   - Local API server must be running: npm run start:server
 *   - Database must be seeded:           npm run database:seed
 *
 * Run: npx jest --testPathPattern=demo-account.integration
 */

import * as http from 'node:http';

const BASE_URL = process.env['DEMO_TEST_BASE_URL'] ?? 'http://localhost:3333';
const DEMO_USER_ID = '00000000-0000-4000-a000-000000000001';
const TEST_SESSION_ID = '550e8400-e29b-41d4-a716-446655440099';

const EXPECTED_SYMBOLS = ['AAPL', 'MSFT', 'BND', 'TSLA', 'GOOGL', 'AMZN', 'NVDA', 'META'];

function get(url: string, token?: string): Promise<{ status: number; body: unknown }> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options: http.RequestOptions = {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'Content-Type': 'application/json'
      },
      hostname: parsedUrl.hostname,
      method: 'GET',
      path: parsedUrl.pathname + parsedUrl.search,
      port: parsedUrl.port || 80
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ body: JSON.parse(data), status: res.statusCode ?? 0 });
        } catch {
          resolve({ body: data, status: res.statusCode ?? 0 });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function post(
  url: string,
  payload: unknown,
  token: string
): Promise<{ status: number; body: unknown }> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const body = JSON.stringify(payload);
    const options: http.RequestOptions = {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Length': Buffer.byteLength(body),
        'Content-Type': 'application/json'
      },
      hostname: parsedUrl.hostname,
      method: 'POST',
      path: parsedUrl.pathname + parsedUrl.search,
      port: parsedUrl.port || 80
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ body: JSON.parse(data), status: res.statusCode ?? 0 });
        } catch {
          resolve({ body: data, status: res.statusCode ?? 0 });
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT');
  return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
}

describe('Demo account — API integration', () => {
  let demoAuthToken: string;

  beforeAll(async () => {
    const result = await get(`${BASE_URL}/api/v1/info`);
    expect(result.status).toBe(200);
    const info = result.body as Record<string, unknown>;
    expect(typeof info['demoAuthToken']).toBe('string');
    demoAuthToken = info['demoAuthToken'] as string;
  }, 15000);

  describe('/api/v1/info', () => {
    it('returns HTTP 200', async () => {
      const result = await get(`${BASE_URL}/api/v1/info`);
      expect(result.status).toBe(200);
    });

    it('includes a non-empty demoAuthToken field', async () => {
      const result = await get(`${BASE_URL}/api/v1/info`);
      const info = result.body as Record<string, unknown>;
      expect(info['demoAuthToken']).toBeTruthy();
    });

    it('demoAuthToken is a well-formed JWT (3 base64url parts)', () => {
      expect(demoAuthToken.split('.').length).toBe(3);
    });

    it('JWT payload contains the expected demo user ID', () => {
      const payload = decodeJwtPayload(demoAuthToken);
      expect(payload['id']).toBe(DEMO_USER_ID);
    });
  });

  describe('/api/v1/portfolio/holdings (authenticated as demo user)', () => {
    let holdingsBody: Record<string, unknown>;
    let holdingSymbols: string[];

    beforeAll(async () => {
      const result = await get(`${BASE_URL}/api/v1/portfolio/holdings`, demoAuthToken);
      expect(result.status).toBe(200);
      holdingsBody = result.body as Record<string, unknown>;
      // Holdings is an array of objects each with a `symbol` field
      const holdingsArr = holdingsBody['holdings'] as Array<{ symbol: string }>;
      holdingSymbols = holdingsArr.map((h) => h.symbol);
    }, 30000);

    it('returns HTTP 200', async () => {
      const result = await get(`${BASE_URL}/api/v1/portfolio/holdings`, demoAuthToken);
      expect(result.status).toBe(200);
    });

    it('returns a holdings array with 8 entries', () => {
      const holdings = holdingsBody['holdings'] as unknown[];
      expect(Array.isArray(holdings)).toBe(true);
      expect(holdings).toHaveLength(EXPECTED_SYMBOLS.length);
    });

    for (const symbol of EXPECTED_SYMBOLS) {
      it(`holdings include ${symbol}`, () => {
        expect(holdingSymbols).toContain(symbol);
      });
    }
  });

  describe('/api/v1/agent (authenticated as demo user)', () => {
    it('returns HTTP 200 for a holdings query', async () => {
      const result = await post(
        `${BASE_URL}/api/v1/agent`,
        { query: 'What are my holdings?', sessionId: TEST_SESSION_ID },
        demoAuthToken
      );
      expect(result.status).toBe(200);
    }, 60000);

    it('response contains a non-empty narrative', async () => {
      const result = await post(
        `${BASE_URL}/api/v1/agent`,
        { query: 'What are my holdings?', sessionId: TEST_SESSION_ID },
        demoAuthToken
      );
      const body = result.body as Record<string, unknown>;
      expect(typeof body['response']).toBe('string');
      expect((body['response'] as string).length).toBeGreaterThan(50);
    }, 60000);

    it('sources array is present', async () => {
      const result = await post(
        `${BASE_URL}/api/v1/agent`,
        { query: 'What are my holdings?', sessionId: TEST_SESSION_ID },
        demoAuthToken
      );
      const body = result.body as Record<string, unknown>;
      expect(Array.isArray(body['sources'])).toBe(true);
    }, 60000);
  });
});
