import { z } from 'zod';

export const PortfolioPerformanceInputSchema = z.object({
  dateRange: z
    .enum(['1d', '1w', '1m', '3m', '6m', 'ytd', '1y', '3y', '5y', 'max'])
    .optional()
    .default('max')
    .describe('Time range for performance calculation'),
  accountIds: z
    .array(z.string())
    .optional()
    .describe('Filter by specific account IDs')
});

export const PortfolioPerformanceOutputSchema = z.object({
  annualizedPerformancePercent: z.number().optional(),
  currentNetWorth: z.number().optional(),
  currentValueInBaseCurrency: z.number(),
  netPerformance: z.number(),
  netPerformancePercentage: z.number(),
  netPerformancePercentageWithCurrencyEffect: z.number(),
  netPerformanceWithCurrencyEffect: z.number(),
  totalInvestment: z.number(),
  totalInvestmentValueWithCurrencyEffect: z.number()
});

export type PortfolioPerformanceInput = z.infer<
  typeof PortfolioPerformanceInputSchema
>;
export type PortfolioPerformanceOutput = z.infer<
  typeof PortfolioPerformanceOutputSchema
>;
