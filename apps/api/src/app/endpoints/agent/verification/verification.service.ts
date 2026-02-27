import { Injectable, Logger } from '@nestjs/common';

import type { ToolResponse } from '../types';
import type {
  StructuredAgentResponse,
  VerificationCheck
} from './verification.types';

export interface PipelineResult {
  passed: boolean;
  failedChecker?: string;
  reason?: string;
}

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);
  private readonly checkers: VerificationCheck[];

  public constructor(checkers: VerificationCheck[]) {
    this.checkers = checkers;
  }

  public async verify(
    agentOutput: StructuredAgentResponse,
    toolOutputs: Map<string, ToolResponse<unknown>>
  ): Promise<PipelineResult> {
    for (const checker of this.checkers) {
      const result = await checker.check(agentOutput, toolOutputs);

      if (!result.passed) {
        this.logger.warn(
          `Verification blocked by ${checker.name}: ${result.reason}`
        );

        return {
          failedChecker: result.checker,
          passed: false,
          reason: result.reason
        };
      }
    }

    return { passed: true };
  }
}
