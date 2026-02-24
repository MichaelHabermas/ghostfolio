import { AgentService } from './agent.service';

describe('AgentService', () => {
  let agentService: AgentService;

  beforeAll(() => {
    agentService = new AgentService(
      null as any,
      null as any,
      null as any,
      null as any
    );
  });

  it('should be defined', () => {
    expect(agentService).toBeDefined();
  });

  it('should return a stub response with the query echoed', async () => {
    const result = await agentService.processQuery({
      query: 'What are my holdings?',
      userId: 'user-123'
    });

    expect(result.response).toContain('What are my holdings?');
    expect(result.sources).toEqual([]);
    expect(result.flags).toEqual([]);
    expect(result.sessionId).toBeDefined();
    expect(typeof result.sessionId).toBe('string');
  });

  it('should use provided sessionId when given', async () => {
    const result = await agentService.processQuery({
      query: 'Test query',
      sessionId: 'my-session-id',
      userId: 'user-123'
    });

    expect(result.sessionId).toBe('my-session-id');
  });

  it('should generate a sessionId when not provided', async () => {
    const result = await agentService.processQuery({
      query: 'Test query',
      userId: 'user-123'
    });

    expect(result.sessionId).toBeTruthy();
    expect(result.sessionId.length).toBeGreaterThan(0);
  });
});
