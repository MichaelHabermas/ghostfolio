# MVP Finishing Up — Slack Insights & Action Items

Important information from #agentforge-ghostfolioiscooler for finishing the Ghostfolio agent MVP and submission.

---

## Master checklist (high-level)

- [ ] **Deploy:** Ghostfolio + Agent publicly accessible (e.g. Railway)
- [ ] **Test subject:** Shared demo account on deployed instance (stable login, password, token; pre-populated investments); credentials documented for testers
- [ ] **Data providers:** Yahoo Finance (and any other sources) working on deployed instance; rate limits / connectivity verified or documented
- [ ] **Evals exposed to testers:** Eval cases and/or results visible in repo or docs; testers can run or review evals (see [Exposing evals to testers](#exposing-evals-to-testers) below)
- [ ] **Week 2 admin:** Pre-search done, interview prep (Slack paragraph), PAT in portal, Week 1 AI interview if applicable
- [ ] **Submission:** PRD checklist complete (demo video with eval results, architecture doc, cost analysis, eval dataset, open source link, deployed app, social post)

---

## Exposing evals to testers

Testers/reviewers need a way to see or run the eval suite:

- [ ] **In the repo:** Eval test cases live under `apps/api/src/app/endpoints/agent/eval/` (e.g. `eval/cases/mvp-cases.json`, Jest runner). Document in README or `docs/` how to run the evals (e.g. `npm test -- --testPathPattern=eval` or the project’s equivalent) so testers can run the same suite locally.
- [ ] **Documented results:** Provide pass rate and brief failure analysis somewhere testers can see it (README, `docs/`, or a dedicated eval-results doc). Final submission expects “Eval Dataset (50+ test cases with results)”.
- [ ] **Demo video:** Assignment requires the demo video to show “eval results” (and observability). Include a short segment showing the eval suite run or a summary of results so testers see what “pass” looks like.

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

- [ ] **Stable credentials:** Fixed login (username + password) and, if needed, security/access token for API or demo access.
- [ ] **Pre-populated dataset:** Account already has a set of investments (holdings, accounts, maybe rules) so testers see real agent behavior without importing data.
- [ ] **Document and share:** Put login details (or where to get them) in a single place (e.g. README, deployment doc, or secure shared note) so reviewers can log in and try the agent against the same data.

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
- [ ] Optional: Check Ghostfolio OpenAPI/Swagger.
- [ ] Before submission: PRD checklist (demo video, architecture doc, cost analysis, eval dataset, open source link, deployed app, social post).
