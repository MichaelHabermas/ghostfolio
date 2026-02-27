import { PropertyService } from '@ghostfolio/api/services/property/property.service';

import { FrameworkSpikeService } from './framework-spike.service';

jest.mock('ai', () => {
  const actual = jest.requireActual('ai');
  return {
    ...actual,
    generateText: jest.fn()
  };
});

jest.mock('@openrouter/ai-sdk-provider', () => ({
  createOpenRouter: jest.fn(() => ({
    chat: jest.fn(() => 'mock-model')
  }))
}));

import { generateText } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

const mockGenerateText = generateText as jest.MockedFunction<
  typeof generateText
>;
const mockCreateOpenRouter = createOpenRouter as jest.MockedFunction<
  typeof createOpenRouter
>;

describe('FrameworkSpikeService', () => {
  let service: FrameworkSpikeService;
  let propertyService: jest.Mocked<Pick<PropertyService, 'getByKey'>>;

  beforeEach(() => {
    jest.clearAllMocks();

    propertyService = {
      getByKey: jest.fn().mockImplementation((key: string) => {
        if (key === 'API_KEY_OPENROUTER') return Promise.resolve('test-key');
        if (key === 'OPENROUTER_MODEL')
          return Promise.resolve('anthropic/claude-3.5-sonnet');
        return Promise.resolve(undefined);
      })
    };

    service = new FrameworkSpikeService(propertyService as any);
  });

  describe('runSpike (unit, mocked)', () => {
    it('should create OpenRouter provider with the stored API key', async () => {
      mockGenerateText.mockResolvedValue({
        text: 'Hello, John!',
        steps: [],
        usage: { promptTokens: 10, completionTokens: 5 }
      } as any);

      await service.runSpike();

      expect(mockCreateOpenRouter).toHaveBeenCalledWith({
        apiKey: 'test-key'
      });
    });

    it('should call generateText with tools, maxSteps, and prompt', async () => {
      mockGenerateText.mockResolvedValue({
        text: 'Hello, John!',
        steps: [],
        usage: { promptTokens: 10, completionTokens: 5 }
      } as any);

      await service.runSpike();

      expect(mockGenerateText).toHaveBeenCalledTimes(1);
      const callArgs = mockGenerateText.mock.calls[0][0];
      expect(callArgs.prompt).toBe('Greet the user whose name is John.');
      expect(callArgs.maxSteps).toBe(3);
      expect(callArgs.tools).toBeDefined();
      expect(callArgs.tools).toHaveProperty('get_greeting');
    });

    it('should return structured result with tool calls and text', async () => {
      mockGenerateText.mockResolvedValue({
        text: 'Hello, John! Welcome to Ghostfolio.',
        steps: [
          {
            toolCalls: [
              { toolName: 'get_greeting', args: { name: 'John' } }
            ],
            toolResults: [
              {
                toolName: 'get_greeting',
                result: { greeting: 'Hello, John! Welcome to Ghostfolio.' }
              }
            ]
          },
          {
            toolCalls: [],
            toolResults: []
          }
        ],
        usage: { promptTokens: 100, completionTokens: 50 }
      } as any);

      const result = await service.runSpike();

      expect(result.text).toContain('John');
      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls[0].toolName).toBe('get_greeting');
      expect(result.toolCalls[0].args).toEqual({ name: 'John' });
      expect(result.toolResults).toHaveLength(1);
      expect(result.toolResults[0].result).toEqual({
        greeting: 'Hello, John! Welcome to Ghostfolio.'
      });
      expect(result.steps).toBe(2);
      expect(result.usage.promptTokens).toBe(100);
      expect(result.usage.completionTokens).toBe(50);
      expect(result.usage.totalTokens).toBe(150);
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('should handle missing model from PropertyService by using default', async () => {
      propertyService.getByKey.mockImplementation((key: string) => {
        if (key === 'API_KEY_OPENROUTER') return Promise.resolve('test-key');
        return Promise.resolve(undefined);
      });

      mockGenerateText.mockResolvedValue({
        text: 'Fallback',
        steps: [],
        usage: { promptTokens: 5, completionTokens: 3 }
      } as any);

      await service.runSpike();

      const chatFn = (mockCreateOpenRouter as any).mock.results[0].value.chat;
      expect(chatFn).toHaveBeenCalledWith('anthropic/claude-3.5-sonnet');
    });
  });

  describe('get_greeting tool execute function', () => {
    it('should produce correct greeting via the tool execute callback', async () => {
      let capturedToolExecute: ((args: any) => Promise<any>) | undefined;

      mockGenerateText.mockImplementation(async (opts: any) => {
        capturedToolExecute = opts.tools.get_greeting.execute;
        return {
          text: 'mocked',
          steps: [],
          usage: { promptTokens: 1, completionTokens: 1 }
        } as any;
      });

      await service.runSpike();

      expect(capturedToolExecute).toBeDefined();
      const toolResult = await capturedToolExecute!({ name: 'Alice' });
      expect(toolResult).toEqual({
        greeting: 'Hello, Alice! Welcome to Ghostfolio.'
      });
    });
  });
});

/**
 * Live integration test -- requires a real OpenRouter API key.
 * Skipped by default in CI. To run:
 *   OPENROUTER_API_KEY=<key> npx jest --testPathPattern=framework-spike --testNamePattern="live"
 */
describe('FrameworkSpikeService (live integration)', () => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const shouldRun = !!apiKey;

  const conditionalIt = shouldRun ? it : it.skip;

  conditionalIt(
    'should complete a full tool-calling round-trip with the live API',
    async () => {
      jest.restoreAllMocks();
      jest.resetModules();
      jest.unmock('ai');
      jest.unmock('@openrouter/ai-sdk-provider');

      const { FrameworkSpikeService: LiveService } = await import(
        './framework-spike.service'
      );

      const livePropertyService = {
        getByKey: jest.fn().mockImplementation((key: string) => {
          if (key === 'API_KEY_OPENROUTER') return Promise.resolve(apiKey);
          if (key === 'OPENROUTER_MODEL')
            return Promise.resolve('anthropic/claude-3.5-sonnet');
          return Promise.resolve(undefined);
        })
      };

      const liveService = new LiveService(livePropertyService as any);
      const result = await liveService.runSpike();

      expect(result.text).toBeTruthy();
      expect(result.toolCalls.length).toBeGreaterThanOrEqual(1);
      expect(result.toolCalls[0].toolName).toBe('get_greeting');
      expect(result.toolCalls[0].args).toHaveProperty('name');
      expect(result.toolResults.length).toBeGreaterThanOrEqual(1);
      expect(result.steps).toBeGreaterThanOrEqual(2);
      expect(result.latencyMs).toBeGreaterThan(0);
      expect(result.usage.totalTokens).toBeGreaterThan(0);

      console.log(
        `SPIKE LIVE RESULT: latency=${result.latencyMs}ms, ` +
          `steps=${result.steps}, tokens=${result.usage.totalTokens}, ` +
          `text="${result.text.slice(0, 100)}..."`
      );
    },
    30_000
  );
});
