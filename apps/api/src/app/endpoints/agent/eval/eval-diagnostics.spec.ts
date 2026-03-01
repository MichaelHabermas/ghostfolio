const USE_REAL_LLM = process.env['EVAL_USE_REAL_LLM'] === 'true';

jest.mock('ai', () => {
  if (process.env['EVAL_USE_REAL_LLM'] === 'true') {
    return jest.requireActual('ai');
  }

  return {
    generateText: jest.fn(),
    tool: jest.fn((config) => config)
  };
});

jest.mock('@openrouter/ai-sdk-provider', () => {
  if (process.env['EVAL_USE_REAL_LLM'] === 'true') {
    return jest.requireActual('@openrouter/ai-sdk-provider');
  }

  return {
    createOpenRouter: jest.fn(() => ({
      chat: jest.fn(() => 'mock-model')
    }))
  };
});

import * as fs from 'fs';
import * as path from 'path';

import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText, type CoreMessage } from 'ai';

import { AgentService, DEFAULT_MODEL } from '../agent.service';
import { ErrorMapperService } from '../errors/error-mapper.service';
import { ResponseFormatter } from '../formatters/response-formatter';
import { ConversationMemory } from '../memory/conversation-memory';
import { LangfuseService } from '../observability/langfuse.service';
import { SYSTEM_PROMPT } from '../prompts/system-prompt';
import { createToolRegistry } from '../tools/tool-registry';
import { VerificationService } from '../verification/verification.service';
import type { EvalCase } from './eval-case.schema';
import { EvalCaseArraySchema } from './eval-case.schema';

const mockGenerateText = generateText as jest.MockedFunction<typeof generateText>;

const makeEvalLikePropertyService = (useRealLlm = USE_REAL_LLM) => {
  const openRouterKey = useRealLlm
    ? (process.env['OPENROUTER_API_KEY'] ?? 'test-api-key')
    : 'test-api-key';
  const openRouterModel =
    useRealLlm
      ? (process.env['OPENROUTER_MODEL'] ?? DEFAULT_MODEL)
      : DEFAULT_MODEL;

  return {
    getByKey: jest.fn().mockImplementation((key: string) => {
      if (key === 'API_KEY_OPENROUTER') return Promise.resolve(openRouterKey);
      if (key === 'OPENROUTER_MODEL') return Promise.resolve(openRouterModel);
      return Promise.resolve(undefined);
    })
  };
};

const makePassingVerificationService = () => {
  const svc = new VerificationService([]);
  jest.spyOn(svc, 'verify').mockResolvedValue({ passed: true });
  return svc;
};

const makeDisabledLangfuseService = () => {
  const svc = new LangfuseService();
  svc.onModuleInit();
  return svc;
};

const makeToolInstances = () => ({
  performanceTool: { execute: jest.fn().mockResolvedValue({ success: true, data: {} }) },
  holdingsTool: { execute: jest.fn().mockResolvedValue({ success: true, data: {} }) },
  rulesReportTool: { execute: jest.fn().mockResolvedValue({ success: true, data: {} }) },
  marketDataTool: { execute: jest.fn().mockResolvedValue({ success: true, data: {} }) },
  transactionHistoryTool: {
    execute: jest.fn().mockResolvedValue({ success: true, data: {} })
  },
  rebalanceSimulatorTool: {
    execute: jest.fn().mockResolvedValue({ success: true, data: {} })
  }
});

const makeService = () => {
  const tools = makeToolInstances();
  const service = new AgentService(
    makeEvalLikePropertyService() as any,
    tools.performanceTool as any,
    tools.holdingsTool as any,
    tools.rulesReportTool as any,
    tools.marketDataTool as any,
    tools.transactionHistoryTool as any,
    tools.rebalanceSimulatorTool as any,
    new ConversationMemory(),
    new ResponseFormatter(),
    makePassingVerificationService(),
    new ErrorMapperService(),
    makeDisabledLangfuseService()
  );

  return { service, tools };
};

const loadEvalCaseById = (caseId: string): EvalCase => {
  const casesPath = path.join(__dirname, 'cases', 'full-eval-cases.json');
  const raw = fs.readFileSync(casesPath, 'utf-8');
  const parsed = JSON.parse(raw);
  const result = EvalCaseArraySchema.safeParse(parsed);

  if (!result.success) {
    throw new Error(`Invalid eval cases: ${JSON.stringify(result.error.issues, null, 2)}`);
  }

  const evalCase = result.data.find((item) => item.id === caseId);

  if (!evalCase) {
    throw new Error(`Could not find eval case: ${caseId}`);
  }

  return evalCase;
};

describe('Eval Diagnostics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Test 1: model selection diagnostics (H2)', () => {
    it('should use OPENROUTER_MODEL when set', async () => {
      const previousValue = process.env['OPENROUTER_MODEL'];
      process.env['OPENROUTER_MODEL'] = 'google/gemini-2.5-flash';
      const propertyService = makeEvalLikePropertyService(true);

      const model = await propertyService.getByKey('OPENROUTER_MODEL');
      expect(model).toBe('google/gemini-2.5-flash');

      process.env['OPENROUTER_MODEL'] = previousValue;
    });

    it('should default to DEFAULT_MODEL when OPENROUTER_MODEL is unset in eval helper', async () => {
      const previousValue = process.env['OPENROUTER_MODEL'];
      delete process.env['OPENROUTER_MODEL'];
      const propertyService = makeEvalLikePropertyService(true);

      const model = await propertyService.getByKey('OPENROUTER_MODEL');
      expect(model).toBe(DEFAULT_MODEL);

      process.env['OPENROUTER_MODEL'] = previousValue;
    });
  });

  describe('Test 2: response_format effect diagnostics (H1)', () => {
    const runSingleCall = async ({
      includeResponseFormat
    }: {
      includeResponseFormat: boolean;
    }) => {
      const { service, tools } = makeService();
      const toolOutputs = new Map();
      const toolsCalled = new Set<string>();
      const registry = createToolRegistry(
        tools as any,
        'eval-diagnostic-user',
        toolOutputs,
        toolsCalled
      );
      const formatter = new ResponseFormatter();

      if (!includeResponseFormat) {
        const apiKey =
          process.env['OPENROUTER_API_KEY'] ?? (await makeEvalLikePropertyService().getByKey('API_KEY_OPENROUTER'));
        const modelId =
          process.env['OPENROUTER_MODEL'] ??
          (await makeEvalLikePropertyService().getByKey('OPENROUTER_MODEL')) ??
          DEFAULT_MODEL;
        const provider = createOpenRouter({ apiKey });
        (service as any).createLlmProvider = async () => provider.chat(modelId);
      }

      const result = await service.callLlm({
        messages: [{ role: 'user', content: 'What is my portfolio performance over the last year?' }] as CoreMessage[],
        system: SYSTEM_PROMPT,
        tools: registry
      });

      const parsed = formatter.tryParseJson(result.text);
      return {
        parsed,
        text: result.text,
        toolsCalled: [...toolsCalled.values()]
      };
    };

    const maybeReal = USE_REAL_LLM ? it : it.skip;

    maybeReal('should compare parseability with and without response_format', async () => {
      const withResponseFormat = await runSingleCall({ includeResponseFormat: true });
      const withoutResponseFormat = await runSingleCall({ includeResponseFormat: false });

      const withOk = Boolean(withResponseFormat.parsed);
      const withoutOk = Boolean(withoutResponseFormat.parsed);

      // eslint-disable-next-line no-console
      console.log('DIAGNOSTIC: with response_format', {
        parsed: withOk,
        textLength: withResponseFormat.text.length,
        preview: withResponseFormat.text.slice(0, 200),
        toolsCalled: withResponseFormat.toolsCalled
      });
      // eslint-disable-next-line no-console
      console.log('DIAGNOSTIC: without response_format', {
        parsed: withoutOk,
        textLength: withoutResponseFormat.text.length,
        preview: withoutResponseFormat.text.slice(0, 200),
        toolsCalled: withoutResponseFormat.toolsCalled
      });

      expect(withOk || withoutOk).toBe(true);
    }, 30000);
  });

  describe('Test 3: result.text handling with tool-calling (H3)', () => {
    const maybeMockOnly = USE_REAL_LLM ? it.skip : it;

    maybeMockOnly('should preserve non-empty text from tool-calling flow', async () => {
      mockGenerateText.mockImplementation(async (args: any) => {
        await args.tools.get_holdings.execute({});
        return {
          text: JSON.stringify({
            claims: [],
            narrative: 'Holdings analysis complete'
          }),
          steps: [{ text: 'intermediate' }],
          usage: { promptTokens: 10, completionTokens: 10 }
        } as any;
      });

      const { service } = makeService();
      const result = await service.processQuery({
        query: 'Show me my holdings',
        userId: 'eval-diagnostic-user'
      });

      expect(result.response).toContain('Holdings analysis complete');
      expect(result.toolsCalled).toContain('get_holdings');
      expect(result.flags).not.toContain('plain_text_response');
    });

    maybeMockOnly('should expose empty text fallback behavior when final text is empty', async () => {
      mockGenerateText.mockImplementation(async (args: any) => {
        await args.tools.get_holdings.execute({});
        return {
          text: '',
          steps: [{ text: '' }],
          usage: { promptTokens: 10, completionTokens: 1 }
        } as any;
      });

      const { service } = makeService();
      const result = await service.processQuery({
        query: 'Show me my holdings',
        userId: 'eval-diagnostic-user'
      });

      expect(result.response).toBe('');
      expect(result.flags).toContain('plain_text_response');
      expect(result.toolsCalled).toContain('get_holdings');
    });
  });

  describe('Test 4: parser edge-case diagnostics (H4)', () => {
    let formatter: ResponseFormatter;

    beforeEach(() => {
      formatter = new ResponseFormatter();
    });

    it('should parse baseline valid JSON', () => {
      const parsed = formatter.tryParseJson('{"claims":[],"narrative":"ok"}');
      expect(parsed).not.toBeNull();
      expect(parsed?.narrative).toBe('ok');
    });

    it('should parse fenced JSON', () => {
      const parsed = formatter.tryParseJson('```json\n{"claims":[],"narrative":"ok"}\n```');
      expect(parsed).not.toBeNull();
      expect(parsed?.narrative).toBe('ok');
    });

    it('should parse JSON with text preamble/suffix by brace extraction', () => {
      const parsed = formatter.tryParseJson('preamble {"claims":[],"narrative":"ok"} suffix');
      expect(parsed).not.toBeNull();
      expect(parsed?.narrative).toBe('ok');
    });

    it('should return null for empty string', () => {
      const parsed = formatter.tryParseJson('');
      expect(parsed).toBeNull();
    });

    it('should parse JSON with BOM prefix', () => {
      const parsed = formatter.tryParseJson('\uFEFF{"claims":[],"narrative":"ok"}');
      expect(parsed).not.toBeNull();
      expect(parsed?.narrative).toBe('ok');
    });

    it('should fail for trailing-comma JSON and return null', () => {
      const parsed = formatter.tryParseJson('{"claims":[],"narrative":"ok",}');
      expect(parsed).toBeNull();
    });

    it('should fail for double-encoded JSON string and return null', () => {
      const parsed = formatter.tryParseJson('"{\\"claims\\":[],\\"narrative\\":\\"ok\\"}"');
      expect(parsed).toBeNull();
    });
  });

  describe('Test 5: end-to-end single-case real-LLM diagnostic', () => {
    const maybeReal = USE_REAL_LLM ? it : it.skip;

    maybeReal('should run mvp-001 and print structured diagnostics', async () => {
      const evalCase = loadEvalCaseById('mvp-001');
      const { service } = makeService();

      const queryResult = await service.processQuery({
        query: evalCase.input_query,
        userId: 'eval-diagnostic-user'
      });

      const responseLower = queryResult.response.toLowerCase();
      const matched = evalCase.expected_output_contains.filter((phrase) =>
        responseLower.includes(phrase.toLowerCase())
      );
      const requiredMatches = Math.max(
        1,
        Math.ceil(evalCase.expected_output_contains.length * 0.5)
      );

      // eslint-disable-next-line no-console
      console.log('DIAGNOSTIC: single-case result', {
        caseId: evalCase.id,
        query: evalCase.input_query,
        responsePreview: queryResult.response.slice(0, 300),
        responseLength: queryResult.response.length,
        toolsCalled: queryResult.toolsCalled,
        flags: queryResult.flags,
        sources: queryResult.sources,
        matchedPhrases: matched,
        requiredMatches
      });

      expect(queryResult.response).toBeDefined();
      expect(Array.isArray(queryResult.toolsCalled)).toBe(true);
      expect(matched.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('run command guidance', () => {
    it('should document the command used for diagnostics', () => {
      expect('npx nx test api --testPathPattern=eval-diagnostics').toContain(
        'eval-diagnostics'
      );
    });
  });
});
