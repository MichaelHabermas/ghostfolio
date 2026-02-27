# Demo Video Script and Social Post (Epic 16)

**Purpose:** Drafts for a 3–5 minute demo video and a social post (X or LinkedIn). Replace placeholders (e.g. `[YOUR_DEMO_VIDEO_URL]`) before publishing.

---

## 1. Demo Video Script (3–5 minutes)

### Intro (0:00–0:30)

- **Say:** “This is the Ghostfolio Smart Portfolio Auditor — a domain-specific AI agent built for AgentForge Week 2. It runs inside Ghostfolio and answers natural language questions about your portfolio using six tools, with verification and observability.”
- **Show:** Ghostfolio UI, navigate to **Portfolio → Agent**. Point out the chat interface and the deployed URL if applicable.

### Agent in action (0:30–2:00)

- **Say:** “I’ll ask a few questions to show how it works.”
- **Do:** Type: “What is my current allocation by asset class?”
- **Show:** Response appears; scroll to **Tools used** (e.g. `get_holdings`) so viewers see the agent called a tool.
- **Say:** “The agent called the get_holdings tool and summarized my allocation. Every claim is tied to tool data.”
- **Do:** Type: “Are there any rule violations in my portfolio?”
- **Show:** Response and **Tools used** (e.g. `get_rules_report`). Briefly mention that rule claims are verified against Ghostfolio’s RulesService so the agent can’t invent violations.

### Verification and safety (2:00–3:00)

- **Say:** “Before any answer is shown, it goes through a four-layer verification pipeline: rules alignment, math consistency, source citations, and a human-in-the-loop check for high-impact recommendations. If something doesn’t match the data, the agent returns a safe error instead of wrong numbers.”
- **Optional:** Trigger a query that yields a high-impact disclaimer or show a Langfuse trace where verification failed (if you have a sanitized example).

### Observability (3:00–4:00)

- **Say:** “We use Langfuse for observability.”
- **Show:** Langfuse dashboard (or a short recording): traces list, open one trace to show input query, tools called, token usage, estimated cost, verification pass/fail, duration.
- **Say:** “Every request is traced so we can debug failures, monitor cost, and review security events like injection attempts.”

### Eval results and wrap-up (4:00–5:00)

- **Say:** “The agent is evaluated with a 50-case suite: happy path, edge cases, adversarial prompts, and multi-step reasoning. Our current baseline is 100% pass with a deterministic runner; we also support an optional real-LLM run for final validation.”
- **Show:** Either the eval badge / CI run in the repo or the `BASELINE-RESULTS.md` / eval summary.
- **Say:** “That’s the Ghostfolio Smart Portfolio Auditor — read-only, verified, and observable. Links to the repo and live demo are in the description. Thanks for watching.”

### Checklist before recording

- [ ] Demo account has a small portfolio (e.g. a few holdings) so responses are quick and clear.
- [ ] OpenRouter API key (or equivalent) is set so the agent returns real answers.
- [ ] Langfuse is configured so traces appear in the dashboard.
- [ ] Optional: one adversarial query (e.g. “Sell all my stocks”) to show refusal and no tool misuse.

---

## 2. Social Post (X or LinkedIn)

**Use one of the variants below; shorten for X (character limit), use the longer one for LinkedIn.**

### Short (X-friendly)

```
Built a read-only AI portfolio auditor inside Ghostfolio for @GauntletAI AgentForge Week 2:

✅ 6 tools (performance, holdings, rules, market data, transactions, rebalancing)
✅ 4-layer verification (rules, math, citations, high-impact escalation)
✅ 50-case eval suite, 100% baseline pass
✅ Langfuse tracing + cost tracking

Live demo: [YOUR_DEMO_VIDEO_URL or deployed app URL]
Repo: [YOUR_REPO_URL]

#AgentForge #GauntletAI #AIAgents
```

### Longer (LinkedIn)

```
For AgentForge Week 2 I integrated a production-oriented AI agent into Ghostfolio — an open-source wealth management platform.

The Smart Portfolio Auditor answers natural language questions about your portfolio (allocation, performance, rule violations, rebalancing) using six tools, with strict verification before any answer is shown: rules alignment, math consistency, source citations, and human-in-the-loop escalation for high-impact recommendations. It’s read-only and suggestion-only; no trades, no data modification.

We run a 50-case evaluation suite (happy path, edge cases, adversarial, multi-step) and use Langfuse for tracing, token/cost tracking, and security audit logging. The current baseline is 100% pass.

If you’re interested in domain-specific agents, verification pipelines, or evals, the architecture doc, cost analysis, and eval setup are in the repo. Demo and code links below.

Demo: [YOUR_DEMO_VIDEO_URL or deployed app URL]
Repo: [YOUR_REPO_URL]

#AgentForge #GauntletAI #AIAgents #OpenSource
```

---

## 3. README placeholder for demo link

After you publish the video, add the URL to the README in the **AI Portfolio Agent** section, for example:

```markdown
### Demo Video

**[3–5 min demo: agent in action, tool calls, verification, Langfuse](YOUR_VIDEO_URL)**
```

Or keep the existing **Live Demo** app link and add a second line:

```markdown
**Demo video (walkthrough):** [Link TBD — add your published video URL here]
```

Update this file and the README when the link is available.
