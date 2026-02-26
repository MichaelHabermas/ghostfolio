import { MarketDataService } from '@ghostfolio/api/services/market-data/market-data.service';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';

import { Injectable, Logger } from '@nestjs/common';

import type { MarketDataInput, MarketDataOutput } from '../schemas';
import type { ToolResponse } from '../types';

const DEFAULT_LOOKBACK_DAYS = 30;

@Injectable()
export class MarketDataTool {
  private readonly logger = new Logger(MarketDataTool.name);

  public constructor(
    private readonly marketDataService: MarketDataService,
    private readonly prismaService: PrismaService
  ) {}

  public async execute(
    input: MarketDataInput,
    _userId = ''
  ): Promise<ToolResponse<MarketDataOutput>> {
    try {
      const profiles = await this.prismaService.symbolProfile.findMany({
        select: { currency: true, dataSource: true, symbol: true },
        where: { symbol: { in: input.symbols } }
      });

      if (profiles.length === 0) {
        return {
          data: { data: [] },
          success: true
        };
      }

      const assetProfileIdentifiers = profiles.map((p) => ({
        dataSource: p.dataSource,
        symbol: p.symbol
      }));

      const now = new Date();
      const defaultStart = new Date(now);
      defaultStart.setDate(defaultStart.getDate() - DEFAULT_LOOKBACK_DAYS);

      const dateQuery = {
        gte: input.startDate ? new Date(input.startDate) : defaultStart,
        lt: input.endDate ? new Date(input.endDate) : now
      };

      const marketData = await this.marketDataService.getRange({
        assetProfileIdentifiers,
        dateQuery
      });

      const currencyMap = new Map(
        profiles.map((p) => [p.symbol, p.currency])
      );

      const grouped = new Map<
        string,
        Array<{ date: string; marketPrice: number }>
      >();

      for (const item of marketData) {
        const points = grouped.get(item.symbol) ?? [];
        points.push({
          date: item.date.toISOString(),
          marketPrice: Number(item.marketPrice)
        });
        grouped.set(item.symbol, points);
      }

      const data = input.symbols.map((symbol) => ({
        currency: currencyMap.get(symbol) ?? undefined,
        dataPoints: grouped.get(symbol) ?? [],
        symbol
      }));

      return { data: { data }, success: true };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`market_data tool failed: ${message}`);

      return { error: message, success: false };
    }
  }
}
