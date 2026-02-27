# Ghostfolio Agent — Architecture Document

**Version:** 1.0  
**Date:** 2026-02-26  
**Status:** Final (Epic 16)

---

## 1. Domain and Use Cases

### Domain

**Finance — Personal Wealth Management.** The agent operates strictly within Ghostfolio’s read-only portfolio data: holdings, performance, rules/compliance, market data, transactions, and rebalancing simulations.

### Use Cases

| Use Case | Description |
|----------|-------------|
| **Portfolio analysis** | User asks "What is my allocation?" or "How did my portfolio perform this year?" — agent calls `get_holdings` or `portfolio_performance` and synthesizes a clear answer. |
| **Risk and compliance** | User asks "Are there any rule violations?" — agent calls `get_rules_report` and explains which rules pass/fail and why. |
| **Market context** | User asks about price history or trends for symbols — agent uses `market_data`. |
| **Transaction review** | User asks about recent trades or activity — agent uses `transaction_history`. |
| **Rebalancing simulation** | User asks "How do I get to 60/40?" — agent uses `get_holdings` and `rebalance_simulator` and suggests trades (read-only; no orders created). |

### Constraints

- **Read-only.** No order creation, trade execution, or data modification.
- **Suggestion-only.** All recommendations carry explicit disclaimers; no financial advice.
- **User-scoped.** All tool calls use the authenticated user’s ID; no cross-user data access.
- **Verification required.** Every response is checked by a 4-layer verification pipeline before being returned.

---

## 2. Agent Architecture

### Framework Choice

**Vercel AI SDK (v4)** with **OpenRouter** as the provider, routing to **Claude 3.5 Sonnet**. This choice was validated in Epic 2 (framework spike): tool-calling, structured output, and multi-step loops work reliably. The existing Ghostfolio stack already used the same SDK and OpenRouter, so no new runtime dependencies were introduced.

### Reasoning Approach

- **Single-agent.** One LLM with a role-based system prompt and a single tool registry. Multi-agent (e.g. supervisor + specialists) was considered but rejected for scope: one agent halves complexity while preserving quality for this sprint.
- **Tool-augmented generation.** The agent receives a system prompt that defines role, constraints, tool usage rules, and a strict JSON response format (claims with `source_tool` and `source_field`). It uses `generateText()` with `maxSteps: 5` so it can chain multiple tool calls before producing the final answer.
- **Structured output.** The LLM is instructed to return a JSON object with `claims[]`, `narrative`, and optional `recommendations[]`. The backend parses this for verification and then formats a user-facing narrative via `ResponseFormatter`.

### Tool Design

- **Six tools:** `portfolio_performance`, `get_holdings`, `get_rules_report`, `market_data`, `transaction_history`, `rebalance_simulator`.
- Each tool is a thin wrapper over an existing Ghostfolio service (e.g. `PortfolioService`, `RulesService`, `MarketDataService`, `OrderService`). Tools expose a single `execute(args)` method and return a `ToolResponse<T>` envelope (`success`, `data?`, `error?`).
- Tool definitions are created by `createToolRegistry()`: Zod schemas for parameters, detailed descriptions (used as prompts by the LLM), and an `execute` function that runs the tool, records the result in a `Map` for verification, and optionally redacts the result before it is sent back to the LLM.
- **User-scoping:** The registry is created per request with the authenticated `userId`; every tool call is executed in that user’s context.

### Data Flow

1. **Controller** validates input (length, sessionId, injection patterns), then calls `AgentService.processQuery()`.
2. **AgentService** loads conversation history, builds messages, creates the tool registry (with `userId`, `toolOutputs`, `toolsCalled`, and optional `RedactionService`), and calls `generateText()`.
3. **Vercel AI SDK** runs the tool loop: LLM may request tool calls; each result is stored in `toolOutputs` and, if redaction is enabled, redacted before being passed back to the LLM.
4. **AgentService** parses the final text into `StructuredAgentResponse`, runs **VerificationService**, then either returns a user-facing error (if verification failed) or formats the response and returns it with sources and flags.
5. **ConversationMemory** stores the exchange (capped at 20 turns per session) for follow-up questions.

---

## 3. Verification Strategy

All agent output is verified by a **4-layer pipeline** before being returned. The pipeline runs in order; the first blocking failure stops the process and returns a safe, generic error message to the user.

| Layer | Checker | Purpose | Blocks? |
|-------|---------|---------|--------|
| 1 | **RulesValidationChecker** | Cross-reference agent claims about rule violations against actual `get_rules_report` tool output. Prevents hallucinated or incorrect compliance statements. | Yes |
| 2 | **MathConsistencyChecker** | Recompute numerical claims (allocations, totals, percentages) from tool data. Ensures numbers are derivable within a small tolerance (e.g. 0.01%). | Yes |
| 3 | **SourceCitationChecker** | Ensure every factual claim has a valid `source_tool` and `source_field` that was actually called and exists in the tool output. Flags unsourced claims. | Yes |
| 4 | **EscalationChecker** | Detect high-impact recommendations (e.g. >20% of portfolio or full position exit). Adds a "HIGH IMPACT — review before acting" disclaimer and logs for audit; does not block the response. | No (flag only) |

Verification runs on the **raw** tool outputs (before redaction). The user never sees internal verification details; on failure they see a single, non-alarming message (e.g. "I detected an inconsistency in my analysis and stopped...").

---

## 4. Eval Results

- **Suite size:** 50 test cases (20 happy path, 10 edge, 10 adversarial, 10 multi-step).
- **Runner:** Jest-based (`eval-execution.spec.ts`), with deterministic mocked LLM by default so CI is fast and reproducible. Optional real-LLM mode via `EVAL_USE_REAL_LLM` for final validation.
- **Latest result (deterministic run):** **50/50 passed (100%)** — see `apps/api/src/app/endpoints/agent/eval/BASELINE-RESULTS.md` and `eval/results/latest-eval-results.json`.
- **Categories:** Happy path, edge case, adversarial, and multi-step all at 100% in the current baseline. Adversarial cases confirm the agent refuses out-of-scope requests (e.g. "Sell all my stocks", PII extraction, trade execution).
- **Target:** PRD and assignment require >80% pass rate; current baseline meets that. For production, periodic real-LLM runs are recommended.

---

## 5. Observability Setup

- **Langfuse** is used for tracing, cost tracking, and audit logging. Integration is via `@langfuse/tracing` in `LangfuseService`. If `LANGFUSE_SECRET_KEY` and `LANGFUSE_PUBLIC_KEY` are not set, the service degrades to a no-op so the agent still works in all environments.
- **Per request we track:** `userId`, `sessionId`, query text, tools called, token counts (input/output), estimated cost (USD), verification pass/fail, duration, and on error the categorized error type (`input_validation`, `llm_error`, `llm_timeout`, `tool_failure`, `verification_failure`).
- **Security and feedback:** Injection attempts are logged via `logSecurityEvent()`; user thumbs up/down are recorded via a dedicated feedback endpoint and stored as Langfuse scores. This supports security audits, compliance reviews, and quality trending.
- **Insights:** Traces can be used to debug verification failures, tune prompts, and monitor cost and latency. Token and cost are derived from Vercel AI SDK usage metadata and a small cost-estimator module (Claude pricing).

---

## 6. Open Source Contribution

- This fork is released as a **documented fork** of Ghostfolio with the agent module, eval suite, and documentation included. The contribution form (e.g. future npm package or standalone eval dataset) may be refined later.
- **License:** AGPLv3, matching upstream Ghostfolio.
- **Deliverables:** AgentModule (6 tools, 4-layer verification, redaction, observability), 50-case eval dataset with schema and runner, architecture and cost docs, setup and deployment instructions in the README and under `docs/`. The repository is suitable for review, reuse, and further contribution (e.g. PRs to upstream or standalone packages).
