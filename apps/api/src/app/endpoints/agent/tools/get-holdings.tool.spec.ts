import { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';

import { Test, TestingModule } from '@nestjs/testing';

import { GetHoldingsTool } from './get-holdings.tool';

const mockDetailsResponse: any = {
  accounts: {},
  createdAt: new Date('2026-01-01'),
  hasErrors: false,
  holdings: {
    AAPL: {
      activitiesCount: 3,
      allocationInPercentage: 0.4,
      assetClass: 'EQUITY' as any,
      assetSubClass: 'STOCK' as any,
      countries: [],
      currency: 'USD',
      dataSource: 'YAHOO' as any,
      dateOfFirstActivity: new Date('2023-01-01'),
      dividend: 0,
      grossPerformance: 2000,
      grossPerformancePercent: 0.1,
      grossPerformancePercentWithCurrencyEffect: 0.1,
      grossPerformanceWithCurrencyEffect: 2000,
      holdings: [],
      investment: 20000,
      marketPrice: 165,
      name: 'Apple Inc.',
      netPerformance: 1900,
      netPerformancePercent: 0.095,
      netPerformancePercentWithCurrencyEffect: 0.095,
      netPerformanceWithCurrencyEffect: 1900,
      quantity: 132.12,
      sectors: [],
      symbol: 'AAPL',
      tags: [],
      url: null,
      valueInBaseCurrency: 22000
    },
    BOND: {
      activitiesCount: 1,
      allocationInPercentage: 0.6,
      assetClass: 'FIXED_INCOME' as any,
      assetSubClass: 'BOND' as any,
      countries: [],
      currency: 'USD',
      dataSource: 'YAHOO' as any,
      dateOfFirstActivity: new Date('2023-01-01'),
      dividend: 0,
      grossPerformance: 300,
      grossPerformancePercent: 0.01,
      grossPerformancePercentWithCurrencyEffect: 0.01,
      grossPerformanceWithCurrencyEffect: 300,
      holdings: [],
      investment: 30000,
      marketPrice: 1010,
      name: 'US Treasury Bond',
      netPerformance: 290,
      netPerformancePercent: 0.0097,
      netPerformancePercentWithCurrencyEffect: 0.0097,
      netPerformanceWithCurrencyEffect: 290,
      quantity: 33,
      sectors: [],
      symbol: 'BOND',
      tags: [],
      url: null,
      valueInBaseCurrency: 33330
    }
  },
  platforms: {},
  summary: {
    balanceInBaseCurrency: 0,
    cash: 0,
    committedFunds: 0,
    currentGrossPerformance: 2300,
    currentGrossPerformancePercent: 0.046,
    currentGrossPerformancePercentWithCurrencyEffect: 0.046,
    currentGrossPerformanceWithCurrencyEffect: 2300,
    currentNetPerformance: 2190,
    currentNetPerformancePercent: 0.0438,
    currentNetPerformancePercentWithCurrencyEffect: 0.0438,
    currentNetPerformanceWithCurrencyEffect: 2190,
    currentValueInBaseCurrency: 55330,
    dividend: 0,
    dividendInBaseCurrency: 0,
    emergencyFund: { assets: [], total: 0 },
    excludedAccountsAndActivities: 0,
    fees: 110,
    feesWithCurrencyEffect: 110,
    fireWealth: 0,
    firstOrderDate: new Date('2023-01-01'),
    grossPerformance: 2300,
    grossPerformanceWithCurrencyEffect: 2300,
    hasErrors: false,
    interest: 0,
    interestInBaseCurrency: 0,
    items: 0,
    liabilities: 0,
    liabilitiesInBaseCurrency: 0,
    netPerformance: 2190,
    netPerformanceWithCurrencyEffect: 2190,
    totalBuy: 50000,
    totalInvestment: 50000,
    totalSell: 0,
    valuables: 0,
    valuablesInBaseCurrency: 0
  }
};

describe('GetHoldingsTool', () => {
  let tool: GetHoldingsTool;
  let portfolioService: jest.Mocked<Pick<PortfolioService, 'getDetails'>>;

  beforeEach(async () => {
    portfolioService = {
      getDetails: jest.fn().mockResolvedValue(mockDetailsResponse)
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetHoldingsTool,
        { provide: PortfolioService, useValue: portfolioService }
      ]
    }).compile();

    tool = module.get<GetHoldingsTool>(GetHoldingsTool);
  });

  it('should be defined', () => {
    expect(tool).toBeDefined();
  });

  it('should call getDetails with correct parameters and return holdings array', async () => {
    const result = await tool.execute(
      { dateRange: '1y', accountIds: undefined },
      'user-123'
    );

    expect(portfolioService.getDetails).toHaveBeenCalledWith({
      dateRange: '1y',
      filters: undefined,
      impersonationId: undefined,
      userId: 'user-123',
      withSummary: true
    });

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.holdings).toHaveLength(2);
  });

  it('should correctly convert holdings map to array with proper field mapping', async () => {
    const result = await tool.execute({ dateRange: 'max' }, 'user-123');

    expect(result.success).toBe(true);
    const aapl = result.data!.holdings.find((h) => h.symbol === 'AAPL');
    expect(aapl).toBeDefined();
    expect(aapl!.name).toBe('Apple Inc.');
    expect(aapl!.allocationInPercentage).toBe(0.4);
    expect(aapl!.valueInBaseCurrency).toBe(22000);
    expect(aapl!.currency).toBe('USD');
    expect(aapl!.assetClass).toBe('EQUITY');
    expect(aapl!.assetSubClass).toBe('STOCK');
    expect(aapl!.marketPrice).toBe(165);
    expect(aapl!.quantity).toBe(132.12);
  });

  it('should include totalValueInBaseCurrency from summary', async () => {
    const result = await tool.execute({ dateRange: 'max' }, 'user-123');

    expect(result.success).toBe(true);
    expect(result.data!.totalValueInBaseCurrency).toBe(55330);
  });

  it('should map accountIds to ACCOUNT filters', async () => {
    await tool.execute({ dateRange: 'max', accountIds: ['acc-1'] }, 'user-456');

    expect(portfolioService.getDetails).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: [{ id: 'acc-1', type: 'ACCOUNT' }]
      })
    );
  });

  it('should handle nullable assetClass and assetSubClass', async () => {
    portfolioService.getDetails.mockResolvedValue({
      ...mockDetailsResponse,
      holdings: {
        CASH: {
          ...mockDetailsResponse.holdings['AAPL'],
          assetClass: undefined,
          assetSubClass: undefined,
          name: 'Cash',
          symbol: 'CASH'
        }
      }
    });

    const result = await tool.execute({ dateRange: 'max' }, 'user-123');

    expect(result.success).toBe(true);
    const cash = result.data!.holdings.find((h) => h.symbol === 'CASH');
    expect(cash!.assetClass).toBeNull();
    expect(cash!.assetSubClass).toBeNull();
    // null values in schema map from undefined/null from service
  });

  it('should return error envelope when service throws', async () => {
    portfolioService.getDetails.mockRejectedValue(new Error('DB error'));

    const result = await tool.execute({ dateRange: 'max' }, 'user-123');

    expect(result.success).toBe(false);
    expect(result.data).toBeUndefined();
    expect(result.error).toBe('DB error');
  });

  it('should fall back to summing holding values when summary is unavailable', async () => {
    portfolioService.getDetails.mockResolvedValue({
      ...mockDetailsResponse,
      summary: undefined as any
    });

    const result = await tool.execute({ dateRange: 'max' }, 'user-123');

    expect(result.success).toBe(true);
    // 22000 (AAPL) + 33330 (BOND) = 55330
    expect(result.data!.totalValueInBaseCurrency).toBe(55330);
  });
});
