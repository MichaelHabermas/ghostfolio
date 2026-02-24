import { tool } from 'ai';

import {
  GetHoldingsInputSchema,
  GetRulesReportInputSchema,
  PortfolioPerformanceInputSchema
} from '../schemas';
import type { GetHoldingsTool } from './get-holdings.tool';
import type { GetRulesReportTool } from './get-rules-report.tool';
import type { PortfolioPerformanceTool } from './portfolio-performance.tool';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ToolRegistry = Record<string, any>;

export interface ToolInstances {
  performanceTool: Pick<PortfolioPerformanceTool, 'execute'>;
  holdingsTool: Pick<GetHoldingsTool, 'execute'>;
  rulesReportTool: Pick<GetRulesReportTool, 'execute'>;
}

/**
 * Creates Vercel AI SDK tool definitions from NestJS injectable tool classes.
 * The factory closes over userId so each tool execute() call is user-scoped.
 * Tool descriptions are written as prompts — the LLM reads them to decide
 * which tool to invoke.
 */
export function createToolRegistry(
  tools: ToolInstances,
  userId: string
): ToolRegistry {
  const { performanceTool, holdingsTool, rulesReportTool } = tools;

  return {
    portfolio_performance: tool({
      description:
        'Retrieves portfolio performance metrics including net returns, total investment value, ' +
        'current portfolio value, performance percentages (with and without currency effect), ' +
        'and annualized performance. Use this tool when the user asks about returns, gains/losses, ' +
        'portfolio growth, net worth, TWR/MWR, or how well their investments have performed over a time period.',
      parameters: PortfolioPerformanceInputSchema,
      execute: async (args) => performanceTool.execute(args, userId)
    }),

    get_holdings: tool({
      description:
        'Retrieves the user\'s current portfolio holdings including each position\'s symbol, name, ' +
        'allocation percentage, value in base currency, asset class, and currency. Also returns ' +
        'total portfolio value. Use this tool when the user asks about what they own, their current ' +
        'holdings, portfolio composition, asset class breakdown, allocation percentages, ' +
        'concentration risks, or diversification.',
      parameters: GetHoldingsInputSchema,
      execute: async (args) => holdingsTool.execute(args, userId)
    }),

    get_rules_report: tool({
      description:
        'Retrieves the portfolio risk and compliance rules report. Returns rule categories ' +
        '(e.g. emergency fund, fee ratio, political risk, currency risk) with pass/fail status ' +
        'for each rule, plus summary statistics (active rules count, fulfilled rules count). ' +
        'Use this tool when the user asks about portfolio risks, rule violations, compliance status, ' +
        'portfolio health checks, or whether their portfolio meets any guidelines or benchmarks.',
      parameters: GetRulesReportInputSchema,
      execute: async (args) => rulesReportTool.execute(args, userId)
    })
  };
}
