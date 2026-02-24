import { InputValidationService, ValidationError } from './input-validation.service';

describe('InputValidationService', () => {
  let service: InputValidationService;

  beforeEach(() => {
    service = new InputValidationService();
  });

  describe('validateQuery', () => {
    it('should accept a valid query', () => {
      const result = service.validateQuery('What are my holdings?');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('What are my holdings?');
    });

    it('should reject an empty query', () => {
      const result = service.validateQuery('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe(ValidationError.QUERY_EMPTY);
    });

    it('should reject a query that exceeds 2000 characters', () => {
      const longQuery = 'a'.repeat(2001);
      const result = service.validateQuery(longQuery);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(ValidationError.QUERY_TOO_LONG);
    });

    it('should accept a query of exactly 2000 characters', () => {
      const maxQuery = 'a'.repeat(2000);
      const result = service.validateQuery(maxQuery);
      expect(result.valid).toBe(true);
    });

    it('should strip control characters from the query', () => {
      const queryWithControl = 'Hello\x00World\x01\x02test';
      const result = service.validateQuery(queryWithControl);
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('HelloWorldtest');
    });

    it('should strip null bytes from the query', () => {
      const queryWithNull = 'test\u0000query';
      const result = service.validateQuery(queryWithNull);
      expect(result.valid).toBe(true);
      expect(result.sanitized).not.toContain('\u0000');
    });

    it('should preserve legitimate whitespace', () => {
      const query = 'What are my holdings this year?';
      const result = service.validateQuery(query);
      expect(result.sanitized).toBe('What are my holdings this year?');
    });

    it('should trim leading and trailing whitespace', () => {
      const result = service.validateQuery('  How is my portfolio?  ');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('How is my portfolio?');
    });

    it('should reject a query that is only whitespace', () => {
      const result = service.validateQuery('   ');
      expect(result.valid).toBe(false);
      expect(result.error).toBe(ValidationError.QUERY_EMPTY);
    });
  });

  describe('validateSessionId', () => {
    it('should accept a valid UUID v4', () => {
      const result = service.validateSessionId('550e8400-e29b-41d4-a716-446655440000');
      expect(result.valid).toBe(true);
    });

    it('should accept undefined (sessionId is optional)', () => {
      const result = service.validateSessionId(undefined);
      expect(result.valid).toBe(true);
    });

    it('should reject a sessionId that is not a valid UUID', () => {
      const result = service.validateSessionId('not-a-valid-uuid');
      expect(result.valid).toBe(false);
      expect(result.error).toBe(ValidationError.INVALID_SESSION_ID);
    });

    it('should reject a sessionId with invalid characters', () => {
      const result = service.validateSessionId('<script>alert(1)</script>');
      expect(result.valid).toBe(false);
      expect(result.error).toBe(ValidationError.INVALID_SESSION_ID);
    });

    it('should accept another valid UUID format', () => {
      const result = service.validateSessionId('6ba7b810-9dad-11d1-80b4-00c04fd430c8');
      expect(result.valid).toBe(true);
    });
  });

  describe('validate (combined)', () => {
    it('should return valid for a good query and no sessionId', () => {
      const result = service.validate({ query: 'What are my holdings?' });
      expect(result.valid).toBe(true);
      expect(result.sanitizedQuery).toBe('What are my holdings?');
    });

    it('should return invalid when query is too long', () => {
      const result = service.validate({ query: 'a'.repeat(2001) });
      expect(result.valid).toBe(false);
      expect(result.error).toBe(ValidationError.QUERY_TOO_LONG);
    });

    it('should return invalid when sessionId is invalid', () => {
      const result = service.validate({
        query: 'Hello',
        sessionId: 'bad-session-id'
      });
      expect(result.valid).toBe(false);
      expect(result.error).toBe(ValidationError.INVALID_SESSION_ID);
    });

    it('should sanitize the query in the combined result', () => {
      const result = service.validate({ query: 'test\x00query' });
      expect(result.valid).toBe(true);
      expect(result.sanitizedQuery).toBe('testquery');
    });
  });
});
