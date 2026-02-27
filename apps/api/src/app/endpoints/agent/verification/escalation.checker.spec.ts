import { EscalationChecker } from './escalation.checker';
import type { StructuredAgentResponse } from './verification.types';

describe('EscalationChecker', () => {
  let checker: EscalationChecker;

  beforeEach(() => {
    checker = new EscalationChecker();
  });

  it('should have name "escalation"', () => {
    expect(checker.name).toBe('escalation');
  });

  it('should pass when there are no recommendations', async () => {
    const result = await checker.check({ claims: [], narrative: 'Test' }, new Map());
    expect(result.passed).toBe(true);
  });

  it('should pass when recommendations are empty array', async () => {
    const output: StructuredAgentResponse = {
      claims: [],
      narrative: 'Test',
      recommendations: []
    };
    const result = await checker.check(output, new Map());
    expect(result.passed).toBe(true);
  });

  it('should pass for low-impact recommendation without requires_review', async () => {
    const output: StructuredAgentResponse = {
      claims: [],
      narrative: 'Test',
      recommendations: [{
        action: 'Buy 5% more bonds',
        impact_percentage: 5,
        rationale: 'Slight underweight',
        requires_review: false
      }]
    };
    const result = await checker.check(output, new Map());
    expect(result.passed).toBe(true);
  });

  it('should pass for high-impact recommendation with requires_review=true', async () => {
    const output: StructuredAgentResponse = {
      claims: [],
      narrative: 'Test',
      recommendations: [{
        action: 'Sell 30% of equity',
        impact_percentage: 30,
        rationale: 'Overweight equities',
        requires_review: true
      }]
    };
    const result = await checker.check(output, new Map());
    expect(result.passed).toBe(true);
  });

  it('should fail for high-impact recommendation without requires_review', async () => {
    const output: StructuredAgentResponse = {
      claims: [],
      narrative: 'Test',
      recommendations: [{
        action: 'Sell 30% of equity',
        impact_percentage: 30,
        rationale: 'Overweight equities',
        requires_review: false
      }]
    };
    const result = await checker.check(output, new Map());
    expect(result.passed).toBe(false);
    expect(result.checker).toBe('escalation');
    expect(result.reason).toContain('requires_review');
  });

  it('should fail for exactly-at-threshold (>20%) recommendation without requires_review', async () => {
    const output: StructuredAgentResponse = {
      claims: [],
      narrative: 'Test',
      recommendations: [{
        action: 'Rebalance 21% of portfolio',
        impact_percentage: 21,
        requires_review: false
      }]
    };
    const result = await checker.check(output, new Map());
    expect(result.passed).toBe(false);
  });

  it('should pass for exactly 20% (not > 20%)', async () => {
    const output: StructuredAgentResponse = {
      claims: [],
      narrative: 'Test',
      recommendations: [{
        action: 'Rebalance 20% of portfolio',
        impact_percentage: 20,
        requires_review: false
      }]
    };
    const result = await checker.check(output, new Map());
    expect(result.passed).toBe(true);
  });

  it('should detect "sell all" as full-exit pattern', async () => {
    const output: StructuredAgentResponse = {
      claims: [],
      narrative: 'Test',
      recommendations: [{
        action: 'Sell all equity holdings',
        impact_percentage: 10,
        requires_review: false
      }]
    };
    const result = await checker.check(output, new Map());
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('requires_review');
  });

  it('should detect "liquidate" as full-exit pattern', async () => {
    const output: StructuredAgentResponse = {
      claims: [],
      narrative: 'Test',
      recommendations: [{
        action: 'Liquidate bond positions',
        requires_review: false
      }]
    };
    const result = await checker.check(output, new Map());
    expect(result.passed).toBe(false);
  });

  it('should detect "close entire" as full-exit pattern', async () => {
    const output: StructuredAgentResponse = {
      claims: [],
      narrative: 'Test',
      recommendations: [{
        action: 'Close entire position in AAPL',
        requires_review: false
      }]
    };
    const result = await checker.check(output, new Map());
    expect(result.passed).toBe(false);
  });

  it('should pass full-exit with requires_review=true', async () => {
    const output: StructuredAgentResponse = {
      claims: [],
      narrative: 'Test',
      recommendations: [{
        action: 'Sell everything and move to cash',
        requires_review: true
      }]
    };
    const result = await checker.check(output, new Map());
    expect(result.passed).toBe(true);
  });
});
