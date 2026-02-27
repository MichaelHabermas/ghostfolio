import { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';

import { Test, TestingModule } from '@nestjs/testing';

import { RebalanceSimulatorTool } from './rebalance-simulator.tool';

const mockPortfolioDetails = {
  accounts: {},
  createdAt: new Date(),
  hasErrors: false,
  holdings: {
    AAPL: {
      assetClass: 'EQUITY',
      name: 'Apple Inc.',
      symbol: 'AAPL',
      valueInBaseCurrency: 6000
    },
    BND: {
      assetClass: 'FIXED_INCOME',
      name: 'Vanguard Total Bond',
      symbol: 'BND',
      valueInBaseCurrency: 4000
    }
  },
  platforms: {},
  summary: {
    currentValueInBaseCurrency: 10000
  }
};

describe('RebalanceSimulatorTool', () => {
  let tool: RebalanceSimulatorTool;
  let portfolioService: { getDetails: jest.Mock };

  beforeEach(async () => {
    portfolioService = {
      getDetails: jest.fn().mockResolvedValue(mockPortfolioDetails)
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RebalanceSimulatorTool,
        { provide: PortfolioService, useValue: portfolioService }
      ]
    }).compile();

    tool = module.get<RebalanceSimulatorTool>(RebalanceSimulatorTool);
  });

  it('should be defined', () => {
    expect(tool).toBeDefined();
  });

  it('should calculate rebalancing from 60/40 to 50/50', async () => {
    const result = await tool.execute(
      {
        targetAllocations: [
          { assetClass: 'EQUITY', targetPercentage: 50 },
          { assetClass: 'FIXED_INCOME', targetPercentage: 50 }
        ]
      },
      'user-123'
    );

    expect(result.success).toBe(true);
    expect(result.data!.totalPortfolioValue).toBe(10000);

    const equityComparison = result.data!.allocationComparison.find(
      (a) => a.assetClass === 'EQUITY'
    );
    expect(equityComparison!.currentPercentage).toBe(60);
    expect(equityComparison!.targetPercentage).toBe(50);
    expect(equityComparison!.differencePercentage).toBe(-10);

    const aaplTrade = result.data!.proposedTrades.find(
      (t) => t.symbol === 'AAPL'
    );
    expect(aaplTrade!.action).toBe('SELL');
    expect(aaplTrade!.currentValueInBaseCurrency).toBe(6000);
    expect(aaplTrade!.targetValueInBaseCurrency).toBe(5000);
    expect(aaplTrade!.differenceInBaseCurrency).toBe(-1000);

    const bndTrade = result.data!.proposedTrades.find(
      (t) => t.symbol === 'BND'
    );
    expect(bndTrade!.action).toBe('BUY');
    expect(bndTrade!.differenceInBaseCurrency).toBe(1000);
  });

  it('should return HOLD when already at target', async () => {
    const result = await tool.execute(
      {
        targetAllocations: [
          { assetClass: 'EQUITY', targetPercentage: 60 },
          { assetClass: 'FIXED_INCOME', targetPercentage: 40 }
        ]
      },
      'user-123'
    );

    expect(result.success).toBe(true);

    for (const trade of result.data!.proposedTrades) {
      expect(trade.action).toBe('HOLD');
    }
  });

  it('should handle empty portfolio', async () => {
    portfolioService.getDetails.mockResolvedValue({
      ...mockPortfolioDetails,
      holdings: {},
      summary: { currentValueInBaseCurrency: 0 }
    });

    const result = await tool.execute(
      { targetAllocations: [{ assetClass: 'EQUITY', targetPercentage: 60 }] },
      'user-123'
    );

    expect(result.success).toBe(true);
    expect(result.data!.proposedTrades).toEqual([]);
    expect(result.data!.totalPortfolioValue).toBe(0);
  });

  it('should handle single holding portfolio', async () => {
    portfolioService.getDetails.mockResolvedValue({
      ...mockPortfolioDetails,
      holdings: {
        AAPL: {
          assetClass: 'EQUITY',
          name: 'Apple Inc.',
          symbol: 'AAPL',
          valueInBaseCurrency: 10000
        }
      },
      summary: { currentValueInBaseCurrency: 10000 }
    });

    const result = await tool.execute(
      {
        targetAllocations: [
          { assetClass: 'EQUITY', targetPercentage: 60 },
          { assetClass: 'FIXED_INCOME', targetPercentage: 40 }
        ]
      },
      'user-123'
    );

    expect(result.success).toBe(true);

    const aaplTrade = result.data!.proposedTrades[0];
    expect(aaplTrade.action).toBe('SELL');
    expect(aaplTrade.targetValueInBaseCurrency).toBe(6000);

    const fiComparison = result.data!.allocationComparison.find(
      (a) => a.assetClass === 'FIXED_INCOME'
    );
    expect(fiComparison!.currentPercentage).toBe(0);
    expect(fiComparison!.targetPercentage).toBe(40);
  });

  it('should handle UNKNOWN asset class', async () => {
    portfolioService.getDetails.mockResolvedValue({
      ...mockPortfolioDetails,
      holdings: {
        CRYPTO: {
          assetClass: null,
          name: 'Some Crypto',
          symbol: 'CRYPTO',
          valueInBaseCurrency: 1000
        }
      },
      summary: { currentValueInBaseCurrency: 1000 }
    });

    const result = await tool.execute(
      { targetAllocations: [{ assetClass: 'EQUITY', targetPercentage: 100 }] },
      'user-123'
    );

    expect(result.success).toBe(true);
    const trade = result.data!.proposedTrades[0];
    expect(trade.assetClass).toBeNull();
  });

  it('should call getDetails with correct parameters', async () => {
    await tool.execute(
      { targetAllocations: [{ assetClass: 'EQUITY', targetPercentage: 100 }] },
      'user-123'
    );

    expect(portfolioService.getDetails).toHaveBeenCalledWith({
      impersonationId: undefined,
      userId: 'user-123',
      withSummary: true
    });
  });

  it('should return error envelope when service throws', async () => {
    portfolioService.getDetails.mockRejectedValue(
      new Error('Portfolio data unavailable')
    );

    const result = await tool.execute(
      { targetAllocations: [{ assetClass: 'EQUITY', targetPercentage: 60 }] },
      'user-123'
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('Portfolio data unavailable');
    expect(result.data).toBeUndefined();
  });
});
