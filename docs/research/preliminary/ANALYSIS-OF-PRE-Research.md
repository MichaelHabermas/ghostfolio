# Pre-Search Evaluation Report

**Subject:** AgentForge Week 2 — Smart Portfolio Auditor & Optimizer (Ghostfolio)
**Date:** 2026-02-23
**Verdict:** Strong pre-search with mature architectural thinking. Several areas need tightening before execution.

---

## 0. Personal Top-Line: Don't Over-Engineer This

Before anything else — the biggest threat to this project is not a bad architecture decision. It is building too much architecture for a one-week sprint.

**You are one person with seven days.** Every hour spent on multi-agent orchestration, Redis-backed memory, or open-source packaging is an hour not spent on the thing that actually matters: a working agent that calls real Ghostfolio services and returns verified answers.

**Three rules for the week:**

1. **Ship the dumbest thing that works first.** Single agent. In-memory state. Local demo. No Redis. No multi-agent. No Railway. Get the "query → tool call → verified answer" loop working end-to-end, then layer on complexity only when you have time and a reason.

2. **Redis is a future optimization, not an MVP dependency.** Ghostfolio runs Redis, yes, but your agent does not need persistent conversation memory to be useful on Day 1. A simple in-memory array of the last N messages is enough for a session. Redis-backed `BufferMemory` is a nice-to-have for production session persistence — file it under "Friday if things are going well" and move on.

3. **Resist the resume-driven-development urge.** Supervisor + 3 Specialists looks impressive on a slide. It also means debugging inter-agent routing, managing separate system prompts, and dealing with context handoff — none of which makes the agent's answers better for a single-user MVP. A single agent with 6 tools and a well-written system prompt will produce identical output quality with half the code and a fraction of the debugging surface.

**The pre-search is strong. The risk is not that the plan is wrong — it is that the plan is too much plan.** Trim it, ship it, then iterate.

---

## 1. Executive Summary

This pre-search document plans a read-only AI portfolio auditor built on top of the Ghostfolio open-source wealth management platform. It proposes a LangChain-based multi-agent system (Supervisor + 3 Specialists) backed by Claude 3.5 Sonnet, with a four-layer verification pipeline, Langfuse observability, and a hybrid Jest/Langfuse eval strategy, all delivered in a one-week sprint.

**Overall quality: 8/10.** The document demonstrates strong domain awareness, disciplined scope control, and credible architectural choices. The main weaknesses are timeline risk, some under-specified integration details, and a few choices that could be simplified without losing value.

---

## 2. Strengths

### 2.1 Domain Constraint Discipline

The read-only constraint is the single most important design decision in this document and it is applied consistently: no trade execution, no data mutation, suggestion-only output. This dramatically reduces the blast radius of any agent failure and is the correct posture for a finance-domain MVP.

### 2.2 Verification Pipeline

The four-layer verification model (RulesService hallucination detection, math consistency, confidence scoring, human-in-the-loop escalation) is unusually thorough for a sprint-scoped project. Each layer addresses a distinct failure mode, and the thresholds are concrete rather than hand-wavy.

### 2.3 Grounded Tool Selection

Rejecting `tax_estimate` and `transaction_categorize` in favour of tools that map directly to real Ghostfolio services is a mature decision. It avoids the common trap of fabricating backend capabilities to match assignment examples and keeps the eval suite meaningful.

### 2.4 Failure Mode Matrix

The explicit failure mode matrix with detection and mitigation per scenario is well-structured. The "fail fast" strategy is correctly justified for the finance domain: partial answers hiding missing data are genuinely more dangerous than explicit errors.

### 2.5 Cost Analysis

The per-query and per-scale cost projections are realistic and use correct Claude 3.5 Sonnet pricing. Including dev/test cost estimates is a nice touch.

---

## 3. Weaknesses and Risks

### 3.1 Timeline Feasibility (HIGH RISK)

The 24-hour MVP scope includes: forking Ghostfolio, standing up Docker Compose (API + Postgres + Redis), creating a full `AgentModule` (controller, service, module), implementing 3 tools with DI wiring, integrating LangChain with Claude, adding BufferMemory + Redis, building one verification check, writing 5 test cases, deploying to Railway, and end-to-end verification.

**Assessment:** This is 2-3 days of work compressed into 24 hours. The Ghostfolio codebase is non-trivial (NestJS monorepo with Prisma, complex service layer). Just understanding the DI graph for `PortfolioService` and `RulesService` will consume significant time.

**Risk:** If the 24-hour gate is hard, this is the most likely failure point.

### 3.2 LangChain TypeScript Maturity (MEDIUM RISK)

The document acknowledges a fallback to the direct Anthropic SDK but does not detail what that fallback looks like architecturally. LangChain's TypeScript ecosystem (`@langchain/core`, `@langchain/anthropic`) is less mature and less stable than the Python counterpart. Nested tool-agents (wrapping agents as `DynamicStructuredTool`) is an advanced pattern that may not work cleanly out of the box.

**Risk:** Time lost debugging LangChain TS quirks could cascade into the Friday and Sunday milestones.

### 3.3 Multi-Agent Overhead for MVP (MEDIUM RISK)

The document correctly plans to start with a single agent for the 24-hour MVP and refactor to multi-agent by Friday. However, the specialist boundaries (PortfolioAnalyst, RiskAssessor, MarketResearcher) overlap significantly: both the PortfolioAnalyst and RiskAssessor need holdings data, and the MarketResearcher is effectively a thin wrapper around a single tool call.

**Risk:** The multi-agent pattern may add complexity without proportional benefit. A single agent with all six tools and good system prompting could achieve the same outcomes with less inter-agent coordination overhead.

### 3.4 Confidence Scoring Reliability (LOW-MEDIUM RISK)

Self-assessed confidence scores from LLMs are notoriously unreliable. Models frequently report high confidence on hallucinated outputs and low confidence on correct but unusual outputs. Using self-assessed confidence as a gating mechanism (blocking responses below 50%) could produce both false positives and false negatives.

**Risk:** This verification layer may not add the safety margin it implies. It could block valid responses or pass through hallucinated ones.

### 3.5 Data Privacy Gap (MEDIUM RISK)

The document acknowledges that portfolio data is sent to Anthropic's API and marks it as "acceptable for MVP." This is correct for a demo but under-specifies the actual risk: personal financial data (holdings, transactions, account balances) is highly sensitive. The document mentions "consider on-prem LLM or data anonymization" for production but provides no concrete path.

### 3.6 Missing Error Recovery UX

The fail-fast strategy is justified, but the document does not describe what the user actually sees when a failure occurs. "Database unavailable" is a developer-facing message, not a user-facing one. For a finance tool, error messages should be clear, non-alarming, and actionable.

---

## 4. Mitigations

### 4.1 Timeline: Cut Scope, Not Corners

| Current 24h MVP Item | Recommendation |
|---|---|
| 3 MVP tools | Keep — these are the core value |
| BufferMemory + Redis | **Drop entirely for this sprint.** Use a plain in-memory message array (last 10-20 turns). Redis-backed memory is a future optimization for production session persistence — not a sprint concern. |
| Railway deployment | **Defer to Day 2.** Demo locally for the 24h gate. Deploying to Railway while simultaneously debugging DI wiring is a context-switching trap. |
| RulesService verification | Keep — this is the key differentiator |
| 5 test cases | Reduce to 3 smoke tests. Comprehensive testing is a Friday concern. |

This buys back roughly 4-6 hours.

### 4.2 LangChain Fallback: Spike First

Before committing to LangChain, spend 1-2 hours on a throwaway spike: wire `@langchain/anthropic` with a single `DynamicStructuredTool` inside a NestJS service and confirm tool-calling round-trips work. If the spike fails, immediately switch to the direct Anthropic SDK with a manual tool-calling loop (Anthropic's Messages API natively supports tool-use with JSON schemas — no framework needed).

Document the fallback architecture now so the switch is mechanical, not creative.

### 4.3 Single Agent with Role Prompting Instead of Multi-Agent

Replace the Supervisor + 3 Specialists pattern with a single agent that has all tools and uses role-based system prompting to guide its behaviour. This eliminates inter-agent coordination, reduces token overhead (no supervisor reasoning about which specialist to invoke), and simplifies debugging.

If specialist separation is still desired for context isolation, implement it as prompt sections within the single agent rather than as separate agent instances. The multi-agent refactor can happen post-submission if the pattern proves valuable.

### 4.4 Replace Self-Assessed Confidence with Output Validation

Remove the LLM self-assessed confidence score as a gating mechanism. Instead, invest that effort in stronger deterministic checks:

- Extend the math consistency check to cover all numerical claims (not just allocation sums).
- Add a "source citation" requirement: every factual claim must reference a specific tool output. Claims without source references are flagged.
- Use the Langfuse LLM-as-judge eval for response quality scoring (which is already planned) rather than in-line self-assessment.

### 4.5 Data Privacy: Add a Redaction Layer

For the MVP, add a lightweight redaction pass on data sent to the LLM:

- Replace real account names with generic labels (`Account A`, `Account B`).
- Optionally replace exact balances with rounded values (rounding to nearest $100 is sufficient for analysis without exposing exact wealth).
- Document what data is sent to Anthropic in the README.

This is a small effort that significantly improves the privacy posture without requiring an on-prem LLM.

### 4.6 User-Facing Error Messages

Define an error message map that translates internal failures into user-appropriate language:

| Internal Error | User Message |
|---|---|
| DB connection timeout | "I'm unable to access your portfolio data right now. Please try again in a moment." |
| LLM rate limit | "The analysis service is temporarily busy. Please try again shortly." |
| Verification mismatch | "I detected an inconsistency in my analysis and stopped to avoid giving you incorrect information. Please try rephrasing your question." |
| Context overflow | "Your portfolio is very large. I'll focus on your top holdings for this analysis." |

---

## 5. Viability Assessment by Decision Area

### 5.1 Agent Framework: LangChain (TypeScript) — VIABLE WITH CAVEATS

LangChain TS is a reasonable choice for a sprint-scoped project, but the nested tool-agent pattern is pushing the framework's TypeScript implementation beyond its well-trodden path. The fallback to the direct Anthropic SDK is the correct insurance policy.

**Verdict:** Viable if the spike (Mitigation 4.2) succeeds. If not, the fallback is equally viable and arguably simpler.

### 5.2 LLM: Claude 3.5 Sonnet — STRONGLY VIABLE

Correct choice. Claude 3.5 Sonnet has excellent tool-use support, the 200k context window is more than adequate, and the pricing is competitive. The one concern is data privacy (portfolio data to Anthropic), which is mitigated by the redaction layer (Mitigation 4.5).

**Note:** Since this document was written, Claude 3.5 Sonnet has been superseded by Claude 4 models. Verify whether `@langchain/anthropic` supports the latest model and whether pricing/performance has shifted. If Claude 4 Sonnet is available at comparable pricing, it would be a strict upgrade.

### 5.3 Observability: Langfuse — VIABLE

Langfuse is a solid choice for an open-source project. The `langfuse-langchain` callback handler simplifies integration. The main risk is the callback handler's stability with LangChain TS, which is less tested than the Python equivalent. Acceptable for MVP.

### 5.4 Verification Pipeline — VIABLE (3 of 4 layers)

The RulesService hallucination detection and math consistency check are strong, deterministic, and directly grounded in the domain. The human-in-the-loop escalation is well-defined. The self-assessed confidence score is the weakest layer and should be reworked (Mitigation 4.4).

### 5.5 Deployment: Railway — VIABLE

Railway is appropriate for a demo deployment. Managed Postgres reduces ops burden (Redis is not needed for the agent itself — only for Ghostfolio's existing cache layer). The Docker Compose local fallback is good insurance. Cost is minimal for MVP scale.

### 5.6 Failure Strategy: Fail Fast — STRONGLY VIABLE

Correct for the domain. The document's rationale (partial answers are more dangerous than no answer in finance) is sound. Needs the UX polish described in Mitigation 4.6.

### 5.7 Testing and Eval Strategy — VIABLE BUT AMBITIOUS

50 test cases is a solid target but aggressive for a one-week sprint, especially with 10 adversarial and 10 multi-step cases that require careful ground truth definition. The eval dataset schema is well-designed. Consider starting with 30 cases (15 happy path, 5 edge, 5 adversarial, 5 multi-step) and expanding to 50 only if time permits.

### 5.8 Open Source Plan — VIABLE BUT PREMATURE

The plan to release as a standalone `ghostfolio-agent` NestJS module is ambitious for Week 2. Focus on the agent working correctly first; packaging and documentation for open-source release can happen after the submission deadline without risk.

---

## 6. Missing Items

| Gap | Severity | Recommendation |
|---|---|---|
| No system prompt drafts | Medium | Write draft system prompts for the supervisor and each specialist before coding. Prompt engineering is where most agent quality comes from. |
| No schema definitions for tool inputs/outputs | Medium | Define TypeScript interfaces or Zod schemas for every tool's input and output before implementation. This prevents drift between what the agent expects and what the tools return. |
| No conversation memory eviction strategy | Low | If using in-memory messages (recommended), cap at 10-20 turns per session. If Redis is added later as an optimization, define a TTL and max token budget per session then. |
| No rollback plan for LangChain | Medium | The fallback to direct Anthropic SDK is mentioned but not architecturally sketched. Sketch it now. |
| No load testing plan | Low | Acceptable for MVP but worth noting. Railway's free/hobby tier may have request concurrency limits. |
| Claude model version pinning | Low | Pin to a specific model version (e.g., `claude-3-5-sonnet-20241022`) to avoid behaviour changes from model updates during the sprint. |
| No API versioning on the agent endpoint | Low | If this becomes an open-source module, the agent endpoint should be versioned (`/api/v1/agent`) from the start. |

---

## 7. Recommended Priority Order

If time is constrained (which it will be), execute in this order:

1. **Spike LangChain TS tool-calling with NestJS DI** (1-2 hours, go/no-go decision)
2. **Implement 3 MVP tools as plain NestJS services** (these are valuable regardless of agent framework)
3. **Wire single agent with tools + RulesService verification** (core value loop)
4. **Write 10-15 eval cases and run them** (validates the whole pipeline)
5. **Add Langfuse tracing** (observability)
6. **Deploy to Railway** (demo-ability)
7. **Expand to 30+ eval cases** (credibility)
8. **Add remaining tools and multi-agent refactor** (if time permits)

Items 1-4 should be the 24-hour gate. Items 5-8 fill out the week.

---

## 8. Conclusion

This is a well-researched and thoughtfully structured pre-search document. The domain constraints are clear, the architectural choices are defensible, and the verification pipeline is unusually mature for a sprint project. The primary risks are timeline compression and LangChain TS stability, both of which are manageable with the mitigations outlined above.

The project is **viable for a one-week sprint** if scope is managed aggressively: skip multi-agent architecture, defer Railway deployment past Day 1, drop Redis-backed memory entirely (it is a future optimization, not a sprint need), and start with a focused single-agent MVP that nails the core value loop of "query → tool calls → verified response."

The pre-search is thorough and the thinking is sound. The danger is not a wrong decision — it is too many decisions. Build the simple version. It will be good enough. Then make it better with time you have left.

**Final rating: 8/10** — Strong foundation, needs execution discipline and the restraint to not over-engineer it.
