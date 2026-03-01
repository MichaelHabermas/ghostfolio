# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ghostfolio is an open-source wealth management platform with an integrated AI portfolio agent. It's an Nx monorepo with a NestJS backend, Angular frontend, PostgreSQL database, and AI orchestration via Vercel AI SDK + Claude 3.5 Sonnet through OpenRouter.

## Common Commands

### Development
```bash
npm run start:server          # NestJS API on port 3333
npm run start:client          # Angular dev server on port 4200
npm run start:storybook       # Component library dev
```

### Testing
```bash
npm test                                        # All tests (parallel=4)
npm run test:api                                # API tests only
npx nx test api --testPathPattern=agent         # Agent tests only
npx nx test api --testPathPattern=eval          # Eval suite only
npx nx test api --testPathPattern="some-file"   # Single test file
npm run watch:test                              # Watch mode
```

### Linting & Formatting
```bash
npm run lint                  # Lint all projects
npm run format:write          # Auto-format with Prettier
```

### Database
```bash
npm run database:setup        # Push schema + seed
npm run database:push         # Sync schema with DB
npm run database:migrate      # Deploy migrations
npm run database:gui          # Open Prisma Studio
```

### Build
```bash
npm run build:production      # Full production build
```

## Architecture

### Monorepo Structure
- **`apps/api/`** — NestJS backend (REST API)
- **`apps/client/`** — Angular frontend
- **`libs/common/`** — Shared types, interfaces, permissions, config
- **`libs/ui/`** — Component library with Storybook
- **`prisma/`** — Database schema, migrations, seed scripts

### Path Aliases (tsconfig.base.json)
```
@ghostfolio/api/*      → apps/api/src/*
@ghostfolio/client/*   → apps/client/src/app/*
@ghostfolio/common/*   → libs/common/src/lib/*
@ghostfolio/ui/*       → libs/ui/src/lib/*
```

Nx enforces module boundaries: `apps/api` imports from `libs/common`, not from `apps/client`.

### Backend (NestJS)
- Entry: `apps/api/src/main.ts`, root module: `apps/api/src/app/app.module.ts`
- Endpoints in `apps/api/src/app/endpoints/`
- Services in `apps/api/src/services/`
- All services use `@Injectable()` with constructor-based DI — never use `new ServiceName()`
- Database via `PrismaService` — never raw SQL

### Frontend (Angular)
- Angular 21 with Angular Material
- PWA-enabled

### Agent Module (`apps/api/src/app/endpoints/agent/`)
The AI portfolio agent is a major feature. Key components:
- **`agent.service.ts`** — Orchestrator (LLM + tools + verification)
- **`tools/`** — Tool wrappers (portfolio-performance, get-holdings, get-rules-report, market-data, transaction-history, rebalance-simulator), registered in `tool-registry.ts`
- **`verification/`** — 4-layer pipeline: hallucination detection, math consistency, source citation, human-in-the-loop escalation
- **`memory/`** — Session-based conversation history (20-turn limit)
- **`redaction/`** — Data sanitization before LLM calls
- **`eval/`** — 50 golden test cases in `cases/full-eval-cases.json`
- **`observability/`** — Langfuse tracing, cost estimation

Data flow: User Query → Auth/Rate Limit → Load History → Redact → LLM with Tools (Vercel AI SDK `generateText`) → Format Response → Verification Pipeline → Store Memory → Log to Langfuse → Response

The agent is **read-only** — it never modifies user data.

## Code Conventions

### TypeScript
- Strict mode: no `any` types (use `unknown` with type guards)
- Explicit types on all function params and return values
- `readonly` for immutable properties
- Interfaces for contracts, types for unions/intersections

### Zod Schemas
- All tool schemas defined with Zod
- Use `.describe()` on every field (serves as LLM prompts)
- Export both schema and inferred TypeScript type

### Formatting (Prettier)
- 80 char print width, single quotes, 2-space indent, no trailing commas
- Import order: `@ghostfolio/*` → third-party → relative

### Testing
- Jest with `describe`/`it` blocks, co-located `*.spec.ts` files
- Mock external services with `jest.fn()` or `Test.createTestingModule`
- TDD approach: failing test first, then implementation

### Git Conventions
- Branch strategy: `main` ← `dev` ← `feature/epic-N-descriptive-name`
- Commit format: `<type>(scope): <description>`
- Types: feat, fix, test, refactor, docs, chore
- Scopes: agent, tools, verification, observability, deploy, rules, eval

## Key Environment Variables
```
DATABASE_URL          # PostgreSQL connection string
REDIS_HOST/PORT/PASSWORD/DB
JWT_SECRET_KEY
ACCESS_TOKEN_SALT
API_KEY_OPENROUTER    # For AI agent
LANGFUSE_SECRET_KEY/PUBLIC_KEY/HOST  # Observability
```
