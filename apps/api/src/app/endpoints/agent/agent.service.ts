import { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';
import { RulesService } from '@ghostfolio/api/app/portfolio/rules.service';
import { MarketDataService } from '@ghostfolio/api/services/market-data/market-data.service';
import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import {
  PROPERTY_API_KEY_OPENROUTER,
  PROPERTY_OPENROUTER_MODEL
} from '@ghostfolio/common/config';

import { Injectable, Logger } from '@nestjs/common';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText, type CoreMessage, type LanguageModel } from 'ai';

import type { AgentResponse } from './types';

const DEFAULT_MODEL = 'anthropic/claude-3.5-sonnet';
const DEFAULT_MAX_STEPS = 5;

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  // TODO(Epic 4): Replace direct domain service injection with a tool registry
  // (AgentToolsService). Per SOLID/ISP, the orchestrator should depend on the
  // tool registry abstraction, not on PortfolioService/RulesService/MarketDataService
  // directly. Those services move into individual tool wrappers in Epic 3-4.
  // PropertyService stays for LLM provider configuration.
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

    try {
      const result = await this.callLlm({
        messages: [{ role: 'user', content: query }]
      });

      return {
        response: result.text,
        sources: [],
        flags: [],
        sessionId: resolvedSessionId
      };
    } catch (error) {
      this.logger.error(`LLM call failed: ${error}`);

      return {
        response:
          'I was unable to process your request at this time. Please try again shortly.',
        sources: [],
        flags: ['error'],
        sessionId: resolvedSessionId
      };
    }
  }

  public async callLlm({
    messages,
    tools = {},
    maxSteps = DEFAULT_MAX_STEPS
  }: {
    messages: CoreMessage[];
    tools?: Record<string, unknown>;
    maxSteps?: number;
  }) {
    const model = await this.createLlmProvider();

    return generateText({
      model,
      messages,
      tools: tools as any,
      maxSteps
    });
  }

  private async createLlmProvider(): Promise<LanguageModel> {
    const openRouterApiKey = await this.propertyService.getByKey<string>(
      PROPERTY_API_KEY_OPENROUTER
    );

    if (!openRouterApiKey) {
      throw new Error(
        'OpenRouter API key not configured. Set API_KEY_OPENROUTER in admin settings.'
      );
    }

    const openRouterModel =
      (await this.propertyService.getByKey<string>(
        PROPERTY_OPENROUTER_MODEL
      )) ?? DEFAULT_MODEL;

    const provider = createOpenRouter({ apiKey: openRouterApiKey });

    return provider.chat(openRouterModel);
  }
}
