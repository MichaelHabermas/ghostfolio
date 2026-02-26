# Harsh Review: Epics 8-13

Date: 2026-02-26

Scope audited:
- `docs/G4-Week-2-AgentForge.md`
- `docs/PRD.md`
- `docs/RUBRIC-HARD-GATE-REVIEW.md`
- Agent/eval/security implementation and tests under `apps/api/src/app/endpoints/agent/**`

## Findings (ordered by severity)

### Critical

- None remaining.

### Serious

- **Resolved:** `TransactionHistoryTool` field-shape compatibility bug.
  - Symptom: `transaction-history.tool.spec.ts` failed because `accountName` was `undefined` despite relation data present.
  - Root cause: tool only read lowercase relation keys (`account`, `settings`) while some data paths/tests use uppercase relation keys (`Account`, `Settings`).
  - Fix:
    - `apps/api/src/app/endpoints/agent/tools/transaction-history.tool.ts`
      - read user currency from either `settings` or `Settings`
      - map account name from either `account.name` or `Account.name`
  - Validation:
    - `npx nx test api --testFile=transaction-history.tool.spec.ts --no-cache` (pass)

### Moderate

- Prompt injection remains **detect-and-log**, not **hard-block**.
  - This matches current PRD wording/checks for Epic 13 but leaves residual risk for production hardening.
  - Recommendation: configurable strict mode (`400` + no LLM/tool call) for high-security deployments.

- Full API suite still includes demo tests requiring local DB connectivity.
  - Failures observed in `seed-demo.spec.ts` and `demo-account.integration.spec.ts` when DB is unavailable.
  - Not an Epic 8-13 regression, but affects blanket local `api:test` execution.

## Evidence Summary

- Full 50-case eval suite now executes and reports pass/fail with machine-readable artifact:
  - `apps/api/src/app/endpoints/agent/eval/results/latest-eval-results.json`
  - latest: `46/50` passed (`92.0%`)
  - category split: happy `85%`, edge `100%`, adversarial `100%`, multi-step `90%`

- Runner/harness hardening:
  - `apps/api/src/app/endpoints/agent/eval/eval-execution.spec.ts`
    - behavior-focused scoring
    - strict tool-match and forbidden-output enforcement
    - adversarial refusal signal enforcement
    - JSON run artifact output

## Verdict

Epics 8-13 are in a **verifiable pass state** with no unresolved critical/serious implementation gaps in the audited scope.

