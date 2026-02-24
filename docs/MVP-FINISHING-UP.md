# MVP Finishing Up — Slack Insights & Action Items

This doc distills useful information, open questions, insights, and action items from the #agentforge-ghostfolioiscooler Slack channel as they relate to finishing the Ghostfolio agent MVP and submission.

---

## Architecture and integration approaches

- **Smit's question:** Integrate the agent directly into Ghostfolio (NestJS endpoints) vs. a separate agent service that talks to the Ghostfolio backend?
- **Relevance to this repo:** This project uses the former (in-repo NestJS AgentModule, per [PRD](PRD.md)). Tradeoff: in-repo = single deploy, shared auth/DB; side-car = separate scaling and stack (e.g. FastAPI Python).
- **Other approaches mentioned:**
  - **G. Sebastian Garces:** Separate **widget** — React app served as static bundle, integrated via one line in the Angular app; communication via Ghostfolio API. Can be open-sourced outside the Ghostfolio repo.
  - **Scott Humphries:** **CLI-first** — get the agent working by itself, then add UI (e.g. Tampermonkey userscript, Chrome extension, or "AI playground" where you point at your instance and log in).
  - **Nathan Koerschner:** Working **directly in the repo** (like this project), dealing with pre-commit hooks.
  - **Aaron Harbaugh:** Mix of both; mostly side-car with plans to surface insights inside Ghostfolio later.
- **Jean-Paul:** Suggested FastAPI Python for the agent stack; this repo is locked to NestJS/TypeScript per PRD.

---

## Open questions from Slack (with brief answers where applicable)

- **"What does 'conversation history maintained across turns' mean?" (Megha)**  
  - **Answer:** Per [G4-Week-2-AgentForge](G4-Week-2-AgentForge.md) and [PRD](PRD.md), the agent must keep conversation context within a session (e.g. in-memory store, cap at 20 turns) so follow-up questions work without re-stating context.
- **"What does 'domain specific verification check' mean?" (Sandesh)**  
  - **Answer:** At least one check that enforces domain rules before returning a response. For this project: RulesService validation (cross-check agent claims vs. actual rule violations). Other examples: math consistency, source citation, human-in-the-loop escalation (all in PRD verification pipeline).
- **"Where is the portal submission for the PAT?" (Tyler)**  
  - **Answer (Olivia):** Profile picture on the portal → "Github PAT" — instructions and the field to paste the token are there.
- **"Anyone using Railway for Ghostfolio + Agent + DB + Redis — do we need a paid monthly plan?" (Megha)**  
  - **Note:** Open question. Railway free tier may not cover all services; the PRD assumes Railway with managed Postgres + Redis (~$5–20/month for demo).
- **"Yahoo Finance rate limiting — works locally, fails when deployed. Good workaround?" (Cade)**  
  - **Note:** Open question. Check Ghostfolio's data provider config, caching, and alternative data sources or rate-limit handling for production.
- **"Is [Tom's pre-search / tie-in link] actually dead?" (Tom)**  
  - **Note:** Verify link and relevance if the URL was meant for pre-search or external integration.

---

## Insights and ideas

- **System prompt and weaker models (Duke Ian):** Dumber LLMs failed tests until the system prompt was redefined; improving the system prompt fixed behavior. **Takeaway:** If evals fail with a cheaper/smaller model, try refining the system prompt before changing architecture.
- **CLI-first (Duke Ian, Scott):** "CLI is goat" — validating the agent in isolation (e.g. CLI or API-only) before building UI is a valid strategy and matches "ship the dumbest thing that works first" from the PRD.
- **Widget as open source (G. Sebastian):** A standalone widget that talks to the Ghostfolio API can count as the required open-source contribution and doesn't need to live in the Ghostfolio repo.
- **OpenAPI/Swagger (James Allen):** Suggesting Ghostfolio expose Swagger/OpenAPI would help third-party agents and widgets; "maybe they already do" — worth checking for API docs.
- **claude.md / agents.md (Aaron):** Some report these as "mostly bloat"; experimenting with removing them is a team choice — this repo's source of truth is the PRD and `.cursor/rules`.

---

## Demo and deliverables (from Duke Ian)

- Demo: Loom link shared in channel.
- **Deliverables to confirm:**
  - Week 2 Pre-search + project start
  - Interview prep: send Slack paragraph and wait for reach out
  - Upload PAT to portal (profile → Github PAT)
  - AI interview for Week 1 project due midnight CT if not yet done
- **Note:** Felipe's point that submit items get lost — use this doc and PRD submission checklist to avoid missing items.

---

## Technical and tooling notes

- **Recursive types / TypeScript (Olivia, Scott):** Suggestion to try <https://github.com/microsoft/typescript-go> if hitting recursive type issues (reference only; no code change).
- **CI duration (G. Sebastian):** "CI takes like 10 mins" — relevant for planning PR and eval runs; no action specified here.
- **Railway:** Deployment (Ghostfolio + Agent + DB + Redis) is assumed in the PRD; confirm whether free tier is sufficient or a paid plan is needed.

---

## Action items (checklist)

- [ ] Confirm all Week 2 deliverables: pre-search, interview prep (Slack paragraph), PAT in portal, Week 1 AI interview if applicable.
- [ ] Clarify for team/docs: "conversation history maintained across turns" and "domain specific verification check" (use the short definitions above in this doc or in PRD).
- [ ] If using Railway: verify plan (free vs paid) for Ghostfolio + Agent + DB + Redis.
- [ ] If using Yahoo Finance in production: investigate rate-limit workarounds (caching, provider config, or alternatives).
- [ ] Optional: Check if Ghostfolio exposes OpenAPI/Swagger for API consumers and widgets.
- [ ] Before submission: Run through PRD submission checklist (demo video, architecture doc, cost analysis, eval dataset, open source link, deployed app, social post) so nothing is missed.

---

## Scope and UI (from Xian)

- **"Improving the UI or only working on the AI agent?"**  
  - **Note:** Per PRD, MVP gate is agent-focused (NL queries, tools, verification, evals, deployment). UI improvements are optional/post-MVP; several participants are CLI or API-first.
