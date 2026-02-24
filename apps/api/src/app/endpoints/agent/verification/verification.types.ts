import type { ToolResponse } from '../types';

export interface VerificationResult {
  passed: boolean;
  checker: string;
  reason?: string;
  details?: Record<string, unknown>;
}

export interface StructuredAgentClaim {
  statement?: string;
  source_tool?: string;
  source_field?: string;
  value?: unknown;
}

export interface StructuredAgentResponse {
  claims?: StructuredAgentClaim[];
  narrative?: string;
  recommendations?: Array<{
    action?: string;
    rationale?: string;
    impact_percentage?: number;
    requires_review?: boolean;
  }>;
}

export interface VerificationCheck {
  readonly name: string;
  check(
    agentOutput: StructuredAgentResponse,
    toolOutputs: Map<string, ToolResponse<unknown>>
  ): Promise<VerificationResult>;
}
