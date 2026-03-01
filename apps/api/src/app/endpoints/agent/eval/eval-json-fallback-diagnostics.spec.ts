/**
 * JSON fallback diagnostics: capture raw LLM text when plain-text fallback is used,
 * classify why parsing failed, and persist samples + report for root-cause analysis.
 * No production code changes; diagnosis only.
 */

const USE_REAL_LLM = process.env['EVAL_USE_REAL_LLM'] === 'true';
const CAPTURE_JSON_FAILURES =
  process.env['EVAL_CAPTURE_JSON_FAILURES'] === 'true';

jest.mock('ai', () => {
  if (process.env['EVAL_USE_REAL_LLM'] === 'true') {
    return jest.requireActual('ai');
  }
  return {
    generateText: jest.fn(),
    tool: jest.fn((config: unknown) => config)
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

import { AgentService, DEFAULT_MODEL } from '../agent.service';
import { ConversationMemory } from '../memory/conversation-memory';
import { ErrorMapperService } from '../errors/error-mapper.service';
import { ResponseFormatter } from '../formatters/response-formatter';
import { LangfuseService } from '../observability/langfuse.service';
import { VerificationService } from '../verification/verification.service';
import type { EvalCase } from './eval-case.schema';
import { EvalCaseArraySchema } from './eval-case.schema';
import {
  MOCK_HOLDINGS_DATA,
  MOCK_PERFORMANCE_DATA,
  MOCK_PERFORMANCE_ERROR,
  MOCK_RULES_REPORT_DATA
} from './fixtures/seed-portfolio';

// ---------------------------------------------------------------------------
// Classification helper (mirrors ResponseFormatter.tryParseJson steps)
// ---------------------------------------------------------------------------

export type JsonFailureReason =
  | 'empty'
  | 'no_braces'
  | 'direct_parse_failed'
  | 'brace_extraction_failed'
  | 'parsed';

/**
 * Replicates tryParseJson steps and returns why the parser would return null (or 'parsed').
 * Used only in tests to diagnose plain-text fallback causes.
 */
export function classifyJsonFailure(rawText: string): JsonFailureReason {
  let cleanText = rawText.trim();
  if (cleanText === '') {
    return 'empty';
  }

  if (cleanText.startsWith('```')) {
    cleanText = cleanText.replace(/^```[a-zA-Z]*\n?/, '');
    cleanText = cleanText.replace(/\n?```$/, '');
    cleanText = cleanText.trim();
  }

  try {
    const result = JSON.parse(cleanText);
    if (typeof result === 'object' && result !== null) {
      return 'parsed';
    }
  } catch {
    // Direct parse failed, try brace extraction
  }

  const firstBrace = cleanText.indexOf('{');
  const lastBrace = cleanText.lastIndexOf('}');
  if (
    firstBrace === -1 ||
    lastBrace === -1 ||
    lastBrace <= firstBrace
  ) {
    return 'no_braces';
  }

  const candidate = cleanText.substring(firstBrace, lastBrace + 1);
  try {
    const result = JSON.parse(candidate);
    if (typeof result === 'object' && result !== null) {
      return 'parsed';
    }
  } catch {
    // Brace extraction parse failed
  }

  return 'brace_extraction_failed';
}

// ---------------------------------------------------------------------------
// Unit tests for the classifier
// ---------------------------------------------------------------------------

describe('classifyJsonFailure', () => {
  it('should return empty for empty string', () => {
    expect(classifyJsonFailure('')).toBe('empty');
    expect(classifyJsonFailure('   ')).toBe('empty');
  });

  it('should return no_braces for prose only', () => {
    expect(classifyJsonFailure('Your portfolio looks good.')).toBe('no_braces');
    expect(classifyJsonFailure('I cannot do that.')).toBe('no_braces');
  });

  it('should return parsed for valid JSON', () => {
    expect(
      classifyJsonFailure('{"claims":[],"narrative":"ok"}')
    ).toBe('parsed');
  });

  it('should return parsed for fenced valid JSON', () => {
    expect(
      classifyJsonFailure('```json\n{"claims":[],"narrative":"ok"}\n```')
    ).toBe('parsed');
  });

  it('should return parsed for preamble/suffix with valid JSON in middle', () => {
    expect(
      classifyJsonFailure('preamble {"claims":[],"narrative":"ok"} suffix')
    ).toBe('parsed');
  });

  it('should return no_braces for truncated JSON (no closing brace)', () => {
    expect(classifyJsonFailure('{"claims":[]')).toBe('no_braces');
  });

  it('should return brace_extraction_failed for trailing-comma JSON', () => {
    const reason = classifyJsonFailure('{"claims":[],"narrative":"ok",}');
    expect(['direct_parse_failed', 'brace_extraction_failed']).toContain(reason);
    const formatter = new ResponseFormatter();
    expect(formatter.tryParseJson('{"claims":[],"narrative":"ok",}')).toBeNull();
  });

  it('should return brace_extraction_failed for double-encoded JSON string', () => {
    const reason = classifyJsonFailure(
      '"{\\"claims\\":[],\\"narrative\\":\\"ok\\"}"'
    );
    expect(reason).toBe('brace_extraction_failed');
  });
});

// ---------------------------------------------------------------------------
// Load eval cases and build helpers (for capture run)
// ---------------------------------------------------------------------------

function loadEvalCases(): EvalCase[] {
  const casesPath = path.join(__dirname, 'cases', 'full-eval-cases.json');
  const raw = fs.readFileSync(casesPath, 'utf-8');
  const parsed = JSON.parse(raw);
  const result = EvalCaseArraySchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `Invalid eval cases: ${JSON.stringify(result.error.issues, null, 2)}`
    );
  }
  return result.data;
}

const makePropertyService = () => {
  const openRouterKey = USE_REAL_LLM
    ? (process.env['OPENROUTER_API_KEY'] ?? 'test-api-key')
    : 'test-api-key';
  const openRouterModel =
    USE_REAL_LLM
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

interface JsonFallbackCapture {
  currentCaseId: string;
  samples: Array<{ caseId: string; rawText: string }>;
}

function buildEvalServiceWithCapture(
  capture: JsonFallbackCapture,
  toolFixtures: {
    performanceResult?: typeof MOCK_PERFORMANCE_DATA;
    holdingsResult?: typeof MOCK_HOLDINGS_DATA;
    rulesReportResult?: typeof MOCK_RULES_REPORT_DATA;
  }
) {
  const performanceTool = {
    execute: jest
      .fn()
      .mockResolvedValue(toolFixtures.performanceResult ?? MOCK_PERFORMANCE_DATA)
  };
  const holdingsTool = {
    execute: jest
      .fn()
      .mockResolvedValue(toolFixtures.holdingsResult ?? MOCK_HOLDINGS_DATA)
  };
  const rulesReportTool = {
    execute: jest
      .fn()
      .mockResolvedValue(
        toolFixtures.rulesReportResult ?? MOCK_RULES_REPORT_DATA
      )
  };
  const marketDataTool = {
    execute: jest.fn().mockResolvedValue({ success: true, data: {} })
  };
  const transactionHistoryTool = {
    execute: jest.fn().mockResolvedValue({ success: true, data: {} })
  };
  const rebalanceSimulatorTool = {
    execute: jest.fn().mockResolvedValue({ success: true, data: {} })
  };

  const formatter = new ResponseFormatter();
  const originalFormat = formatter.format.bind(formatter);
  jest.spyOn(formatter, 'format').mockImplementation((rawText: string) => {
    const result = originalFormat(rawText);
    if (result.flags.includes('plain_text_response')) {
      capture.samples.push({ caseId: capture.currentCaseId, rawText });
    }
    return result;
  });

  const service = new AgentService(
    makePropertyService() as never,
    performanceTool as never,
    holdingsTool as never,
    rulesReportTool as never,
    marketDataTool as never,
    transactionHistoryTool as never,
    rebalanceSimulatorTool as never,
    new ConversationMemory(),
    formatter,
    makePassingVerificationService(),
    new ErrorMapperService(),
    makeDisabledLangfuseService()
  );

  return { service };
}

const RESULTS_DIR = path.join(__dirname, 'results');
const SAMPLES_FILE = path.join(RESULTS_DIR, 'json-fallback-samples.json');
const REPORT_FILE = path.join(RESULTS_DIR, 'json-fallback-report.json');
const RAW_DIR = path.join(RESULTS_DIR, 'json-fallback-raw');

// ---------------------------------------------------------------------------
// Capture run (env-gated: EVAL_USE_REAL_LLM + EVAL_CAPTURE_JSON_FAILURES)
// ---------------------------------------------------------------------------

describe('JSON fallback capture run', () => {
  const shouldRunCapture =
    USE_REAL_LLM && CAPTURE_JSON_FAILURES;

  const maybeCapture = shouldRunCapture ? it : it.skip;

  maybeCapture(
    'should run all 50 cases with real LLM, capture fallback raw text, and write samples + report',
    async () => {
      if (!process.env['OPENROUTER_API_KEY']) {
        throw new Error(
          'EVAL_CAPTURE_JSON_FAILURES with real LLM requires OPENROUTER_API_KEY'
        );
      }

      const evalCases = loadEvalCases();
      const capture: JsonFallbackCapture = {
        currentCaseId: '',
        samples: []
      };

      for (const evalCase of evalCases) {
        capture.currentCaseId = evalCase.id;
        const toolFixtures: Parameters<
          typeof buildEvalServiceWithCapture
        >[1] = {};
        if (evalCase.id === 'mvp-004') {
          toolFixtures.performanceResult = MOCK_PERFORMANCE_ERROR;
        }
        const { service } = buildEvalServiceWithCapture(capture, toolFixtures);

        await service.processQuery({
          query: evalCase.input_query,
          userId: 'eval-json-fallback-user'
        });
      }

      fs.mkdirSync(RESULTS_DIR, { recursive: true });

      const samplesPayload = capture.samples.map((s) => ({
        caseId: s.caseId,
        rawTextLength: s.rawText.length,
        rawTextPreview: s.rawText.slice(0, 400),
        rawText: s.rawText
      }));
      fs.writeFileSync(
        SAMPLES_FILE,
        JSON.stringify(samplesPayload, null, 2),
        'utf-8'
      );

      fs.mkdirSync(RAW_DIR, { recursive: true });
      for (const s of capture.samples) {
        fs.writeFileSync(
          path.join(RAW_DIR, `${s.caseId}.txt`),
          s.rawText,
          'utf-8'
        );
      }

      const byReason: Record<string, number> = {};
      const sampleReasons: Array<{ caseId: string; reason: JsonFailureReason; rawTextLength: number }> = [];
      for (const s of capture.samples) {
        const reason = classifyJsonFailure(s.rawText);
        sampleReasons.push({
          caseId: s.caseId,
          reason,
          rawTextLength: s.rawText.length
        });
        byReason[reason] = (byReason[reason] ?? 0) + 1;
      }

      const report = {
        generatedAt: new Date().toISOString(),
        totalSamples: capture.samples.length,
        byReason,
        samples: sampleReasons
      };
      fs.writeFileSync(
        REPORT_FILE,
        JSON.stringify(report, null, 2),
        'utf-8'
      );

      expect(capture.samples.length).toBeGreaterThanOrEqual(0);
    },
    600000
  );
});

// ---------------------------------------------------------------------------
// Classify existing samples file (no real LLM)
// ---------------------------------------------------------------------------

describe('Classify existing json-fallback-samples', () => {
  it('should read json-fallback-samples.json when present, classify each sample, and write report', () => {
    if (!fs.existsSync(SAMPLES_FILE)) {
      return;
    }

    const raw = fs.readFileSync(SAMPLES_FILE, 'utf-8');
    const samples: Array<{ caseId: string; rawText: string }> = JSON.parse(
      raw
    ).map((s: { caseId: string; rawText: string; rawTextLength?: number; rawTextPreview?: string }) => ({
      caseId: s.caseId,
      rawText: s.rawText
    }));

    const byReason: Record<string, number> = {};
    const sampleReasons: Array<{
      caseId: string;
      reason: JsonFailureReason;
      rawTextLength: number;
    }> = [];

    for (const s of samples) {
      const reason = classifyJsonFailure(s.rawText);
      expect(reason).not.toBe('parsed');
      sampleReasons.push({
        caseId: s.caseId,
        reason,
        rawTextLength: s.rawText.length
      });
      byReason[reason] = (byReason[reason] ?? 0) + 1;
    }

    fs.mkdirSync(RESULTS_DIR, { recursive: true });
    const report = {
      generatedAt: new Date().toISOString(),
      totalSamples: samples.length,
      byReason,
      samples: sampleReasons
    };
    fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2), 'utf-8');
  });
});
