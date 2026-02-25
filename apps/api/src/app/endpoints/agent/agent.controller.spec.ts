import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';

import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { InputValidationService } from './validation/input-validation.service';

describe('AgentController', () => {
  let agentController: AgentController;
  let agentService: AgentService;

  const mockRequest = {
    user: {
      id: 'user-123',
      settings: { settings: { language: 'en', baseCurrency: 'USD' } }
    }
  } as any;

  let inputValidationService: InputValidationService;

  beforeAll(() => {
    process.env['AGENT_ENABLED'] = 'true';
    agentService = new AgentService(
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any
    );
    inputValidationService = new InputValidationService();
    agentController = new AgentController(agentService, mockRequest, inputValidationService);
  });

  afterAll(() => {
    delete process.env['AGENT_ENABLED'];
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
        sessionId: 'session-abc',
        toolsCalled: []
      });

    const validSessionId = '550e8400-e29b-41d4-a716-446655440000';

    const result = await agentController.query({
      query: 'What are my holdings?',
      sessionId: validSessionId
    });

    expect(processQuerySpy).toHaveBeenCalledWith({
      query: 'What are my holdings?',
      sessionId: validSessionId,
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
        sessionId: 's1',
        toolsCalled: []
      });

    await agentController.query({ query: 'test' });

    expect(processQuerySpy).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-123' })
    );
  });

  describe('AGENT_ENABLED feature flag', () => {
    afterEach(() => {
      process.env['AGENT_ENABLED'] = 'true';
    });

    it('should return 503 when AGENT_ENABLED is not set', async () => {
      delete process.env['AGENT_ENABLED'];
      await expect(
        agentController.query({ query: 'What are my holdings?' })
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it('should return 503 when AGENT_ENABLED is set to "false"', async () => {
      process.env['AGENT_ENABLED'] = 'false';
      await expect(
        agentController.query({ query: 'What are my holdings?' })
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it('should return 503 with correct message when AGENT_ENABLED is not set', async () => {
      expect.assertions(2);
      delete process.env['AGENT_ENABLED'];
      try {
        await agentController.query({ query: 'What are my holdings?' });
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(ServiceUnavailableException);
        expect((err as ServiceUnavailableException).message).toBe(
          'The agent feature is currently disabled.'
        );
      }
    });

    it('should proceed normally when AGENT_ENABLED is "true"', async () => {
      process.env['AGENT_ENABLED'] = 'true';
      jest.spyOn(agentService, 'processQuery').mockResolvedValue({
        response: 'ok',
        sources: [],
        flags: [],
        sessionId: 's1',
        toolsCalled: []
      });

      await expect(
        agentController.query({ query: 'What are my holdings?' })
      ).resolves.toBeDefined();
    });
  });

  describe('input validation', () => {
    it('should throw BadRequestException when query exceeds 2000 characters', async () => {
      const longQuery = 'a'.repeat(2001);
      await expect(agentController.query({ query: longQuery })).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException when query is empty', async () => {
      await expect(agentController.query({ query: '' })).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException when sessionId is not a valid UUID', async () => {
      await expect(
        agentController.query({ query: 'valid query', sessionId: 'not-a-uuid' })
      ).rejects.toThrow(BadRequestException);
    });

    it('should sanitize control characters before passing to AgentService', async () => {
      const processQuerySpy = jest
        .spyOn(agentService, 'processQuery')
        .mockResolvedValue({
          response: 'ok',
          sources: [],
          flags: [],
          sessionId: 's',
          toolsCalled: []
        });

      await agentController.query({ query: 'test\x00query' });

      expect(processQuerySpy).toHaveBeenCalledWith(
        expect.objectContaining({ query: 'testquery' })
      );
    });

    it('should accept a valid UUID sessionId', async () => {
      jest.spyOn(agentService, 'processQuery').mockResolvedValue({
        response: 'ok',
        sources: [],
        flags: [],
        sessionId: '550e8400-e29b-41d4-a716-446655440000',
        toolsCalled: []
      });

      await expect(
        agentController.query({
          query: 'test',
          sessionId: '550e8400-e29b-41d4-a716-446655440000'
        })
      ).resolves.toBeDefined();
    });
  });
});
