# Ghostfolio Agent — AI Cost Analysis

**Version:** 1.0  
**Date:** 2026-02-26  
**Status:** Epic 16 deliverable

---

## 1. Pricing Reference

| Item | Rate | Source |
|------|------|--------|
| Claude 3.5 Sonnet (input) | ~$3 / 1M tokens | OpenRouter / Anthropic (verify current rates) |
| Claude 3.5 Sonnet (output) | ~$15 / 1M tokens | OpenRouter / Anthropic (verify current rates) |

The agent uses `anthropic/claude-3.5-sonnet` via OpenRouter. Per-request cost is computed in-app via `observability/cost-estimator.ts` and attached to Langfuse traces.

---

## 2. Development and Testing Costs

| Item | Estimate / Note |
|------|------------------|
| **LLM (dev/test)** | ~500 queries × ~2,000 input × ~1,000 output → ~$3 (input) + ~$7.50 (output) ≈ **$10.50** |
| **Langfuse** | Free tier (cloud) or self-hosted — no direct cost |
| **Railway (demo)** | ~$5–20/month for API + Postgres + Redis |
| **Total estimated dev cost** | **~$15–25** for the sprint |

Actual dev spend can be read from Langfuse (token usage and `estimatedCostUsd` per trace). If you have run the full eval suite or real-LLM evals, sum those traces for a more accurate dev number.

---

## 3. Production Cost Projections

### Assumptions

| Metric | Value |
|--------|------|
| Queries per user per day | 3 |
| Avg input tokens per query | 2,000 (system prompt + portfolio data + conversation) |
| Avg output tokens per query | 800 (analysis + recommendations) |
| Tool calls per query | ~2 (additional rounds add to input/output) |
| Verification overhead | ~10% (already reflected in the token estimates above) |

### Monthly Projections

| Scale | Monthly Queries | Input Tokens | Output Tokens | Estimated Cost |
|-------|-----------------|--------------|---------------|----------------|
| 100 users | 9,000 | 18M | 7.2M | **~$162/month** |
| 1,000 users | 90,000 | 180M | 72M | **~$1,620/month** |
| 10,000 users | 900,000 | 1.8B | 720M | **~$16,200/month** |
| 100,000 users | 9,000,000 | 18B | 7.2B | **~$162,000/month** |

**Formula (monthly):**  
`queries = users × 3 × 30`  
`input_cost = (queries × 2000 / 1e6) × 3`  
`output_cost = (queries × 800 / 1e6) × 15`  
`total = input_cost + output_cost`

---

## 4. Cost Optimization Strategies

| Strategy | Description |
|----------|-------------|
| **Caching** | Cache common query/tool result combinations (e.g. “What is my allocation?” for a given user/snapshot) to avoid repeated LLM + tool calls. |
| **Smaller models for routing** | Use a cheaper/smaller model for intent routing or simple FAQs; call Claude only when full analysis is needed. |
| **Batch tool calls** | Where the LLM supports it, request multiple tools in one round to reduce round-trips and total tokens. |
| **Token budgets per session** | Cap tokens per user or per session to avoid runaway usage (e.g. long conversations). |
| **Redaction and prompt sizing** | Keep tool payloads and system prompt lean; redaction already reduces payload size before the LLM. |

---

## 5. How to Get Actual Numbers

- **Dev/test:** In Langfuse, filter traces by time range (e.g. sprint), sum `promptTokens` and `completionTokens`, or use the exported `estimatedCostUsd` if stored.
- **Staging/production:** Use the same Langfuse views or export by `userId` / `sessionId` to report per-user or per-session cost for capacity planning.
