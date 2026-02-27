import { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';

import { Test, TestingModule } from '@nestjs/testing';

import { PortfolioPerformanceTool } from './portfolio-performance.tool';

const mockPerformanceResponse = {
  chart: [],
  firstOrderDate: new Date('2023-01-01'),
  hasErrors: false,
  performance: {
    annualizedPerformancePercent: 0.12,
    currentNetWorth: 105000,
    currentValueInBaseCurrency: 105000,
    grossPerformance: 5000,
    grossPerformancePercentage: 0.05,
    grossPerformancePercentageWithCurrencyEffect: 0.05,
    grossPerformanceWithCurrencyEffect: 5000,
    netPerformance: 4800,
    netPerformancePercentage: 0.048,
    netPerformancePercentageWithCurrencyEffect: 0.048,
    netPerformanceWithCurrencyEffect: 4800,
    totalInvestment: 100000,
    totalInvestmentValueWithCurrencyEffect: 100000
  }
};

describe('PortfolioPerformanceTool', () => {
  let tool: PortfolioPerformanceTool;
  let portfolioService: jest.Mocked<Pick<PortfolioService, 'getPerformance'>>;

  beforeEach(async () => {
    portfolioService = {
      getPerformance: jest.fn().mockResolvedValue(mockPerformanceResponse)
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PortfolioPerformanceTool,
        { provide: PortfolioService, useValue: portfolioService }
      ]
    }).compile();

    tool = module.get<PortfolioPerformanceTool>(PortfolioPerformanceTool);
  });

  it('should be defined', () => {
    expect(tool).toBeDefined();
  });

  it('should call getPerformance with correct parameters and return mapped output', async () => {
    const result = await tool.execute(
      { dateRange: '1y', accountIds: undefined },
      'user-123'
    );

    expect(portfolioService.getPerformance).toHaveBeenCalledWith({
      dateRange: '1y',
      filters: undefined,
      impersonationId: undefined,
      userId: 'user-123'
    });

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.netPerformance).toBe(4800);
    expect(result.data!.netPerformancePercentage).toBe(0.048);
    expect(result.data!.currentValueInBaseCurrency).toBe(105000);
    expect(result.data!.totalInvestment).toBe(100000);
  });

  it('should map accountIds to ACCOUNT filters', async () => {
    await tool.execute(
      { dateRange: 'max', accountIds: ['acc-1', 'acc-2'] },
      'user-456'
    );

    expect(portfolioService.getPerformance).toHaveBeenCalledWith({
      dateRange: 'max',
      filters: [
        { id: 'acc-1', type: 'ACCOUNT' },
        { id: 'acc-2', type: 'ACCOUNT' }
      ],
      impersonationId: undefined,
      userId: 'user-456'
    });
  });

  it('should use default dateRange of "max" when not specified', async () => {
    await tool.execute({ dateRange: 'max', accountIds: undefined }, 'user-789');

    expect(portfolioService.getPerformance).toHaveBeenCalledWith(
      expect.objectContaining({ dateRange: 'max' })
    );
  });

  it('should return error envelope when service throws', async () => {
    portfolioService.getPerformance.mockRejectedValue(
      new Error('Database timeout')
    );

    const result = await tool.execute({ dateRange: 'max' }, 'user-123');

    expect(result.success).toBe(false);
    expect(result.data).toBeUndefined();
    expect(result.error).toBe('Database timeout');
  });

  it('should return error envelope when service returns hasErrors=true with no performance', async () => {
    portfolioService.getPerformance.mockResolvedValue({
      ...mockPerformanceResponse,
      hasErrors: true,
      performance: null as any
    });

    const result = await tool.execute({ dateRange: 'max' }, 'user-123');

    expect(result.success).toBe(false);
    expect(result.error).toContain('portfolio performance data');
  });

  it('should include optional annualizedPerformancePercent when available', async () => {
    const result = await tool.execute({ dateRange: '1y' }, 'user-123');

    expect(result.success).toBe(true);
    expect(result.data!.annualizedPerformancePercent).toBe(0.12);
  });
});
