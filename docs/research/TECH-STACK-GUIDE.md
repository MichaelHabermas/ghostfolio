# Ghostfolio Agent -- Tech Stack Guide

In-depth reference for every technology in the agent stack. Each section covers: official documentation, key API patterns used in this project, and integration notes specific to our architecture.

**Always use Context7 MCP to fetch the latest stable documentation** before implementing against any of these libraries. The versions and APIs documented here are correct as of 2026-02-23 but libraries evolve.

---

## Table of Contents

- [Vercel AI SDK](#vercel-ai-sdk)
- [Anthropic Claude 3.5 Sonnet](#anthropic-claude-35-sonnet)
- [OpenRouter](#openrouter)
- [NestJS](#nestjs)
- [Zod](#zod)
- [Langfuse](#langfuse)
- [Prisma](#prisma)
- [Jest](#jest)
- [Railway](#railway)
- [Context7 MCP](#context7-mcp)
- [Docker](#docker)
- [Nx](#nx)
- [GitHub Actions](#github-actions)

---

## Vercel AI SDK

**Official docs:** [https://sdk.vercel.ai/docs](https://sdk.vercel.ai/docs)
**Package:** `ai` (v4.3.16 -- already installed in Ghostfolio)
**Purpose:** LLM orchestration, tool-calling, structured output

### Key APIs We Use

#### `generateText()` -- Core Agent Loop

This is the primary function for the agent. It sends messages to the LLM and handles tool-calling loops automatically via the `maxSteps` parameter.

```typescript
import { generateText } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { z } from 'zod';

const openrouter = createOpenRouter({ apiKey: 'your-key' });

const result = await generateText({
  model: openrouter.chat('anthropic/claude-3.5-sonnet'),
  system: 'You are a portfolio analysis assistant...',
  messages: conversationHistory,
  tools: {
    portfolio_performance: {
      description: 'Fetch portfolio performance metrics including TWR, MWR, and totals',
      parameters: z.object({
        dateRange: z.string().optional(),
        accountId: z.string().optional(),
      }),
      execute: async (args) => {
        // Call PortfolioService.getPerformance() via DI
        return await portfolioPerformanceTool.execute(args);
      },
    },
    // ... more tools
  },
  maxSteps: 5, // Allow up to 5 tool-calling round-trips
});

// result.text -- final text response from LLM
// result.toolCalls -- array of tool calls made
// result.toolResults -- array of tool results
// result.usage -- token usage { promptTokens, completionTokens, totalTokens }
```

**Critical parameters:**
- `maxSteps`: Controls how many tool-calling iterations the LLM can perform. Set to 5 for our agent (allows multi-tool chains without infinite loops).
- `system`: The system prompt. Defined once, passed to every call.
- `messages`: Conversation history as an array of `{ role, content }` objects.
- `tools`: Object of tool definitions with Zod schemas and execute functions.

#### `generateObject()` -- Structured Output

Used for forcing the LLM to return a specific JSON structure (e.g., the structured response with source citations).

```typescript
import { generateObject } from 'ai';

const result = await generateObject({
  model: openrouter.chat('anthropic/claude-3.5-sonnet'),
  schema: AgentResponseSchema, // Zod schema
  prompt: 'Analyze this portfolio data and return structured claims...',
});

// result.object -- typed object matching the Zod schema
```

### Integration Notes

- The Vercel AI SDK is already installed and working in Ghostfolio's `AiService` at `apps/api/src/app/endpoints/ai/ai.service.ts`. Our `AgentService` follows the same pattern.
- The `@openrouter/ai-sdk-provider` (v0.7.2) is also already installed. It creates a provider that routes to Claude via OpenRouter.
- Tool definitions use Zod schemas for the `parameters` field. The SDK automatically converts these to JSON Schema for the LLM.
- The `execute` function in each tool definition is where we call our NestJS service wrappers.
- `maxSteps` is the agentic loop control. Each "step" is one LLM call that may include tool calls. The SDK handles the tool_use -> tool_result -> next LLM call loop automatically.

### Error Handling

The SDK throws errors for network failures, rate limits, and malformed responses. Wrap `generateText()` in a try-catch and map errors to user-facing messages via `ErrorMapperService`.

```typescript
try {
  const result = await generateText({ ... });
} catch (error) {
  if (error.message.includes('rate_limit')) {
    return this.errorMapper.map('llm_rate_limit');
  }
  throw error;
}
```

---

## Anthropic Claude 3.5 Sonnet

**Official docs:** [https://docs.anthropic.com](https://docs.anthropic.com)
**Model ID:** `claude-3-5-sonnet-20241022` (pinned version)
**Via OpenRouter:** `anthropic/claude-3.5-sonnet`
**Purpose:** Primary LLM for reasoning, tool selection, and response generation

### Tool-Use Protocol

Claude supports native tool-use through its Messages API. When using the Vercel AI SDK, this is abstracted -- you define tools with Zod schemas and the SDK handles the protocol. Under the hood:

1. The SDK sends tool definitions as JSON Schema in the API request
2. Claude responds with `tool_use` content blocks when it wants to call a tool
3. The SDK executes the tool and sends `tool_result` back
4. Claude uses the results to generate its final response

### Context Window

- 200,000 tokens (input + output combined)
- Our agent uses approximately 2,000-4,000 tokens per request (system prompt + portfolio data + conversation history)
- For very large portfolios (>100 holdings), summarize to top 20 by value before sending to avoid context overflow

### Model Version Pinning

Always pin to a specific model version to avoid behavior changes during the sprint:

```typescript
const model = openrouter.chat('anthropic/claude-3-5-sonnet-20241022');
```

Do not use `anthropic/claude-3.5-sonnet` (which resolves to "latest") in production. Pin the version.

### Pricing (Verify Before Submission)

| Metric | Rate (2024 figures -- verify current) |
|---|---|
| Input tokens | ~$3 per 1M tokens |
| Output tokens | ~$15 per 1M tokens |
| Context window | 200k tokens |

Check [OpenRouter pricing](https://openrouter.ai/docs#models) for current rates.

### Best Practices for Tool-Use

From the [Tool Calling lecture notes](../../docs/Tool-Calling-with-Aaron-Gallant.md):
- **Atomic tools**: Each tool does exactly one thing
- **Idempotent tools**: Multiple calls produce the same result (critical since agents retry)
- **Well-documented tools**: Tool descriptions are the "prompts" Claude uses to decide which tool to call. Write them like you're explaining the tool to a colleague.
- **Error-handled tools**: Return descriptive errors so Claude can reason about failures

---

## OpenRouter

**Official docs:** [https://openrouter.ai/docs](https://openrouter.ai/docs)
**Package:** `@openrouter/ai-sdk-provider` (v0.7.2 -- already installed)
**Purpose:** Multi-model API gateway -- routes requests to Claude via a single API key

### Setup

OpenRouter is already configured in Ghostfolio. The API key is stored in the database (not `.env`) and accessed via `PropertyService`:

```typescript
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

const openRouterApiKey = await this.propertyService.getByKey<string>(
  PROPERTY_API_KEY_OPENROUTER
);

const openrouter = createOpenRouter({ apiKey: openRouterApiKey });
const model = openrouter.chat('anthropic/claude-3.5-sonnet');
```

### Why OpenRouter Instead of Direct Anthropic

- Single API key for multiple models (useful for experimenting with different LLMs)
- Already configured and working in Ghostfolio's existing `AiService`
- If direct Anthropic access is needed, install `@ai-sdk/anthropic` and switch the provider

---

## NestJS

**Official docs:** [https://docs.nestjs.com](https://docs.nestjs.com)
**Version:** ^10.x (Ghostfolio's version)
**Purpose:** Backend API framework, dependency injection, module system

### Module Pattern (Critical for Agent Integration)

The agent is a NestJS module that follows the same pattern as the existing `AiModule`. This is the most important integration pattern in the project:

```typescript
// agent.module.ts -- mirrors ai.module.ts
import { Module } from '@nestjs/common';
import { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';
import { RulesService } from '@ghostfolio/api/app/portfolio/rules.service';
// ... other imports matching AiModule

@Module({
  controllers: [AgentController],
  imports: [
    ApiModule,
    ConfigurationModule,
    DataProviderModule,
    // ... same imports as AiModule
  ],
  providers: [
    AgentService,
    PortfolioService,
    RulesService,
    MarketDataService,
    // ... same providers as AiModule, plus agent-specific ones
    VerificationService,
    RedactionService,
    ErrorMapperService,
  ],
})
export class AgentModule {}
```

### Dependency Injection for Tools

Each tool receives Ghostfolio services through constructor injection:

```typescript
@Injectable()
export class PortfolioPerformanceTool {
  constructor(
    private readonly portfolioService: PortfolioService,
  ) {}

  async execute(args: { dateRange?: string; accountId?: string }): Promise<ToolResponse<PerformanceData>> {
    try {
      const data = await this.portfolioService.getPerformance({ ... });
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
```

### Guards and Authentication

The agent endpoint uses the same authentication guards as the rest of the Ghostfolio API. The authenticated `userId` is extracted from the request context and passed to all service calls:

```typescript
@Controller('api/v1/agent')
export class AgentController {
  @Post()
  @UseGuards(AuthGuard('jwt'))
  async query(
    @Body() body: AgentRequestDto,
    @Headers('authorization') authHeader: string,
  ) {
    const userId = this.request.user.id;
    return this.agentService.processQuery(body.query, userId, body.sessionId);
  }
}
```

### Key NestJS Concepts for This Project

| Concept | How We Use It |
|---|---|
| **Modules** | `AgentModule` encapsulates all agent components |
| **Controllers** | `AgentController` handles HTTP requests |
| **Services** | `AgentService` orchestrates the agent loop |
| **Providers** | Tools, VerificationService, etc. are injectable providers |
| **Guards** | JWT auth guard protects the agent endpoint |
| **Dependency Injection** | Constructor injection for all service dependencies |

---

## Zod

**Official docs:** [https://zod.dev](https://zod.dev)
**Version:** ^3.x (already installed in Ghostfolio)
**Purpose:** Schema definitions for tool inputs/outputs, runtime validation, type inference

### Tool Schema Definitions

Every tool defines its input parameters and output data using Zod schemas. These schemas serve three purposes:
1. Runtime validation of tool inputs and outputs
2. TypeScript type inference (`z.infer<typeof schema>`)
3. JSON Schema generation for the LLM (Vercel AI SDK converts Zod to JSON Schema automatically)

```typescript
import { z } from 'zod';

export const PortfolioPerformanceInputSchema = z.object({
  dateRange: z.string().optional().describe('Date range for performance calculation (e.g., "1Y", "YTD", "MAX")'),
  accountId: z.string().optional().describe('Filter by specific account ID'),
});

export const PortfolioPerformanceOutputSchema = z.object({
  totalValue: z.number(),
  totalReturn: z.number(),
  twrPercentage: z.number(),
  mwrPercentage: z.number(),
  assetClassBreakdown: z.array(z.object({
    assetClass: z.string(),
    allocation: z.number(),
    value: z.number(),
  })),
});

export type PortfolioPerformanceInput = z.infer<typeof PortfolioPerformanceInputSchema>;
export type PortfolioPerformanceOutput = z.infer<typeof PortfolioPerformanceOutputSchema>;
```

### Shared Envelope

All tools use the same response envelope:

```typescript
export const ToolResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
  });
```

### Important: `.describe()` Is a Prompt

When using Zod schemas as tool parameters, the `.describe()` string is literally what Claude sees as the parameter description. Write these as clear, actionable descriptions:

```typescript
// Good -- Claude knows what values to pass
z.string().optional().describe('Date range: "1Y" for 1 year, "YTD" for year-to-date, "MAX" for all time')

// Bad -- Claude doesn't know what format to use
z.string().optional().describe('date range')
```

---

## Langfuse

**Official docs:** [https://langfuse.com/docs](https://langfuse.com/docs)
**Package:** `@langfuse/vercel` (for Vercel AI SDK integration) or `langfuse` (v4 SDK for direct usage)
**Purpose:** Observability -- tracing, eval scoring, cost tracking, prompt management

### Integration with Vercel AI SDK

The `@langfuse/vercel` package provides automatic tracing for Vercel AI SDK calls:

```typescript
import { Langfuse } from 'langfuse';

// Initialize Langfuse client
const langfuse = new Langfuse({
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  baseUrl: process.env.LANGFUSE_HOST,
});

// Create a trace for each agent request
const trace = langfuse.trace({
  name: 'agent-query',
  input: { query: userQuery },
  userId: userId,
});

// Wrap generateText() with trace context
const generation = trace.generation({
  name: 'llm-call',
  model: 'claude-3-5-sonnet-20241022',
  input: messages,
});

const result = await generateText({ ... });

generation.end({
  output: result.text,
  usage: {
    input: result.usage.promptTokens,
    output: result.usage.completionTokens,
  },
});

trace.update({
  output: { response: result.text },
});

await langfuse.flushAsync();
```

### Alternative: OpenTelemetry Integration

If `@langfuse/vercel` has compatibility issues with the OpenRouter provider, use `@langfuse/otel` for framework-agnostic tracing:

```typescript
import { LangfuseSpanProcessor } from '@langfuse/otel';
import { NodeSDK } from '@opentelemetry/sdk-node';

const sdk = new NodeSDK({
  spanProcessors: [new LangfuseSpanProcessor()],
});
sdk.start();
```

### What We Track

| Metric | How |
|---|---|
| End-to-end latency | Trace start/end timestamps |
| Token usage (input/output) | `result.usage` from Vercel AI SDK |
| Cost per request | Token counts x Claude pricing |
| Tool calls and results | Logged as spans within the trace |
| Verification results | Logged as events on the trace |
| Error categorization | Tagged on trace (tool_failure, llm_timeout, verification_failure) |
| Eval scores | Scored on traces (pass/fail per eval case) |
| User feedback | Thumbs up/down stored as Langfuse scores |

### Environment Variables

```env
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_HOST=https://cloud.langfuse.com
```

---

## Prisma

**Official docs:** [https://www.prisma.io/docs](https://www.prisma.io/docs)
**Version:** Ghostfolio's installed version
**Purpose:** ORM for PostgreSQL -- the agent reads portfolio data through Prisma-backed services

### How the Agent Uses Prisma

The agent does not call Prisma directly. Instead, it calls Ghostfolio services (PortfolioService, RulesService, etc.) which internally use Prisma to query the database. This is by design -- the agent stays within the existing service layer.

### Key Data Models

| Model | Used By | Agent Access |
|---|---|---|
| `Account` | PortfolioService | Holdings, balances |
| `Order` | OrderService | Transaction history |
| `SymbolProfile` | MarketDataService | Symbol metadata, prices |
| `User` | Authentication | User scoping |

### Database Seeding for Tests

For deterministic eval testing, seed the database with known portfolio data:

```bash
npm run database:setup
# Then add test data via Prisma seed scripts or manual insertion
```

---

## Jest

**Official docs:** [https://jestjs.io/docs/getting-started](https://jestjs.io/docs/getting-started)
**Version:** Ghostfolio's installed version
**Purpose:** Unit tests, integration tests, eval runner

### Test Structure

```
apps/api/src/app/endpoints/agent/
├── tools/
│   ├── portfolio-performance.tool.spec.ts  # Unit test
│   ├── get-holdings.tool.spec.ts           # Unit test
│   └── get-rules-report.tool.spec.ts       # Unit test
├── verification/
│   ├── rules-validation.checker.spec.ts    # Unit test
│   ├── math-consistency.checker.spec.ts    # Unit test
│   └── verification.service.spec.ts        # Integration test
└── eval/
    └── eval-runner.spec.ts                 # Eval suite runner
```

### Mocking Ghostfolio Services

Tools are tested in isolation by mocking the injected services:

```typescript
describe('PortfolioPerformanceTool', () => {
  let tool: PortfolioPerformanceTool;
  let portfolioService: jest.Mocked<PortfolioService>;

  beforeEach(() => {
    portfolioService = {
      getPerformance: jest.fn(),
    } as any;
    tool = new PortfolioPerformanceTool(portfolioService);
  });

  it('should return performance data in ToolResponse envelope', async () => {
    portfolioService.getPerformance.mockResolvedValue(mockPerformanceData);
    const result = await tool.execute({ dateRange: '1Y' });
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject(expectedOutput);
  });

  it('should return error envelope on service failure', async () => {
    portfolioService.getPerformance.mockRejectedValue(new Error('DB timeout'));
    const result = await tool.execute({});
    expect(result.success).toBe(false);
    expect(result.error).toContain('DB timeout');
  });
});
```

### Running Tests

```bash
# All tests
npm test

# Agent-specific tests
npx jest --testPathPattern=endpoints/agent

# Eval suite only
npx jest --testPathPattern=eval-runner

# Watch mode for development
npx jest --watch --testPathPattern=endpoints/agent
```

---

## Railway

**Official docs:** [https://docs.railway.com](https://docs.railway.com)
**Purpose:** Hosting -- NestJS API + managed PostgreSQL + managed Redis

### Deployment Architecture

Railway runs the Ghostfolio Docker image as a single service with managed database add-ons:

```
Railway Project
├── Service: ghostfolio (Docker image)
│   ├── Environment variables
│   └── Auto-deploy from GitHub (dev branch)
├── PostgreSQL (managed add-on)
└── Redis (managed add-on)
```

### Environment Variables on Railway

| Variable | Value |
|---|---|
| `DATABASE_URL` | Auto-set by Railway PostgreSQL add-on |
| `REDIS_HOST` | Auto-set by Railway Redis add-on |
| `REDIS_PORT` | Auto-set by Railway Redis add-on |
| `AGENT_ENABLED` | `true` |
| `LANGFUSE_SECRET_KEY` | Your Langfuse secret key |
| `LANGFUSE_PUBLIC_KEY` | Your Langfuse public key |
| `LANGFUSE_HOST` | `https://cloud.langfuse.com` |

Note: The OpenRouter API key is stored in the Ghostfolio database properties, not in environment variables.

### Rollback

Railway supports instant rollback to any previous deployment. Additionally, the `AGENT_ENABLED` feature flag allows quick disable of the agent endpoint without redeployment.

### Cost

Railway hobby tier: ~$5-20/month for this project (API service + managed Postgres + managed Redis).

---

## Context7 MCP

**Purpose:** Fetch the latest stable documentation for any library during AI-assisted development

### How to Use

When working with Cursor IDE, the Context7 MCP server is available to fetch up-to-date documentation. Use it before implementing against any library to ensure you have the latest API signatures and best practices.

### Libraries to Look Up

Always verify the latest docs for these before implementation:

| Library | What to Check |
|---|---|
| `ai` (Vercel AI SDK) | `generateText()` API, `tools` parameter format, `maxSteps` behavior |
| `@openrouter/ai-sdk-provider` | `createOpenRouter()` configuration, model ID format |
| `@langfuse/vercel` | Trace wrapping API, compatibility with Vercel AI SDK v4 |
| `zod` | Schema definition patterns, `.describe()` for tool parameters |
| `@nestjs/common` | Module, Controller, Injectable decorators, Guards |
| `@nestjs/throttler` | ThrottlerModule configuration, @Throttle() decorator |

### Cursor Rules

The `.cursor/rules/context7-mcp.mdc` rule (created in Epic 0) instructs the AI assistant to always use Context7 MCP for documentation lookups. This ensures you never implement against stale documentation.

---

## Docker

**Official docs:** [https://docs.docker.com](https://docs.docker.com)
**Purpose:** Local development environment, deployment containerization

### Local Development

Ghostfolio provides a Docker Compose file for local development services:

```bash
# Start PostgreSQL and Redis
docker compose -f docker/docker-compose.dev.yml up -d

# Stop services
docker compose -f docker/docker-compose.dev.yml down
```

The API and client run outside Docker (via `npm run start:server` and `npm run start:client`).

### Production Deployment

Railway builds and runs the Docker image from the repository. The existing Ghostfolio Dockerfile is used without modification.

---

## Nx

**Official docs:** [https://nx.dev/getting-started/intro](https://nx.dev/getting-started/intro)
**Purpose:** Monorepo build system for Ghostfolio

### Relevant Commands

```bash
# Build the API (includes agent module)
npx nx build api

# Run API tests
npx nx test api

# Serve the API
npx nx serve api

# Generate a new NestJS module (if needed)
npx nx generate @nx/nest:module --name=agent --project=api
```

### Project Structure

Ghostfolio uses Nx with the following relevant projects:
- `apps/api` -- NestJS backend (where the agent module lives)
- `apps/client` -- Angular frontend
- `libs/common` -- Shared interfaces and types

---

## GitHub Actions

**Official docs:** [https://docs.github.com/en/actions](https://docs.github.com/en/actions)
**Purpose:** CI/CD pipeline for automated testing and deployment

### PR Checks Workflow

```yaml
# .github/workflows/pr-checks.yml
name: PR Checks
on:
  pull_request:
    branches: [dev]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm test
```

### Deploy Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to Railway
on:
  push:
    branches: [dev]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      # Railway deploy hook or CLI
```

---

## Quick Reference: Import Patterns

Common imports used throughout the agent module:

```typescript
// Vercel AI SDK
import { generateText, generateObject } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

// Zod
import { z } from 'zod';

// NestJS
import { Module, Controller, Injectable, Post, Body, UseGuards } from '@nestjs/common';

// Ghostfolio services (via DI, not direct import in tools)
import { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';
import { RulesService } from '@ghostfolio/api/app/portfolio/rules.service';
import { MarketDataService } from '@ghostfolio/api/services/market-data/market-data.service';

// Ghostfolio config
import { PROPERTY_API_KEY_OPENROUTER, PROPERTY_OPENROUTER_MODEL } from '@ghostfolio/common/config';

// Langfuse
import { Langfuse } from 'langfuse';
```
