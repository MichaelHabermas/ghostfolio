import { Injectable } from '@nestjs/common';

export enum ValidationError {
  QUERY_EMPTY = 'QUERY_EMPTY',
  QUERY_TOO_LONG = 'QUERY_TOO_LONG',
  INVALID_SESSION_ID = 'INVALID_SESSION_ID'
}

export interface QueryValidationResult {
  valid: boolean;
  sanitized?: string;
  error?: ValidationError;
}

export interface SessionIdValidationResult {
  valid: boolean;
  error?: ValidationError;
}

export interface CombinedValidationResult {
  valid: boolean;
  sanitizedQuery?: string;
  error?: ValidationError;
}

const MAX_QUERY_LENGTH = 2000;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class InputValidationService {
  public validateQuery(query: string): QueryValidationResult {
    const sanitized = this.sanitize(query);

    if (!sanitized) {
      return { valid: false, error: ValidationError.QUERY_EMPTY };
    }

    if (sanitized.length > MAX_QUERY_LENGTH) {
      return { valid: false, error: ValidationError.QUERY_TOO_LONG };
    }

    return { valid: true, sanitized };
  }

  public validateSessionId(
    sessionId: string | undefined
  ): SessionIdValidationResult {
    if (sessionId === undefined) {
      return { valid: true };
    }

    if (!UUID_REGEX.test(sessionId)) {
      return { valid: false, error: ValidationError.INVALID_SESSION_ID };
    }

    return { valid: true };
  }

  public validate({
    query,
    sessionId
  }: {
    query: string;
    sessionId?: string;
  }): CombinedValidationResult {
    const queryResult = this.validateQuery(query);

    if (!queryResult.valid) {
      return { valid: false, error: queryResult.error };
    }

    const sessionResult = this.validateSessionId(sessionId);

    if (!sessionResult.valid) {
      return { valid: false, error: sessionResult.error };
    }

    return { valid: true, sanitizedQuery: queryResult.sanitized };
  }

  private sanitize(input: string): string {
    // Strip control characters (0x00-0x1F) except tab (0x09), LF (0x0A), CR (0x0D)
    // then trim whitespace
    return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '').trim();
  }
}
