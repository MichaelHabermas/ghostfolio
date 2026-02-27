import type { ErrorCategory } from './langfuse.service';

/**
 * Categorizes an error into a structured category for Langfuse tracking.
 */
export function categorizeError(error: unknown): ErrorCategory {
  if (!(error instanceof Error)) {
    return 'llm_error';
  }

  const message = error.message.toLowerCase();

  if (
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('econnaborted')
  ) {
    return 'llm_timeout';
  }

  if (
    message.includes('tool') ||
    message.includes('execute') ||
    message.includes('service')
  ) {
    return 'tool_failure';
  }

  if (
    message.includes('validation') ||
    message.includes('invalid') ||
    message.includes('required')
  ) {
    return 'input_validation';
  }

  if (
    message.includes('verification') ||
    message.includes('inconsistency')
  ) {
    return 'verification_failure';
  }

  return 'llm_error';
}
