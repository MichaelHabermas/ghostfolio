import { PropertyService } from '@ghostfolio/api/services/property/property.service';

jest.mock('ai', () => ({
  generateText: jest.fn()
}));

jest.mock('@openrouter/ai-sdk-provider', () => ({
  createOpenRouter: jest.fn(() => ({
    chat: jest.fn(() => 'mock-model')
  }))
}));

import { generateText } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

import { AgentService } from './agent.service';

const mockGenerateText = generateText as jest.MockedFunction<
  typeof generateText
>;
const mockCreateOpenRouter = createOpenRouter as jest.MockedFunction<
  typeof createOpenRouter
>;

describe('AgentService', () => {
  let agentService: AgentService;
  let propertyService: jest.Mocked<Pick<PropertyService, 'getByKey'>>;

  beforeEach(() => {
    jest.clearAllMocks();

    propertyService = {
      getByKey: jest.fn().mockImplementation((key: string) => {
        if (key === 'API_KEY_OPENROUTER')
          return Promise.resolve('test-api-key');
        if (key === 'OPENROUTER_MODEL')
          return Promise.resolve('anthropic/claude-3.5-sonnet');
        return Promise.resolve(undefined);
      })
    };

    agentService = new AgentService(
      null as any,
      null as any,
      null as any,
      propertyService as any
    );
  });

  describe('processQuery', () => {
    it('should call the LLM and return the response text', async () => {
      mockGenerateText.mockResolvedValue({
        text: 'Your portfolio is well-diversified.',
        steps: [],
        usage: { promptTokens: 20, completionTokens: 10 }
      } as any);

      const result = await agentService.processQuery({
        query: 'How is my portfolio?',
        userId: 'user-123'
      });

      expect(result.response).toBe('Your portfolio is well-diversified.');
      expect(result.sources).toEqual([]);
      expect(result.flags).toEqual([]);
      expect(result.sessionId).toBeDefined();
    });

    it('should use provided sessionId when given', async () => {
      mockGenerateText.mockResolvedValue({
        text: 'Response',
        steps: [],
        usage: { promptTokens: 5, completionTokens: 3 }
      } as any);

      const result = await agentService.processQuery({
        query: 'Test query',
        sessionId: 'my-session-id',
        userId: 'user-123'
      });

      expect(result.sessionId).toBe('my-session-id');
    });

    it('should generate a sessionId when not provided', async () => {
      mockGenerateText.mockResolvedValue({
        text: 'Response',
        steps: [],
        usage: { promptTokens: 5, completionTokens: 3 }
      } as any);

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

      expect(result.response).toContain('unable to process');
      expect(result.flags).toContain('error');
    });

    it('should pass the user query as a message to generateText', async () => {
      mockGenerateText.mockResolvedValue({
        text: 'OK',
        steps: [],
        usage: { promptTokens: 5, completionTokens: 3 }
      } as any);

      await agentService.processQuery({
        query: 'What are my holdings?',
        userId: 'user-123'
      });

      expect(mockGenerateText).toHaveBeenCalledTimes(1);
      const callArgs = mockGenerateText.mock.calls[0][0];
      expect(callArgs.messages).toEqual([
        { role: 'user', content: 'What are my holdings?' }
      ]);
    });
  });

  describe('callLlm', () => {
    it('should call generateText with model, messages, tools, and maxSteps', async () => {
      mockGenerateText.mockResolvedValue({
        text: 'result',
        steps: [],
        usage: { promptTokens: 5, completionTokens: 3 }
      } as any);

      await agentService.callLlm({
        messages: [{ role: 'user', content: 'hello' }]
      });

      expect(mockGenerateText).toHaveBeenCalledTimes(1);
      const callArgs = mockGenerateText.mock.calls[0][0];
      expect(callArgs.model).toBe('mock-model');
      expect(callArgs.messages).toEqual([
        { role: 'user', content: 'hello' }
      ]);
      expect(callArgs.maxSteps).toBe(5);
    });

    it('should use default maxSteps of 5', async () => {
      mockGenerateText.mockResolvedValue({
        text: 'result',
        steps: [],
        usage: { promptTokens: 5, completionTokens: 3 }
      } as any);

      await agentService.callLlm({
        messages: [{ role: 'user', content: 'test' }]
      });

      const callArgs = mockGenerateText.mock.calls[0][0];
      expect(callArgs.maxSteps).toBe(5);
    });

    it('should allow overriding maxSteps', async () => {
      mockGenerateText.mockResolvedValue({
        text: 'result',
        steps: [],
        usage: { promptTokens: 5, completionTokens: 3 }
      } as any);

      await agentService.callLlm({
        messages: [{ role: 'user', content: 'test' }],
        maxSteps: 10
      });

      const callArgs = mockGenerateText.mock.calls[0][0];
      expect(callArgs.maxSteps).toBe(10);
    });

    it('should pass custom tools to generateText', async () => {
      const mockTools = { my_tool: { description: 'A tool' } };

      mockGenerateText.mockResolvedValue({
        text: 'result',
        steps: [],
        usage: { promptTokens: 5, completionTokens: 3 }
      } as any);

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
      mockGenerateText.mockResolvedValue({
        text: 'result',
        steps: [],
        usage: { promptTokens: 5, completionTokens: 3 }
      } as any);

      await agentService.callLlm({
        messages: [{ role: 'user', content: 'test' }]
      });

      expect(mockCreateOpenRouter).toHaveBeenCalledWith({
        apiKey: 'test-api-key'
      });
    });

    it('should use model from PropertyService', async () => {
      mockGenerateText.mockResolvedValue({
        text: 'result',
        steps: [],
        usage: { promptTokens: 5, completionTokens: 3 }
      } as any);

      await agentService.callLlm({
        messages: [{ role: 'user', content: 'test' }]
      });

      const chatFn = (mockCreateOpenRouter as any).mock.results[0].value.chat;
      expect(chatFn).toHaveBeenCalledWith('anthropic/claude-3.5-sonnet');
    });

    it('should fall back to default model when PropertyService returns null', async () => {
      propertyService.getByKey.mockImplementation((key: string) => {
        if (key === 'API_KEY_OPENROUTER')
          return Promise.resolve('test-api-key');
        return Promise.resolve(undefined);
      });

      mockGenerateText.mockResolvedValue({
        text: 'result',
        steps: [],
        usage: { promptTokens: 5, completionTokens: 3 }
      } as any);

      await agentService.callLlm({
        messages: [{ role: 'user', content: 'test' }]
      });

      const chatFn = (mockCreateOpenRouter as any).mock.results[0].value.chat;
      expect(chatFn).toHaveBeenCalledWith('anthropic/claude-3.5-sonnet');
    });

    it('should throw when API key is not configured', async () => {
      propertyService.getByKey.mockResolvedValue(undefined);

      await expect(
        agentService.callLlm({
          messages: [{ role: 'user', content: 'test' }]
        })
      ).rejects.toThrow('OpenRouter API key not configured');
    });
  });
});
