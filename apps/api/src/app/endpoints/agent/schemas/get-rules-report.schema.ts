import { z } from 'zod';

export const GetRulesReportInputSchema = z.object({
  accountIds: z
    .array(z.string())
    .optional()
    .describe('Filter by specific account IDs')
});

const RuleViolationSchema = z.object({
  key: z.string(),
  name: z.string(),
  isActive: z.boolean(),
  value: z.boolean().optional(),
  evaluation: z.string().optional()
});

const RuleCategorySchema = z.object({
  key: z.string(),
  name: z.string(),
  rules: z.array(RuleViolationSchema)
});

export const GetRulesReportOutputSchema = z.object({
  categories: z.array(RuleCategorySchema),
  statistics: z.object({
    rulesActiveCount: z.number(),
    rulesFulfilledCount: z.number()
  })
});

export type GetRulesReportInput = z.infer<typeof GetRulesReportInputSchema>;
export type GetRulesReportOutput = z.infer<typeof GetRulesReportOutputSchema>;
