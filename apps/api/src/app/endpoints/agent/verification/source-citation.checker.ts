import { Injectable } from '@nestjs/common';

import type { ToolResponse } from '../types';
import type {
  StructuredAgentResponse,
  VerificationCheck,
  VerificationResult
} from './verification.types';

const CHECKER_NAME = 'source_citation';

@Injectable()
export class SourceCitationChecker implements VerificationCheck {
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

    const numericClaims = agentOutput.claims.filter(
      (c) => typeof c.value === 'number'
    );

    if (numericClaims.length === 0) {
      return pass();
    }

    for (const claim of numericClaims) {
      if (!claim.source_tool) {
        return fail(
          `Numeric claim "${claim.statement}" has no source_tool citation`,
          { claim: claim.statement, value: claim.value }
        );
      }

      if (!claim.source_field) {
        return fail(
          `Numeric claim "${claim.statement}" has no source_field citation`,
          { claim: claim.statement, sourceTool: claim.source_tool, value: claim.value }
        );
      }

      const toolOutput = toolOutputs.get(claim.source_tool);

      if (!toolOutput) {
        return fail(
          `Claim cites tool "${claim.source_tool}" which was not called`,
          { claim: claim.statement, citedTool: claim.source_tool }
        );
      }

      if (toolOutput.success && toolOutput.data) {
        const fieldValue = this.resolveField(toolOutput.data, claim.source_field);

        if (fieldValue === undefined) {
          return fail(
            `Claim cites field "${claim.source_field}" which does not exist in ${claim.source_tool} output`,
            {
              citedField: claim.source_field,
              citedTool: claim.source_tool,
              claim: claim.statement
            }
          );
        }
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
}
