import * as path from 'path';
import * as fs from 'fs';

import { EvalCaseSchema, EvalCaseArraySchema } from './eval-case.schema';
import type { EvalCase } from './eval-case.schema';

const CASES_PATH = path.join(__dirname, 'cases', 'mvp-cases.json');

function loadCases(): EvalCase[] {
  const raw = fs.readFileSync(CASES_PATH, 'utf-8');
  const parsed = JSON.parse(raw);
  const result = EvalCaseArraySchema.safeParse(parsed);

  if (!result.success) {
    throw new Error(`Invalid eval cases: ${JSON.stringify(result.error.issues, null, 2)}`);
  }

  return result.data;
}

describe('MVP Eval Runner', () => {
  let cases: EvalCase[];

  beforeAll(() => {
    cases = loadCases();
  });

  describe('Dataset integrity', () => {
    it('should load at least 5 eval cases', () => {
      expect(cases.length).toBeGreaterThanOrEqual(5);
    });

    it('should have at least 6 eval cases as specified in Epic 6', () => {
      expect(cases.length).toBeGreaterThanOrEqual(6);
    });

    it('should have unique IDs across all cases', () => {
      const ids = cases.map((c) => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should validate every case against EvalCaseSchema', () => {
      const results = cases.map((rawCase) => ({
        id: rawCase.id,
        result: EvalCaseSchema.safeParse(rawCase)
      }));

      const failures = results.filter((r) => !r.result.success);
      expect(failures).toHaveLength(0);
    });
  });

  describe('Category coverage', () => {
    it('should include at least one happy_path case', () => {
      const happyPathCases = cases.filter((c) => c.category === 'happy_path');
      expect(happyPathCases.length).toBeGreaterThanOrEqual(1);
    });

    it('should include at least one adversarial case', () => {
      const adversarialCases = cases.filter((c) => c.category === 'adversarial');
      expect(adversarialCases.length).toBeGreaterThanOrEqual(1);
    });

    it('should include at least one edge_case', () => {
      const edgeCases = cases.filter((c) => c.category === 'edge_case');
      expect(edgeCases.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Adversarial case rules', () => {
    let adversarialCases: EvalCase[];

    beforeAll(() => {
      adversarialCases = cases.filter((c) => c.category === 'adversarial');
    });

    it('should have no expected_tools for adversarial cases (agent must refuse)', () => {
      for (const evalCase of adversarialCases) {
        expect(evalCase.expected_tools).toHaveLength(0);
      }
    });

    it('should have non-empty expected_output_not_contains for adversarial cases', () => {
      for (const evalCase of adversarialCases) {
        expect(evalCase.expected_output_not_contains.length).toBeGreaterThan(0);
      }
    });

    it('should not allow adversarial cases to contain trade-execution phrases in expected_output_contains', () => {
      const tradeKeywords = ['sold', 'executed', 'trade placed', 'order submitted'];
      for (const evalCase of adversarialCases) {
        for (const phrase of evalCase.expected_output_contains) {
          const lower = phrase.toLowerCase();
          const hasTrade = tradeKeywords.some((kw) => lower.includes(kw));
          expect(hasTrade).toBe(false);
        }
      }
    });
  });

  describe('Happy path and edge case rules', () => {
    let nonAdversarialCases: EvalCase[];

    beforeAll(() => {
      nonAdversarialCases = cases.filter((c) => c.category !== 'adversarial');
    });

    it('should have at least one expected_tool for happy_path cases', () => {
      const happyPathCases = nonAdversarialCases.filter((c) => c.category === 'happy_path');
      for (const evalCase of happyPathCases) {
        expect(evalCase.expected_tools.length).toBeGreaterThan(0);
      }
    });

    it('should reference only valid MVP tool names', () => {
      const validTools = ['portfolio_performance', 'get_holdings', 'get_rules_report'];
      for (const evalCase of nonAdversarialCases) {
        for (const tool of evalCase.expected_tools) {
          expect(validTools).toContain(tool);
        }
      }
    });
  });

  describe('Output contains validation', () => {
    it('should have non-empty strings in expected_output_not_contains (no empty string sentinels)', () => {
      for (const evalCase of cases) {
        for (const phrase of evalCase.expected_output_not_contains) {
          expect(phrase.trim().length).toBeGreaterThan(0);
        }
      }
    });

    it('should have valid (non-empty) strings in expected_output_contains when provided', () => {
      for (const evalCase of cases) {
        for (const phrase of evalCase.expected_output_contains) {
          expect(phrase.trim().length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Pass criteria validation', () => {
    it('should have meaningful pass_criteria (longer than 10 chars)', () => {
      for (const evalCase of cases) {
        expect(evalCase.pass_criteria.length).toBeGreaterThan(10);
      }
    });
  });

  describe('Individual case validation — reporting', () => {
    it.each([
      ['mvp-001', 'happy_path', ['portfolio_performance']],
      ['mvp-002', 'happy_path', ['get_holdings']],
      ['mvp-003', 'happy_path', ['get_rules_report']],
      ['mvp-004', 'edge_case', ['portfolio_performance']],
      ['mvp-005', 'adversarial', []],
      ['mvp-006', 'happy_path', ['get_holdings']]
    ])(
      'case %s should have category %s and expected_tools %j',
      (id, expectedCategory, expectedTools) => {
        const evalCase = cases.find((c) => c.id === id);
        expect(evalCase).toBeDefined();
        expect(evalCase!.category).toBe(expectedCategory);
        expect(evalCase!.expected_tools).toEqual(expectedTools);
      }
    );
  });
});
