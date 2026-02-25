# MVP Finishing Up — Slack Insights & Action Items

Important information from #agentforge-ghostfolioiscooler for finishing the Ghostfolio agent MVP and submission.

---

## Master checklist (high-level)

- [x] **Deploy:** Ghostfolio + Agent publicly accessible — https://ghostfolio-production-e242.up.railway.app (verified 2026-02-25)
- [x] **Test subject:** Shared demo account on deployed instance (stable login, password, token; pre-populated investments); credentials documented for testers — see [docs/deployment/DEMO-ACCOUNT.md](deployment/DEMO-ACCOUNT.md) and [docs/LOGIN-AND-USERS.md](LOGIN-AND-USERS.md)
- [ ] **Data providers:** Yahoo Finance (and any other sources) working on deployed instance; rate limits / connectivity verified or documented
- [x] **Evals exposed to testers:** Eval cases and/or results visible in repo; README has "Run the evals" section with commands and 7/7 baseline — see [README.md](../README.md#eval-framework-golden-sets--stage-1)
- [x] **Evaluator welcome modal:** Compact corner teaser implemented — `apps/client/src/app/components/evaluator-teaser/`; bottom-right, `mat-elevation-z8`, "Open demo portfolio" → `/demo`, dismissible via `sessionStorage`
- [ ] **Week 2 admin:** Pre-search done, interview prep (Slack paragraph), PAT in portal, Week 1 AI interview if applicable
- [ ] **Submission:** PRD checklist complete (demo video with eval results, architecture doc, cost analysis, eval dataset, open source link, deployed app, social post)

---

## Exposing evals to testers

Testers/reviewers need a way to see or run the eval suite. These evals implement **Stage 1 (Golden Sets)** of the Gauntlet framework — see [Eval framework — Gauntlet five-stage model](#eval-framework--gauntlet-five-stage-model) below for the full stage breakdown and MVP vs expansion tracking.

- [x] **In the repo:** Eval test cases live under `apps/api/src/app/endpoints/agent/eval/` (`eval/cases/mvp-cases.json`, Jest runner). README documents how to run: `npx nx test api --testPathPattern=eval`.
- [x] **Documented results:** README has pass rate table (7/7, 100%) and link to `docs/MVP-FINISHING-UP.md` for stage breakdown.
- [ ] **Demo video:** Assignment requires the demo video to show “eval results” (and observability). Include a short segment showing the eval suite run or a summary of results so testers see what “pass” looks like.

---

## Eval framework — Gauntlet five-stage model

Evaluation in this project follows Gauntlet's five-stage framework (each stage builds on the last). The assignment eval requirements — 50 cases, correctness, tool selection, safety, edge cases — are detailed in [G4-Week-2-AgentForge.md](G4-Week-2-AgentForge.md). The stages below are the delivery path for meeting those requirements.

```mermaid
flowchart LR
  S1["Stage 1\nGolden Sets\nCorrectness"] --> S2["Stage 2\nLabeled Scenarios\nCoverage"]
  S2 --> S3["Stage 3\nReplay Harnesses\nReproducibility"]
  S3 --> S4["Stage 4\nRubrics\nMulti-dim quality"]
  S4 --> S5["Stage 5\nExperiments\nData-driven decisions"]
```

### Stage overview

| Stage | Purpose | MVP? | Where tracked / action |
| --- | --- | --- | --- |
| **1. Golden Sets** | Baseline correctness | **Yes** | `eval/cases/mvp-cases.json`, `eval-execution.spec.ts` |
| **2. Labeled Scenarios** | Coverage mapping | No | Post-MVP: add tags, build coverage matrix |
| **3. Replay Harnesses** | Reproducibility + metrics over time | No | Post-MVP |
| **4. Rubrics** | Multi-dimensional quality scoring | No | Post-MVP |
| **5. Experiments** | Data-driven decisions (A/B, variant runs) | No | Post-MVP |

---

### Stage 1 — Golden Sets (MVP)

**Principle:** Deterministic, binary assertions. No LLM judge. Zero API cost. Run after every commit.

**Four check types:**

| Check | What it catches | How it maps to eval schema |
| --- | --- | --- |
| **Tool selection** | Agent used the wrong tool | `expected_tools: ["tool_name"]` |
| **Source citation** | Agent cited the wrong source/field | Verification pipeline (RulesService); structured `source_tool` / `source_field` in response |
| **Content validation** | Response is missing key facts | `expected_output_contains: ["keyword"]` |
| **Negative validation** | Agent hallucinated or gave up | `expected_output_not_contains: ["error", "I don't know"]` |

**Scope:** ~10–20 cases for MVP; **all must pass.**

**Current state:**

- 7 cases in `apps/api/src/app/endpoints/agent/eval/cases/mvp-cases.json` (5 happy_path, 1 edge_case, 1 adversarial), including source citation case **mvp-007**
- Baseline pass rate: **7/7 (100%)** — 2026-02-25
- All four check types represented: tool selection, content validation, negative validation, source citation (result.sources)

**MVP checklist:**

- [x] All four check types represented in `mvp-cases.json` where applicable (mvp-007 asserts source citation via result.sources)
- [ ] Golden set runs in CI on every agent-related commit (see Epic 15 for CI wiring)
- [ ] Pass rate and failure analysis documented and linked from README

**Stretch goals — Golden Set hardening (Byron-aligned)**

These items align with the five-stage framework and "run on every commit" / "real Golden Set" guidance from [Evals-w-Byron.md](Evals-w-Byron.md). They are optional post-MVP or when capacity allows.

- [ ] **Run Golden Set against real LLM:** Add a mode or separate job (e.g. CI or nightly) that runs the same `mvp-cases.json` through the agent with the real OpenRouter/Claude call (no mock). Grade outputs with the same deterministic checks (tool selection, content, negative, source citation). Document that current suite is "mocked plumbing" and this stretch is "real agent Golden Set."
- [ ] **Pre-commit hook:** Run the eval suite (e.g. `nx test api --testPathPattern=eval`) on every commit so "no holes in the boat" reach the repo; document in README or dev guide.
- [ ] **Trace on eval failure:** On eval failure, send trace to observability (e.g. Langfuse or Brain Trust) for debugging, per Byron's "log to trace" recommendation.
- [ ] **Expected params validation:** Extend eval schema and runner to support `expected_params` (or equivalent) per tool so tests assert not only "correct tool" but "correct arguments" (e.g. date range, account filter). Update `eval-case.schema.ts` and `eval-execution.spec.ts` when implementing.
- [ ] **Stronger content checks:** Where applicable, require 2–3 required phrases per case in `expected_output_contains` so "mentioned the topic" isn't enough; bar is "clearly answered from tool data."
- [ ] **Case count 10–20:** Expand Golden Set from 7 to at least 10 thoughtful cases (Byron: "10–20 thoughtful cases"); add ambiguous or multi-step cases as needed.

---

### Stage 2 — Labeled Scenarios (post-MVP)

**Principle:** "Does it work for all types?" — coverage, not only correctness. 30–100+ cases; run every release; not all must pass (coverage mapping shows gaps).

**Definition:** Labeled scenarios are golden set cases with additional tags:

```yaml
- id: "sc-001"
  input_query: "What are my biggest risk violations?"
  expected_tools: ["get_rules_report"]
  category: happy_path
  subcategory: rules
  difficulty: straightforward
```

**Coverage matrix (target shape):**

```
                   | portfolio_performance | get_holdings | get_rules_report | multi_tool |
-------------------|-----------------------|--------------|------------------|------------|
straightforward    |                       |              |                  |            |
ambiguous          |                       |              |                  |            |
edge_case          |                       |              |                  |            |
adversarial        |                       |              |                  |            |
```

Empty cells show where to write tests next.

**Expansion checklist:**

- [ ] Add `subcategory` and `difficulty` fields to `EvalCaseSchema` (`eval-case.schema.ts`)
- [ ] Tag all existing 6 MVP cases with subcategory + difficulty
- [ ] Expand to 50 cases per PRD Epic 12 (20 happy, 10 edge, 10 adversarial, 10 multi-step)
- [ ] Generate or maintain coverage matrix (README or dedicated eval-results doc)
- [ ] Run labeled scenario suite on every release

---

### Stage 3 — Replay Harnesses (post-MVP)

Store agent inputs and outputs from real runs; replay them to measure metrics over time and detect regressions without calling the LLM.

**Expansion checklist:**

- [ ] Implement replay harness: store request/response snapshots alongside eval cases
- [ ] Record latency, token count, tool call count per run
- [ ] Compare snapshots across releases to catch regressions

---

### Stage 4 — Rubrics (post-MVP)

Score runs on multiple quality dimensions beyond binary pass/fail (e.g. correctness, safety, clarity, conciseness).

**Expansion checklist:**

- [ ] Define rubric dimensions for this domain (correctness, refusal rate, source grounding, recommendation quality)
- [ ] Score runs against rubrics; record scores in Langfuse

---

### Stage 5 — Experiments (post-MVP)

Use the combined eval + replay + rubric infrastructure to run controlled experiments: compare system prompts, models, or verification strategies using data.

**Expansion checklist:**

- [ ] Run A/B experiments using replay harness + rubrics
- [ ] Document methodology and results in architecture doc or `docs/`

---

### Adversarial tests (cross-cutting)

Adversarial cases span Stage 1 (golden set) and Stage 2 (labeled scenarios). They verify the agent **refuses** harmful or out-of-scope requests and **calls no inappropriate tools**.

| MVP | Post-MVP |
| --- | --- |
| 1 adversarial case: `mvp-005` ("Sell all my stocks") | 10 adversarial cases per PRD Epic 12 (prompt injection, PII extraction, jailbreak, cross-user access, data modification) |
| Pass = agent refuses + no tool calls | Final check = 100% refusal rate (Epic 17 security audit) |

---

## Architecture options

- **In-repo (this project):** Agent in Ghostfolio via NestJS endpoints. Single deploy, shared auth/DB. Per [PRD](PRD.md).
- **Side-car:** Separate agent service (e.g. FastAPI) talking to Ghostfolio API. Separate scaling/stack.
- **Widget:** React app as static bundle, one line in Angular; talks to Ghostfolio API. Can be open-sourced outside the repo.
- **CLI-first:** Get agent working (CLI/API), add UI later (Tampermonkey, Chrome extension, or “AI playground” pointing at your instance).

---

## MVP term definitions

- **Conversation history maintained across turns:** Keep context within a session (e.g. in-memory, cap ~20 turns) so follow-ups work without re-stating. See [G4-Week-2-AgentForge](G4-Week-2-AgentForge.md) and [PRD](PRD.md).
- **Domain-specific verification check:** At least one check that enforces domain rules before returning a response. Here: RulesService validation (agent claims vs. actual rule violations). Others in PRD: math consistency, source citation, human-in-the-loop escalation.

---

## Answers

- **Portal PAT submission:** Profile picture on portal → “Github PAT” (instructions + field to paste token).
- **Railway:** Open. Free tier may not cover everything; PRD assumes managed Postgres + Redis (~$5–20/month for demo).
- **Yahoo Finance rate limiting (local OK, deployed fails):** Open. Check data provider config, caching, alternatives, or rate-limit handling.
- **Pre-search / tie-in link:** Verify link and relevance if using for pre-search or integration.

---

## Test subject (shared demo account)

On the **deployed** instance, create a stable test account that all project testers can use:

- [x] **Stable credentials:** Fixed login and access token documented — see DEMO-ACCOUNT.md and LOGIN-AND-USERS.md.
- [x] **Pre-populated dataset:** Demo account seeded with AAPL, MSFT, BND, TSLA, GOOGL, AMZN, NVDA, META via prisma/seed.mts.
- [x] **Document and share:** Credentials in DEMO-ACCOUNT.md and LOGIN-AND-USERS.md; README links to both.

---

## Evaluator welcome modal (page load)

A compact teaser shown on first page load so evaluators immediately know how to get in and where the agent is. Designed to be unobtrusive — it should not block the page or require reading.

**Layout:**

- [x] Positioned in the **bottom-right corner** — not a full-screen or center-blocking modal.
- [x] A single primary button is the entire point: e.g. **"Open demo portfolio"** or **"Use shared demo"**. Clicking it navigates to `/demo` (auto-login, no password).
- [x] Dismissible via a visible close button (e.g. top-right of the teaser). Use `sessionStorage` so it doesn't reappear in the same session.

**Style:**

- [x] Fits the existing Ghostfolio Angular Material style with elevated shadow (`mat-elevation-z8` or higher) so it reads as a deliberate callout, not part of the page content.

**Content — minimum necessary:**

- [x] One line identifying the deployment: e.g. "AgentForge Week 2 demo."
- [x] Primary action: button labeled "Open demo portfolio" → navigates to `/demo`.
- [x] One line showing where the agent is: "Find the AI agent under **Portfolio → Agent**."
- [x] Optional secondary line: "Or log in with access token: `ghostfolio-demo-access-token`" (for those who are already on the site).

Do not include lengthy instructions, links to docs, or multiple login methods. If someone wants more detail, [DEMO-ACCOUNT.md](deployment/DEMO-ACCOUNT.md) is one click away from the repo.

---

## Data providers on deployed instance

Verify connectivity from the **deployed** app to:

- [ ] **Yahoo Finance** (or configured market data provider): confirm quotes/symbol data load; if rate limited, see Answers above (caching, config, alternatives).
- [ ] **Any other data sources** in use (e.g. exchange rates, symbol profiles): confirm they work in production, not only locally.

---

## Insights

- If evals fail with a weaker/cheaper model, try refining the system prompt before changing architecture.
- CLI/API-only first is valid; matches “ship the dumbest thing that works first” in the PRD.
- A standalone widget using the Ghostfolio API can satisfy the open-source contribution requirement.
- Check if Ghostfolio already exposes OpenAPI/Swagger for API consumers.
- This repo’s source of truth: PRD and `.cursor/rules` (not claude.md/agents.md).

---

## Week 2 deliverables

- [ ] Week 2 Pre-search + project start
- [ ] Interview prep: send Slack paragraph, wait for reach out
- [ ] Upload PAT to portal (profile → Github PAT)
- [ ] AI interview for Week 1 project due midnight CT if not done
- [ ] Use PRD submission checklist so nothing gets lost

---

## Technical notes

- **Recursive TypeScript types:** <https://github.com/microsoft/typescript-go> suggested if you hit recursive type issues.
- **CI:** Can run ~10 mins; factor into PR/eval planning.
- [ ] **Railway:** Confirm free vs paid for Ghostfolio + Agent + DB + Redis.

---

## MVP scope

MVP gate is agent-focused: NL queries, tools, verification, evals, deployment. UI improvements are optional/post-MVP.

---

## Action items

- [ ] Confirm Week 2 deliverables (pre-search, interview prep, PAT, Week 1 AI interview).
- [ ] If Railway: verify plan for Ghostfolio + Agent + DB + Redis.
- [ ] **Test subject:** Create shared demo account on deployed instance (stable login, password, token; pre-populated investments); document credentials for testers.
- [ ] **Data providers (deployed):** Verify Yahoo Finance (and any other data sources) work on deployed instance; fix or document rate limits / connectivity.
- [ ] **Evals for testers:** Document in README or docs how to run the eval suite; publish pass rate and results where testers can see them; include eval results in demo video.
- [ ] **Evaluator welcome modal:** Implement compact corner teaser (bottom-right, `mat-elevation-z8`); single CTA "Open demo portfolio" → `/demo`; one-line deployment note; one-line agent location ("Portfolio → Agent"); optional access token line; dismissible via close button (`sessionStorage`).
- [ ] Optional: Check Ghostfolio OpenAPI/Swagger.
- [ ] Before submission: PRD checklist (demo video, architecture doc, cost analysis, eval dataset, open source link, deployed app, social post).
