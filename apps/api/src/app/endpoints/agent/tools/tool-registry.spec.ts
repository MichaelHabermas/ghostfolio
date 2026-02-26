import { createToolRegistry } from './tool-registry';

const mockPerformanceTool = {
  execute: jest.fn().mockResolvedValue({ success: true, data: { currentValueInBaseCurrency: 100000 } })
};

const mockHoldingsTool = {
  execute: jest.fn().mockResolvedValue({ success: true, data: { holdings: [], totalValueInBaseCurrency: 100000 } })
};

const mockRulesReportTool = {
  execute: jest.fn().mockResolvedValue({ success: true, data: { categories: [], statistics: { rulesActiveCount: 0, rulesFulfilledCount: 0 } } })
};

const mockMarketDataTool = {
  execute: jest.fn().mockResolvedValue({ success: true, data: { data: [] } })
};

const mockTransactionHistoryTool = {
  execute: jest.fn().mockResolvedValue({ success: true, data: { transactions: [], totalCount: 0 } })
};

const mockRebalanceSimulatorTool = {
  execute: jest.fn().mockResolvedValue({ success: true, data: { proposedTrades: [], allocationComparison: [], totalPortfolioValue: 0 } })
};

const allMockTools = {
  performanceTool: mockPerformanceTool as any,
  holdingsTool: mockHoldingsTool as any,
  rulesReportTool: mockRulesReportTool as any,
  marketDataTool: mockMarketDataTool as any,
  transactionHistoryTool: mockTransactionHistoryTool as any,
  rebalanceSimulatorTool: mockRebalanceSimulatorTool as any
};

describe('createToolRegistry', () => {
  const userId = 'user-test-123';

  let registry: ReturnType<typeof createToolRegistry>;

  beforeEach(() => {
    jest.clearAllMocks();
    registry = createToolRegistry(allMockTools, userId);
  });

  it('should return an object with exactly 6 tool definitions', () => {
    const keys = Object.keys(registry);
    expect(keys).toHaveLength(6);
  });

  it('should include portfolio_performance tool', () => {
    expect(registry).toHaveProperty('portfolio_performance');
  });

  it('should include get_holdings tool', () => {
    expect(registry).toHaveProperty('get_holdings');
  });

  it('should include get_rules_report tool', () => {
    expect(registry).toHaveProperty('get_rules_report');
  });

  it('should include market_data tool', () => {
    expect(registry).toHaveProperty('market_data');
  });

  it('should include transaction_history tool', () => {
    expect(registry).toHaveProperty('transaction_history');
  });

  it('should include rebalance_simulator tool', () => {
    expect(registry).toHaveProperty('rebalance_simulator');
  });

  it('each tool definition should have a description string', () => {
    for (const [, toolDef] of Object.entries(registry)) {
      expect(typeof (toolDef as any).description).toBe('string');
      expect((toolDef as any).description.length).toBeGreaterThan(10);
    }
  });

  it('each tool definition should have a parameters schema', () => {
    for (const [, toolDef] of Object.entries(registry)) {
      expect((toolDef as any).parameters).toBeDefined();
    }
  });

  it('portfolio_performance execute should delegate to performanceTool with userId', async () => {
    const args = { dateRange: '1y' as const };
    await (registry.portfolio_performance as any).execute(args);
    expect(mockPerformanceTool.execute).toHaveBeenCalledWith(args, userId);
  });

  it('get_holdings execute should delegate to holdingsTool with userId', async () => {
    const args = { dateRange: 'max' as const };
    await (registry.get_holdings as any).execute(args);
    expect(mockHoldingsTool.execute).toHaveBeenCalledWith(args, userId);
  });

  it('get_rules_report execute should delegate to rulesReportTool with userId', async () => {
    const args = {};
    await (registry.get_rules_report as any).execute(args);
    expect(mockRulesReportTool.execute).toHaveBeenCalledWith(args, userId);
  });

  it('market_data execute should delegate to marketDataTool with userId', async () => {
    const args = { symbols: ['AAPL'] };
    await (registry.market_data as any).execute(args);
    expect(mockMarketDataTool.execute).toHaveBeenCalledWith(args, userId);
  });

  it('transaction_history execute should delegate to transactionHistoryTool with userId', async () => {
    const args = {};
    await (registry.transaction_history as any).execute(args);
    expect(mockTransactionHistoryTool.execute).toHaveBeenCalledWith(args, userId);
  });

  it('rebalance_simulator execute should delegate to rebalanceSimulatorTool with userId', async () => {
    const args = { targetAllocations: [{ assetClass: 'EQUITY', targetPercentage: 60 }] };
    await (registry.rebalance_simulator as any).execute(args);
    expect(mockRebalanceSimulatorTool.execute).toHaveBeenCalledWith(args, userId);
  });

  it('tool descriptions should be detailed enough to guide LLM choice', () => {
    const perfDesc = (registry.portfolio_performance as any).description as string;
    const holdingsDesc = (registry.get_holdings as any).description as string;
    const rulesDesc = (registry.get_rules_report as any).description as string;
    const marketDesc = (registry.market_data as any).description as string;
    const txDesc = (registry.transaction_history as any).description as string;
    const rebalDesc = (registry.rebalance_simulator as any).description as string;

    expect(perfDesc.toLowerCase()).toContain('performance');
    expect(holdingsDesc.toLowerCase()).toContain('holdings');
    expect(rulesDesc.toLowerCase()).toContain('risk');
    expect(marketDesc.toLowerCase()).toContain('market');
    expect(txDesc.toLowerCase()).toContain('transaction');
    expect(rebalDesc.toLowerCase()).toContain('rebalanc');
  });

  describe('toolOutputs capture', () => {
    it('should record tool results into toolOutputs map when provided', async () => {
      const toolOutputs = new Map();
      const registryWithCapture = createToolRegistry(
        allMockTools,
        userId,
        toolOutputs
      );

      await (registryWithCapture.portfolio_performance as any).execute({});
      await (registryWithCapture.get_holdings as any).execute({});
      await (registryWithCapture.get_rules_report as any).execute({});
      await (registryWithCapture.market_data as any).execute({ symbols: ['AAPL'] });
      await (registryWithCapture.transaction_history as any).execute({});
      await (registryWithCapture.rebalance_simulator as any).execute({ targetAllocations: [] });

      expect(toolOutputs.has('portfolio_performance')).toBe(true);
      expect(toolOutputs.has('get_holdings')).toBe(true);
      expect(toolOutputs.has('get_rules_report')).toBe(true);
      expect(toolOutputs.has('market_data')).toBe(true);
      expect(toolOutputs.has('transaction_history')).toBe(true);
      expect(toolOutputs.has('rebalance_simulator')).toBe(true);
    });

    it('should not fail when toolOutputs is not provided', async () => {
      await expect(
        (registry.portfolio_performance as any).execute({})
      ).resolves.toBeDefined();
    });
  });
});
