# AgentForge Week 2 - Pre-Search AI Conversation

This file captures the raw conversation, questions, and decisions during the Pre-Search process for Ghostfolio.

---

## Stage 1: Constraints (Inherited)

Stage 1 was completed prior to this conversation and recorded in `PRE-SEARCH.md`.

**Summary of inherited decisions:**

- **Domain**: Finance (Smart Portfolio Auditor & Optimizer)
- **Access**: Strictly read-only — no orders, no data modification
- **Scale**: Single-user local environment for MVP
- **Data Sources**: User's Postgres DB (Holdings/Transactions) + Mock Market Data API for evals
- **Reliability**: Deterministic evals required; all findings verified against RulesService
- **Team**: Solo builder using existing NestJS Dependency Injection system
- **Integration**: New AgentModule within the api project at `apps/api/src/app/endpoints/agent/`

**Codebase recon identified key services:**

- `PortfolioService.getPerformance()` — account totals and asset classes
- `PortfolioService.getHoldings()` / `getDetails()` — current holdings and allocations
- `PortfolioService.getReport()` → `RulesService.evaluate()` — compliance violations
- `MarketDataService.getRange()` — market prices
- `OrderService.getOrders()` — transaction history
- Existing `AiModule` at `apps/api/src/app/endpoints/ai/` with OpenRouter integration as a starting point

---

## Stage 2: Architecture & Framework Selection

### Q1: Which agent framework?

**Options presented:** LangChain / LangGraph / Custom (Vercel AI SDK / NestJS native)

**User answer:** "If we can use LangFuse, do that. IF not, lets go with Langchain"

**AI clarification:** LangFuse is an observability platform, not an agent framework. We will use **LangChain** as the agent framework and **Langfuse** for observability. These are complementary — LangChain runs the agent, Langfuse traces everything.

**Decision:** LangChain (TypeScript) for the agent framework.

---

### Q2: Which LLM provider?

**Options presented:** OpenAI GPT-4o / Anthropic Claude 3.5 Sonnet / Open Source (Llama 3 / Mistral)

**User answer:** Claude 3.5 Sonnet

**Decision:** Anthropic Claude 3.5 Sonnet via `@langchain/anthropic`.

---

### Q3: Which observability platform?

**Options presented:** LangSmith / Braintrust / Custom logging

**User answer:** "If we can use LangFuse, do that. IF not, lets go with LangSmith"

**Decision:** Langfuse (open-source tracing, evals, prompt management). Integrated via `langfuse-langchain` callback handler.

---

### Q4: Single agent or multi-agent?

**Options presented:** Single Agent (Orchestrator handles all tasks) / Multi-Agent (Supervisor + Specialists)

**User answer:** Multi-agent. Then asked: "Would it make sense the sub agents to live inside tools?"

**AI response:** Yes — this is a well-established pattern called "Hierarchical Tool-Agents." A Supervisor Agent receives user queries and has access to "tools" that are actually specialized sub-agents:

1. **PortfolioAnalyst** — handles portfolio performance and holdings queries
2. **RiskAssessor** — handles compliance violations and rules-based analysis
3. **MarketResearcher** — handles market data lookups and transaction context

Each specialist is wrapped as a `DynamicStructuredTool` in LangChain, so the supervisor sees them as callable tools. This keeps the supervisor's context lean (it doesn't need to hold all portfolio data) while allowing each specialist to do focused multi-step reasoning.

**Decision:** Supervisor + 3 Specialist tool-agents.

---

### Q5: Which tools to implement?

**Options presented:** portfolio_performance / get_holdings / get_rules_report / market_data / transaction_history / rebalance_simulator

**User answer:** All 6 selected.

**Decision:** All 6 tools. First 3 are MVP (mapped to existing Ghostfolio services). Last 3 are post-MVP.

---

## Stage 3: Evals & Verification

### Q6: Eval framework approach?

**Options presented:**

- Langfuse Native Evals (Prompt/Model grading)
- Custom Evals via Jest (Deterministic exact matching)
- Hybrid: Jest for Tool Correctness + Langfuse for LLM grading

**User answer:** Hybrid

**Decision:** Hybrid evaluation — Jest for deterministic tool correctness tests (seeded DB, expected outputs) + Langfuse for LLM-as-judge scoring on response quality, hallucination detection, and domain accuracy.

---

### Q7: Which verification mechanisms?

**Options presented:**

- RulesService Validation (Agent claims must match actual Ghostfolio violations)
- Math Consistency Check (Sum of allocations = 100%, totals match)
- Confidence Scoring (Agent states confidence, reject if < 80%)
- Self-Reflection Hallucination Check (Secondary LLM call to verify claims)

**User answer:** RulesService Validation, Math Consistency Check, Confidence Scoring (3 of 4)

**Decision:** Three verification mechanisms:

1. **RulesService Validation** — cross-reference agent claims against `PortfolioService.getReport()` output
2. **Math Consistency Check** — re-compute numerical claims from raw data (allocations sum to 100%, totals match)
3. **Confidence Scoring** — agent self-assesses confidence; <80% gets disclaimer, <50% blocks response

The Self-Reflection Hallucination Check (secondary LLM call) was not selected — it would add latency and cost for MVP. Can be added post-MVP if hallucination rates are above target.

---

## Stage 4: Failure Modes & Deployment

### Q8: Failure mode strategy?

**Options presented:**

- Fail Fast (error immediately on any tool/verification failure)
- Graceful Degradation (explain what worked and what failed)

**User answer:** Fail Fast

**Decision:** Fail fast on any tool or verification failure. In finance, partial answers missing critical data are more dangerous than no answer. The agent returns an explicit error message rather than attempting partial analysis.

---

### Q9: Deployment platform?

**Options presented:**

- Local Docker Compose (alongside Ghostfolio stack)
- Vercel Serverless Function
- Railway/Render (single service)

**User answer:** Railway

**Decision:** Railway for deployment. Single service with managed Postgres + Redis add-ons. Auto-deploy from GitHub on merge to main. Publicly accessible URL for demo and submission.

---

## Stage 5: Synthesis

No new decision checkpoints were needed. All prior stage decisions (Q1–Q9) were consolidated into `PRE-SEARCH.md` as the final Pre-Search deliverable.

**Synthesis produced:**

- Architectural Decisions Summary table
- Tool-to-Service Mapping table
- AI Cost Analysis (dev ~$15-25, production projections at 4 scale tiers)
- Open Source Contribution Plan (`ghostfolio-agent` NestJS module, AGPLv3)
- One-Week Execution Roadmap (Tuesday MVP → Friday Early → Sunday Final)
- Decision Log: 6 major decisions recorded with trade-offs and risks

---

## Refinement Pass (Post-Synthesis)

After the initial 5-stage Pre-Search was complete, a gap analysis was performed against `G4-Week-2-AgentForge.md` to identify areas where the deliverable was thin or missing explicit connections to assignment requirements.

**Gaps identified:**

1. Tool set diverges from assignment examples without justification
2. "Hallucination Detection" (an assignment verification type) not named despite being covered in practice
3. Human-in-the-loop listed as "TBD" instead of a concrete decision
4. Rate limiting / fallback strategy too thin for the checklist
5. Per-stage "Locked Decisions" blocks created repetition the instructor notes say isn't needed

---

### Q10: Why no `tax_estimate` or `transaction_categorize`?

**Context:** The assignment lists these as example finance tools. Our tool set uses `rebalance_simulator` and `transaction_history` instead.

**User answer:** Ghostfolio has no tax data or categorization engine — those tools would be fake/hallucinated.

**Decision:** Document the justification explicitly: Ghostfolio has no tax engine, no income/deduction model, and no transaction categorization system. Building those tools would mean fabricating backend capabilities that don't exist. The chosen alternatives are grounded in real Ghostfolio services.

---

### Q11: How to address "Hallucination Detection" naming?

**Context:** The assignment's verification table lists "Hallucination Detection" explicitly. Our RulesService validation and confidence scoring cover this in practice but never use the term.

**Options presented:**

- Reframe existing verifications to explicitly name it
- Add a 4th mechanism (Self-Reflection / secondary LLM check)

**User answer:** Reframe existing verifications — they already cover it, just name it explicitly.

**Decision:** Renamed RulesService Validation to "Hallucination Detection via RulesService Validation" — any agent claim that doesn't match actual `RulesService.evaluate()` output is treated as a hallucination and blocked. Added a note to Confidence Scoring that it also serves as hallucination mitigation.

---

### Q12: How to handle repetition in PRE-SEARCH.md?

**Context:** The same decisions appeared in Stage 2, 3, 4, and Final Synthesis "Locked Decisions" blocks. Instructor notes say "details about the back and forth... are not required."

**Options presented:**

- Collapse into ONE authoritative Final Synthesis section
- Keep stages but trim to 2-3 bullets each
- Keep as-is

**User answer:** Collapse into one authoritative Final Synthesis section.

**Decision:** Removed per-stage "Locked Decisions" / "Trade-offs" / "Open Questions" / "Risks" blocks from Stage 2, 3, and 4 outputs. The Final Pre-Search Synthesis is now the single authoritative section. Phase detail content (tool descriptions, failure mode matrix, security plan, etc.) remains intact.

---

### Q13: Human-in-the-loop — what's the concrete stance?

**Context:** Phase 1 listed "Human-in-the-loop TBD." The assignment's verification table includes "Human-in-the-Loop" as an option.

**Options presented:**

- Agent is suggestion-only by design — that IS the human-in-the-loop
- Add explicit escalation for high-risk recommendations
- Not applicable for MVP

**User answer:** Add an explicit escalation: flag high-risk recommendations for user confirmation.

**Decision:** Added 4th verification mechanism — "Human-in-the-Loop Escalation." High-impact recommendations (rebalancing >20% of portfolio value, full position exits) are surfaced with a "requires your review" flag. Updated Phase 1 reliability section to replace "TBD" with this concrete approach. Verification count now 4 (exceeds the "implement 3+" requirement).

---

### Q14: Rate limiting — what's proportionate for MVP?

**Context:** Rate limiting bullet was thin ("no user-facing rate limiting for single-user MVP"). Checklist asks about rate limiting and fallback strategies.

**Options presented:**

- Queue-based (Bull/Redis)
- API gateway (Railway/nginx) + LLM retry
- Simple: `@nestjs/throttler` + LLM retry logic

**User answer:** `@nestjs/throttler` on the agent endpoint + LangChain retry with backoff. It's honest, proportionate, and fits the NestJS stack natively. Production path (API gateway + Bull/Redis queue) documented but not built this week.

**Decision:** MVP uses `@nestjs/throttler` (e.g., 10 req/min per user) + LangChain built-in retry with exponential backoff. Production path: API gateway-level rate limiting + Bull/Redis job queue for async execution. One sentence in the doc bridges MVP and production understanding.

---

### Q15: Should we document this refinement conversation?

**Options presented:**

- Append as a "Refinement Pass" section
- Append AND clean up existing stages
- Just add a brief note

**User answer:** Append it AND clean up existing stages for consistency.

**Decision:** Added this Refinement Pass section to `PRE-SEARCH-AI-CONVERSATION.md`. Cleaned up Stage 5 to note that no new decision checkpoints were needed (synthesis only). All refinement decisions (Q10–Q15) added to `PRE-SEARCH.md` Decision Log as entries 7–9.

---

## Reconciliation Pass (Post-Analysis)

After the Pre-Search was complete, an independent critical review was conducted and recorded in `ANALYSIS-OF-PRE-Research.md`. That document rated the Pre-Search **8/10** but identified over-engineering as the primary risk: "The danger is not a wrong decision — it is too many decisions." The ANALYSIS is treated as the stronger document; its recommendations are accepted unless they conflict with hard assignment requirements.

The following questions reconcile the original Pre-Search decisions with the ANALYSIS findings. All changes flow back into `PRE-SEARCH.md`.

---

### Q16: Single agent or multi-agent architecture?

**Context:** The Pre-Search committed to Supervisor + 3 Specialist tool-agents (Q4). The ANALYSIS argues this is over-engineering for a one-week sprint — a single agent with all tools and good system prompting produces identical output quality with half the code and a fraction of the debugging surface. Specialist boundaries overlap (both PortfolioAnalyst and RiskAssessor need holdings data) and MarketResearcher is effectively a thin wrapper around a single tool call.

**Options presented:**

- Accept: Single agent for MVP (and likely the whole sprint)
- Compromise: Single agent for MVP, multi-agent refactor if ahead of schedule by Friday
- Reject: Keep multi-agent plan as-is

**User answer:** Accept — single agent for the sprint.

**Decision:** Multi-agent architecture removed entirely. The agent is a single LangChain agent with all 6 tools directly available and role-based system prompting to guide behaviour. This eliminates inter-agent coordination, reduces token overhead, and simplifies debugging. The multi-agent refactor is not planned for any milestone.

---

### Q17: Drop Redis/BufferMemory?

**Context:** The Pre-Search included LangChain `BufferMemory` backed by Redis in the 24h MVP. The ANALYSIS argues Redis-backed memory is a future optimization, not a sprint dependency — a plain in-memory message array is sufficient for a single-user session.

**Options presented:**

- Accept: Drop Redis memory entirely. Use plain in-memory array (last 10-20 turns).
- Compromise: Drop from 24h MVP, add Friday if things are going well.
- Reject: Keep Redis-backed memory in MVP.

**User answer:** Accept — drop Redis memory entirely.

**Decision:** Redis is no longer used for agent conversation memory. Session state is a plain in-memory array capped at 10-20 turns. This removes a dependency, simplifies the 24h MVP, and avoids context-switching between Redis debugging and core agent work. (Redis remains in the stack for Ghostfolio's own cache layer — this change only affects the agent's conversation memory.)

---

### Q18: Replace confidence scoring with deterministic checks?

**Context:** The Pre-Search included LLM self-assessed confidence scoring as verification mechanism #3 (Q7). The ANALYSIS argues this is unreliable — models frequently report high confidence on hallucinated outputs and low confidence on correct but unusual outputs. Recommends replacing it with stronger deterministic checks: extended math validation + source citation requirements.

**Options presented:**

- Accept: Replace confidence scoring with source citation + extended math checks
- Compromise: Keep confidence scoring AND add source citation requirements
- Reject: Keep confidence scoring as-is

**User answer:** Accept — replace confidence scoring.

**Decision:** Confidence scoring removed as a verification mechanism. Replaced with two deterministic checks:

1. **Extended Math Validation** — the existing math consistency check is expanded to cover all numerical claims in the response, not just allocation sums and portfolio totals.
2. **Source Citation Requirement** — every factual claim the agent makes must reference a specific tool output. Claims without source references are flagged as unsupported and blocked.

Verification mechanisms are now: (1) Hallucination Detection via RulesService, (2) Extended Math Consistency Check, (3) Source Citation Requirement, (4) Human-in-the-Loop Escalation. Still 4 mechanisms, exceeding the "implement 3+" requirement.

---

### Q19: 24h MVP scope — accept ANALYSIS cuts?

**Context:** The ANALYSIS says the 24h MVP is 2-3 days of work compressed into 24 hours. Recommends deferring Railway to Day 2 (demo locally for 24h gate) and reducing test cases from 5 to 3 smoke tests.

**User answer:** Reject — the MVP requirements are hard gates. The assignment explicitly requires "Deployed and publicly accessible" and "5+ test cases with expected outcomes." Both stay in the 24h MVP.

**Decision:** Railway deployment and 5+ test cases remain in the 24h MVP scope. The time savings from dropping multi-agent architecture and Redis memory (Q16, Q17) partially offset this. The LangChain spike (see Q21) also de-risks the timeline by front-loading the go/no-go framework decision. Eval dataset target remains 50 cases (assignment says "minimum 50").

---

### Q20: Additional improvements from ANALYSIS?

**Context:** The ANALYSIS recommends several additive improvements: data redaction layer (generic account labels, rounded balances before sending to Anthropic), user-facing error message map (translating internal failures to friendly language), and open source contribution form.

**Decisions made:**

- **Data redaction layer:** Accepted. Replace real account names with generic labels (`Account A`, `Account B`), optionally round exact balances. Document what data is sent to Anthropic in the README. Small effort, significant privacy improvement.
- **User-facing error message map:** Accepted. Define a mapping from internal errors to user-appropriate messages (e.g., DB timeout → "I'm unable to access your portfolio data right now. Please try again in a moment.").
- **Open source contribution form:** Deferred to Friday. Decide based on progress whether to publish an npm package, release the eval dataset, or ship the forked repo with documentation. The assignment requires this for Final Submission (Sunday), not MVP.

---

### Q21: LangChain spike before committing?

**Context:** The ANALYSIS recommends spending 1-2 hours on a throwaway spike before committing to LangChain TS: wire `@langchain/anthropic` with a single `DynamicStructuredTool` inside a NestJS service and confirm tool-calling round-trips work. If the spike fails, switch to the direct Anthropic SDK with a manual tool-calling loop.

**Options presented:**

- Yes, spike first then decide
- No, commit to LangChain and deal with issues as they arise

**User answer:** Yes — spike first.

**Decision:** First task on Day 1 is a 1-2 hour LangChain TS spike. Wire `@langchain/anthropic` with one tool in a NestJS service, confirm tool-calling works end-to-end. If it fails, switch to the direct Anthropic SDK (Messages API with native tool-use). The fallback architecture is sketched in `PRE-SEARCH.md` so the switch is mechanical, not creative.

---

### Reconciliation Summary

| Area | Pre-Search (Before) | Reconciled (After) | Source |
|---|---|---|---|
| Agent Architecture | Supervisor + 3 Specialists | Single agent, all tools, role-based prompting | ANALYSIS 4.3 |
| Conversation Memory | BufferMemory + Redis | In-memory array, 10-20 turns | ANALYSIS 4.1 |
| Verification #3 | Confidence Scoring (self-assessed) | Source Citation Requirement (deterministic) | ANALYSIS 4.4 |
| Math Check | Allocation sums + portfolio totals | Extended to all numerical claims | ANALYSIS 4.4 |
| Data Privacy | "Acceptable for MVP, consider anonymization later" | Redaction layer in MVP (generic labels, rounded balances) | ANALYSIS 4.5 |
| Error UX | Developer-facing messages | User-facing error message map | ANALYSIS 4.6 |
| Framework Commitment | Commit to LangChain, fallback mentioned | Spike first (1-2h go/no-go), fallback sketched | ANALYSIS 4.2 |
| 24h MVP Scope | Railway + 5 tests + Redis + multi-agent path | Railway + 5 tests (kept per hard gates); Redis + multi-agent removed | Hard requirements override ANALYSIS |
| Eval Dataset | 50 cases | 50 cases (kept per assignment minimum) | Hard requirement |
| Open Source Form | ghostfolio-agent npm package | Decide Friday based on progress | Deferred |
