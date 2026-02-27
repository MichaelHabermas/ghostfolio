import { MarketDataService } from '@ghostfolio/api/services/market-data/market-data.service';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';

import { Test, TestingModule } from '@nestjs/testing';

import { MarketDataTool } from './market-data.tool';

const mockProfiles = [
  { currency: 'USD', dataSource: 'YAHOO', symbol: 'AAPL' },
  { currency: 'USD', dataSource: 'YAHOO', symbol: 'MSFT' }
];

const mockMarketData = [
  {
    dataSource: 'YAHOO',
    date: new Date('2024-01-15'),
    marketPrice: 185.5,
    state: 'CLOSE',
    symbol: 'AAPL'
  },
  {
    dataSource: 'YAHOO',
    date: new Date('2024-01-16'),
    marketPrice: 187.0,
    state: 'CLOSE',
    symbol: 'AAPL'
  },
  {
    dataSource: 'YAHOO',
    date: new Date('2024-01-15'),
    marketPrice: 390.2,
    state: 'CLOSE',
    symbol: 'MSFT'
  }
];

describe('MarketDataTool', () => {
  let tool: MarketDataTool;
  let marketDataService: { getRange: jest.Mock };
  let prismaService: { symbolProfile: { findMany: jest.Mock } };

  beforeEach(async () => {
    marketDataService = {
      getRange: jest.fn().mockResolvedValue(mockMarketData)
    };

    prismaService = {
      symbolProfile: {
        findMany: jest.fn().mockResolvedValue(mockProfiles)
      }
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketDataTool,
        { provide: MarketDataService, useValue: marketDataService },
        { provide: PrismaService, useValue: prismaService }
      ]
    }).compile();

    tool = module.get<MarketDataTool>(MarketDataTool);
  });

  it('should be defined', () => {
    expect(tool).toBeDefined();
  });

  it('should resolve symbols and return grouped market data', async () => {
    const result = await tool.execute(
      { symbols: ['AAPL', 'MSFT'] },
      'user-123'
    );

    expect(result.success).toBe(true);
    expect(result.data!.data).toHaveLength(2);

    const aapl = result.data!.data.find((d) => d.symbol === 'AAPL');
    expect(aapl).toBeDefined();
    expect(aapl!.dataPoints).toHaveLength(2);
    expect(aapl!.currency).toBe('USD');

    const msft = result.data!.data.find((d) => d.symbol === 'MSFT');
    expect(msft).toBeDefined();
    expect(msft!.dataPoints).toHaveLength(1);
  });

  it('should pass resolved AssetProfileIdentifiers to getRange', async () => {
    await tool.execute({ symbols: ['AAPL'] }, 'user-123');

    expect(marketDataService.getRange).toHaveBeenCalledWith(
      expect.objectContaining({
        assetProfileIdentifiers: expect.arrayContaining([
          { dataSource: 'YAHOO', symbol: 'AAPL' }
        ])
      })
    );
  });

  it('should use custom date range when provided', async () => {
    await tool.execute(
      {
        endDate: '2024-02-01',
        startDate: '2024-01-01',
        symbols: ['AAPL']
      },
      'user-123'
    );

    const call = marketDataService.getRange.mock.calls[0][0];
    expect(call.dateQuery.gte).toEqual(new Date('2024-01-01'));
    expect(call.dateQuery.lt).toEqual(new Date('2024-02-01'));
  });

  it('should return empty data for unknown symbols', async () => {
    prismaService.symbolProfile.findMany.mockResolvedValue([]);

    const result = await tool.execute({ symbols: ['UNKNOWN'] }, 'user-123');

    expect(result.success).toBe(true);
    expect(result.data!.data).toEqual([]);
    expect(marketDataService.getRange).not.toHaveBeenCalled();
  });

  it('should return empty dataPoints for symbols with no market data', async () => {
    marketDataService.getRange.mockResolvedValue([]);

    const result = await tool.execute({ symbols: ['AAPL'] }, 'user-123');

    expect(result.success).toBe(true);
    const aapl = result.data!.data.find((d) => d.symbol === 'AAPL');
    expect(aapl!.dataPoints).toEqual([]);
  });

  it('should return error envelope when service throws', async () => {
    marketDataService.getRange.mockRejectedValue(
      new Error('Market data unavailable')
    );

    const result = await tool.execute({ symbols: ['AAPL'] }, 'user-123');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Market data unavailable');
    expect(result.data).toBeUndefined();
  });
});
