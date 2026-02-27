import { Injectable } from '@nestjs/common';

import type { ToolResponse } from '../types';
import type {
  StructuredAgentResponse,
  VerificationCheck,
  VerificationResult
} from './verification.types';

const CHECKER_NAME = 'escalation';
const HIGH_IMPACT_THRESHOLD = 20; // percentage
const FULL_EXIT_PATTERNS = [
  /sell\s+(all|everything|100%)/i,
  /liquidat/i,
  /close\s+(all|entire)/i,
  /exit\s+(all|entire|position)/i
];

@Injectable()
export class EscalationChecker implements VerificationCheck {
  public readonly name = CHECKER_NAME;

  public async check(
    agentOutput: StructuredAgentResponse,
    _toolOutputs: Map<string, ToolResponse<unknown>>
  ): Promise<VerificationResult> {
    const pass = (): VerificationResult => ({ checker: CHECKER_NAME, passed: true });
    const fail = (reason: string, details?: Record<string, unknown>): VerificationResult => ({
      checker: CHECKER_NAME,
      details,
      passed: false,
      reason
    });

    if (!Array.isArray(agentOutput.recommendations) || agentOutput.recommendations.length === 0) {
      return pass();
    }

    for (const rec of agentOutput.recommendations) {
      const isHighImpact =
        (typeof rec.impact_percentage === 'number' && rec.impact_percentage > HIGH_IMPACT_THRESHOLD) ||
        this.isFullExitAction(rec.action);

      if (isHighImpact && !rec.requires_review) {
        return fail(
          `High-impact recommendation "${rec.action}" (impact: ${rec.impact_percentage ?? 'full exit'}%) is missing requires_review flag`,
          {
            action: rec.action,
            impactPercentage: rec.impact_percentage,
            requiresReview: rec.requires_review
          }
        );
      }
    }

    return pass();
  }

  private isFullExitAction(action?: string): boolean {
    if (!action) return false;
    return FULL_EXIT_PATTERNS.some((pattern) => pattern.test(action));
  }
}
