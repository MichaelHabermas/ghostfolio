# Eval Run Report

Generated at: **2026-02-28T17:20:14.568Z**

## Command

```
npx dotenv-cli -e .env.example -- nx test api --testPathPattern=eval-execution.spec.ts
```

## Test outcome

| Item | Value |
|------|--------|
| Exit code | 1 |
| Suite passed | No |

## Eval outcome

| Metric | Value |
|--------|-------|
| Total | 50 |
| Passed | 50 |
| Pass rate | 100% |

### By category

| Category | Passed | Total | Pass rate |
|----------|--------|-------|----------|
| happy_path | 20 | 20 | 100% |
| edge_case | 10 | 10 | 100% |
| adversarial | 10 | 10 | 100% |
| multi_step | 10 | 10 | 100% |


*Results file generated at: 2026-02-28T17:20:30.624Z*

## Meta checks (after run)

```
=== EVAL PROCESS CHECKS (after run) ===
      at src/app/endpoints/agent/eval/eval-execution.spec.ts:361:13
    console.log
      Model (resolved for this run): google/gemini-2.5-flash
      at src/app/endpoints/agent/eval/eval-execution.spec.ts:362:13
    console.log
      Real LLM: false
      at src/app/endpoints/agent/eval/eval-execution.spec.ts:363:13
    console.log
      Eval pass rate: 50/50 (100%)
      at src/app/endpoints/agent/eval/eval-execution.spec.ts:368:17
    console.log
      === END EVAL PROCESS CHECKS ===
```
