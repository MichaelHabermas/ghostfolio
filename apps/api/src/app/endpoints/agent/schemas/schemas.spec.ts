import {
  GetHoldingsInputSchema,
  GetHoldingsOutputSchema,
  GetRulesReportInputSchema,
  GetRulesReportOutputSchema,
  MarketDataInputSchema,
  MarketDataOutputSchema,
  PortfolioPerformanceInputSchema,
  PortfolioPerformanceOutputSchema,
  RebalanceSimulatorInputSchema,
  RebalanceSimulatorOutputSchema,
  TransactionHistoryInputSchema,
  TransactionHistoryOutputSchema
} from './index';

describe('Agent Zod Schemas', () => {
  describe('PortfolioPerformanceSchema', () => {
    it('should accept valid input with defaults', () => {
      const result = PortfolioPerformanceInputSchema.parse({});
      expect(result.dateRange).toBe('max');
    });

    it('should accept valid input with explicit values', () => {
      const result = PortfolioPerformanceInputSchema.parse({
        dateRange: '1y',
        accountIds: ['acc-1', 'acc-2']
      });
      expect(result.dateRange).toBe('1y');
      expect(result.accountIds).toEqual(['acc-1', 'acc-2']);
    });

    it('should reject invalid dateRange', () => {
      expect(() =>
        PortfolioPerformanceInputSchema.parse({ dateRange: 'invalid' })
      ).toThrow();
    });

    it('should validate output schema', () => {
      const output = PortfolioPerformanceOutputSchema.parse({
        currentValueInBaseCurrency: 100000,
        netPerformance: 5000,
        netPerformancePercentage: 0.05,
        netPerformancePercentageWithCurrencyEffect: 0.048,
        netPerformanceWithCurrencyEffect: 4800,
        totalInvestment: 95000,
        totalInvestmentValueWithCurrencyEffect: 94500
      });
      expect(output.netPerformance).toBe(5000);
    });
  });

  describe('GetHoldingsSchema', () => {
    it('should accept empty input with defaults', () => {
      const result = GetHoldingsInputSchema.parse({});
      expect(result.dateRange).toBe('max');
    });

    it('should validate output with holdings array', () => {
      const output = GetHoldingsOutputSchema.parse({
        holdings: [
          {
            symbol: 'AAPL',
            name: 'Apple Inc.',
            allocationInPercentage: 0.25,
            valueInBaseCurrency: 25000,
            currency: 'USD',
            assetClass: 'EQUITY',
            assetSubClass: 'STOCK'
          }
        ],
        totalValueInBaseCurrency: 100000
      });
      expect(output.holdings).toHaveLength(1);
      expect(output.holdings[0].symbol).toBe('AAPL');
    });

    it('should allow nullable assetClass', () => {
      const output = GetHoldingsOutputSchema.parse({
        holdings: [
          {
            symbol: 'BTC',
            name: 'Bitcoin',
            allocationInPercentage: 0.1,
            valueInBaseCurrency: 10000,
            currency: 'USD',
            assetClass: null,
            assetSubClass: null
          }
        ],
        totalValueInBaseCurrency: 10000
      });
      expect(output.holdings[0].assetClass).toBeNull();
    });
  });

  describe('GetRulesReportSchema', () => {
    it('should accept empty input', () => {
      const result = GetRulesReportInputSchema.parse({});
      expect(result.accountIds).toBeUndefined();
    });

    it('should validate output with categories and statistics', () => {
      const output = GetRulesReportOutputSchema.parse({
        categories: [
          {
            key: 'diversification',
            name: 'Diversification',
            rules: [
              {
                key: 'allocationCluster',
                name: 'Allocation Cluster Risk',
                isActive: true,
                value: false,
                evaluation: 'FAIL'
              }
            ]
          }
        ],
        statistics: {
          rulesActiveCount: 5,
          rulesFulfilledCount: 3
        }
      });
      expect(output.categories).toHaveLength(1);
      expect(output.statistics.rulesActiveCount).toBe(5);
    });
  });

  describe('MarketDataSchema', () => {
    it('should require at least one symbol', () => {
      expect(() => MarketDataInputSchema.parse({ symbols: [] })).toThrow();
    });

    it('should accept valid input', () => {
      const result = MarketDataInputSchema.parse({
        symbols: ['AAPL', 'GOOGL'],
        startDate: '2025-01-01',
        endDate: '2025-12-31'
      });
      expect(result.symbols).toHaveLength(2);
    });

    it('should validate output', () => {
      const output = MarketDataOutputSchema.parse({
        data: [
          {
            symbol: 'AAPL',
            currency: 'USD',
            dataPoints: [{ date: '2025-01-01', marketPrice: 185.5 }]
          }
        ]
      });
      expect(output.data[0].dataPoints[0].marketPrice).toBe(185.5);
    });
  });

  describe('TransactionHistorySchema', () => {
    it('should accept empty input', () => {
      const result = TransactionHistoryInputSchema.parse({});
      expect(result.accountIds).toBeUndefined();
    });

    it('should validate output with transactions', () => {
      const output = TransactionHistoryOutputSchema.parse({
        transactions: [
          {
            id: 'tx-1',
            date: '2025-06-15',
            type: 'BUY',
            symbol: 'AAPL',
            quantity: 10,
            unitPrice: 185.0,
            fee: 1.5,
            currency: 'USD',
            accountName: 'Main Brokerage'
          }
        ],
        totalCount: 1
      });
      expect(output.transactions[0].type).toBe('BUY');
    });

    it('should reject invalid transaction type', () => {
      expect(() =>
        TransactionHistoryOutputSchema.parse({
          transactions: [
            {
              id: 'tx-1',
              date: '2025-06-15',
              type: 'INVALID',
              symbol: 'AAPL',
              quantity: 10,
              unitPrice: 185.0,
              fee: 1.5,
              currency: 'USD'
            }
          ],
          totalCount: 1
        })
      ).toThrow();
    });
  });

  describe('RebalanceSimulatorSchema', () => {
    it('should require at least one target allocation', () => {
      expect(() =>
        RebalanceSimulatorInputSchema.parse({ targetAllocations: [] })
      ).toThrow();
    });

    it('should accept valid input', () => {
      const result = RebalanceSimulatorInputSchema.parse({
        targetAllocations: [
          { assetClass: 'EQUITY', targetPercentage: 60 },
          { assetClass: 'FIXED_INCOME', targetPercentage: 40 }
        ]
      });
      expect(result.targetAllocations).toHaveLength(2);
    });

    it('should reject percentage over 100', () => {
      expect(() =>
        RebalanceSimulatorInputSchema.parse({
          targetAllocations: [
            { assetClass: 'EQUITY', targetPercentage: 150 }
          ]
        })
      ).toThrow();
    });

    it('should validate output', () => {
      const output = RebalanceSimulatorOutputSchema.parse({
        proposedTrades: [
          {
            symbol: 'AAPL',
            name: 'Apple Inc.',
            assetClass: 'EQUITY',
            action: 'SELL',
            currentValueInBaseCurrency: 30000,
            targetValueInBaseCurrency: 24000,
            differenceInBaseCurrency: -6000
          }
        ],
        allocationComparison: [
          {
            assetClass: 'EQUITY',
            currentPercentage: 75,
            targetPercentage: 60,
            differencePercentage: -15
          }
        ],
        totalPortfolioValue: 40000
      });
      expect(output.proposedTrades[0].action).toBe('SELL');
    });
  });
});
