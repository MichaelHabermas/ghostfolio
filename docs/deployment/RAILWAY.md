# Railway Deployment Guide

This document covers deploying the Ghostfolio + Agent instance to Railway for public access.

---

## Prerequisites

- [Railway account](https://railway.com) (free tier works for demo)
- GitHub repository with the Ghostfolio + Agent code
- OpenRouter API key (for Claude 3.5 Sonnet via OpenRouter)
- Langfuse account (for observability)

---

## Step 1: Create Railway Project

1. Log in to [Railway](https://railway.com)
2. Click **New Project**
3. Select **Deploy from GitHub repo**
4. Authorize Railway to access your GitHub account
5. Select the `ghostfolio` repository
6. Railway will detect the Dockerfile automatically

---

## Step 2: Configure PostgreSQL Add-on

1. In your Railway project, click **+ New Service**
2. Select **Database → PostgreSQL**
3. Railway provisions a managed PostgreSQL 15 instance
4. Copy the `DATABASE_URL` from the PostgreSQL service's **Variables** tab
5. It will look like: `postgresql://postgres:<password>@<host>.railway.internal:5432/railway`

---

## Step 3: Configure Redis Add-on

1. In your Railway project, click **+ New Service**
2. Select **Database → Redis**
3. Railway provisions a managed Redis 7 instance
4. Copy the `REDIS_URL` from the Redis service's **Variables** tab
5. It will look like: `redis://default:<password>@<host>.railway.internal:6379`

---

## Step 4: Set Environment Variables

Navigate to your main service's **Variables** tab and add the following:

### Required Variables

| Variable | Value | Notes |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql://...` | From PostgreSQL add-on (Step 2) |
| `REDIS_HOST` | `<redis-host>.railway.internal` | Hostname from Redis add-on |
| `REDIS_PORT` | `6379` | Default Redis port |
| `REDIS_PASSWORD` | `<redis-password>` | From Redis add-on variables |
| `ACCESS_TOKEN_SALT` | `<random-string>` | Generate with `openssl rand -hex 32` |
| `JWT_SECRET_KEY` | `<random-string>` | Generate with `openssl rand -hex 64` |
| `TZ` | `UTC` | Timezone setting |

### Agent-Specific Variables

| Variable | Value | Notes |
| --- | --- | --- |
| `OPENROUTER_API_KEY` | `sk-or-v1-...` | From [OpenRouter](https://openrouter.ai) |
| `AGENT_ENABLED` | `true` | Enables the agent endpoint |

### Observability Variables (Optional but Recommended)

| Variable | Value | Notes |
| --- | --- | --- |
| `LANGFUSE_SECRET_KEY` | `sk-lf-...` | From [Langfuse](https://langfuse.com) |
| `LANGFUSE_PUBLIC_KEY` | `pk-lf-...` | From [Langfuse](https://langfuse.com) |
| `LANGFUSE_BASE_URL` | `https://us.cloud.langfuse.com` | Or your self-hosted URL |

---

## Step 5: Docker-Based Deployment

Ghostfolio uses Docker for deployment. Railway detects the `Dockerfile` at the project root.

### Dockerfile Configuration

The existing `Dockerfile` builds the NestJS API and Angular client. Railway:

1. Detects the `Dockerfile` on push to the connected branch
2. Builds the Docker image (takes ~3-5 minutes on first build)
3. Deploys the container and exposes port `3333` (the NestJS API port)

### Build Settings (if needed)

In Railway project settings → Build:

- **Build Command**: (leave empty, uses Dockerfile)
- **Start Command**: (leave empty; the repo's `railway.toml` sets `sh /ghostfolio/entrypoint.sh` so the script runs under shell, not Node)
- **Port**: `3333`

### Trigger Deployment

```bash
git push origin dev
```

Railway automatically deploys on push to the connected branch.

---

## Step 6: Database Setup

After first deploy, run Prisma migrations:

1. Open Railway's **Shell** for your service (or use Railway CLI)
2. Run:

```bash
npx prisma migrate deploy
```

Or set the `DATABASE_URL` locally and run migrations from your machine:

```bash
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

---

## Step 7: Configure OpenRouter API Key in Admin Settings

The OpenRouter API key is stored in Ghostfolio's database (not as an environment variable), following the existing pattern used by Ghostfolio's AI feature.

1. Open `https://<your-railway-url>/en` in a browser
2. Log in as the admin user (the first account you created)
3. Navigate to **Admin** → **Settings** (or go to `https://<your-railway-url>/en/admin`)
4. Find the **OpenRouter API Key** field (labelled `API_KEY_OPENROUTER`)
5. Paste your OpenRouter API key (`sk-or-v1-...`)
6. Click **Save**

If you don't set this, the agent will return:
```json
{
  "statusCode": 500,
  "message": "OpenRouter API key not configured. Set API_KEY_OPENROUTER in admin settings."
}
```

---

## Step 8: Verify the Agent Endpoint

### Check the API is running

```bash
curl https://<your-railway-url>/api/v1/info
```

Expected: JSON with Ghostfolio version information.

### Get an auth token

1. Open `https://<your-railway-url>/en` in a browser
2. Create a **non-admin** test user account via **Get Started** (use a different email than the admin)
3. Use the Ghostfolio API to get a Bearer token:

```bash
curl -X POST https://<your-railway-url>/api/v1/auth/anonymous \
  -H "Content-Type: application/json" \
  -d '{"accessToken": "<your-access-token>"}'
```

### Test the agent endpoint

```bash
curl -X POST https://<your-railway-url>/api/v1/agent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -d '{
    "query": "What are my current holdings?",
    "sessionId": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

Expected response:

```json
{
  "response": "...",
  "sources": [...],
  "flags": [],
  "sessionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Verify AGENT_ENABLED feature flag

If `AGENT_ENABLED` is not set to `"true"`, the endpoint returns:

```json
{
  "statusCode": 503,
  "message": "The agent feature is currently disabled."
}
```

### Add sample portfolio data

To test the agent with real data:

1. Log in to the Ghostfolio UI as your test user
2. Go to **Portfolio** → **Transactions**
3. Click **+** to add transactions (e.g., buy 10 shares of AAPL, 5 shares of MSFT)
4. The agent will now have real holdings to analyze

---

## Troubleshooting

| Issue | Cause | Fix |
| --- | --- | --- |
| Container crash: `SyntaxError: Unexpected string` on `entrypoint.sh` | Railway/Node ran the shell script as JavaScript | The repo's `railway.toml` and Dockerfile `CMD ["sh", "/ghostfolio/entrypoint.sh"]` force the script to run with `sh`. Ensure Start Command in Railway is empty so config-as-code is used. |
| `503 Service Unavailable` on agent endpoint | `AGENT_ENABLED` not set or not `"true"` | Set `AGENT_ENABLED=true` in Railway variables |
| `401 Unauthorized` on agent endpoint | Missing or invalid JWT token | Ensure `Authorization: Bearer <token>` header is included |
| Database connection errors | `DATABASE_URL` misconfigured | Verify `DATABASE_URL` references the Railway PostgreSQL internal hostname |
| Container crash: `Cannot find module '@prisma/config'` | `node_modules` in image missing prisma (install used generated package.json only) | Ensure Dockerfile runs `npm ci` after copying the root `package.json` into `dist/apps/api` so prisma and @prisma/config are installed before the final image is built. |
| Agent returns "OpenRouter API key not configured" | Key not set in admin settings | Follow Step 7: set `API_KEY_OPENROUTER` in Ghostfolio admin settings |
| Agent returns LLM error | `API_KEY_OPENROUTER` invalid | Check key is valid at [openrouter.ai/keys](https://openrouter.ai/keys) |
| Build fails | Docker build error | Check Railway build logs; common issue is Node.js version mismatch |

---

## Deployment URL

Once deployed, your Railway URL will be:

```bash
https://<project-name>.up.railway.app
```

Update this document with the actual URL after deployment:

**Deployed URL:** _(to be filled in after deployment)_
