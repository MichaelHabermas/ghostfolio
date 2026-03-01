I'm working on the Ghostfolio repo (portfolio/agent project). Here's what we're doing:

**Goal**
- Run the agent eval suite (50 cases in eval-execution.spec.ts) and get clear outcomes and reports.
- Prefer the REAL LLM run (OpenRouter) over the mocked run; the mock run is for CI speed, the real run is what we care about for validation.

**Eval setup**
- Main suite: apps/api/src/app/endpoints/agent/eval/eval-execution.spec.ts (50 cases: happy_path, edge_case, adversarial, multi_step).
- Results are written to apps/api/src/app/endpoints/agent/eval/results/latest-eval-results.json.
- After the run, the suite logs "EVAL PROCESS CHECKS" (model used, Real LLM flag, pass rate, optional responseFormatSummary).
- Script scripts/eval-report.mts runs the eval and writes docs/eval-run-report.md; npm scripts: test:eval (mock), test:eval:report.

**How to run only the eval suite (isolated) with REAL LLM**
- So Nx doesn't run the whole api test suite (seed-demo, agent.service, etc.), use testPathPattern=eval-execution so only eval-execution.spec.ts runs.
- Command (OPENROUTER_API_KEY in .env or env):
  EVAL_USE_REAL_LLM=true npx dotenv-cli -e .env -e .env.example -- nx test api --testPathPattern=eval-execution --testTimeout=60000

**What we want from a run**
- Test pass/fail for the eval suite.
- Eval pass rate and by-category breakdown; list of failures if any.
- Model used and Real LLM flag; response-format stats if present.
- Prefer reporting "HERE" (in chat) rather than only in a file.

**Conventions (from .cursor/rules)**
- Branch: feature/epic-N-name off dev; commits: type(scope): description.
- TDD where practical; protect the 9 MVP hard-gate requirements from the PRD.
- Before using a library API, check Context7 MCP for latest docs (Vercel AI SDK, NestJS, Langfuse, Zod, Prisma, Jest, OpenRouter).

Help me with [your next task], staying consistent with the above.
