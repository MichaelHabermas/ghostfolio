import { OrderService } from '@ghostfolio/api/app/order/order.service';
import { UserService } from '@ghostfolio/api/app/user/user.service';

import { Test, TestingModule } from '@nestjs/testing';

import { TransactionHistoryTool } from './transaction-history.tool';

const mockUser = {
  Settings: {
    settings: { baseCurrency: 'USD' },
    updatedAt: new Date(),
    userId: 'user-123'
  },
  id: 'user-123'
};

const mockActivities = {
  activities: [
    {
      Account: { name: 'Main Brokerage' },
      SymbolProfile: { currency: 'USD', symbol: 'AAPL' },
      date: new Date('2024-01-15'),
      fee: 0,
      id: 'order-1',
      quantity: 10,
      type: 'BUY',
      unitPrice: 185.5
    },
    {
      Account: { name: 'Main Brokerage' },
      SymbolProfile: { currency: 'USD', symbol: 'MSFT' },
      date: new Date('2024-01-20'),
      fee: 1.5,
      id: 'order-2',
      quantity: 5,
      type: 'BUY',
      unitPrice: 390.0
    },
    {
      Account: null,
      SymbolProfile: { currency: 'USD', symbol: 'AAPL' },
      date: new Date('2024-02-01'),
      fee: 0,
      id: 'order-3',
      quantity: 10,
      type: 'DIVIDEND',
      unitPrice: 0.96
    }
  ],
  count: 3
};

describe('TransactionHistoryTool', () => {
  let tool: TransactionHistoryTool;
  let orderService: { getOrders: jest.Mock };
  let userService: { user: jest.Mock };

  beforeEach(async () => {
    orderService = {
      getOrders: jest.fn().mockResolvedValue(mockActivities)
    };

    userService = {
      user: jest.fn().mockResolvedValue(mockUser)
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionHistoryTool,
        { provide: OrderService, useValue: orderService },
        { provide: UserService, useValue: userService }
      ]
    }).compile();

    tool = module.get<TransactionHistoryTool>(TransactionHistoryTool);
  });

  it('should be defined', () => {
    expect(tool).toBeDefined();
  });

  it('should return mapped transactions', async () => {
    const result = await tool.execute({}, 'user-123');

    expect(result.success).toBe(true);
    expect(result.data!.transactions).toHaveLength(3);
    expect(result.data!.totalCount).toBe(3);

    const first = result.data!.transactions[0];
    expect(first.symbol).toBe('AAPL');
    expect(first.type).toBe('BUY');
    expect(first.quantity).toBe(10);
    expect(first.unitPrice).toBe(185.5);
    expect(first.accountName).toBe('Main Brokerage');
  });

  it('should look up user currency and pass to getOrders', async () => {
    await tool.execute({}, 'user-123');

    expect(userService.user).toHaveBeenCalledWith({ id: 'user-123' });
    expect(orderService.getOrders).toHaveBeenCalledWith(
      expect.objectContaining({
        userCurrency: 'USD',
        userId: 'user-123'
      })
    );
  });

  it('should pass date filters when provided', async () => {
    await tool.execute(
      { endDate: '2024-02-01', startDate: '2024-01-01' },
      'user-123'
    );

    expect(orderService.getOrders).toHaveBeenCalledWith(
      expect.objectContaining({
        endDate: new Date('2024-02-01'),
        startDate: new Date('2024-01-01')
      })
    );
  });

  it('should pass account filters when provided', async () => {
    await tool.execute({ accountIds: ['acc-1'] }, 'user-123');

    expect(orderService.getOrders).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: [{ id: 'acc-1', type: 'ACCOUNT' }]
      })
    );
  });

  it('should handle activities with no account gracefully', async () => {
    const result = await tool.execute({}, 'user-123');

    const dividend = result.data!.transactions[2];
    expect(dividend.accountName).toBeUndefined();
    expect(dividend.type).toBe('DIVIDEND');
  });

  it('should return empty transactions when no orders exist', async () => {
    orderService.getOrders.mockResolvedValue({ activities: [], count: 0 });

    const result = await tool.execute({}, 'user-123');

    expect(result.success).toBe(true);
    expect(result.data!.transactions).toEqual([]);
    expect(result.data!.totalCount).toBe(0);
  });

  it('should use default currency when user has no settings', async () => {
    userService.user.mockResolvedValue({
      Settings: { settings: {} },
      id: 'user-123'
    });

    await tool.execute({}, 'user-123');

    expect(orderService.getOrders).toHaveBeenCalledWith(
      expect.objectContaining({ userCurrency: 'USD' })
    );
  });

  it('should return error envelope when service throws', async () => {
    orderService.getOrders.mockRejectedValue(
      new Error('Database timeout')
    );

    const result = await tool.execute({}, 'user-123');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Database timeout');
    expect(result.data).toBeUndefined();
  });
});
