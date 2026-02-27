import type { ToolResponse } from '../types';
import { RedactionService } from './redaction.service';

describe('RedactionService', () => {
  let service: RedactionService;

  beforeEach(() => {
    service = new RedactionService();
  });

  it('should replace account names with generic labels', () => {
    const result = service.redactToolResponse('get_holdings', {
      success: true,
      data: {
        holdings: [
          { accountName: 'Retirement Account', symbol: 'AAPL' },
          { accountName: 'Brokerage', symbol: 'MSFT' }
        ]
      }
    } as ToolResponse<unknown>);

    const holdings = (result.data as any).holdings;
    expect(holdings[0].accountName).toBe('Account A');
    expect(holdings[1].accountName).toBe('Account B');
  });

  it('should round value-like balances to nearest 100', () => {
    const result = service.redactToolResponse('portfolio_performance', {
      success: true,
      data: {
        currentValueInBaseCurrency: 12345,
        netPerformance: 9876
      }
    } as ToolResponse<unknown>);

    expect((result.data as any).currentValueInBaseCurrency).toBe(12300);
    expect((result.data as any).netPerformance).toBe(9900);
  });

  it('should strip email and username-like PII fields', () => {
    const result = service.redactToolResponse('transaction_history', {
      success: true,
      data: {
        accountOwnerName: 'Jane Doe',
        createdByUserName: 'jane.doe',
        email: 'jane@example.com',
        transactions: [{ symbol: 'NVDA' }]
      }
    } as ToolResponse<unknown>);

    const data = result.data as Record<string, unknown>;
    expect(data).not.toHaveProperty('accountOwnerName');
    expect(data).not.toHaveProperty('createdByUserName');
    expect(data).not.toHaveProperty('email');
    expect((data.transactions as Array<{ symbol: string }>)[0].symbol).toBe(
      'NVDA'
    );
  });
});
