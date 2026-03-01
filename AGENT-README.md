# Ghostfolio Agent -- Smart Portfolio Auditor & Optimizer

An AI-powered, read-only portfolio analysis agent built on top of [Ghostfolio](https://github.com/ghostfolio/ghostfolio), the open-source wealth management platform. The agent uses natural language conversation to analyze holdings, identify risk violations, and suggest rebalancing strategies -- without ever executing trades or modifying data.

Built as part of [AgentForge Week 2](docs/research/G4-Week-2-AgentForge.md) for the Gauntlet program.

---

## Overview

The Ghostfolio Agent is a NestJS module (`AgentModule`) integrated directly into the Ghostfolio API. It wraps existing Ghostfolio services (PortfolioService, RulesService, MarketDataService, OrderService) as LLM-callable tools, orchestrated by Claude 3.5 Sonnet via the Vercel AI SDK.

**Key capabilities:**
- Natural language portfolio analysis ("What is my allocation breakdown?")
- Risk violation detection via Ghostfolio's built-in RulesService
- Rebalancing simulation (read-only calculations)
- 4-layer verification pipeline (hallucination detection, math consistency, source citation, human-in-the-loop escalation)
- Full observability via Langfuse (tracing, token tracking, cost tracking)

**Design principles:** SOLID, modular design, separation of concerns, TDD. See the [full PRD](docs/research/PRD.md) for complete specifications.

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop) (for PostgreSQL and Redis)
- [Node.js](https://nodejs.org/) >= 22.18.0 (see `.nvmrc`)
- [Git](https://git-scm.com/)
- An [OpenRouter](https://openrouter.ai/) API key (for Claude 3.5 Sonnet access)
- (Optional) A [Langfuse](https://langfuse.com/) account for observability

---

## Setup

### 1. Clone and Install

```bash
git clone <your-fork-url>
cd ghostfolio
npm install
```

### 2. Configure Environment

```bash
cp .env.dev .env
```

Edit `.env` and add your keys:

```env
# Required: OpenRouter API key for Claude access
# Set via Ghostfolio admin panel under PROPERTY_API_KEY_OPENROUTER
# or directly in the database properties table

# Optional: Langfuse observability (post-MVP)
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_HOST=https://cloud.langfuse.com

# Agent feature flag
AGENT_ENABLED=true
```

### 3. Start Infrastructure

```bash
docker compose -f docker/docker-compose.dev.yml up -d
```

This starts PostgreSQL and Redis containers.

### 4. Initialize Database

```bash
npm run database:setup
```

### 5. Start the Application

**Server (API + Agent):**
```bash
npm run start:server
```

**Client (Angular UI):**
```bash
npm run start:client
```

### 6. Create a User

Open https://localhost:4200/en in your browser and click **Get Started** to create your first user (this user gets the ADMIN role). Add some holdings to your portfolio so the agent has data to analyze.

### 7. Configure OpenRouter API Key

In the Ghostfolio admin panel, set the OpenRouter API key and model:
- Navigate to Admin > Settings
- Set `API_KEY_OPENROUTER` to your OpenRouter key
- Set `OPENROUTER_MODEL` to `google/gemini-2.5-flash` (or your preferred model)

---

## Usage

### API Endpoint

```
POST /api/v1/agent
Content-Type: application/json
Authorization: Bearer <your-auth-token>

{
  "query": "What is my portfolio allocation breakdown?",
  "sessionId": "optional-session-id-for-conversation-continuity"
}
```

### Example Requests

**Portfolio performance:**
```bash
curl -X POST https://localhost:4200/api/v1/agent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"query": "How has my portfolio performed this year?"}'
```

**Holdings analysis:**
```bash
curl -X POST https://localhost:4200/api/v1/agent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"query": "Show me my current holdings and highlight any concentration risks"}'
```

**Risk violations:**
```bash
curl -X POST https://localhost:4200/api/v1/agent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"query": "Are there any compliance or risk rule violations in my portfolio?"}'
```

**Rebalancing simulation (post-MVP):**
```bash
curl -X POST https://localhost:4200/api/v1/agent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"query": "Compare my current allocation to a 60/40 stocks/bonds target and suggest rebalancing trades"}'
```

### Response Format

```json
{
  "response": "Based on your portfolio data...",
  "sources": [
    { "tool": "get_holdings", "field": "allocationInPercentage" }
  ],
  "flags": [],
  "sessionId": "abc123"
}
```

If a high-impact recommendation is made, the response includes a flag:
```json
{
  "flags": ["HIGH IMPACT -- review before acting: Rebalancing would affect 35% of portfolio value"]
}
```

---

## Architecture

```
User -> Angular Client -> NestJS API -> AgentController
                                           |
                                     AgentService (orchestrator)
                                           |
                            +-------- generateText() --------+
                            |         (Vercel AI SDK)        |
                            v                                v
                     Claude 3.5 Sonnet              Tool Registry
                     (via OpenRouter)                (6 tools)
                                                         |
                                                 Ghostfolio Services
                                                 (Portfolio, Rules,
                                                  MarketData, Order)
                                                         |
                                                    PostgreSQL
                            |
                    Verification Pipeline
                    (4 layers: hallucination,
                     math, citation, escalation)
                            |
                        Langfuse
                    (observability)
```

For the full architecture with mermaid diagrams, see the [PRD](docs/research/PRD.md#part-4-architecture).

### Agent Tools

| Tool | Purpose | MVP? |
|---|---|---|
| `portfolio_performance` | Fetch returns, TWR/MWR metrics | Yes |
| `get_holdings` | List current assets, allocations | Yes |
| `get_rules_report` | Fetch compliance/risk violations | Yes |
| `market_data` | Current/historical prices | Post-MVP |
| `transaction_history` | Recent buy/sell/dividend activity | Post-MVP |
| `rebalance_simulator` | Simulate rebalancing trades (read-only) | Post-MVP |

### Verification Pipeline

Every agent response passes through 4 verification layers before reaching the user:

1. **Hallucination Detection** -- Claims about violations cross-referenced against RulesService
2. **Math Consistency** -- All numbers re-computed from raw tool data (0.01% tolerance)
3. **Source Citation** -- Every factual claim must reference a specific tool output
4. **Human-in-the-Loop** -- High-impact recommendations flagged with review disclaimers

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend Framework | NestJS (TypeScript) |
| AI Orchestration | Vercel AI SDK (`generateText()` with tool-calling) |
| LLM | Claude 3.5 Sonnet via OpenRouter |
| Observability | Langfuse |
| Database | PostgreSQL (via Prisma ORM) |
| Cache | Redis (Ghostfolio native -- not used for agent memory) |
| Testing | Jest |
| CI/CD | GitHub Actions |
| Deployment | Railway |
| Monorepo | Nx |

For in-depth tech stack documentation, see the [Tech Stack Guide](docs/TECH-STACK-GUIDE.md).

---

## Testing

### Run All Tests

```bash
npm test
```

### Run Agent-Specific Tests

```bash
npx jest --testPathPattern=endpoints/agent
```

### Run Eval Suite

```bash
npx jest --testPathPattern=eval-runner
```

### Eval Dataset

The eval suite contains 50 test cases:
- 20 happy path (standard portfolio queries)
- 10 edge cases (empty portfolio, single holding, unknown symbols)
- 10 adversarial (prompt injection, trade requests, PII extraction)
- 10 multi-step reasoning (cross-tool analysis)

See the [PRD](docs/research/PRD.md#epic-12-full-eval-suite-50-test-cases) for the full eval specification.

---

## Deployment

### Railway (Production)

The application is deployed to Railway with managed PostgreSQL and Redis:

1. Create a Railway project linked to your GitHub repository
2. Add PostgreSQL and Redis as managed services
3. Set environment variables (OpenRouter API key, Langfuse keys, `AGENT_ENABLED=true`)
4. Deploy via GitHub integration (auto-deploy on merge to `dev`)

### Local (Development)

```bash
docker compose -f docker/docker-compose.dev.yml up -d
npm run start:server
npm run start:client
```

---

## Git Workflow

- `main` -- Production-ready releases only
- `dev` -- Main development integration branch
- `feature/epic-N-*` -- Individual epic feature branches (branch from `dev`)

Feature branch lifecycle: create from `dev` -> implement -> write tests -> run tests -> fix failures -> merge to `dev`.

See the [PRD](docs/research/PRD.md#part-5-git-workflow) for the full git workflow specification.

---

## Data Privacy

The agent sends portfolio data to the Anthropic API (via OpenRouter) for analysis. A redaction layer is applied before data enters the LLM context:

- Account names are replaced with generic labels ("Account A", "Account B")
- Exact balances are rounded to the nearest $100
- User PII is stripped from tool outputs

For full data isolation in production, consider deploying with an on-premises LLM.

---

## Project Documentation

| Document | Description |
|---|---|
| [PRD](docs/research/PRD.md) | Full Product Requirements Document with EPICs, user stories, features |
| [Tech Stack Guide](docs/TECH-STACK-GUIDE.md) | In-depth reference for all technologies used |
| [Pre-Search](docs/research/PRE-SEARCH.md) | Architectural decisions and trade-off analysis |
| [AgentForge Requirements](docs/research/G4-Week-2-AgentForge.md) | Original assignment requirements |
| [Analysis](docs/research/preliminary/ANALYSIS-OF-PRE-Research.md) | Pre-search evaluation and mitigations |
| [Development Guide](DEVELOPMENT.md) | Ghostfolio development environment setup |

---

## License

This project is licensed under the [GNU Affero General Public License v3.0](https://www.gnu.org/licenses/agpl-3.0) (AGPLv3), matching the Ghostfolio license.
