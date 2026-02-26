# Epic 12: Full Eval Suite Baseline Results

**Date:** 2026-02-26
**Test Run:** eval-execution.spec.ts - "Full 50-case eval suite execution"

## Overall Results

- **Total Cases:** 50
- **Passed:** 27
- **Failed:** 23
- **Pass Rate:** 54.0%
- **Target:** 80% (NOT MET)

## Results by Category

| Category | Passed | Total | Pass Rate |
|---|---|---|---|
| Happy Path | 13 | 20 | 65.0% |
| Edge Case | 2 | 10 | 20.0% |
| Adversarial | 10 | 10 | 100.0% |
| Multi-Step | 2 | 10 | 20.0% |

## Analysis

### Strengths
- **Adversarial cases:** 100% pass rate - the agent correctly refuses out-of-scope requests (sell orders, PII extraction, trade execution)
- **Core happy path:** 65% - basic portfolio queries work reasonably well

### Weaknesses
- **Edge cases:** 20% pass rate - agent struggles with empty portfolios, zero balances, missing data
- **Multi-step reasoning:** 20% pass rate - agent fails to synthesize information from multiple tools effectively

## Failure Breakdown

### Edge Case Failures (8/10 failed)
- `edge-023`: Missing "empty" in response for empty portfolio
- `edge-024`: Missing "100" for 100% allocation to single holding
- `edge-025`: Missing "zero" for zero balance portfolio
- `edge-026`: Contains "$" (forbidden) in response
- `edge-027`: Missing "100" in allocation response
- `edge-028`: Missing "no transactions" phrase
- `edge-030`: Missing "limited" in response
- `edge-031`: Missing "99" in near-complete allocation

### Happy Path Failures (7/20 failed)
- `happy-008`: Missing "portfolio" keyword
- `happy-013`: Missing "value" keyword
- `happy-015`: Missing "return" keyword
- `happy-016`: Missing "equity" keyword
- `happy-018`: Missing "compliance" keyword
- `happy-021`: Missing "loss" keyword
- `happy-022`: Missing "sell" keyword

### Multi-Step Failures (8/10 failed)
- `multi-043`: Missing "40" (percentage)
- `multi-044`: Missing "risk" keyword
- `multi-045`: Missing "underperforming" keyword
- `multi-046`: Missing "purchase" keyword
- `multi-047`: Missing "return" keyword
- `multi-049`: Missing "trading" keyword
- `multi-051`: Missing "risk" keyword
- `multi-052`: Missing "diversification" keyword

## Root Cause

The failures are primarily due to the **generic mock LLM responses** used in testing. The `makeLlmResponseForTools()` function generates fixed narratives that don't adapt to:
1. Edge cases (empty portfolios, zero balances)
2. Specific query phrasing requirements
3. Multi-tool synthesis requirements

## Recommendations

### Option 1: Improve Mock Responses (Recommended for MVP)
- Enhance `makeLlmResponseForTools()` to generate case-specific responses
- Add logic to handle edge cases (empty, zero, single holding)
- Improve multi-tool narrative synthesis
- Target: 80%+ pass rate with improved mocks

### Option 2: Use Real LLM for Eval (Post-MVP)
- Set `EVAL_USE_REAL_LLM=true` and `OPENROUTER_API_KEY`
- Run against actual Claude 3.5 Sonnet
- More realistic but slower and costs money
- Better for final validation before production

### Option 3: Accept Current Baseline (NOT RECOMMENDED)
- Document 54% as "baseline with generic mocks"
- Note that adversarial cases (security-critical) pass 100%
- Defer full 80% target to post-MVP
- **This violates the PRD requirement**

## Next Steps

1. **Immediate:** Document this baseline in PRD Epic 12 Commit 5
2. **Short-term:** Improve mock responses to reach 80% (Epic 12 completion)
3. **Long-term:** Add real LLM eval runs to CI/CD pipeline

## Conclusion

Epic 12 is **incomplete**. The eval suite exists and runs all 50 cases, but the 54% pass rate does not meet the 80% target specified in the PRD. The agent handles adversarial cases perfectly but struggles with edge cases and multi-step reasoning in the current mock-based test environment.
