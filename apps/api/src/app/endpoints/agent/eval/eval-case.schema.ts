import { z } from 'zod';

export const EvalCategoryEnum = z.enum([
  'happy_path',
  'edge_case',
  'adversarial',
  'multi_step'
]);

export type EvalCategory = z.infer<typeof EvalCategoryEnum>;

export const VerificationChecksSchema = z
  .object({
    input_validation: z.boolean().optional(),
    tool_call_validation: z.boolean().optional(),
    response_validation: z.boolean().optional(),
    rules_validation: z.boolean().optional()
  })
  .optional();

export const EvalCaseSchema = z.object({
  id: z.string().min(1),
  category: EvalCategoryEnum,
  input_query: z.string().min(1),
  expected_tools: z.array(z.string()),
  expected_output_contains: z.array(z.string()),
  expected_output_not_contains: z.array(z.string()),
  verification_checks: VerificationChecksSchema,
  pass_criteria: z.string().min(1)
});

export type EvalCase = z.infer<typeof EvalCaseSchema>;

export const EvalCaseArraySchema = z.array(EvalCaseSchema);

export type EvalCaseArray = z.infer<typeof EvalCaseArraySchema>;

/*
 * Seed Data Fixture — Portfolio State Assumptions
 *
 * The eval cases in mvp-cases.json assume the following portfolio state in the
 * Ghostfolio database. This is NOT a live database seed; it documents the
 * preconditions so integration tests (when added) can reproduce deterministic results.
 *
 * User Account:
 *   - email: eval-user@ghostfolio.test
 *   - one portfolio with two accounts:
 *       1. "Brokerage Account" (USD)
 *       2. "Retirement Account" (USD)
 *
 * Holdings (as of eval baseline date 2026-01-01):
 *   - AAPL  (Apple Inc.)         100 shares @ avg cost $150  → current $175
 *   - MSFT  (Microsoft Corp.)     50 shares @ avg cost $300  → current $380
 *   - BND   (Vanguard Bond ETF)  200 shares @ avg cost $73   → current $71
 *   - Cash                       $5,000
 *
 * Portfolio Metrics:
 *   - Total value: ~$55,700
 *   - Overall P&L: +$6,200 (approx +12.5%)
 *   - Asset allocation: ~68% equities, ~26% bonds, ~6% cash
 *
 * Rules:
 *   - No rules violations active (no single asset > 50% of portfolio)
 *   - Account "XYZ" does NOT exist (used in edge_case test)
 */
