import { SYSTEM_PROMPT } from './system-prompt';

describe('SYSTEM_PROMPT', () => {
  it('should be a non-empty string', () => {
    expect(typeof SYSTEM_PROMPT).toBe('string');
    expect(SYSTEM_PROMPT.length).toBeGreaterThan(0);
  });

  it('should define the agent role as read-only portfolio analysis assistant', () => {
    expect(SYSTEM_PROMPT.toLowerCase()).toContain('portfolio');
    expect(SYSTEM_PROMPT.toLowerCase()).toContain('read-only');
  });

  it('should contain domain constraints prohibiting trade execution', () => {
    const lowerPrompt = SYSTEM_PROMPT.toLowerCase();
    expect(lowerPrompt).toContain('trade');
    expect(lowerPrompt).toContain('suggest');
  });

  it('should include guidance for the portfolio_performance tool', () => {
    expect(SYSTEM_PROMPT).toContain('portfolio_performance');
  });

  it('should include guidance for the get_holdings tool', () => {
    expect(SYSTEM_PROMPT).toContain('get_holdings');
  });

  it('should include guidance for the get_rules_report tool', () => {
    expect(SYSTEM_PROMPT).toContain('get_rules_report');
  });

  it('should define structured JSON response format with claims and narrative', () => {
    expect(SYSTEM_PROMPT).toContain('claims');
    expect(SYSTEM_PROMPT).toContain('narrative');
    expect(SYSTEM_PROMPT).toContain('source_tool');
    expect(SYSTEM_PROMPT).toContain('source_field');
  });

  it('should include escalation rule for high-impact recommendations', () => {
    expect(SYSTEM_PROMPT).toContain('20%');
  });

  it('should include disclaimer requirement for suggestions', () => {
    const lowerPrompt = SYSTEM_PROMPT.toLowerCase();
    expect(lowerPrompt).toContain('disclaimer');
  });
});
