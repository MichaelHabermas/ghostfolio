/**
 * Integration tests for the full agent loop:
 * processQuery() -> system prompt -> tool registry -> generateText() -> formatter -> response
 *
 * Uses Jest mocks for the LLM and AI SDK so tests are fast and deterministic.
 */

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

import { AgentService } from './agent.service';
import { ResponseFormatter } from './formatters/response-formatter';
import { ConversationMemory } from './memory/conversation-memory';

const mockGenerateText = generateText as jest.MockedFunction<typeof generateText>;

const makePropertyService = () => ({
  getByKey: jest.fn().mockImplementation((key: string) => {
    if (key === 'API_KEY_OPENROUTER') return Promise.resolve('test-api-key');
    if (key === 'OPENROUTER_MODEL') return Promise.resolve('anthropic/claude-3.5-sonnet');
    return Promise.resolve(undefined);
  })
});

const makeToolMock = () => ({ execute: jest.fn().mockResolvedValue({ success: true, data: {} }) });

const buildService = () => {
  const propertyService = makePropertyService();
  const performanceTool = makeToolMock();
  const holdingsTool = makeToolMock();
  const rulesReportTool = makeToolMock();
  const memory = new ConversationMemory();
  const formatter = new ResponseFormatter();

  const service = new AgentService(
    propertyService as any,
    performanceTool as any,
    holdingsTool as any,
    rulesReportTool as any,
    memory,
    formatter
  );

  return { service, memory, performanceTool, holdingsTool, rulesReportTool };
};

describe('Agent loop integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('query -> tool call -> synthesized response', () => {
    it('should call the LLM with system prompt and return a synthesized response', async () => {
      mockGenerateText.mockResolvedValue({
        text: JSON.stringify({
          claims: [{ statement: 'Value is $100,000', source_tool: 'portfolio_performance', source_field: 'currentValueInBaseCurrency', value: 100000 }],
          narrative: 'Your portfolio is worth $100,000.'
        }),
        steps: [],
        usage: { promptTokens: 50, completionTokens: 30 }
      } as any);

      const { service } = buildService();
      const result = await service.processQuery({
        query: 'What is my portfolio worth?',
        userId: 'user-123'
      });

      expect(result.response).toBe('Your portfolio is worth $100,000.');
      expect(result.sources).toHaveLength(1);
      expect(result.sources[0]).toEqual({
        tool: 'portfolio_performance',
        field: 'currentValueInBaseCurrency'
      });
      expect(result.sessionId).toBeTruthy();

      const callArgs = mockGenerateText.mock.calls[0][0];
      expect(callArgs.system).toBeDefined();
      expect(callArgs.tools).toHaveProperty('portfolio_performance');
      expect(callArgs.tools).toHaveProperty('get_holdings');
      expect(callArgs.tools).toHaveProperty('get_rules_report');
    });

    it('should handle plain text LLM response with fallback formatting', async () => {
      mockGenerateText.mockResolvedValue({
        text: 'Your portfolio has 5 holdings spread across equities and bonds.',
        steps: [],
        usage: { promptTokens: 30, completionTokens: 20 }
      } as any);

      const { service } = buildService();
      const result = await service.processQuery({
        query: 'Tell me about my holdings',
        userId: 'user-456'
      });

      expect(result.response).toBe('Your portfolio has 5 holdings spread across equities and bonds.');
      expect(result.sources).toEqual([]);
      expect(result.flags).toContain('plain_text_response');
    });

    it('should return error response when LLM throws', async () => {
      mockGenerateText.mockRejectedValue(new Error('LLM timeout'));

      const { service } = buildService();
      const result = await service.processQuery({
        query: 'What are my holdings?',
        userId: 'user-789'
      });

      expect(result.flags).toContain('error');
      expect(result.response).toBeTruthy();
    });
  });

  describe('conversation history across turns', () => {
    it('should persist conversation history across multiple turns within the same session', async () => {
      mockGenerateText.mockResolvedValue({
        text: JSON.stringify({ claims: [], narrative: 'Response.' }),
        steps: [],
        usage: { promptTokens: 20, completionTokens: 10 }
      } as any);

      const { service, memory } = buildService();
      const sessionId = 'session-abc';

      await service.processQuery({ query: 'First question', userId: 'user-1', sessionId });
      await service.processQuery({ query: 'Follow-up question', userId: 'user-1', sessionId });

      const history = memory.getHistory(sessionId);
      expect(history.length).toBeGreaterThanOrEqual(2);

      const userMessages = history.filter((m) => m.role === 'user');
      expect(userMessages.length).toBeGreaterThanOrEqual(2);
    });

    it('should include conversation history in subsequent LLM calls', async () => {
      mockGenerateText.mockResolvedValue({
        text: JSON.stringify({ claims: [], narrative: 'Response.' }),
        steps: [],
        usage: { promptTokens: 20, completionTokens: 10 }
      } as any);

      const { service } = buildService();
      const sessionId = 'session-xyz';

      await service.processQuery({ query: 'First question', userId: 'user-1', sessionId });
      await service.processQuery({ query: 'Second question', userId: 'user-1', sessionId });

      const secondCallArgs = mockGenerateText.mock.calls[1][0];
      const messages = secondCallArgs.messages as any[];

      const userMessages = messages.filter((m) => m.role === 'user');
      expect(userMessages.length).toBeGreaterThanOrEqual(2);
      expect(userMessages.some((m) => m.content === 'First question')).toBe(true);
      expect(userMessages.some((m) => m.content === 'Second question')).toBe(true);
    });

    it('should use separate history for different sessions', async () => {
      mockGenerateText.mockResolvedValue({
        text: JSON.stringify({ claims: [], narrative: 'Response.' }),
        steps: [],
        usage: { promptTokens: 20, completionTokens: 10 }
      } as any);

      const { service, memory } = buildService();

      await service.processQuery({ query: 'Session A message', userId: 'user-1', sessionId: 'session-A' });
      await service.processQuery({ query: 'Session B message', userId: 'user-2', sessionId: 'session-B' });

      const historyA = memory.getHistory('session-A');
      const historyB = memory.getHistory('session-B');

      expect(historyA.some((m) => m.content === 'Session A message')).toBe(true);
      expect(historyB.some((m) => m.content === 'Session B message')).toBe(true);
      expect(historyA.some((m) => m.content === 'Session B message')).toBe(false);
    });
  });

  describe('high-impact recommendation flagging', () => {
    it('should flag high_impact_recommendation in response flags', async () => {
      mockGenerateText.mockResolvedValue({
        text: JSON.stringify({
          claims: [],
          narrative: 'Consider major rebalancing.',
          recommendations: [
            {
              action: 'Sell 30% of equity holdings',
              rationale: 'Overweight',
              impact_percentage: 30,
              requires_review: true
            }
          ]
        }),
        steps: [],
        usage: { promptTokens: 40, completionTokens: 25 }
      } as any);

      const { service } = buildService();
      const result = await service.processQuery({
        query: 'How should I rebalance?',
        userId: 'user-111'
      });

      expect(result.flags).toContain('high_impact_recommendation');
    });
  });
});
