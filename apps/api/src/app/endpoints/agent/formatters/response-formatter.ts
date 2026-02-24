import { Injectable, Logger } from '@nestjs/common';

import type { AgentSource } from '../types';

export interface ParsedAgentResponse {
  narrative: string;
  sources: AgentSource[];
  flags: string[];
}

interface AgentClaim {
  statement?: string;
  source_tool?: string;
  source_field?: string;
  value?: unknown;
}

interface StructuredAgentOutput {
  claims?: AgentClaim[];
  narrative?: string;
  recommendations?: Array<{
    action?: string;
    rationale?: string;
    impact_percentage?: number;
    requires_review?: boolean;
  }>;
}

@Injectable()
export class ResponseFormatter {
  private readonly logger = new Logger(ResponseFormatter.name);

  public format(rawText: string): ParsedAgentResponse {
    const parsed = this.tryParseJson(rawText);

    if (!parsed) {
      return {
        narrative: rawText,
        sources: [],
        flags: ['plain_text_response']
      };
    }

    const sources = this.extractSources(parsed);
    const flags = this.extractFlags(parsed);
    const narrative = parsed.narrative ?? rawText;

    return { narrative, sources, flags };
  }

  private tryParseJson(text: string): StructuredAgentOutput | null {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const candidate = jsonMatch ? jsonMatch[0] : text.trim();

    try {
      const result = JSON.parse(candidate);

      if (typeof result === 'object' && result !== null) {
        return result as StructuredAgentOutput;
      }

      return null;
    } catch {
      this.logger.debug('Agent response was not valid JSON; using plain text fallback');
      return null;
    }
  }

  private extractSources(parsed: StructuredAgentOutput): AgentSource[] {
    if (!Array.isArray(parsed.claims)) return [];

    return parsed.claims
      .filter((c) => c.source_tool && c.source_field)
      .map((c) => ({
        tool: c.source_tool as string,
        field: c.source_field as string
      }));
  }

  private extractFlags(parsed: StructuredAgentOutput): string[] {
    const flags: string[] = [];

    if (Array.isArray(parsed.recommendations)) {
      const hasHighImpact = parsed.recommendations.some((r) => r.requires_review === true);

      if (hasHighImpact) {
        flags.push('high_impact_recommendation');
      }
    }

    return flags;
  }
}
