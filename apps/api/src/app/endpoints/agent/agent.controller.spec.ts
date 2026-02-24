import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';

describe('AgentController', () => {
  let agentController: AgentController;
  let agentService: AgentService;

  const mockRequest = {
    user: {
      id: 'user-123',
      settings: { settings: { language: 'en', baseCurrency: 'USD' } }
    }
  } as any;

  beforeAll(() => {
    agentService = new AgentService(
      null as any,
      null as any,
      null as any,
      null as any
    );
    agentController = new AgentController(agentService, mockRequest);
  });

  it('should be defined', () => {
    expect(agentController).toBeDefined();
  });

  it('should delegate query to AgentService.processQuery', async () => {
    const processQuerySpy = jest
      .spyOn(agentService, 'processQuery')
      .mockResolvedValue({
        response: 'mocked response',
        sources: [],
        flags: [],
        sessionId: 'session-abc'
      });

    const result = await agentController.query({
      query: 'What are my holdings?',
      sessionId: 'session-abc'
    });

    expect(processQuerySpy).toHaveBeenCalledWith({
      query: 'What are my holdings?',
      sessionId: 'session-abc',
      userId: 'user-123'
    });
    expect(result.response).toBe('mocked response');
    expect(result.sessionId).toBe('session-abc');
  });

  it('should pass userId from request context', async () => {
    const processQuerySpy = jest
      .spyOn(agentService, 'processQuery')
      .mockResolvedValue({
        response: 'test',
        sources: [],
        flags: [],
        sessionId: 's1'
      });

    await agentController.query({ query: 'test' });

    expect(processQuerySpy).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-123' })
    );
  });
});
