import { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';

import { Injectable, Logger } from '@nestjs/common';

import type {
  RebalanceSimulatorInput,
  RebalanceSimulatorOutput
} from '../schemas';
import type { ToolResponse } from '../types';

@Injectable()
export class RebalanceSimulatorTool {
  private readonly logger = new Logger(RebalanceSimulatorTool.name);

  public constructor(private readonly portfolioService: PortfolioService) {}

  public async execute(
    input: RebalanceSimulatorInput,
    userId = ''
  ): Promise<ToolResponse<RebalanceSimulatorOutput>> {
    try {
      const details = await this.portfolioService.getDetails({
        impersonationId: undefined,
        userId,
        withSummary: true
      });

      const holdings = Object.values(details.holdings);

      const totalValue =
        details.summary?.currentValueInBaseCurrency ??
        holdings.reduce(
          (sum, h) => sum + (h.valueInBaseCurrency ?? 0),
          0
        );

      if (totalValue <= 0) {
        return {
          data: {
            allocationComparison: [],
            proposedTrades: [],
            totalPortfolioValue: 0
          },
          success: true
        };
      }

      const currentByClass = new Map<string, number>();
      for (const h of holdings) {
        const cls = h.assetClass ?? 'UNKNOWN';
        currentByClass.set(
          cls,
          (currentByClass.get(cls) ?? 0) + (h.valueInBaseCurrency ?? 0)
        );
      }

      const targetByClass = new Map<string, number>();
      for (const t of input.targetAllocations) {
        targetByClass.set(
          t.assetClass,
          (t.targetPercentage / 100) * totalValue
        );
      }

      const allClasses = new Set([
        ...currentByClass.keys(),
        ...targetByClass.keys()
      ]);

      const allocationComparison = [...allClasses].map((cls) => {
        const current = currentByClass.get(cls) ?? 0;
        const target = targetByClass.get(cls) ?? 0;
        const currentPct = (current / totalValue) * 100;
        const targetPct = (target / totalValue) * 100;

        return {
          assetClass: cls,
          currentPercentage: Math.round(currentPct * 100) / 100,
          differencePercentage:
            Math.round((targetPct - currentPct) * 100) / 100,
          targetPercentage: Math.round(targetPct * 100) / 100
        };
      });

      const proposedTrades = holdings.map((h) => {
        const cls = h.assetClass ?? 'UNKNOWN';
        const classCurrentTotal = currentByClass.get(cls) ?? 0;
        const classTargetTotal = targetByClass.get(cls) ?? classCurrentTotal;
        const currentVal = h.valueInBaseCurrency ?? 0;

        let targetVal: number;
        if (classCurrentTotal > 0) {
          targetVal = currentVal * (classTargetTotal / classCurrentTotal);
        } else {
          targetVal = currentVal;
        }

        const diff = targetVal - currentVal;
        const THRESHOLD = 0.01;

        return {
          action: (diff > THRESHOLD
            ? 'BUY'
            : diff < -THRESHOLD
              ? 'SELL'
              : 'HOLD') as 'BUY' | 'SELL' | 'HOLD',
          assetClass: h.assetClass ?? null,
          currentValueInBaseCurrency: currentVal,
          differenceInBaseCurrency: Math.round(diff * 100) / 100,
          name: h.name,
          symbol: h.symbol,
          targetValueInBaseCurrency: Math.round(targetVal * 100) / 100
        };
      });

      return {
        data: {
          allocationComparison,
          proposedTrades,
          totalPortfolioValue: totalValue
        },
        success: true
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`rebalance_simulator tool failed: ${message}`);

      return { error: message, success: false };
    }
  }
}
