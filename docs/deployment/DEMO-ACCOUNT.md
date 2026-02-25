# Demo Account — Credentials & Portfolio

This document describes the shared demo account available on both the local dev server and the deployed Railway instance.
All testers use the same credentials so they evaluate the agent against identical data.

---

## Deployed Instance

| Field | Value |
|---|---|
| **Base URL** | `https://ghostfolio-production-e242.up.railway.app` |
| **Demo login URL** | `https://ghostfolio-production-e242.up.railway.app/demo` |
| **Access token (for access-token dialog)** | `ghostfolio-demo-access-token` |
| **JWT (for API calls)** | Fetch dynamically — see [Fetching the Demo JWT](#fetching-the-demo-jwt) |

## Local Dev Instance

| Field | Value |
|---|---|
| **Base URL** | `http://localhost:3333` |
| **Demo login URL** | `http://localhost:4200/demo` |
| **Access token (for access-token dialog)** | `ghostfolio-demo-access-token` |

---

## Login Methods

### Method 1 — One-click demo URL (recommended for testers)

Visit the demo URL for your environment. The page automatically logs you in with the demo JWT — no password required.

- Local: `http://localhost:4200/demo`
- Deployed: `https://ghostfolio-production-e242.up.railway.app/demo`

### Method 2 — Access token dialog

1. Open the Ghostfolio home page.
2. Click the user icon → "Login with access token".
3. Enter: `ghostfolio-demo-access-token`
4. Check "Stay signed in" if desired.

### Method 3 — Direct API access

Use the demo JWT from `/api/v1/info` to authenticate API requests:

```bash
# 1. Fetch the demo JWT
DEMO_TOKEN=$(curl -s https://ghostfolio-production-e242.up.railway.app/api/v1/info \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['demoAuthToken'])")

# 2. Use it to query the agent
curl -X POST https://ghostfolio-production-e242.up.railway.app/api/v1/agent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DEMO_TOKEN" \
  -d '{"query": "What are my holdings?"}'
```

---

## Fetching the Demo JWT

```bash
# Deployed
curl https://ghostfolio-production-e242.up.railway.app/api/v1/info | jq .demoAuthToken

# Local
curl http://localhost:3333/api/v1/info | jq .demoAuthToken
```

The `demoAuthToken` field contains a valid JWT signed with the server's `JWT_SECRET_KEY` and valid for 180 days.

---

## Demo Portfolio

The demo account contains the following pre-populated holdings (all USD, purchased in 2024):

| Symbol | Name | Shares | Avg Cost | Purchase Date |
|---|---|---|---|---|
| AAPL | Apple Inc. | 100 | $150.00 | 2024-01-15 |
| MSFT | Microsoft Corp. | 50 | $300.00 | 2024-01-15 |
| BND | Vanguard Total Bond Market ETF | 200 | $73.00 | 2024-01-15 |
| TSLA | Tesla Inc. | 25 | $250.00 | 2024-02-01 |
| GOOGL | Alphabet Inc. | 30 | $175.00 | 2024-02-01 |
| AMZN | Amazon.com Inc. | 20 | $185.00 | 2024-02-01 |
| NVDA | NVIDIA Corp. | 40 | $130.00 | 2024-03-01 |
| META | Meta Platforms Inc. | 15 | $500.00 | 2024-03-01 |
| USD | Cash | — | — | — |

**Account cash balance:** $5,000 USD

**Total cost basis (equities):** $62,800

---

## Internal IDs (for debugging)

| Entity | ID |
|---|---|
| Demo user ID | `00000000-0000-4000-a000-000000000001` |
| Demo account ID | `00000000-0000-4000-a000-000000000002` |
| Demo tag ID | `efa08cb3-9b9d-4974-ac68-db13a19c4874` |

---

## Refreshing / Re-seeding

If the demo data gets corrupted or deleted, run the seed script to restore it:

```bash
# Local
npm run database:seed

# Or full reset
npm run database:setup
```

For the deployed instance, the seed runs automatically on every deployment via the entrypoint script (`docker/entrypoint.sh`). To force a fresh seed without redeploying, use the Railway CLI or console to run:

```bash
npx prisma db seed
```

The seed is idempotent — running it multiple times will not create duplicate entries.

---

## Validate Database State

Run the validation script to confirm the demo account is correctly set up:

```bash
npm run demo:validate
```

This checks:
- Demo user exists with role `DEMO`
- Demo account exists with correct currency and balance
- All 8 BUY orders are present with correct symbols and quantities
- `DEMO_USER_ID` and `DEMO_ACCOUNT_ID` properties are set correctly
