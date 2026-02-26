import { tool } from 'ai';

import type { ToolResponse } from '../types';
import type { RedactionService } from '../redaction/redaction.service';
import {
  GetHoldingsInputSchema,
  GetRulesReportInputSchema,
  MarketDataInputSchema,
  PortfolioPerformanceInputSchema,
  RebalanceSimulatorInputSchema,
  TransactionHistoryInputSchema
} from '../schemas';
import type { GetHoldingsTool } from './get-holdings.tool';
import type { GetRulesReportTool } from './get-rules-report.tool';
import type { MarketDataTool } from './market-data.tool';
import type { PortfolioPerformanceTool } from './portfolio-performance.tool';
import type { RebalanceSimulatorTool } from './rebalance-simulator.tool';
import type { TransactionHistoryTool } from './transaction-history.tool';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ToolRegistry = Record<string, any>;

export interface ToolInstances {
  performanceTool: Pick<PortfolioPerformanceTool, 'execute'>;
  holdingsTool: Pick<GetHoldingsTool, 'execute'>;
  rulesReportTool: Pick<GetRulesReportTool, 'execute'>;
  marketDataTool: Pick<MarketDataTool, 'execute'>;
  transactionHistoryTool: Pick<TransactionHistoryTool, 'execute'>;
  rebalanceSimulatorTool: Pick<RebalanceSimulatorTool, 'execute'>;
}

/**
 * Creates Vercel AI SDK tool definitions from NestJS injectable tool classes.
 * The factory closes over userId so each tool execute() call is user-scoped.
 * Tool descriptions are written as prompts — the LLM reads them to decide
 * which tool to invoke.
 *
 * When toolOutputs is provided, each tool result is recorded into that Map
 * by tool name so the VerificationService can cross-reference outputs.
 */
export function createToolRegistry(
  tools: ToolInstances,
  userId: string,
  toolOutputs?: Map<string, ToolResponse<unknown>>,
  toolsCalled?: Set<string>,
  redactionService?: Pick<RedactionService, 'redactToolResponse'>
): ToolRegistry {
  const {
    performanceTool,
    holdingsTool,
    rulesReportTool,
    marketDataTool,
    transactionHistoryTool,
    rebalanceSimulatorTool
  } = tools;

  const capture = (name: string, result: ToolResponse<unknown>) => {
    if (toolOutputs) {
      toolOutputs.set(name, result);
    }
    if (toolsCalled) {
      toolsCalled.add(name);
    }

    if (!redactionService) {
      return result;
    }

    return redactionService.redactToolResponse(name, result);
  };

  return {
    portfolio_performance: tool({
      description:
        'Retrieves portfolio performance metrics including net returns, total investment value, ' +
        'current portfolio value, performance percentages (with and without currency effect), ' +
        'and annualized performance. Use this tool when the user asks about returns, gains/losses, ' +
        'portfolio growth, net worth, TWR/MWR, or how well their investments have performed over a time period.',
      parameters: PortfolioPerformanceInputSchema,
      execute: async (args) =>
        capture('portfolio_performance', await performanceTool.execute(args, userId))
    }),

    get_holdings: tool({
      description:
        'Retrieves the user\'s current portfolio holdings including each position\'s symbol, name, ' +
        'allocation percentage, value in base currency, asset class, and currency. Also returns ' +
        'total portfolio value. Use this tool when the user asks about what they own, their current ' +
        'holdings, portfolio composition, asset class breakdown, allocation percentages, ' +
        'concentration risks, or diversification.',
      parameters: GetHoldingsInputSchema,
      execute: async (args) =>
        capture('get_holdings', await holdingsTool.execute(args, userId))
    }),

    get_rules_report: tool({
      description:
        'Retrieves the portfolio risk and compliance rules report. Returns rule categories ' +
        '(e.g. emergency fund, fee ratio, political risk, currency risk) with pass/fail status ' +
        'for each rule, plus summary statistics (active rules count, fulfilled rules count). ' +
        'Use this tool when the user asks about portfolio risks, rule violations, compliance status, ' +
        'portfolio health checks, or whether their portfolio meets any guidelines or benchmarks.',
      parameters: GetRulesReportInputSchema,
      execute: async (args) =>
        capture('get_rules_report', await rulesReportTool.execute(args, userId))
    }),

    market_data: tool({
      description:
        'Retrieves current and historical market price data for specified stock/fund symbols. ' +
        'Returns time-series price data points with dates and market prices. ' +
        'Use this tool when the user asks about price history, current market prices, price trends, ' +
        'or how a specific stock or fund has performed in the market.',
      parameters: MarketDataInputSchema,
      execute: async (args) =>
        capture('market_data', await marketDataTool.execute(args, userId))
    }),

    transaction_history: tool({
      description:
        'Retrieves the user\'s transaction history including buys, sells, dividends, and fees. ' +
        'Returns a list of transactions with dates, types, symbols, quantities, and prices. ' +
        'Use this tool when the user asks about their recent trades, buy/sell history, ' +
        'dividend income, transaction patterns, or trading activity.',
      parameters: TransactionHistoryInputSchema,
      execute: async (args) =>
        capture('transaction_history', await transactionHistoryTool.execute(args, userId))
    }),

    rebalance_simulator: tool({
      description:
        'Simulates portfolio rebalancing by comparing current asset class allocations to target ' +
        'allocations and calculating proposed trades. This is a READ-ONLY simulation — no orders ' +
        'are created. Use this tool when the user asks about rebalancing, target allocation, what ' +
        'trades to make to reach a desired allocation, or how to adjust their portfolio mix.',
      parameters: RebalanceSimulatorInputSchema,
      execute: async (args) =>
        capture('rebalance_simulator', await rebalanceSimulatorTool.execute(args, userId))
    })
  };
}
