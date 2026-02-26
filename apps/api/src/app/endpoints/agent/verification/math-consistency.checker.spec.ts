import { MathConsistencyChecker } from './math-consistency.checker';
import type { StructuredAgentResponse } from './verification.types';

describe('MathConsistencyChecker', () => {
  let checker: MathConsistencyChecker;

  beforeEach(() => {
    checker = new MathConsistencyChecker();
  });

  it('should have name "math_consistency"', () => {
    expect(checker.name).toBe('math_consistency');
  });

  it('should pass when there are no claims', async () => {
    const result = await checker.check({ claims: [], narrative: 'Test' }, new Map());
    expect(result.passed).toBe(true);
  });

  it('should pass when there are no numerical claims', async () => {
    const output: StructuredAgentResponse = {
      claims: [{ statement: 'Portfolio is healthy', source_tool: 'portfolio_performance', value: 'good' }],
      narrative: 'Test'
    };
    const result = await checker.check(output, new Map());
    expect(result.passed).toBe(true);
  });

  it('should pass when claimed value matches actual value exactly', async () => {
    const output: StructuredAgentResponse = {
      claims: [{
        statement: 'Portfolio value is $100,000',
        source_tool: 'portfolio_performance',
        source_field: 'currentValueInBaseCurrency',
        value: 100000
      }],
      narrative: 'Test'
    };

    const toolOutputs = new Map();
    toolOutputs.set('portfolio_performance', {
      success: true,
      data: { currentValueInBaseCurrency: 100000 }
    });

    const result = await checker.check(output, toolOutputs);
    expect(result.passed).toBe(true);
  });

  it('should pass when value is within 1% tolerance', async () => {
    const output: StructuredAgentResponse = {
      claims: [{
        statement: 'Value is $100,500',
        source_tool: 'portfolio_performance',
        source_field: 'currentValueInBaseCurrency',
        value: 100500
      }],
      narrative: 'Test'
    };

    const toolOutputs = new Map();
    toolOutputs.set('portfolio_performance', {
      success: true,
      data: { currentValueInBaseCurrency: 100000 }
    });

    const result = await checker.check(output, toolOutputs);
    expect(result.passed).toBe(true);
  });

  it('should fail when value exceeds 1% tolerance', async () => {
    const output: StructuredAgentResponse = {
      claims: [{
        statement: 'Value is $105,000',
        source_tool: 'portfolio_performance',
        source_field: 'currentValueInBaseCurrency',
        value: 105000
      }],
      narrative: 'Test'
    };

    const toolOutputs = new Map();
    toolOutputs.set('portfolio_performance', {
      success: true,
      data: { currentValueInBaseCurrency: 100000 }
    });

    const result = await checker.check(output, toolOutputs);
    expect(result.passed).toBe(false);
    expect(result.checker).toBe('math_consistency');
    expect(result.reason).toContain('Numerical mismatch');
  });

  it('should use absolute tolerance ($1) for near-zero values', async () => {
    const output: StructuredAgentResponse = {
      claims: [{
        statement: 'Fee is $0.50',
        source_tool: 'portfolio_performance',
        source_field: 'fee',
        value: 0.5
      }],
      narrative: 'Test'
    };

    const toolOutputs = new Map();
    toolOutputs.set('portfolio_performance', {
      success: true,
      data: { fee: 0 }
    });

    const result = await checker.check(output, toolOutputs);
    expect(result.passed).toBe(true);
  });

  it('should resolve nested field paths', async () => {
    const output: StructuredAgentResponse = {
      claims: [{
        statement: 'Return is 12.5%',
        source_tool: 'portfolio_performance',
        source_field: 'performance.totalReturn',
        value: 12.5
      }],
      narrative: 'Test'
    };

    const toolOutputs = new Map();
    toolOutputs.set('portfolio_performance', {
      success: true,
      data: { performance: { totalReturn: 12.5 } }
    });

    const result = await checker.check(output, toolOutputs);
    expect(result.passed).toBe(true);
  });

  it('should skip claims where tool output is missing', async () => {
    const output: StructuredAgentResponse = {
      claims: [{
        statement: 'Value is $100,000',
        source_tool: 'portfolio_performance',
        source_field: 'currentValue',
        value: 100000
      }],
      narrative: 'Test'
    };

    const result = await checker.check(output, new Map());
    expect(result.passed).toBe(true);
  });

  it('should skip claims where field resolves to non-number', async () => {
    const output: StructuredAgentResponse = {
      claims: [{
        statement: 'Count is 5',
        source_tool: 'get_holdings',
        source_field: 'status',
        value: 5
      }],
      narrative: 'Test'
    };

    const toolOutputs = new Map();
    toolOutputs.set('get_holdings', {
      success: true,
      data: { status: 'active' }
    });

    const result = await checker.check(output, toolOutputs);
    expect(result.passed).toBe(true);
  });
});
