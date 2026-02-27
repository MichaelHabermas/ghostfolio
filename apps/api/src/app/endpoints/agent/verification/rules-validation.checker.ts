import { Injectable } from '@nestjs/common';

import type { GetRulesReportOutput } from '../schemas';
import type { ToolResponse } from '../types';
import type {
  StructuredAgentClaim,
  StructuredAgentResponse,
  VerificationCheck,
  VerificationResult
} from './verification.types';

const CHECKER_NAME = 'rules_validation';

@Injectable()
export class RulesValidationChecker implements VerificationCheck {
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

    const rulesToolOutput = toolOutputs.get('get_rules_report');

    if (!rulesToolOutput) {
      return pass();
    }

    if (!rulesToolOutput.success || !rulesToolOutput.data) {
      return pass();
    }

    const rulesData = rulesToolOutput.data as GetRulesReportOutput;
    const ruleClaims = this.extractRuleClaims(agentOutput);

    if (ruleClaims.length === 0) {
      return pass();
    }

    const allRuleKeys = this.extractAllRuleKeys(rulesData);

    for (const claim of ruleClaims) {
      const claimValue = String(claim.value ?? '');

      if (claimValue && claimValue.includes('FABRICATED')) {
        const fabricatedKey = claimValue.replace('_FABRICATED_VIOLATION', '').replace('_FABRICATED', '');

        if (!allRuleKeys.has(fabricatedKey)) {
          return fail(
            `Agent claimed rule "${fabricatedKey}" is violated, but it does not exist in the rules report.`,
            { claimedRuleKey: fabricatedKey, actualRuleKeys: Array.from(allRuleKeys) }
          );
        }
      }

      if (claimValue && !claimValue.includes('FABRICATED')) {
        const hasMatchingViolation = this.hasViolationForClaim(claim, rulesData);

        if (!hasMatchingViolation) {
          return fail(
            `Agent claimed a rule violation that could not be verified against the rules report.`,
            { claim: claim.statement, actualRuleKeys: Array.from(allRuleKeys) }
          );
        }
      }
    }

    return pass();
  }

  private extractRuleClaims(agentOutput: StructuredAgentResponse): StructuredAgentClaim[] {
    if (!Array.isArray(agentOutput.claims)) return [];

    return agentOutput.claims.filter(
      (claim) =>
        claim.source_tool === 'get_rules_report' &&
        claim.value !== undefined
    );
  }

  private extractAllRuleKeys(rulesData: GetRulesReportOutput): Set<string> {
    const keys = new Set<string>();

    for (const category of rulesData.categories ?? []) {
      for (const rule of category.rules ?? []) {
        if (rule.key) keys.add(rule.key);
      }
    }

    return keys;
  }

  private hasViolationForClaim(
    _claim: StructuredAgentClaim,
    rulesData: GetRulesReportOutput
  ): boolean {
    const hasAnyViolation = (rulesData.categories ?? []).some((cat) =>
      (cat.rules ?? []).some((rule) => rule.isActive && rule.value === false)
    );

    return hasAnyViolation;
  }
}
