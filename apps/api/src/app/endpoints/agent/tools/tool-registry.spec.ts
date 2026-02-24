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

describe('createToolRegistry', () => {
  const userId = 'user-test-123';

  let registry: ReturnType<typeof createToolRegistry>;

  beforeEach(() => {
    jest.clearAllMocks();
    registry = createToolRegistry(
      {
        performanceTool: mockPerformanceTool as any,
        holdingsTool: mockHoldingsTool as any,
        rulesReportTool: mockRulesReportTool as any
      },
      userId
    );
  });

  it('should return an object with exactly 3 tool definitions', () => {
    const keys = Object.keys(registry);
    expect(keys).toHaveLength(3);
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

  it('tool descriptions should be detailed enough to guide LLM choice', () => {
    const perfDesc = (registry.portfolio_performance as any).description as string;
    const holdingsDesc = (registry.get_holdings as any).description as string;
    const rulesDesc = (registry.get_rules_report as any).description as string;

    expect(perfDesc.toLowerCase()).toContain('performance');
    expect(holdingsDesc.toLowerCase()).toContain('holdings');
    expect(rulesDesc.toLowerCase()).toContain('risk');
  });

  describe('toolOutputs capture', () => {
    it('should record tool results into toolOutputs map when provided', async () => {
      const toolOutputs = new Map();
      const registryWithCapture = createToolRegistry(
        {
          performanceTool: mockPerformanceTool as any,
          holdingsTool: mockHoldingsTool as any,
          rulesReportTool: mockRulesReportTool as any
        },
        userId,
        toolOutputs
      );

      await (registryWithCapture.portfolio_performance as any).execute({});
      await (registryWithCapture.get_holdings as any).execute({});
      await (registryWithCapture.get_rules_report as any).execute({});

      expect(toolOutputs.has('portfolio_performance')).toBe(true);
      expect(toolOutputs.has('get_holdings')).toBe(true);
      expect(toolOutputs.has('get_rules_report')).toBe(true);
    });

    it('should not fail when toolOutputs is not provided', async () => {
      await expect(
        (registry.portfolio_performance as any).execute({})
      ).resolves.toBeDefined();
    });
  });
});
