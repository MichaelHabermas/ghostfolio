import type { GetRulesReportOutput } from '../schemas';
import type { ToolResponse } from '../types';
import { RulesValidationChecker } from './rules-validation.checker';
import type { StructuredAgentResponse } from './verification.types';

const makeRulesOutput = (overrides?: Partial<GetRulesReportOutput>): GetRulesReportOutput => ({
  categories: [
    {
      key: 'fees',
      name: 'Fees',
      rules: [
        { key: 'fee_ratio', name: 'Fee Ratio', isActive: true, value: false, evaluation: 'Fee ratio exceeds 1%' }
      ]
    }
  ],
  statistics: { rulesActiveCount: 1, rulesFulfilledCount: 0 },
  ...overrides
});

const makeToolOutputs = (rulesOutput?: GetRulesReportOutput): Map<string, ToolResponse<unknown>> => {
  const map = new Map<string, ToolResponse<unknown>>();
  if (rulesOutput !== undefined) {
    map.set('get_rules_report', { success: true, data: rulesOutput });
  }
  return map;
};

describe('RulesValidationChecker', () => {
  let checker: RulesValidationChecker;

  beforeEach(() => {
    checker = new RulesValidationChecker();
  });

  it('should have name "rules_validation"', () => {
    expect(checker.name).toBe('rules_validation');
  });

  describe('check - passes when get_rules_report was not called', () => {
    it('should pass when no get_rules_report tool was called (no violations to cross-reference)', async () => {
      const agentOutput: StructuredAgentResponse = {
        claims: [],
        narrative: 'Your portfolio looks good.'
      };

      const result = await checker.check(agentOutput, new Map());

      expect(result.passed).toBe(true);
      expect(result.checker).toBe('rules_validation');
    });
  });

  describe('check - passes when agent claims match tool output', () => {
    it('should pass when agent makes no rule violation claims', async () => {
      const agentOutput: StructuredAgentResponse = {
        claims: [
          { statement: 'Your portfolio value is $100,000', source_tool: 'portfolio_performance', source_field: 'currentValueInBaseCurrency' }
        ],
        narrative: 'No rule issues detected.'
      };

      const result = await checker.check(agentOutput, makeToolOutputs(makeRulesOutput()));

      expect(result.passed).toBe(true);
    });

    it('should pass when agent correctly references an active rule violation', async () => {
      const agentOutput: StructuredAgentResponse = {
        claims: [
          { statement: 'Fee ratio rule is violated', source_tool: 'get_rules_report', source_field: 'categories' }
        ],
        narrative: 'You have a fee ratio violation.'
      };

      const result = await checker.check(agentOutput, makeToolOutputs(makeRulesOutput()));

      expect(result.passed).toBe(true);
    });
  });

  describe('check - blocks when agent fabricates violations', () => {
    it('should fail when agent claims a rule is violated that does not exist in tool output', async () => {
      const rulesOutput = makeRulesOutput({
        categories: [],
        statistics: { rulesActiveCount: 0, rulesFulfilledCount: 0 }
      });

      const agentOutput: StructuredAgentResponse = {
        claims: [
          {
            statement: 'emergency_fund rule is violated',
            source_tool: 'get_rules_report',
            source_field: 'categories',
            value: 'emergency_fund_check_FABRICATED'
          }
        ],
        narrative: 'You are missing an emergency fund.'
      };

      const result = await checker.check(agentOutput, makeToolOutputs(rulesOutput));

      expect(result.passed).toBe(false);
      expect(result.reason).toBeDefined();
      expect(result.checker).toBe('rules_validation');
    });

    it('should fail when agent claims specific rule key but tool output has different active rules', async () => {
      const rulesOutput = makeRulesOutput({
        categories: [
          {
            key: 'currency',
            name: 'Currency',
            rules: [{ key: 'currency_cluster_risk', name: 'Currency Cluster Risk', isActive: true, value: true }]
          }
        ]
      });

      const agentOutput: StructuredAgentResponse = {
        claims: [
          {
            statement: 'fee_ratio is violated',
            source_tool: 'get_rules_report',
            source_field: 'categories',
            value: 'fee_ratio_FABRICATED_VIOLATION'
          }
        ],
        narrative: 'Fee ratio is too high.'
      };

      const result = await checker.check(agentOutput, makeToolOutputs(rulesOutput));

      expect(result.passed).toBe(false);
    });
  });

  describe('check - handles tool errors gracefully', () => {
    it('should pass (skip verification) when get_rules_report tool returned an error', async () => {
      const toolOutputs = new Map<string, ToolResponse<unknown>>();
      toolOutputs.set('get_rules_report', { success: false, error: 'Service unavailable' });

      const agentOutput: StructuredAgentResponse = {
        claims: [],
        narrative: 'Could not check rules.'
      };

      const result = await checker.check(agentOutput, toolOutputs);

      expect(result.passed).toBe(true);
    });
  });
});
