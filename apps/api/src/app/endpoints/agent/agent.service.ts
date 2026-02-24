import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import {
  PROPERTY_API_KEY_OPENROUTER,
  PROPERTY_OPENROUTER_MODEL
} from '@ghostfolio/common/config';

import { Injectable, Logger } from '@nestjs/common';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText, type CoreMessage, type LanguageModel } from 'ai';

import { ResponseFormatter } from './formatters/response-formatter';
import { ConversationMemory } from './memory/conversation-memory';
import { SYSTEM_PROMPT } from './prompts/system-prompt';
import { GetHoldingsTool } from './tools/get-holdings.tool';
import { GetRulesReportTool } from './tools/get-rules-report.tool';
import { PortfolioPerformanceTool } from './tools/portfolio-performance.tool';
import { createToolRegistry } from './tools/tool-registry';
import type { AgentResponse } from './types';

const DEFAULT_MODEL = 'anthropic/claude-3.5-sonnet';
const DEFAULT_MAX_STEPS = 5;

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  public constructor(
    private readonly propertyService: PropertyService,
    private readonly performanceTool: PortfolioPerformanceTool,
    private readonly holdingsTool: GetHoldingsTool,
    private readonly rulesReportTool: GetRulesReportTool,
    private readonly conversationMemory: ConversationMemory,
    private readonly responseFormatter: ResponseFormatter
  ) {}

  public async processQuery({
    query,
    sessionId,
    userId
  }: {
    query: string;
    sessionId?: string;
    userId: string;
  }): Promise<AgentResponse> {
    const resolvedSessionId = sessionId ?? crypto.randomUUID();

    try {
      const history = this.conversationMemory.getHistory(resolvedSessionId);
      const userMessage: CoreMessage = { role: 'user', content: query };
      const messages: CoreMessage[] = [...history, userMessage];

      const tools = createToolRegistry(
        {
          performanceTool: this.performanceTool,
          holdingsTool: this.holdingsTool,
          rulesReportTool: this.rulesReportTool
        },
        userId
      );

      const result = await this.callLlm({
        messages,
        system: SYSTEM_PROMPT,
        tools
      });

      const assistantMessage: CoreMessage = {
        role: 'assistant',
        content: result.text
      };

      this.conversationMemory.addMessages(resolvedSessionId, [
        userMessage,
        assistantMessage
      ]);

      const formatted = this.responseFormatter.format(result.text);

      return {
        response: formatted.narrative,
        sources: formatted.sources,
        flags: formatted.flags,
        sessionId: resolvedSessionId
      };
    } catch (error) {
      this.logger.error(`Agent processing failed: ${error}`);

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
    system,
    tools = {},
    maxSteps = DEFAULT_MAX_STEPS
  }: {
    messages: CoreMessage[];
    system?: string;
    tools?: Record<string, unknown>;
    maxSteps?: number;
  }) {
    const model = await this.createLlmProvider();

    return generateText({
      maxSteps,
      messages,
      model,
      system,
      tools: tools as any
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
