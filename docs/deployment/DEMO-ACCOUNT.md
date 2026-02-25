# Demo Account — Credentials & Portfolio

> All users and logins (demo, admin, test): [LOGIN-AND-USERS.md](../LOGIN-AND-USERS.md)

---

## Quick start for testers

Open this link in your browser — it logs you in automatically, no password needed:

| Environment | Open this link |
|---|---|
| **Deployed** | <https://ghostfolio-production-e242.up.railway.app/demo> |
| **Local** | <http://localhost:4200/demo> |

Or log in manually with the access token: `ghostfolio-demo-access-token`
(User icon → "Login with access token" → paste the token above.)

---

## Login Methods

### Method 1 — One-click demo link (recommended)

Navigate to the link above for your environment. The app logs you in as the demo user instantly.

### Method 2 — Access token dialog

1. Open the Ghostfolio home page.
2. Click the user icon → "Login with access token".
3. Enter: `ghostfolio-demo-access-token`
4. Check "Stay signed in" if desired.

### Method 3 — API / scripts (not for browser use)

> **You do not need this to use the website.** The URLs below are the backend API server — skip this section if you're only using the UI.

Get a demo JWT from `/api/v1/info` and use it as a Bearer token in API calls:

```bash
# Deployed — API base URL: https://ghostfolio-production-e242.up.railway.app
DEMO_TOKEN=$(curl -s https://ghostfolio-production-e242.up.railway.app/api/v1/info \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['demoAuthToken'])")

# Local — API server runs on port 3333 (not 4200, which is the UI)
# DEMO_TOKEN=$(curl -s http://localhost:3333/api/v1/info | jq -r .demoAuthToken)

curl -X POST https://ghostfolio-production-e242.up.railway.app/api/v1/agent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DEMO_TOKEN" \
  -d '{"query": "What are my holdings?"}'
```

---

## Fetching the Demo JWT

```bash
# Deployed (API base URL: https://ghostfolio-production-e242.up.railway.app)
curl https://ghostfolio-production-e242.up.railway.app/api/v1/info | jq .demoAuthToken

# Local (API server: http://localhost:3333 — not the UI port 4200)
curl http://localhost:3333/api/v1/info | jq .demoAuthToken
```

The `demoAuthToken` is a JWT signed with the server's `JWT_SECRET_KEY`, valid for 180 days.

---

## Demo Portfolio

Pre-populated holdings (all USD, purchased in 2024):

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

If the demo data gets corrupted or deleted:

```bash
# Local
npm run database:seed

# Full reset
npm run database:setup
```

For the deployed instance, the seed runs automatically on every deployment via `docker/entrypoint.sh`. To force a fresh seed without redeploying:

```bash
npx prisma db seed
```

The seed is idempotent — running it multiple times will not create duplicate entries.

---

## Validate Database State

```bash
npm run demo:validate
```

Checks:
- Demo user exists with role `DEMO`
- Demo account exists with correct currency and balance
- All 8 BUY orders are present with correct symbols and quantities
- `DEMO_USER_ID` and `DEMO_ACCOUNT_ID` properties are set correctly
