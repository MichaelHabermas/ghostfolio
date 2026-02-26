import { SourceCitationChecker } from './source-citation.checker';
import type { StructuredAgentResponse } from './verification.types';

describe('SourceCitationChecker', () => {
  let checker: SourceCitationChecker;

  beforeEach(() => {
    checker = new SourceCitationChecker();
  });

  it('should have name "source_citation"', () => {
    expect(checker.name).toBe('source_citation');
  });

  it('should pass when there are no claims', async () => {
    const result = await checker.check({ claims: [], narrative: 'Test' }, new Map());
    expect(result.passed).toBe(true);
  });

  it('should pass for qualitative claims (no numeric value)', async () => {
    const output: StructuredAgentResponse = {
      claims: [{ statement: 'Portfolio looks healthy', value: 'healthy' }],
      narrative: 'Test'
    };
    const result = await checker.check(output, new Map());
    expect(result.passed).toBe(true);
  });

  it('should pass when numeric claim has valid source_tool and source_field', async () => {
    const output: StructuredAgentResponse = {
      claims: [{
        statement: 'Value is $100k',
        source_tool: 'portfolio_performance',
        source_field: 'currentValue',
        value: 100000
      }],
      narrative: 'Test'
    };

    const toolOutputs = new Map();
    toolOutputs.set('portfolio_performance', {
      success: true,
      data: { currentValue: 100000 }
    });

    const result = await checker.check(output, toolOutputs);
    expect(result.passed).toBe(true);
  });

  it('should fail when numeric claim has no source_tool', async () => {
    const output: StructuredAgentResponse = {
      claims: [{
        statement: 'Value is $100k',
        source_field: 'currentValue',
        value: 100000
      }],
      narrative: 'Test'
    };

    const result = await checker.check(output, new Map());
    expect(result.passed).toBe(false);
    expect(result.checker).toBe('source_citation');
    expect(result.reason).toContain('no source_tool');
  });

  it('should fail when numeric claim has no source_field', async () => {
    const output: StructuredAgentResponse = {
      claims: [{
        statement: 'Value is $100k',
        source_tool: 'portfolio_performance',
        value: 100000
      }],
      narrative: 'Test'
    };

    const toolOutputs = new Map();
    toolOutputs.set('portfolio_performance', { success: true, data: {} });

    const result = await checker.check(output, toolOutputs);
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('no source_field');
  });

  it('should fail when cited tool was not called', async () => {
    const output: StructuredAgentResponse = {
      claims: [{
        statement: 'Value is $100k',
        source_tool: 'portfolio_performance',
        source_field: 'currentValue',
        value: 100000
      }],
      narrative: 'Test'
    };

    const result = await checker.check(output, new Map());
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('was not called');
  });

  it('should fail when cited field does not exist in tool output', async () => {
    const output: StructuredAgentResponse = {
      claims: [{
        statement: 'Value is $100k',
        source_tool: 'portfolio_performance',
        source_field: 'nonExistentField',
        value: 100000
      }],
      narrative: 'Test'
    };

    const toolOutputs = new Map();
    toolOutputs.set('portfolio_performance', {
      success: true,
      data: { currentValue: 100000 }
    });

    const result = await checker.check(output, toolOutputs);
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('does not exist');
  });

  it('should skip field existence check when tool output failed', async () => {
    const output: StructuredAgentResponse = {
      claims: [{
        statement: 'Value is $100k',
        source_tool: 'portfolio_performance',
        source_field: 'whatever',
        value: 100000
      }],
      narrative: 'Test'
    };

    const toolOutputs = new Map();
    toolOutputs.set('portfolio_performance', {
      success: false,
      error: 'Service unavailable'
    });

    const result = await checker.check(output, toolOutputs);
    expect(result.passed).toBe(true);
  });
});
