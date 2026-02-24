import { z } from 'zod';

const TargetAllocationSchema = z.object({
  assetClass: z.string().describe('Asset class name (e.g., "EQUITY", "FIXED_INCOME")'),
  targetPercentage: z
    .number()
    .min(0)
    .max(100)
    .describe('Target allocation percentage (0-100)')
});

export const RebalanceSimulatorInputSchema = z.object({
  targetAllocations: z
    .array(TargetAllocationSchema)
    .min(1)
    .describe('Target allocation percentages by asset class')
});

const ProposedTradeSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  assetClass: z.string().nullable(),
  action: z.enum(['BUY', 'SELL', 'HOLD']),
  currentValueInBaseCurrency: z.number(),
  targetValueInBaseCurrency: z.number(),
  differenceInBaseCurrency: z.number()
});

const AllocationComparisonSchema = z.object({
  assetClass: z.string(),
  currentPercentage: z.number(),
  targetPercentage: z.number(),
  differencePercentage: z.number()
});

export const RebalanceSimulatorOutputSchema = z.object({
  proposedTrades: z.array(ProposedTradeSchema),
  allocationComparison: z.array(AllocationComparisonSchema),
  totalPortfolioValue: z.number()
});

export type RebalanceSimulatorInput = z.infer<
  typeof RebalanceSimulatorInputSchema
>;
export type RebalanceSimulatorOutput = z.infer<
  typeof RebalanceSimulatorOutputSchema
>;
