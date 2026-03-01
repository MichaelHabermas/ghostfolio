import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import {
  PROPERTY_API_KEY_OPENROUTER,
  PROPERTY_OPENROUTER_MODEL
} from '@ghostfolio/common/config';

import { Injectable, Logger } from '@nestjs/common';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText, type CoreMessage, type LanguageModel } from 'ai';

import { ErrorMapperService } from './errors/error-mapper.service';
import { estimateCostUsd } from './observability/cost-estimator';
import { categorizeError } from './observability/error-categorizer';
import { LangfuseService } from './observability/langfuse.service';
import { ResponseFormatter } from './formatters/response-formatter';
import { ConversationMemory } from './memory/conversation-memory';
import { SYSTEM_PROMPT } from './prompts/system-prompt';
import { RedactionService } from './redaction/redaction.service';
import { GetHoldingsTool } from './tools/get-holdings.tool';
import { GetRulesReportTool } from './tools/get-rules-report.tool';
import { MarketDataTool } from './tools/market-data.tool';
import { PortfolioPerformanceTool } from './tools/portfolio-performance.tool';
import { RebalanceSimulatorTool } from './tools/rebalance-simulator.tool';
import { TransactionHistoryTool } from './tools/transaction-history.tool';
import { createToolRegistry } from './tools/tool-registry';
import type { AgentResponse, ToolResponse } from './types';
import { VerificationService } from './verification/verification.service';
import type { StructuredAgentResponse } from './verification/verification.types';

export const DEFAULT_MODEL = 'google/gemini-2.5-flash';
const DEFAULT_MAX_STEPS = 5;

const VERIFICATION_FAILURE_MESSAGE =
  'I detected an inconsistency in my analysis and stopped to avoid giving you incorrect information. Please try your question again.';

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  public constructor(
    private readonly propertyService: PropertyService,
    private readonly performanceTool: PortfolioPerformanceTool,
    private readonly holdingsTool: GetHoldingsTool,
    private readonly rulesReportTool: GetRulesReportTool,
    private readonly marketDataTool: MarketDataTool,
    private readonly transactionHistoryTool: TransactionHistoryTool,
    private readonly rebalanceSimulatorTool: RebalanceSimulatorTool,
    private readonly conversationMemory: ConversationMemory,
    private readonly responseFormatter: ResponseFormatter,
    private readonly verificationService: VerificationService,
    private readonly errorMapperService: ErrorMapperService,
    private readonly langfuseService: LangfuseService,
    private readonly redactionService?: RedactionService
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
    const startTime = Date.now();

    const trace = await this.langfuseService.createTrace({
      userId,
      sessionId: resolvedSessionId,
      query
    });

    try {
      const history = this.conversationMemory.getHistory(resolvedSessionId);
      const userMessage: CoreMessage = { role: 'user', content: query };
      const messages: CoreMessage[] = [...history, userMessage];

      const toolsCalled = new Set<string>();
      const toolOutputs = new Map<string, ToolResponse<unknown>>();

      const tools = createToolRegistry(
        {
          performanceTool: this.performanceTool,
          holdingsTool: this.holdingsTool,
          rulesReportTool: this.rulesReportTool,
          marketDataTool: this.marketDataTool,
          transactionHistoryTool: this.transactionHistoryTool,
          rebalanceSimulatorTool: this.rebalanceSimulatorTool
        },
        userId,
        toolOutputs,
        toolsCalled,
        this.redactionService
      );

      const result = await this.callLlm({
        messages,
        system: SYSTEM_PROMPT,
        tools
      });

      const formatted = this.responseFormatter.format(result.text);
      const structuredOutput = this.toStructuredAgentResponse(result.text);

      const verificationResult = await this.verificationService.verify(
        structuredOutput,
        toolOutputs
      );

      const promptTokens = result.usage?.promptTokens ?? 0;
      const completionTokens = result.usage?.completionTokens ?? 0;

      if (!verificationResult.passed) {
        this.logger.warn(
          `Verification failed: ${verificationResult.reason}`
        );

        trace.recordMetadata({
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
          estimatedCostUsd: estimateCostUsd(promptTokens, completionTokens),
          verificationPassed: false,
          verificationReason: verificationResult.reason,
          toolsCalled: [...toolsCalled.values()],
          durationMs: Date.now() - startTime
        });
        trace.end();

        return {
          flags: ['verification_failed'],
          response: VERIFICATION_FAILURE_MESSAGE,
          sessionId: resolvedSessionId,
          sources: [],
          toolsCalled: [...toolsCalled.values()]
        };
      }

      const assistantMessage: CoreMessage = {
        role: 'assistant',
        content: result.text
      };

      this.conversationMemory.addMessages(resolvedSessionId, [
        userMessage,
        assistantMessage
      ]);

      trace.recordMetadata({
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        estimatedCostUsd: estimateCostUsd(promptTokens, completionTokens),
        verificationPassed: true,
        toolsCalled: [...toolsCalled.values()],
        durationMs: Date.now() - startTime
      });
      trace.end();

      return {
        flags: formatted.flags,
        response: formatted.narrative,
        sessionId: resolvedSessionId,
        sources: formatted.sources,
        toolsCalled: [...toolsCalled.values()]
      };
    } catch (error) {
      this.logger.error(`Agent processing failed: ${error}`);

      trace.recordMetadata({
        errorCategory: categorizeError(error),
        errorMessage:
          error instanceof Error ? error.message : 'Unknown error',
        durationMs: Date.now() - startTime
      });
      trace.end();

      return {
        flags: ['error'],
        response: this.errorMapperService.toUserMessageFromError(error),
        sessionId: resolvedSessionId,
        sources: [],
        toolsCalled: []
      };
    }
  }

  private toStructuredAgentResponse(text: string): StructuredAgentResponse {
    const parsed = this.responseFormatter.tryParseJson(text);

    if (parsed) {
      return parsed as StructuredAgentResponse;
    }

    return { claims: [], narrative: text };
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
    const configuredApiKey = await this.propertyService.getByKey<string>(
      PROPERTY_API_KEY_OPENROUTER
    );
    const openRouterApiKey = configuredApiKey ?? process.env['OPENROUTER_API_KEY'];

    if (!openRouterApiKey) {
      throw new Error(
        'OpenRouter API key not configured. Set API_KEY_OPENROUTER in admin settings.'
      );
    }

    const configuredModel = await this.propertyService.getByKey<string>(
      PROPERTY_OPENROUTER_MODEL
    );
    const openRouterModel =
      configuredModel ?? process.env['OPENROUTER_MODEL'] ?? DEFAULT_MODEL;

    const provider = createOpenRouter({ apiKey: openRouterApiKey });

    return provider.chat(openRouterModel);
  }
}
