import { z } from 'zod';

export const GetHoldingsInputSchema = z.object({
  accountIds: z
    .array(z.string())
    .optional()
    .describe('Filter by specific account IDs'),
  dateRange: z
    .enum(['1d', '1w', '1m', '3m', '6m', 'ytd', '1y', '3y', '5y', 'max'])
    .optional()
    .default('max')
    .describe('Time range for holdings valuation')
});

const HoldingItemSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  allocationInPercentage: z.number(),
  valueInBaseCurrency: z.number(),
  currency: z.string(),
  assetClass: z.string().nullable(),
  assetSubClass: z.string().nullable(),
  marketPrice: z.number().optional(),
  quantity: z.number().optional()
});

export const GetHoldingsOutputSchema = z.object({
  holdings: z.array(HoldingItemSchema),
  totalValueInBaseCurrency: z.number()
});

export type GetHoldingsInput = z.infer<typeof GetHoldingsInputSchema>;
export type GetHoldingsOutput = z.infer<typeof GetHoldingsOutputSchema>;
