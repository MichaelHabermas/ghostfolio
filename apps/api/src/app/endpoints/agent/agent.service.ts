import { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';
import { RulesService } from '@ghostfolio/api/app/portfolio/rules.service';
import { MarketDataService } from '@ghostfolio/api/services/market-data/market-data.service';
import { PropertyService } from '@ghostfolio/api/services/property/property.service';

import { Injectable, Logger } from '@nestjs/common';

import type { AgentResponse } from './types';

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  public constructor(
    private readonly portfolioService: PortfolioService,
    private readonly rulesService: RulesService,
    private readonly marketDataService: MarketDataService,
    private readonly propertyService: PropertyService
  ) {
    this.logger.log(
      `Initialized with services: Portfolio=${!!this.portfolioService}, ` +
        `Rules=${!!this.rulesService}, MarketData=${!!this.marketDataService}, ` +
        `Property=${!!this.propertyService}`
    );
  }

  public async processQuery({
    query,
    sessionId,
    userId: _userId
  }: {
    query: string;
    sessionId?: string;
    userId: string;
  }): Promise<AgentResponse> {
    const resolvedSessionId = sessionId ?? crypto.randomUUID();

    return {
      response: `Agent received query: "${query}". Full implementation coming in Epic 4.`,
      sources: [],
      flags: [],
      sessionId: resolvedSessionId
    };
  }
}
