import { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';

import { Injectable, Logger } from '@nestjs/common';

import type { GetHoldingsInput, GetHoldingsOutput } from '../schemas';
import type { ToolResponse } from '../types';

@Injectable()
export class GetHoldingsTool {
  private readonly logger = new Logger(GetHoldingsTool.name);

  public constructor(private readonly portfolioService: PortfolioService) {}

  public async execute(
    input: GetHoldingsInput,
    userId = ''
  ): Promise<ToolResponse<GetHoldingsOutput>> {
    try {
      const filters = input.accountIds?.map((id) => ({
        id,
        type: 'ACCOUNT' as const
      }));

      const result = await this.portfolioService.getDetails({
        dateRange: input.dateRange ?? 'max',
        filters,
        impersonationId: undefined,
        userId,
        withSummary: true
      });

      const holdings = Object.values(result.holdings).map((holding) => ({
        allocationInPercentage: holding.allocationInPercentage,
        assetClass: holding.assetClass ?? null,
        assetSubClass: holding.assetSubClass ?? null,
        currency: holding.currency,
        marketPrice: holding.marketPrice ?? undefined,
        name: holding.name,
        quantity: holding.quantity ?? undefined,
        symbol: holding.symbol,
        valueInBaseCurrency: holding.valueInBaseCurrency
      }));

      const totalValueInBaseCurrency =
        result.summary?.currentValueInBaseCurrency ??
        holdings.reduce((sum, h) => sum + h.valueInBaseCurrency, 0);

      return {
        data: { holdings, totalValueInBaseCurrency },
        success: true
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`get_holdings tool failed: ${message}`);

      return { error: message, success: false };
    }
  }
}
