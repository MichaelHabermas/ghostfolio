import { BadRequestException } from '@nestjs/common';

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
        sessionId: 's1'
      });

    await agentController.query({ query: 'test' });

    expect(processQuerySpy).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-123' })
    );
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
        .mockResolvedValue({ response: 'ok', sources: [], flags: [], sessionId: 's' });

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
        sessionId: '550e8400-e29b-41d4-a716-446655440000'
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
