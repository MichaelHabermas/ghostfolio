# Eval Baseline — Epic 12 Full Eval Suite

**Date:** 2026-02-26  
**Test Suite:** `full-eval-cases.json` (50 cases)  
**Runner:** `eval-execution.spec.ts` (mocked LLM)  
**Baseline Run:** Commit 5 of Epic 12

---

## Summary

| Metric | Value |
|--------|-------|
| **Total Cases** | 50 |
| **Pass Rate** | 100% (all tests pass with mocked LLM) |
| **Test Execution Time** | ~10-15 seconds |

---

## Distribution by Category

| Category | Count | Pass Rate | Notes |
|----------|-------|-----------|-------|
| **happy_path** | 20 | 100% | Standard portfolio queries across all 6 tools |
| **edge_case** | 10 | 100% | Empty portfolio, single holding, zero balance, unknown symbols, etc. |
| **adversarial** | 10 | 100% | Prompt injection, PII extraction, trade execution attempts, etc. |
| **multi_step** | 10 | 100% | Queries requiring 2-3 tools and synthesized reasoning |

---

## Tools Coverage

All 6 tools are exercised across the eval suite:

| Tool | Happy Path | Edge Case | Adversarial | Multi-Step | Total |
|------|------------|-----------|-------------|------------|-------|
| `portfolio_performance` | 5 | 2 | 0 | 4 | 11 |
| `get_holdings` | 6 | 3 | 0 | 6 | 15 |
| `get_rules_report` | 3 | 1 | 0 | 4 | 8 |
| `market_data` | 3 | 2 | 0 | 3 | 8 |
| `transaction_history` | 3 | 1 | 0 | 4 | 8 |
| `rebalance_simulator` | 1 | 1 | 0 | 4 | 6 |
| **Adversarial (no tools)** | 0 | 0 | 10 | 0 | 10 |

---

## Baseline Pass Criteria

With **mocked LLM** (`makeLlmResponseForTools`), all 50 cases pass because:

1. **Tool selection:** Mock invokes expected tools per case
2. **Content validation:** Mock narratives include `expected_output_contains` phrases
3. **Negative validation:** Mock narratives exclude `expected_output_not_contains` phrases
4. **Adversarial:** Mock returns refusal for `expected_tools: []` cases

---

## Next Steps (Post-Baseline)

1. **Real LLM testing:** Set `EVAL_USE_REAL_LLM=true` to run against actual Claude via OpenRouter
2. **Pass rate target:** Achieve >80% pass rate on real LLM (PRD Epic 12 requirement)
3. **Failure analysis:** Document which cases fail and why (prompt engineering opportunities)
4. **Prompt improvements:** Iterate on system prompt based on failure patterns
5. **Observability:** Integrate Langfuse tracing for eval runs (Epic 11)

---

## Test Execution

To run the full eval suite:

```bash
# Mocked LLM (baseline)
npx nx test api --testPathPattern=eval-execution --testTimeout=30000

# Real LLM (requires OPENROUTER_API_KEY)
EVAL_USE_REAL_LLM=true npx nx test api --testPathPattern=eval-execution --testTimeout=60000
```

---

## Failures (Real LLM)

_To be documented after real LLM run. Expected categories:_

- Tool selection errors (wrong tool chosen)
- Content omissions (missing expected phrases)
- Hallucinations (fabricated data in edge cases)
- Adversarial bypasses (agent performs restricted actions)

---

## Improvements Prioritized

_To be populated based on failure analysis:_

1. [ ] Improve system prompt guardrails for adversarial cases
2. [ ] Add explicit tool selection guidance for ambiguous queries
3. [ ] Strengthen edge case handling (empty portfolio, missing data)
4. [ ] Refine multi-step reasoning prompts for complex queries

---

## References

- **PRD Epic 12:** [docs/PRD.md](PRD.md#epic-12-full-eval-suite-50-test-cases)
- **Eval cases:** [apps/api/src/app/endpoints/agent/eval/cases/full-eval-cases.json](../apps/api/src/app/endpoints/agent/eval/cases/full-eval-cases.json)
- **Eval runner:** [apps/api/src/app/endpoints/agent/eval/eval-execution.spec.ts](../apps/api/src/app/endpoints/agent/eval/eval-execution.spec.ts)
- **Gauntlet framework:** [docs/MVP-FINISHING-UP.md](MVP-FINISHING-UP.md#eval-framework--gauntlet-five-stage-model)
