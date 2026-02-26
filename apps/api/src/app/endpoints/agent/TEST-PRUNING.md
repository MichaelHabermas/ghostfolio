# Epic 17: Test Pruning and Final Suite

**Date:** 2026-02-26

---

## Scope

- **Relevance:** All tests under `apps/api/src/app/endpoints/agent/` were reviewed for relevance to the final architecture.
- **Spike tests:** Retained as regression baseline (e.g. `framework-spike.spec.ts`) per Epic 8 decision.
- **No removals:** No agent tests were removed; none were found to be obsolete, redundant, or hindering the ultimate goal. Verification, security, tools, eval, and observability tests all support current design.

---

## Tests Requiring External Resources

- **Demo/seed (outside agent):** `seed-demo.spec.ts` and `demo-account.integration.spec.ts` require a running PostgreSQL and (for integration) a running API server. They are not part of the agent module. When running the full API suite without a DB, these two suites may fail; this does not indicate an agent regression.
- **Agent-only run:** To run only agent-related tests (no DB required):
  - Eval suite: `npx nx test api --testFile=eval-execution.spec.ts`
  - Security: `npx nx test api --testFile=agent-security.spec.ts`
  - All agent specs: run with `--testPathPattern=endpoints/agent` (note: Nx may still include other api specs; for agent-only, run individual test files or the eval suite).

---

## Final Clean Suite (Epic 17)

- **Eval suite:** 50/50 passed (`npx nx test api --testFile=eval-execution.spec.ts`).
- **Agent unit/integration:** All specs under `agent/` (tools, verification, redaction, security, observability, controller, service, formatters, memory, prompts) pass when run.
- **Conclusion:** No obsolete or hindering tests removed; final architecture is fully covered by the current suite.
