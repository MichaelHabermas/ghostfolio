import { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';

import { Injectable, Logger } from '@nestjs/common';

import type {
  PortfolioPerformanceInput,
  PortfolioPerformanceOutput
} from '../schemas';
import type { ToolResponse } from '../types';

@Injectable()
export class PortfolioPerformanceTool {
  private readonly logger = new Logger(PortfolioPerformanceTool.name);

  public constructor(private readonly portfolioService: PortfolioService) {}

  public async execute(
    input: PortfolioPerformanceInput,
    userId = ''
  ): Promise<ToolResponse<PortfolioPerformanceOutput>> {
    try {
      const filters = input.accountIds?.map((id) => ({
        id,
        type: 'ACCOUNT' as const
      }));

      const result = await this.portfolioService.getPerformance({
        dateRange: input.dateRange ?? 'max',
        filters,
        impersonationId: undefined,
        userId
      });

      if (!result.performance) {
        return {
          error: 'Unable to retrieve portfolio performance data at this time.',
          success: false
        };
      }

      const { performance } = result;

      return {
        data: {
          annualizedPerformancePercent:
            performance.annualizedPerformancePercent ?? undefined,
          currentNetWorth: (performance as any).currentNetWorth ?? undefined,
          currentValueInBaseCurrency: performance.currentValueInBaseCurrency,
          netPerformance: performance.netPerformance,
          netPerformancePercentage: performance.netPerformancePercentage,
          netPerformancePercentageWithCurrencyEffect:
            performance.netPerformancePercentageWithCurrencyEffect,
          netPerformanceWithCurrencyEffect:
            performance.netPerformanceWithCurrencyEffect,
          totalInvestment: performance.totalInvestment,
          totalInvestmentValueWithCurrencyEffect:
            performance.totalInvestmentValueWithCurrencyEffect
        },
        success: true
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`portfolio_performance tool failed: ${message}`);

      return { error: message, success: false };
    }
  }
}
