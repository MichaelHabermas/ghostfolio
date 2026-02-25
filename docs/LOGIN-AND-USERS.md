# Login & Users — Quick Reference

All accounts for this project in one place.

> Full demo portfolio details, re-seed, and validation: [DEMO-ACCOUNT.md](deployment/DEMO-ACCOUNT.md)
> Full deployment guide: [RAILWAY.md](deployment/RAILWAY.md)

---

## Quick Reference

| User | Details |
|---|---|
| **Demo** | [See below](#demo-user) |
| **Admin** | [See below](#admin-user) |
| **Test user** | [See below](#test-user-optional) |

---

## Demo User

The shared demo account for testers. Use it to evaluate the agent against pre-populated portfolio data.

### Using the app in a browser

**Option 1 — One click (fastest):**

| Environment | Open this link |
|---|---|
| **Deployed** | <https://ghostfolio-production-e242.up.railway.app/demo> |
| **Local** | <http://localhost:4200/demo> |

Navigating to `/demo` logs you in automatically — no password required.

**Option 2 — Access token dialog:**

1. Open the Ghostfolio home page.
2. Click the user icon → "Login with access token".
3. Enter: `ghostfolio-demo-access-token`

---

### Calling the API (scripts, curl, automation)

> **Not for browser use.** The URLs below are the backend API server. You don't need them to use the website.

Get a demo JWT from the `/api/v1/info` endpoint and use it as a Bearer token:

```bash
# Deployed
curl https://ghostfolio-production-e242.up.railway.app/api/v1/info | jq .demoAuthToken

# Local (API server runs on port 3333, not 4200)
curl http://localhost:3333/api/v1/info | jq .demoAuthToken
```

| Environment | API base URL |
|---|---|
| **Deployed** | `https://ghostfolio-production-e242.up.railway.app` |
| **Local** | `http://localhost:3333` |

---

### Internal IDs (for debugging)

| Field | Value |
|---|---|
| **Access token** | `ghostfolio-demo-access-token` |
| **Demo user ID** | `00000000-0000-4000-a000-000000000001` |
| **Demo account ID** | `00000000-0000-4000-a000-000000000002` |
| **Demo tag ID** | `efa08cb3-9b9d-4974-ac68-db13a19c4874` |
| **Role** | `DEMO` |
| **Provider** | `ANONYMOUS` |

---

## Admin User

The first account created via "Get Started" on each Ghostfolio instance.
Credentials are **per-environment** and are **not stored in this repo**.

| Environment | Home URL | How to create |
|---|---|---|
| **Local** | `http://localhost:4200` | Click "Get Started" on first run |
| **Deployed** | `https://ghostfolio-production-e242.up.railway.app/en` | Click "Get Started" on first run |

**What admin is used for:**
- Admin → Settings: configure OpenRouter API key (`API_KEY_OPENROUTER`)
- Admin → Properties: inspect/set system properties
- Managing user signups and system configuration

**Where to store admin credentials:**
Store in a team password manager or secure shared note — not in the repo.
If you need to set the OpenRouter key, see step 7 of [RAILWAY.md](deployment/RAILWAY.md).

---

## Test User (optional)

A second regular (non-demo, non-admin) user for API testing.
Only needed if you want to test agent behavior as a user with a custom portfolio (distinct from the shared demo account).

| Environment | How to create |
|---|---|
| **Local** | "Get Started" with a different email/username than admin |
| **Deployed** | Same — "Get Started" at `https://ghostfolio-production-e242.up.railway.app/en` |

**Getting a JWT for the test user:**
```bash
curl -X POST <base-url>/api/v1/auth/anonymous \
  -H "Content-Type: application/json" \
  -d '{"accessToken": "<your-user-access-token>"}'
# Returns: { "authToken": "<jwt>" }
```

For most testing purposes the **demo user** above is sufficient and pre-configured.

---

## See Also

- [DEMO-ACCOUNT.md](deployment/DEMO-ACCOUNT.md) — portfolio contents, re-seed, DB validation
- [RAILWAY.md](deployment/RAILWAY.md) — full deployment guide, environment variables, OpenRouter key setup
- [SMOKE-TESTS.md](deployment/SMOKE-TESTS.md) — curl-based smoke tests including demo account verification
