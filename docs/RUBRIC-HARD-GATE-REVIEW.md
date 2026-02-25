# AgentForge MVP Rubric Hard-Gate Review

This document tracks the strict PASS/FAIL checks from the official rubric:
`C:\Users\haber\Downloads\AgentForge_MVP_Rubric.pdf`.

---

## Baseline (before hard-gate recovery changes)

| Check | Rubric target | Baseline status | Evidence |
| --- | --- | --- | --- |
| 1 | Natural language response returns coherent finance answer | At Risk | Local run can return provider credential/config error instead of analysis (`apps/api/src/app/endpoints/agent/errors/error-mapper.service.ts`) |
| 2 | 3+ functional tools and tool names visible to grader | At Risk | UI tags are derived from `sources`; tool names can disappear when structured claims are missing (`apps/client/src/app/pages/portfolio/agent/agent-page.component.ts`) |
| 3 | Tool results synthesized (not raw dumps) | Pass | Response formatter returns narrative output (`apps/api/src/app/endpoints/agent/formatters/response-formatter.ts`) |
| 4 | Conversation history across turns | Pass | Session + `ConversationMemory` used in agent loop (`apps/api/src/app/endpoints/agent/agent.service.ts`) |
| 5 | Graceful error handling for failures | Pass (At Risk UX) | Agent catches failures and returns user-facing messages, but fallback quality varies with provider failure classes (`apps/api/src/app/endpoints/agent/errors/error-mapper.service.ts`) |
| 6 | Domain-specific verification applied | Pass | Verification pipeline includes rules alignment checks (`apps/api/src/app/endpoints/agent/verification/`) |
| 7 | 5+ eval cases with expected outcomes | Pass | 7 cases present (`apps/api/src/app/endpoints/agent/eval/cases/mvp-cases.json`) |
| 8 | Eval suite runnable and reports pass/fail | Pass | Eval runner exists and executes deterministically (`apps/api/src/app/endpoints/agent/eval/eval-execution.spec.ts`) |
| 9 | Publicly accessible app usable by grader | At Risk (Code-side support) | URL and flow documented, but evaluator path consistency needs tightening (`README.md`, `docs/MVP-FINISHING-UP.md`, `docs/PRD.md`) |
| 10 | AI interview completed | Manual | Operational requirement outside code scope |
| 11 | Not noticeably broken UX | At Risk | Modal clipping/positioning and theme quality issues observed in light/dark screenshots (`apps/client/src/app/components/evaluator-teaser/`) |

---

## Target state for this recovery

- Checks 1-9 and 11: PASS (or exceeded)
- Check 10: tracked as manual/operational

---

## Post-fix review (current state)

| Check | Rubric target | Current status | Evidence |
| --- | --- | --- | --- |
| 1 | Natural language response returns coherent finance answer | Pass | `AgentService` catches failures and returns user-facing messages; provider key can now be sourced from env fallback (`apps/api/src/app/endpoints/agent/agent.service.ts`) |
| 2 | 3+ functional tools and tool names visible to grader | Pass | API now returns `toolsCalled`; UI renders `Tools used` tags from actual execution telemetry + sources (`apps/api/src/app/endpoints/agent/tools/tool-registry.ts`, `apps/client/src/app/pages/portfolio/agent/agent-page.component.ts`) |
| 3 | Tool results synthesized (not raw dumps) | Pass | Response formatter still returns narrative output (`apps/api/src/app/endpoints/agent/formatters/response-formatter.ts`) |
| 4 | Conversation history across turns | Pass | Session memory path unchanged and covered in integration tests (`apps/api/src/app/endpoints/agent/agent.service.ts`) |
| 5 | Graceful error handling for failures | Pass | Error mapper now classifies auth, rate-limit, and provider outage/network failures with clear user messages (`apps/api/src/app/endpoints/agent/errors/error-mapper.service.ts`) |
| 6 | Domain-specific verification applied | Pass | Verification path unchanged (rules alignment remains in gate) |
| 7 | 5+ eval cases with expected outcomes | Pass | 7 Golden Set cases remain in `mvp-cases.json` |
| 8 | Eval suite runnable and reports pass/fail | Pass | `eval-execution.spec.ts` still deterministic by default and now supports optional real-LLM mode (`EVAL_USE_REAL_LLM=true`) |
| 9 | Publicly accessible app usable by grader | Pass (code/docs) | README + PRD + MVP docs aligned on deployed URL and evaluator path |
| 10 | AI interview completed | Manual | Out of code scope |
| 11 | Not noticeably broken UX | Pass | Teaser layout/theme responsiveness fixed; agent chat contrast and readability improved in light and dark mode |

### Validation snapshot

- Targeted review run completed via lints and API test execution command:
  - `npx nx test api --runInBand --testPathPattern=\"agent.service.spec.ts|error-mapper.service.spec.ts|agent.controller.spec.ts|eval-execution.spec.ts\"`
  - Result: test execution passed for changed agent/eval paths (workspace runner still executes broader api suites in this Nx setup).
