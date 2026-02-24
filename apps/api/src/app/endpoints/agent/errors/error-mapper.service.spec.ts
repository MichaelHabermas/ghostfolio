import { ErrorMapperService, AgentErrorType } from './error-mapper.service';

describe('ErrorMapperService', () => {
  let service: ErrorMapperService;

  beforeEach(() => {
    service = new ErrorMapperService();
  });

  describe('toUserMessage', () => {
    it('should return user-friendly message for DB_TIMEOUT', () => {
      const message = service.toUserMessage(AgentErrorType.DB_TIMEOUT);
      expect(message).toContain('portfolio data');
      expect(message.length).toBeGreaterThan(10);
    });

    it('should return user-friendly message for LLM_RATE_LIMIT', () => {
      const message = service.toUserMessage(AgentErrorType.LLM_RATE_LIMIT);
      expect(message).toContain('busy');
      expect(message.length).toBeGreaterThan(10);
    });

    it('should return user-friendly message for VERIFICATION_MISMATCH', () => {
      const message = service.toUserMessage(AgentErrorType.VERIFICATION_MISMATCH);
      expect(message).toContain('inconsistency');
      expect(message.length).toBeGreaterThan(10);
    });

    it('should return user-friendly message for CONTEXT_OVERFLOW', () => {
      const message = service.toUserMessage(AgentErrorType.CONTEXT_OVERFLOW);
      expect(message).toContain('large');
      expect(message.length).toBeGreaterThan(10);
    });

    it('should return user-friendly message for MARKET_DATA_DOWN', () => {
      const message = service.toUserMessage(AgentErrorType.MARKET_DATA_DOWN);
      expect(message.toLowerCase()).toContain('market data');
      expect(message.length).toBeGreaterThan(10);
    });

    it('should return user-friendly message for MALFORMED_LLM_OUTPUT', () => {
      const message = service.toUserMessage(AgentErrorType.MALFORMED_LLM_OUTPUT);
      expect(message).toContain('wrong');
      expect(message.length).toBeGreaterThan(10);
    });

    it('should return a generic fallback message for unknown error types', () => {
      const message = service.toUserMessage('UNKNOWN_ERROR_TYPE' as AgentErrorType);
      expect(message).toBeTruthy();
      expect(message.length).toBeGreaterThan(10);
    });
  });

  describe('classify', () => {
    it('should classify database connection errors as DB_TIMEOUT', () => {
      const error = new Error('Connection to database timed out');
      expect(service.classify(error)).toBe(AgentErrorType.DB_TIMEOUT);
    });

    it('should classify Prisma errors as DB_TIMEOUT', () => {
      const error = new Error('PrismaClientKnownRequestError: database');
      expect(service.classify(error)).toBe(AgentErrorType.DB_TIMEOUT);
    });

    it('should classify rate limit errors as LLM_RATE_LIMIT', () => {
      const error = new Error('Rate limit exceeded: 429 Too Many Requests');
      expect(service.classify(error)).toBe(AgentErrorType.LLM_RATE_LIMIT);
    });

    it('should classify context length errors as CONTEXT_OVERFLOW', () => {
      const error = new Error('context_length_exceeded: maximum context length');
      expect(service.classify(error)).toBe(AgentErrorType.CONTEXT_OVERFLOW);
    });

    it('should classify market data errors as MARKET_DATA_DOWN', () => {
      const error = new Error('MarketDataService: failed to fetch market data');
      expect(service.classify(error)).toBe(AgentErrorType.MARKET_DATA_DOWN);
    });

    it('should classify JSON parse errors as MALFORMED_LLM_OUTPUT', () => {
      const error = new SyntaxError('Unexpected token in JSON');
      expect(service.classify(error)).toBe(AgentErrorType.MALFORMED_LLM_OUTPUT);
    });

    it('should return MALFORMED_LLM_OUTPUT as default for unrecognized errors', () => {
      const error = new Error('Some completely unknown error');
      expect(service.classify(error)).toBe(AgentErrorType.MALFORMED_LLM_OUTPUT);
    });
  });

  describe('toUserMessageFromError', () => {
    it('should classify and map a DB error end-to-end', () => {
      const error = new Error('database timeout');
      const message = service.toUserMessageFromError(error);
      expect(message).toContain('portfolio data');
    });

    it('should classify and map a rate limit error end-to-end', () => {
      const error = new Error('rate limit 429');
      const message = service.toUserMessageFromError(error);
      expect(message).toContain('busy');
    });
  });
});
