import { z } from 'zod';

export const MarketDataInputSchema = z.object({
  symbols: z
    .array(z.string())
    .min(1)
    .describe('Stock/fund symbols to fetch market data for'),
  startDate: z.string().optional().describe('Start date in ISO 8601 format'),
  endDate: z.string().optional().describe('End date in ISO 8601 format')
});

const MarketDataPointSchema = z.object({
  date: z.string(),
  marketPrice: z.number()
});

const SymbolMarketDataSchema = z.object({
  symbol: z.string(),
  currency: z.string().optional(),
  dataPoints: z.array(MarketDataPointSchema)
});

export const MarketDataOutputSchema = z.object({
  data: z.array(SymbolMarketDataSchema)
});

export type MarketDataInput = z.infer<typeof MarketDataInputSchema>;
export type MarketDataOutput = z.infer<typeof MarketDataOutputSchema>;
