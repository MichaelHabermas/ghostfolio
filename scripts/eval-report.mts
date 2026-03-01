/**
 * Runs the eval spec, reads latest-eval-results.json, and writes docs/eval-run-report.md.
 * Usage: npx tsx scripts/eval-report.mts
 */

import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const RESULTS_JSON = path.join(
  REPO_ROOT,
  'apps/api/src/app/endpoints/agent/eval/results/latest-eval-results.json'
);
const REPORT_MD = path.join(REPO_ROOT, 'docs/eval-run-report.md');

const EVAL_CMD = `npx dotenv-cli -e .env.example -- nx test api --testPathPattern=eval-execution.spec.ts`;

function extractProcessChecks(combined: string): string {
  const start = '=== EVAL PROCESS CHECKS (after run) ===';
  const end = '=== END EVAL PROCESS CHECKS ===';
  const i = combined.indexOf(start);
  const j = combined.indexOf(end);
  if (i === -1 || j === -1 || j <= i) return '(not found in output)';
  return combined.slice(i, j + end.length).trim();
}

function main(): void {
  const timestamp = new Date().toISOString();
  console.log(`Running eval spec at ${timestamp}...`);
  const result = spawnSync('npx', ['dotenv-cli', '-e', '.env.example', '--', 'nx', 'test', 'api', '--testPathPattern=eval-execution.spec.ts'], {
    cwd: REPO_ROOT,
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024,
    shell: false
  });

  const exitCode = result.status ?? 1;
  const stdout = result.stdout ?? '';
  const stderr = result.stderr ?? '';
  const combined = stdout + '\n' + stderr;

  const suitePassed = exitCode === 0;
  const processChecksBlock = extractProcessChecks(combined);

  let evalOutcome = '';
  let generatedAt = '';

  if (fs.existsSync(RESULTS_JSON)) {
    try {
      const data = JSON.parse(fs.readFileSync(RESULTS_JSON, 'utf-8'));
      generatedAt = data.generatedAt ?? '';
      const total = data.total ?? 0;
      const passed = data.passed ?? 0;
      const passRate = data.passRate ?? 0;
      const byCat = data.byCategory ?? {};
      const failures = data.failures ?? [];

      evalOutcome += `| Metric | Value |\n|--------|-------|\n`;
      evalOutcome += `| Total | ${total} |\n`;
      evalOutcome += `| Passed | ${passed} |\n`;
      evalOutcome += `| Pass rate | ${passRate}% |\n\n`;
      evalOutcome += `### By category\n\n`;
      evalOutcome += `| Category | Passed | Total | Pass rate |\n|----------|--------|-------|----------|\n`;
      for (const [category, stats] of Object.entries(byCat) as [string, { passed: number; total: number; passRate: number }][]) {
        evalOutcome += `| ${category} | ${stats.passed} | ${stats.total} | ${stats.passRate}% |\n`;
      }
      if (failures.length > 0) {
        evalOutcome += `\n### Failures\n\n`;
        evalOutcome += `| ID | Category | Failure class | Reason |\n|----|----------|---------------|--------|\n`;
        for (const f of failures) {
          evalOutcome += `| ${f.id} | ${f.category} | ${f.failureClass ?? ''} | ${(f.reason ?? '').replace(/\|/g, '\\|')} |\n`;
        }
      }
      if (data.responseFormatSummary) {
        const rfs = data.responseFormatSummary as { parsed: number; fallback: number };
        evalOutcome += `\n### Response format\n\n`;
        evalOutcome += `${rfs.parsed} parsed, ${rfs.fallback} fallback.\n`;
      }
    } catch (e) {
      evalOutcome = '(Failed to read or parse latest-eval-results.json)\n';
    }
  } else {
    evalOutcome = '(latest-eval-results.json not found; full 50-case test may not have run.)\n';
  }

  const report = `# Eval Run Report

Generated at: **${timestamp}**

## Command

\`\`\`
${EVAL_CMD}
\`\`\`

## Test outcome

| Item | Value |
|------|--------|
| Exit code | ${exitCode} |
| Suite passed | ${suitePassed ? 'Yes' : 'No'} |

## Eval outcome

${evalOutcome}

${generatedAt ? `*Results file generated at: ${generatedAt}*` : ''}

## Meta checks (after run)

\`\`\`
${processChecksBlock}
\`\`\`
`;

  fs.mkdirSync(path.dirname(REPORT_MD), { recursive: true });
  fs.writeFileSync(REPORT_MD, report, 'utf-8');
  console.log(`Report written to ${REPORT_MD}`);
  process.exit(exitCode);
}

main();
