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

export interface StructuredAgentOutput {
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

  public tryParseJson(text: string): StructuredAgentOutput | null {
    // 1. Trim
    let cleanText = text.trim();

    // 2. Strip markdown code fences if present
    if (cleanText.startsWith('```')) {
      // Remove starting fence (e.g., ```json)
      cleanText = cleanText.replace(/^```[a-zA-Z]*\n?/, '');
      // Remove ending fence
      cleanText = cleanText.replace(/\n?```$/, '');
      cleanText = cleanText.trim();
    }

    // 3. Attempt direct JSON.parse
    try {
      const result = JSON.parse(cleanText);
      if (typeof result === 'object' && result !== null) {
        this.logger.debug('Agent response parsed successfully (direct)');
        return result as StructuredAgentOutput;
      }
    } catch (e) {
      // Direct parse failed, proceed to fallback
    }

    // 4. Fallback extraction from first { to last }
    const firstBrace = cleanText.indexOf('{');
    const lastBrace = cleanText.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const candidate = cleanText.substring(firstBrace, lastBrace + 1);
      try {
        const result = JSON.parse(candidate);
        if (typeof result === 'object' && result !== null) {
          this.logger.debug('Agent response parsed successfully (fallback extraction)');
          return result as StructuredAgentOutput;
        }
      } catch (e) {
        // One repair: remove trailing comma before } or ]
        const repaired = candidate.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
        try {
          const result = JSON.parse(repaired);
          if (typeof result === 'object' && result !== null) {
            this.logger.debug('Agent response parsed successfully (trailing-comma repair)');
            return result as StructuredAgentOutput;
          }
        } catch {
          // Repair parse failed
        }
      }
    }

    this.logger.debug('Agent response was not valid JSON; using plain text fallback');
    return null;
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
