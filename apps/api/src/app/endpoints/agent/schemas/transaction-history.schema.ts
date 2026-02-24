import { z } from 'zod';

export const TransactionHistoryInputSchema = z.object({
  accountIds: z
    .array(z.string())
    .optional()
    .describe('Filter by specific account IDs'),
  startDate: z.string().optional().describe('Start date in ISO 8601 format'),
  endDate: z.string().optional().describe('End date in ISO 8601 format')
});

const TransactionItemSchema = z.object({
  id: z.string(),
  date: z.string(),
  type: z.enum(['BUY', 'SELL', 'DIVIDEND', 'ITEM', 'FEE', 'INTEREST', 'LIABILITY', 'STAKE']),
  symbol: z.string().nullable(),
  quantity: z.number(),
  unitPrice: z.number(),
  fee: z.number(),
  currency: z.string(),
  accountName: z.string().optional()
});

export const TransactionHistoryOutputSchema = z.object({
  transactions: z.array(TransactionItemSchema),
  totalCount: z.number()
});

export type TransactionHistoryInput = z.infer<
  typeof TransactionHistoryInputSchema
>;
export type TransactionHistoryOutput = z.infer<
  typeof TransactionHistoryOutputSchema
>;
