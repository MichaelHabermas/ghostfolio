import { LangfuseService } from './langfuse.service';

describe('LangfuseService', () => {
  let service: LangfuseService;

  beforeEach(() => {
    service = new LangfuseService();
    delete process.env['LANGFUSE_SECRET_KEY'];
    delete process.env['LANGFUSE_PUBLIC_KEY'];
  });

  afterEach(() => {
    delete process.env['LANGFUSE_SECRET_KEY'];
    delete process.env['LANGFUSE_PUBLIC_KEY'];
  });

  describe('onModuleInit', () => {
    it('should disable when LANGFUSE_SECRET_KEY is missing', () => {
      service.onModuleInit();
      expect(service.enabled).toBe(false);
    });

    it('should disable when LANGFUSE_PUBLIC_KEY is missing', () => {
      process.env['LANGFUSE_SECRET_KEY'] = 'sk-test';
      service.onModuleInit();
      expect(service.enabled).toBe(false);
    });

    it('should enable when both keys are configured', () => {
      process.env['LANGFUSE_SECRET_KEY'] = 'sk-test';
      process.env['LANGFUSE_PUBLIC_KEY'] = 'pk-test';
      service.onModuleInit();
      expect(service.enabled).toBe(true);
    });
  });

  describe('createTrace (disabled)', () => {
    it('should return a no-op trace handle when disabled', async () => {
      service.onModuleInit();
      const trace = await service.createTrace({
        userId: 'user-1',
        sessionId: 'session-1',
        query: 'test'
      });

      // Should not throw
      trace.recordMetadata({ durationMs: 100 });
      trace.end();
    });
  });

  describe('recordFeedback (disabled)', () => {
    it('should silently no-op when disabled', async () => {
      service.onModuleInit();
      await expect(
        service.recordFeedback({
          sessionId: 'session-1',
          score: 'up',
          comment: 'great'
        })
      ).resolves.toBeUndefined();
    });
  });

  describe('onModuleDestroy', () => {
    it('should not throw when disabled', async () => {
      service.onModuleInit();
      await expect(service.onModuleDestroy()).resolves.toBeUndefined();
    });
  });
});
