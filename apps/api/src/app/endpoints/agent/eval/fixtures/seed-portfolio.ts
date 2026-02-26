/**
 * Deterministic seed data fixtures for eval testing.
 *
 * These match the portfolio state documented in eval-case.schema.ts:
 *   - AAPL:  100 shares @ avg cost $150, current $175
 *   - MSFT:   50 shares @ avg cost $300, current $380
 *   - BND:   200 shares @ avg cost $73,  current $71
 *   - Cash:  $5,000
 *   - Total: ~$55,700  |  P&L: +$6,200 (~+12.5%)
 *   - Allocation: ~68% equities, ~26% bonds, ~6% cash
 *   - No active rule violations
 */

import type { ToolResponse } from '../../types';
import type { PortfolioPerformanceOutput } from '../../schemas/portfolio-performance.schema';
import type { GetHoldingsOutput } from '../../schemas/get-holdings.schema';
import type { GetRulesReportOutput } from '../../schemas/get-rules-report.schema';

export const MOCK_PERFORMANCE_DATA: ToolResponse<PortfolioPerformanceOutput> = {
  success: true,
  data: {
    currentValueInBaseCurrency: 55700,
    totalInvestment: 49500,
    netPerformance: 6200,
    netPerformancePercentage: 0.1253,
    netPerformancePercentageWithCurrencyEffect: 0.1253,
    netPerformanceWithCurrencyEffect: 6200,
    totalInvestmentValueWithCurrencyEffect: 49500,
    annualizedPerformancePercent: 0.08
  }
};

export const MOCK_HOLDINGS_DATA: ToolResponse<GetHoldingsOutput> = {
  success: true,
  data: {
    totalValueInBaseCurrency: 55700,
    holdings: [
      {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        allocationInPercentage: 31.42,
        valueInBaseCurrency: 17500,
        currency: 'USD',
        assetClass: 'EQUITY',
        assetSubClass: 'STOCK',
        marketPrice: 175,
        quantity: 100
      },
      {
        symbol: 'MSFT',
        name: 'Microsoft Corp.',
        allocationInPercentage: 34.11,
        valueInBaseCurrency: 19000,
        currency: 'USD',
        assetClass: 'EQUITY',
        assetSubClass: 'STOCK',
        marketPrice: 380,
        quantity: 50
      },
      {
        symbol: 'BND',
        name: 'Vanguard Total Bond Market ETF',
        allocationInPercentage: 25.49,
        valueInBaseCurrency: 14200,
        currency: 'USD',
        assetClass: 'FIXED_INCOME',
        assetSubClass: 'ETF',
        marketPrice: 71,
        quantity: 200
      },
      {
        symbol: 'USD',
        name: 'Cash',
        allocationInPercentage: 8.98,
        valueInBaseCurrency: 5000,
        currency: 'USD',
        assetClass: 'CASH',
        assetSubClass: null,
        quantity: 5000
      }
    ]
  }
};

export const MOCK_RULES_REPORT_DATA: ToolResponse<GetRulesReportOutput> = {
  success: true,
  data: {
    categories: [
      {
        key: 'assetClass',
        name: 'Asset Class',
        rules: [
          {
            key: 'emergencyFund',
            name: 'Emergency Fund',
            isActive: true,
            value: true,
            evaluation: 'Your emergency fund is sufficient.'
          }
        ]
      },
      {
        key: 'currencyCluster',
        name: 'Currency Cluster Risk',
        rules: [
          {
            key: 'currencyClusterRisk',
            name: 'Currency Cluster Risk',
            isActive: true,
            value: true,
            evaluation: 'No significant currency cluster risk detected.'
          }
        ]
      }
    ],
    statistics: {
      rulesActiveCount: 2,
      rulesFulfilledCount: 2
    }
  }
};

export const MOCK_PERFORMANCE_ERROR: ToolResponse<PortfolioPerformanceOutput> = {
  success: false,
  error: 'Account not found: XYZ'
};

// Edge case fixtures for Epic 12 Commit 2

export const MOCK_EMPTY_HOLDINGS: ToolResponse<GetHoldingsOutput> = {
  success: true,
  data: {
    totalValueInBaseCurrency: 0,
    holdings: []
  }
};

export const MOCK_SINGLE_HOLDING: ToolResponse<GetHoldingsOutput> = {
  success: true,
  data: {
    totalValueInBaseCurrency: 17500,
    holdings: [
      {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        allocationInPercentage: 100.0,
        valueInBaseCurrency: 17500,
        currency: 'USD',
        assetClass: 'EQUITY',
        assetSubClass: 'STOCK',
        marketPrice: 175,
        quantity: 100
      }
    ]
  }
};

export const MOCK_ZERO_BALANCE_PERFORMANCE: ToolResponse<PortfolioPerformanceOutput> = {
  success: true,
  data: {
    currentValueInBaseCurrency: 0,
    totalInvestment: 0,
    netPerformance: 0,
    netPerformancePercentage: 0,
    netPerformancePercentageWithCurrencyEffect: 0,
    netPerformanceWithCurrencyEffect: 0,
    totalInvestmentValueWithCurrencyEffect: 0,
    annualizedPerformancePercent: 0
  }
};

export const MOCK_MARKET_DATA_ERROR: ToolResponse<any> = {
  success: false,
  error: 'Symbol not found: UNKNOWN'
};

export const MOCK_CASH_ONLY_HOLDINGS: ToolResponse<GetHoldingsOutput> = {
  success: true,
  data: {
    totalValueInBaseCurrency: 10000,
    holdings: [
      {
        symbol: 'USD',
        name: 'Cash',
        allocationInPercentage: 100.0,
        valueInBaseCurrency: 10000,
        currency: 'USD',
        assetClass: 'CASH',
        assetSubClass: null,
        quantity: 10000
      }
    ]
  }
};
