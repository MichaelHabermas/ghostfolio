import { categorizeError } from './error-categorizer';

describe('categorizeError', () => {
  it('should categorize timeout errors', () => {
    expect(categorizeError(new Error('Request timeout'))).toBe('llm_timeout');
    expect(categorizeError(new Error('Connection timed out'))).toBe('llm_timeout');
    expect(categorizeError(new Error('ECONNABORTED'))).toBe('llm_timeout');
  });

  it('should categorize tool failures', () => {
    expect(categorizeError(new Error('Tool execution failed'))).toBe('tool_failure');
    expect(categorizeError(new Error('PortfolioService error'))).toBe('tool_failure');
  });

  it('should categorize validation errors', () => {
    expect(categorizeError(new Error('Validation failed'))).toBe('input_validation');
    expect(categorizeError(new Error('Invalid input'))).toBe('input_validation');
    expect(categorizeError(new Error('Field required'))).toBe('input_validation');
  });

  it('should categorize verification errors', () => {
    expect(categorizeError(new Error('Verification failed'))).toBe('verification_failure');
  });

  it('should default to llm_error for unknown errors', () => {
    expect(categorizeError(new Error('Something went wrong'))).toBe('llm_error');
  });

  it('should handle non-Error values', () => {
    expect(categorizeError('string error')).toBe('llm_error');
    expect(categorizeError(null)).toBe('llm_error');
    expect(categorizeError(undefined)).toBe('llm_error');
  });
});
