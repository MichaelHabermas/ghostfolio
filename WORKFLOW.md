# Ghostfolio — Getting Started Guide

## What Is Ghostfolio?

Ghostfolio is an **open-source wealth management application** built with modern web technology. It helps you track stocks, ETFs, and cryptocurrencies across multiple brokerage platforms in a single dashboard so you can make data-driven investment decisions without relying on spreadsheets or third-party services that harvest your data.

### The Problem It Solves

Most investors hold assets across several brokers, exchanges, and wallets. Piecing together a complete picture of performance, allocation, and risk means switching between platforms or maintaining fragile spreadsheets. Ghostfolio consolidates everything into one self-hosted (or cloud-hosted) application where you own the data.

### Who It Is For

- People who trade stocks, ETFs, or crypto on multiple platforms
- Buy-and-hold investors who want periodic portfolio health checks
- Privacy-conscious users who prefer to self-host their financial data
- Anyone looking for a clean, mobile-first portfolio tracker that replaces spreadsheets

### Key Features

- Multi-account and multi-currency transaction management
- Portfolio performance tracking (Today, WTD, MTD, YTD, 1Y, 5Y, Max)
- Interactive charts and allocation breakdowns
- Static risk analysis to flag concentration or over-exposure
- CSV/JSON import and export of activities
- Dark Mode, Zen Mode, and Progressive Web App (PWA) support
- Public API for programmatic access

---

## Technology Stack

| Layer | Technology |
|---|---|
| Monorepo | Nx workspace (TypeScript) |
| Backend API | NestJS |
| Database | PostgreSQL 15 with Prisma ORM |
| Cache / Queues | Redis with Bull |
| Frontend | Angular 21, Angular Material, Bootstrap, Chart.js |
| Container | Docker / Docker Compose |

---

## Prerequisites

Install these **before** you begin.

| Prerequisite | Version | How to Check | Install Link |
|---|---|---|---|
| **Node.js** | `>=22.18.0` | `node -v` | [nodejs.org](https://nodejs.org) |
| **npm** | Ships with Node.js | `npm -v` | — |
| **Docker** | Latest stable | `docker -v` | [docker.com](https://www.docker.com/products/docker-desktop) |
| **Git** | Any recent version | `git --version` | [git-scm.com](https://git-scm.com) |

> **Tip:** The repository includes an `.nvmrc` file specifying Node v22. If you use [nvm](https://github.com/nvm-sh/nvm) you can run `nvm install && nvm use` from the project root.

---

## Step-by-Step: Local Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/ghostfolio/ghostfolio.git
cd ghostfolio
```

### 2. Create Your Environment File

Copy the development template and fill in the placeholder values.

**macOS / Linux (or Git Bash on Windows):**

```bash
cp .env.dev .env
```

**Windows (PowerShell):**

```powershell
Copy-Item .env.dev .env
```

Open `.env` in your editor and replace every `<INSERT_...>` placeholder:

| Variable | What to Put | Example |
|---|---|---|
| `REDIS_PASSWORD` | Any password you choose for Redis | `mysecureredispassword` |
| `POSTGRES_PASSWORD` | Any password you choose for PostgreSQL | `mysecuredbpassword` |
| `ACCESS_TOKEN_SALT` | A random string (used to salt access tokens) | `openssl rand -hex 32` |
| `JWT_SECRET_KEY` | A random string (used for JSON Web Tokens) | `openssl rand -hex 32` |

The remaining variables (`REDIS_HOST`, `REDIS_PORT`, `POSTGRES_DB`, `POSTGRES_USER`, `DATABASE_URL`, `TZ`) are pre-filled with sensible development defaults. Leave them as-is unless you have a reason to change them.

### 3. Install Dependencies

```bash
npm install
```

This also runs `prisma generate` automatically (via the `postinstall` script) to create the Prisma client typings.

### 4. Start PostgreSQL and Redis

Docker Compose spins up both services in the background:

```bash
docker compose -f docker/docker-compose.dev.yml up -d
```

Verify the containers are healthy:

```bash
docker compose -f docker/docker-compose.dev.yml ps
```

You should see `postgres` on port **5432** and `redis` on port **6379**.

### 5. Initialize the Database

Push the Prisma schema to PostgreSQL and seed it with default data:

```bash
npm run database:setup
```

This runs two commands under the hood: `database:push` (syncs the schema) followed by `database:seed` (inserts seed data such as default tags).

### 6. Generate SSL Certificates (One-Time)

The Angular dev server runs over HTTPS. Generate a self-signed certificate:

**macOS / Linux (or Git Bash on Windows):**

```bash
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout apps/client/localhost.pem \
  -out apps/client/localhost.cert \
  -days 365 \
  -subj "/C=US/ST=State/L=City/O=Dev/OU=Dev/CN=localhost"
```

**Windows (PowerShell):** OpenSSL is not on PATH by default. Use the copy bundled with Git for Windows (run from the `ghostfolio` folder):

```powershell
& "C:\Program Files\Git\usr\bin\openssl.exe" req -x509 -newkey rsa:2048 -nodes -keyout apps/client/localhost.pem -out apps/client/localhost.cert -days 365 -subj "/C=US/ST=State/L=City/O=Dev/OU=Dev/CN=localhost"
```

If Git is installed elsewhere, try `& "${env:ProgramFiles}\Git\usr\bin\openssl.exe"` in place of the path above. Alternatively, run the macOS/Linux command from **Git Bash**.

### 7. Start the Backend API Server

```bash
npm run start:server
```

The API starts on **<http://localhost:3333>** with file-watch enabled.

### 8. Start the Frontend Client (in a second terminal)

```bash
npm run start:client
```

The Angular dev server starts on **<https://localhost:4200/en>** and opens in your browser automatically.

### 9. Create Your First User

1. Open **<https://localhost:4200/en>** in your browser.
2. Click **Get Started**.
3. Register a new user — this first account is automatically granted the **ADMIN** role.

You are now running Ghostfolio locally.

---

## Environment Variables Reference

### Required

| Variable | Description |
|---|---|
| `ACCESS_TOKEN_SALT` | Random string used as salt for access tokens |
| `JWT_SECRET_KEY` | Random string used for signing JWTs |
| `DATABASE_URL` | PostgreSQL connection string |
| `POSTGRES_DB` | PostgreSQL database name |
| `POSTGRES_USER` | PostgreSQL user |
| `POSTGRES_PASSWORD` | PostgreSQL password |
| `REDIS_HOST` | Redis hostname (`localhost` for dev, `redis` for Docker) |
| `REDIS_PORT` | Redis port (default `6379`) |
| `REDIS_PASSWORD` | Redis password |

### Optional

| Variable | Default | Description |
|---|---|---|
| `HOST` | `0.0.0.0` | Host the API binds to |
| `PORT` | `3333` | Port the API listens on |
| `ROOT_URL` | `http://0.0.0.0:3333` | Root URL for callbacks and links |
| `REQUEST_TIMEOUT` | `2000` | Network request timeout in milliseconds |
| `LOG_LEVELS` | — | JSON array of log levels, e.g. `["debug","error","log","warn"]` |
| `REDIS_DB` | `0` | Redis database index |
| `ENABLE_FEATURE_AUTH_TOKEN` | `true` | Enable security-token authentication |
| `API_KEY_COINGECKO_DEMO` | — | CoinGecko Demo API key (for crypto prices) |
| `API_KEY_COINGECKO_PRO` | — | CoinGecko Pro API key |
| `TZ` | `UTC` | Timezone |

---

## Useful npm Scripts

| Command | What It Does |
|---|---|
| `npm run start:server` | Start the NestJS API with watch mode |
| `npm run start:client` | Start the Angular dev server (English) |
| `npm run start:storybook` | Start the Storybook component library |
| `npm run database:setup` | Push schema and seed the database |
| `npm run database:push` | Sync Prisma schema to the database |
| `npm run database:seed` | Seed the database with defaults |
| `npm run database:gui` | Open Prisma Studio (visual database browser) |
| `npm run database:migrate` | Deploy pending Prisma migrations |
| `npm test` | Run the full test suite |
| `npm run test:api` | Run API tests only |
| `npm run lint` | Lint all projects in the workspace |
| `npm run build:production` | Build both API and client for production |

---

## Running with Docker (Production-Style)

If you prefer to run the entire stack in containers rather than developing locally:

```bash
cp .env.example .env
```

On Windows (PowerShell) use `Copy-Item .env.example .env` instead.

Fill in the placeholder values (same process as Step 2 above), then:

```bash
docker compose -f docker/docker-compose.yml up -d
```

Open **<http://localhost:3333>** in your browser and create your first user.

---

## Stopping Everything

### Development

```bash
docker compose -f docker/docker-compose.dev.yml down
```

Then press `Ctrl+C` in the terminals running the API and client servers.

### Production (Docker)

```bash
docker compose -f docker/docker-compose.yml down
```

---

## Troubleshooting

| Issue | Fix |
|---|---|
| `node -v` shows a version below 22 | Install Node.js 22+ or run `nvm use` if you have nvm |
| Database connection refused | Make sure Docker containers are running: `docker compose -f docker/docker-compose.dev.yml ps` |
| Prisma schema out of sync | Run `npm run database:push` |
| SSL certificate errors in browser | Accept the self-signed cert, or regenerate it with the `openssl` command in Step 6 |
| `openssl` not recognized (Windows) | Use Git’s OpenSSL: `& "C:\Program Files\Git\usr\bin\openssl.exe"` with the Step 6 args, or run the Step 6 command from **Git Bash** |
| Port 5432 or 6379 already in use | Stop any local PostgreSQL/Redis instances or change the ports in `.env` |

---

## Further Reading

- [Official README](./README.md) — environment variable reference, public API docs, self-hosting options
- [Development Guide](./DEVELOPMENT.md) — debugging, Storybook, Prisma migrations, SSL, dependency upgrades
- [Live Demo](https://ghostfol.io/en/demo) — try Ghostfolio without installing anything
- [Ghostfolio Premium](https://ghostfol.io/en/pricing) — managed cloud hosting
- [License](https://www.gnu.org/licenses/agpl-3.0.html) — AGPL v3
