import { VerificationService } from './verification.service';
import type { VerificationCheck, VerificationResult, StructuredAgentResponse } from './verification.types';
import type { ToolResponse } from '../types';

const makePassingChecker = (name: string): VerificationCheck => ({
  name,
  check: jest.fn().mockResolvedValue({ checker: name, passed: true })
});

const makeFailingChecker = (name: string, reason = 'Check failed'): VerificationCheck => ({
  name,
  check: jest.fn().mockResolvedValue({ checker: name, passed: false, reason })
});

const emptyOutput: StructuredAgentResponse = { claims: [], narrative: 'Test narrative.' };
const emptyToolOutputs = new Map<string, ToolResponse<unknown>>();

describe('VerificationService', () => {
  describe('verify - all checkers pass', () => {
    it('should return passed=true when all checkers pass', async () => {
      const service = new VerificationService([
        makePassingChecker('checker_1'),
        makePassingChecker('checker_2')
      ]);

      const result = await service.verify(emptyOutput, emptyToolOutputs);

      expect(result.passed).toBe(true);
    });

    it('should return passed=true with empty checker list', async () => {
      const service = new VerificationService([]);

      const result = await service.verify(emptyOutput, emptyToolOutputs);

      expect(result.passed).toBe(true);
    });
  });

  describe('verify - one checker fails', () => {
    it('should return passed=false when the first checker fails', async () => {
      const service = new VerificationService([
        makeFailingChecker('failing_checker', 'Hallucination detected'),
        makePassingChecker('passing_checker')
      ]);

      const result = await service.verify(emptyOutput, emptyToolOutputs);

      expect(result.passed).toBe(false);
      expect(result.failedChecker).toBe('failing_checker');
      expect(result.reason).toContain('Hallucination detected');
    });

    it('should stop at the first failing checker (early exit)', async () => {
      const checker1 = makeFailingChecker('checker_1', 'First failure');
      const checker2 = makePassingChecker('checker_2');

      const service = new VerificationService([checker1, checker2]);

      await service.verify(emptyOutput, emptyToolOutputs);

      expect(checker1.check).toHaveBeenCalledTimes(1);
      expect(checker2.check).not.toHaveBeenCalled();
    });

    it('should return the failed checker name and reason', async () => {
      const service = new VerificationService([
        makeFailingChecker('rules_validation', 'Agent fabricated a rule violation')
      ]);

      const result = await service.verify(emptyOutput, emptyToolOutputs);

      expect(result.passed).toBe(false);
      expect(result.failedChecker).toBe('rules_validation');
      expect(result.reason).toContain('Agent fabricated a rule violation');
    });
  });

  describe('verify - passes agentOutput and toolOutputs to each checker', () => {
    it('should pass agentOutput and toolOutputs to each checker', async () => {
      const checker = makePassingChecker('checker_1');
      const service = new VerificationService([checker]);

      const toolOutputs = new Map<string, ToolResponse<unknown>>();
      toolOutputs.set('portfolio_performance', { success: true, data: {} });

      await service.verify(emptyOutput, toolOutputs);

      expect(checker.check).toHaveBeenCalledWith(emptyOutput, toolOutputs);
    });
  });

  describe('verify - sequential checker execution', () => {
    it('should run checkers in order and return first failure', async () => {
      const callOrder: string[] = [];
      const checker1: VerificationCheck = {
        name: 'checker_1',
        check: jest.fn().mockImplementation(async () => {
          callOrder.push('checker_1');
          return { checker: 'checker_1', passed: true } as VerificationResult;
        })
      };
      const checker2: VerificationCheck = {
        name: 'checker_2',
        check: jest.fn().mockImplementation(async () => {
          callOrder.push('checker_2');
          return { checker: 'checker_2', passed: false, reason: 'checker_2 failed' } as VerificationResult;
        })
      };
      const checker3: VerificationCheck = {
        name: 'checker_3',
        check: jest.fn()
      };

      const service = new VerificationService([checker1, checker2, checker3]);

      await service.verify(emptyOutput, emptyToolOutputs);

      expect(callOrder).toEqual(['checker_1', 'checker_2']);
      expect(checker3.check).not.toHaveBeenCalled();
    });
  });
});
