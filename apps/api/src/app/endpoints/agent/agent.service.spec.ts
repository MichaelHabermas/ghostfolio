import { PropertyService } from '@ghostfolio/api/services/property/property.service';

jest.mock('ai', () => ({
  generateText: jest.fn(),
  tool: jest.fn((config) => config)
}));

jest.mock('@openrouter/ai-sdk-provider', () => ({
  createOpenRouter: jest.fn(() => ({
    chat: jest.fn(() => 'mock-model')
  }))
}));

import { generateText } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

import { AgentService, DEFAULT_MODEL } from './agent.service';
import type { GetHoldingsTool } from './tools/get-holdings.tool';
import type { GetRulesReportTool } from './tools/get-rules-report.tool';
import type { MarketDataTool } from './tools/market-data.tool';
import type { PortfolioPerformanceTool } from './tools/portfolio-performance.tool';
import type { RebalanceSimulatorTool } from './tools/rebalance-simulator.tool';
import type { TransactionHistoryTool } from './tools/transaction-history.tool';
import { ConversationMemory } from './memory/conversation-memory';
import { ResponseFormatter } from './formatters/response-formatter';
import { ErrorMapperService } from './errors/error-mapper.service';
import { LangfuseService } from './observability/langfuse.service';
import { VerificationService } from './verification/verification.service';

const mockGenerateText = generateText as jest.MockedFunction<
  typeof generateText
>;
const mockCreateOpenRouter = createOpenRouter as jest.MockedFunction<
  typeof createOpenRouter
>;

const makeDefaultGenerateTextResult = (text = 'Your portfolio is well-diversified.') =>
  ({
    text,
    steps: [],
    usage: { promptTokens: 20, completionTokens: 10 }
  } as any);

const makePassingVerificationService = () => {
  const svc = new VerificationService([]);
  jest.spyOn(svc, 'verify').mockResolvedValue({ passed: true });
  return svc;
};

const makeFailingVerificationService = (reason = 'Hallucination detected') => {
  const svc = new VerificationService([]);
  jest.spyOn(svc, 'verify').mockResolvedValue({
    passed: false,
    failedChecker: 'rules_validation',
    reason
  });
  return svc;
};

const makeDisabledLangfuseService = () => {
  const svc = new LangfuseService();
  svc.onModuleInit(); // no env keys = disabled
  return svc;
};

describe('AgentService', () => {
  let agentService: AgentService;
  let propertyService: jest.Mocked<Pick<PropertyService, 'getByKey'>>;
  let performanceTool: jest.Mocked<Pick<PortfolioPerformanceTool, 'execute'>>;
  let holdingsTool: jest.Mocked<Pick<GetHoldingsTool, 'execute'>>;
  let rulesReportTool: jest.Mocked<Pick<GetRulesReportTool, 'execute'>>;
  let marketDataTool: jest.Mocked<Pick<MarketDataTool, 'execute'>>;
  let transactionHistoryTool: jest.Mocked<Pick<TransactionHistoryTool, 'execute'>>;
  let rebalanceSimulatorTool: jest.Mocked<Pick<RebalanceSimulatorTool, 'execute'>>;
  let conversationMemory: ConversationMemory;
  let responseFormatter: ResponseFormatter;
  let verificationService: VerificationService;
  let errorMapperService: ErrorMapperService;
  let redactionService: { redactToolResponse: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();

    propertyService = {
      getByKey: jest.fn().mockImplementation((key: string) => {
        if (key === 'API_KEY_OPENROUTER')
          return Promise.resolve('test-api-key');
        if (key === 'OPENROUTER_MODEL')
          return Promise.resolve(DEFAULT_MODEL);
        return Promise.resolve(undefined);
      })
    };

    performanceTool = { execute: jest.fn().mockResolvedValue({ success: true, data: {} }) };
    holdingsTool = { execute: jest.fn().mockResolvedValue({ success: true, data: {} }) };
    rulesReportTool = { execute: jest.fn().mockResolvedValue({ success: true, data: {} }) };
    marketDataTool = { execute: jest.fn().mockResolvedValue({ success: true, data: {} }) };
    transactionHistoryTool = { execute: jest.fn().mockResolvedValue({ success: true, data: {} }) };
    rebalanceSimulatorTool = { execute: jest.fn().mockResolvedValue({ success: true, data: {} }) };
    conversationMemory = new ConversationMemory();
    responseFormatter = new ResponseFormatter();
    verificationService = makePassingVerificationService();
    errorMapperService = new ErrorMapperService();
    redactionService = {
      redactToolResponse: jest.fn((_: string, response: unknown) => response)
    };

    agentService = new AgentService(
      propertyService as any,
      performanceTool as any,
      holdingsTool as any,
      rulesReportTool as any,
      marketDataTool as any,
      transactionHistoryTool as any,
      rebalanceSimulatorTool as any,
      conversationMemory,
      responseFormatter,
      verificationService,
      errorMapperService,
      makeDisabledLangfuseService(),
      redactionService as any
    );
  });

  describe('processQuery', () => {
    it('should call the LLM and return the response text', async () => {
      mockGenerateText.mockResolvedValue(makeDefaultGenerateTextResult());

      const result = await agentService.processQuery({
        query: 'How is my portfolio?',
        userId: 'user-123'
      });

      expect(result.response).toBeTruthy();
      expect(result.sources).toBeDefined();
      expect(result.flags).toBeDefined();
      expect(result.sessionId).toBeDefined();
      expect(result.toolsCalled).toEqual([]);
    });

    it('should include toolsCalled when a tool execute function is invoked', async () => {
      mockGenerateText.mockImplementation(async (args: any) => {
        await args.tools.get_holdings.execute({});
        return makeDefaultGenerateTextResult('Holdings summary');
      });

      const result = await agentService.processQuery({
        query: 'Show me my holdings',
        userId: 'user-123'
      });

      expect(result.toolsCalled).toContain('get_holdings');
    });

    it('should use provided sessionId when given', async () => {
      mockGenerateText.mockResolvedValue(makeDefaultGenerateTextResult());

      const result = await agentService.processQuery({
        query: 'Test query',
        sessionId: 'my-session-id',
        userId: 'user-123'
      });

      expect(result.sessionId).toBe('my-session-id');
    });

    it('should generate a sessionId when not provided', async () => {
      mockGenerateText.mockResolvedValue(makeDefaultGenerateTextResult());

      const result = await agentService.processQuery({
        query: 'Test query',
        userId: 'user-123'
      });

      expect(result.sessionId).toBeTruthy();
      expect(result.sessionId.length).toBeGreaterThan(0);
    });

    it('should return error response when LLM call fails', async () => {
      mockGenerateText.mockRejectedValue(new Error('API timeout'));

      const result = await agentService.processQuery({
        query: 'Test query',
        userId: 'user-123'
      });

      expect(result.response).toBeTruthy();
      expect(result.flags).toContain('error');
    });

    it('should pass the system prompt to generateText', async () => {
      mockGenerateText.mockResolvedValue(makeDefaultGenerateTextResult());

      await agentService.processQuery({
        query: 'What are my holdings?',
        userId: 'user-123'
      });

      expect(mockGenerateText).toHaveBeenCalledTimes(1);
      const callArgs = mockGenerateText.mock.calls[0][0];
      expect(callArgs.system).toBeDefined();
      expect(typeof callArgs.system).toBe('string');
      expect((callArgs.system as string).length).toBeGreaterThan(0);
    });

    it('should pass tool registry to generateText', async () => {
      mockGenerateText.mockResolvedValue(makeDefaultGenerateTextResult());

      await agentService.processQuery({
        query: 'What are my holdings?',
        userId: 'user-123'
      });

      const callArgs = mockGenerateText.mock.calls[0][0];
      expect(callArgs.tools).toBeDefined();
      expect(callArgs.tools).toHaveProperty('portfolio_performance');
      expect(callArgs.tools).toHaveProperty('get_holdings');
      expect(callArgs.tools).toHaveProperty('get_rules_report');
      expect(callArgs.tools).toHaveProperty('market_data');
      expect(callArgs.tools).toHaveProperty('transaction_history');
      expect(callArgs.tools).toHaveProperty('rebalance_simulator');
    });

    it('should pass maxSteps to generateText', async () => {
      mockGenerateText.mockResolvedValue(makeDefaultGenerateTextResult());

      await agentService.processQuery({
        query: 'What are my holdings?',
        userId: 'user-123'
      });

      const callArgs = mockGenerateText.mock.calls[0][0];
      expect(callArgs.maxSteps).toBeGreaterThan(0);
    });

    it('should include user query in messages', async () => {
      mockGenerateText.mockResolvedValue(makeDefaultGenerateTextResult());

      await agentService.processQuery({
        query: 'What are my holdings?',
        userId: 'user-123'
      });

      const callArgs = mockGenerateText.mock.calls[0][0];
      const messages = callArgs.messages as any[];
      const userMessage = messages.find((m) => m.role === 'user');
      expect(userMessage).toBeDefined();
      expect(userMessage.content).toContain('What are my holdings?');
    });

    it('should call VerificationService.verify after LLM responds', async () => {
      mockGenerateText.mockResolvedValue(makeDefaultGenerateTextResult());

      await agentService.processQuery({
        query: 'How is my portfolio?',
        userId: 'user-123'
      });

      expect(verificationService.verify).toHaveBeenCalledTimes(1);
    });

    it('should block response and return error message when verification fails', async () => {
      verificationService = makeFailingVerificationService('Agent fabricated a rule violation');
      agentService = new AgentService(
        propertyService as any,
        performanceTool as any,
        holdingsTool as any,
        rulesReportTool as any,
        marketDataTool as any,
        transactionHistoryTool as any,
        rebalanceSimulatorTool as any,
        conversationMemory,
        responseFormatter,
        verificationService,
        errorMapperService,
        makeDisabledLangfuseService()
      );

      mockGenerateText.mockResolvedValue(makeDefaultGenerateTextResult());

      const result = await agentService.processQuery({
        query: 'Are there any violations?',
        userId: 'user-123'
      });

      expect(result.flags).toContain('verification_failed');
      expect(result.response).toContain('inconsistency');
    });

    it('should return normal response when verification passes', async () => {
      mockGenerateText.mockResolvedValue(makeDefaultGenerateTextResult('Your portfolio is well-diversified.'));

      const result = await agentService.processQuery({
        query: 'How is my portfolio?',
        userId: 'user-123'
      });

      expect(result.flags).not.toContain('verification_failed');
      expect(result.response).toBeTruthy();
    });

    it('should keep raw tool output for verification while redacting LLM tool result', async () => {
      holdingsTool.execute.mockResolvedValueOnce({
        success: true,
        data: {
          holdings: [{ accountName: 'Retirement', valueInBaseCurrency: 1234 }]
        }
      } as any);
      redactionService.redactToolResponse.mockReturnValueOnce({
        success: true,
        data: {
          holdings: [{ accountName: 'Account A', valueInBaseCurrency: 1200 }]
        }
      });
      mockGenerateText.mockImplementation(async (args: any) => {
        await args.tools.get_holdings.execute({});
        return makeDefaultGenerateTextResult('Holdings summary');
      });

      await agentService.processQuery({
        query: 'Show my holdings',
        userId: 'user-123'
      });

      expect(redactionService.redactToolResponse).toHaveBeenCalledWith(
        'get_holdings',
        expect.objectContaining({ success: true })
      );

      const verifyCallArgs = (verificationService.verify as jest.Mock).mock
        .calls[0];
      const toolOutputs = verifyCallArgs[1] as Map<string, any>;
      expect(toolOutputs.get('get_holdings').data.holdings[0].accountName).toBe(
        'Retirement'
      );
    });
  });

  describe('callLlm', () => {
    it('should call generateText with model, messages, tools, and maxSteps', async () => {
      mockGenerateText.mockResolvedValue(makeDefaultGenerateTextResult('result'));

      await agentService.callLlm({
        messages: [{ role: 'user', content: 'hello' }]
      });

      expect(mockGenerateText).toHaveBeenCalledTimes(1);
      const callArgs = mockGenerateText.mock.calls[0][0];
      expect(callArgs.model).toBe('mock-model');
      expect(callArgs.messages).toEqual([{ role: 'user', content: 'hello' }]);
      expect(callArgs.maxSteps).toBe(5);
    });

    it('should use default maxSteps of 5', async () => {
      mockGenerateText.mockResolvedValue(makeDefaultGenerateTextResult('result'));

      await agentService.callLlm({
        messages: [{ role: 'user', content: 'test' }]
      });

      const callArgs = mockGenerateText.mock.calls[0][0];
      expect(callArgs.maxSteps).toBe(5);
    });

    it('should allow overriding maxSteps', async () => {
      mockGenerateText.mockResolvedValue(makeDefaultGenerateTextResult('result'));

      await agentService.callLlm({
        messages: [{ role: 'user', content: 'test' }],
        maxSteps: 10
      });

      const callArgs = mockGenerateText.mock.calls[0][0];
      expect(callArgs.maxSteps).toBe(10);
    });

    it('should pass custom tools to generateText', async () => {
      const mockTools = { my_tool: { description: 'A tool' } };

      mockGenerateText.mockResolvedValue(makeDefaultGenerateTextResult('result'));

      await agentService.callLlm({
        messages: [{ role: 'user', content: 'test' }],
        tools: mockTools
      });

      const callArgs = mockGenerateText.mock.calls[0][0];
      expect(callArgs.tools).toEqual(mockTools);
    });
  });

  describe('createLlmProvider (via callLlm)', () => {
    it('should create OpenRouter provider with API key from PropertyService', async () => {
      mockGenerateText.mockResolvedValue(makeDefaultGenerateTextResult('result'));

      await agentService.callLlm({
        messages: [{ role: 'user', content: 'test' }]
      });

      expect(mockCreateOpenRouter).toHaveBeenCalledWith({
        apiKey: 'test-api-key'
      });
    });

    it('should use model from PropertyService', async () => {
      mockGenerateText.mockResolvedValue(makeDefaultGenerateTextResult('result'));

      await agentService.callLlm({
        messages: [{ role: 'user', content: 'test' }]
      });

      const chatFn = (mockCreateOpenRouter as any).mock.results[0].value.chat;
      expect(chatFn).toHaveBeenCalledWith(DEFAULT_MODEL);
    });

    it('should fall back to default model when PropertyService returns null', async () => {
      propertyService.getByKey.mockImplementation((key: string) => {
        if (key === 'API_KEY_OPENROUTER')
          return Promise.resolve('test-api-key');
        return Promise.resolve(undefined);
      });

      mockGenerateText.mockResolvedValue(makeDefaultGenerateTextResult('result'));

      await agentService.callLlm({
        messages: [{ role: 'user', content: 'test' }]
      });

      const chatFn = (mockCreateOpenRouter as any).mock.results[0].value.chat;
      expect(chatFn).toHaveBeenCalledWith(DEFAULT_MODEL);
    });

    it('should throw when API key is not configured', async () => {
      propertyService.getByKey.mockResolvedValue(undefined);
      delete process.env['OPENROUTER_API_KEY'];

      await expect(
        agentService.callLlm({
          messages: [{ role: 'user', content: 'test' }]
        })
      ).rejects.toThrow('OpenRouter API key not configured');
    });

    it('should fall back to OPENROUTER_API_KEY environment variable when property is missing', async () => {
      process.env['OPENROUTER_API_KEY'] = 'env-api-key';
      process.env['OPENROUTER_MODEL'] = DEFAULT_MODEL;
      propertyService.getByKey.mockResolvedValue(undefined);
      mockGenerateText.mockResolvedValue(makeDefaultGenerateTextResult('result'));

      await agentService.callLlm({
        messages: [{ role: 'user', content: 'test' }]
      });

      expect(mockCreateOpenRouter).toHaveBeenCalledWith({
        apiKey: 'env-api-key'
      });

      delete process.env['OPENROUTER_API_KEY'];
      delete process.env['OPENROUTER_MODEL'];
    });
  });
});
