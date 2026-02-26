import { Injectable } from '@nestjs/common';

import type { ToolResponse } from '../types';
import type {
  StructuredAgentResponse,
  VerificationCheck,
  VerificationResult
} from './verification.types';

const CHECKER_NAME = 'math_consistency';
const RELATIVE_TOLERANCE = 0.01; // 1%
const ABSOLUTE_TOLERANCE = 1; // $1 for near-zero values

@Injectable()
export class MathConsistencyChecker implements VerificationCheck {
  public readonly name = CHECKER_NAME;

  public async check(
    agentOutput: StructuredAgentResponse,
    toolOutputs: Map<string, ToolResponse<unknown>>
  ): Promise<VerificationResult> {
    const pass = (): VerificationResult => ({ checker: CHECKER_NAME, passed: true });
    const fail = (reason: string, details?: Record<string, unknown>): VerificationResult => ({
      checker: CHECKER_NAME,
      details,
      passed: false,
      reason
    });

    if (!Array.isArray(agentOutput.claims)) {
      return pass();
    }

    const numericalClaims = agentOutput.claims.filter(
      (c) => typeof c.value === 'number' && c.source_tool && c.source_field
    );

    if (numericalClaims.length === 0) {
      return pass();
    }

    for (const claim of numericalClaims) {
      const toolOutput = toolOutputs.get(claim.source_tool!);

      if (!toolOutput || !toolOutput.success || !toolOutput.data) {
        // Source-citation checker handles missing tool outputs
        continue;
      }

      const actualValue = this.resolveField(toolOutput.data, claim.source_field!);

      if (actualValue === undefined || typeof actualValue !== 'number') {
        continue;
      }

      const claimedValue = claim.value as number;

      if (!this.isWithinTolerance(claimedValue, actualValue)) {
        return fail(
          `Numerical mismatch for ${claim.source_field}: claimed ${claimedValue}, actual ${actualValue}`,
          {
            actualValue,
            claimedValue,
            sourceField: claim.source_field,
            sourceTool: claim.source_tool
          }
        );
      }
    }

    return pass();
  }

  private resolveField(data: unknown, fieldPath: string): unknown {
    const parts = fieldPath.split('.');
    let current: unknown = data;

    for (const part of parts) {
      if (current == null || typeof current !== 'object') {
        return undefined;
      }

      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }

  private isWithinTolerance(claimed: number, actual: number): boolean {
    const absoluteDiff = Math.abs(claimed - actual);

    // For near-zero values, use absolute tolerance
    if (Math.abs(actual) < ABSOLUTE_TOLERANCE) {
      return absoluteDiff <= ABSOLUTE_TOLERANCE;
    }

    // For larger values, use relative tolerance
    const relativeDiff = absoluteDiff / Math.abs(actual);
    return relativeDiff <= RELATIVE_TOLERANCE;
  }
}
