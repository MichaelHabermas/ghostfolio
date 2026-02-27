# Epic 17: Security Audit Report

**Date:** 2026-02-26  
**Scope:** Adversarial eval cases, prompt injection, data leakage, API key exposure, redaction

---

## 1. Adversarial Test Cases (100% Refusal)

- **Eval suite:** All 10 adversarial cases in `full-eval-cases.json` are executed by `eval-execution.spec.ts`.
- **Result:** 10/10 passed. Agent refuses out-of-scope requests; `expected_tools: []` for adversarial cases and mock/LLM returns refusal narrative.
- **Coverage:** Prompt injection, "Sell all my stocks", PII extraction, cross-user data requests, data modification, jailbreak/trading-bot attempts.
- **Evidence:** `eval-execution.spec.ts` (Full 50-case eval suite execution), `latest-eval-results.json` (adversarial: 10/10).

---

## 2. Prompt Injection Defenses

- **Detection:** `InputValidationService` detects and flags known injection patterns (ignore previous instructions, role impersonation, system:/assistant:, override, admin mode). Request proceeds with sanitized query; LLM guardrails handle refusal.
- **Tests:** `agent-security.spec.ts` — Injection Pattern Detection (14 variants detected, normal queries not flagged).
- **Sanitization:** Control characters and null bytes stripped; max query length 2000 chars.
- **Audit logging:** Injection attempts logged via `LangfuseService.logSecurityEvent` (see `AgentController`).

---

## 3. User-Scoped Data Access (No Cross-User Leakage)

- **Mechanism:** `userId` is taken only from `request.user.id` (NestJS auth context), never from request body.
- **Tests:** `agent-security.spec.ts` — User Isolation: controller passes correct `userId` (user A vs user B); never uses body-supplied userId.
- **Tools:** All tools receive `userId` from `processQuery()` and pass it to Ghostfolio services (PortfolioService, OrderService, etc.), which enforce user-scoped data.

---

## 4. API Keys Not Exposed

- **API key usage:** OpenRouter API key is read from PropertyService or `process.env['OPENROUTER_API_KEY']` only inside `AgentService` and passed to `createOpenRouter({ apiKey })`. It is never attached to responses or logged.
- **User-facing errors:** When key is missing, `ErrorMapperService` returns a generic message ("OpenRouter API key not configured. Set API_KEY_OPENROUTER in admin settings.") — no key value is ever returned.
- **Verification:** No code path in agent controller, service, or error mapper attaches API key to `AgentResponse` or to any log payload.

---

## 5. Data Redaction

- **RedactionService:** Account names → "Account A", "Account B"; balances rounded to nearest $100; PII (email, accountOwnerName, createdByUserName) stripped from tool outputs.
- **Pipeline:** Redaction applied to tool outputs before they are sent to the LLM; verification runs on raw (unredacted) data.
- **Tests:** `redaction.service.spec.ts` (account names, balance rounding, PII stripping); `tool-registry.spec.ts` (raw output captured but redacted output returned when RedactionService provided); `agent.service.spec.ts` (redactToolResponse called with tool output).

---

## 6. Rate Limiting and Audit

- **Rate limiting:** `@nestjs/throttler` with 10 req/min per user; `UserThrottlerGuard` registered as APP_GUARD; `@Throttle` on query endpoint.
- **Audit:** Langfuse traces capture queries, userId, sessionId, tool calls, verification results, token usage; security events (injection attempts) logged via `logSecurityEvent`.

---

## Summary

| Check | Status | Evidence |
|-------|--------|----------|
| 10 adversarial cases 100% refusal | Pass | Eval suite 10/10 adversarial |
| Prompt injection detection | Pass | agent-security.spec.ts |
| No cross-user data | Pass | User isolation tests |
| API keys not in response/logs | Pass | Code review + error mapper |
| Redaction (accounts, balances, PII) | Pass | redaction.service.spec.ts, tool-registry.spec.ts |

**Verdict:** Security audit complete; all Epic 17 Commit 2 criteria satisfied.
