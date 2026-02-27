import { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';

import { Test, TestingModule } from '@nestjs/testing';

import { GetRulesReportTool } from './get-rules-report.tool';

const mockReportResponse = {
  xRay: {
    categories: [
      {
        key: 'account_cluster_risk',
        name: 'Account Cluster Risk',
        rules: [
          {
            evaluation: 'No significant account concentration detected',
            isActive: true,
            key: 'account_cluster_risk_current_investment',
            name: 'Account Cluster Risk (Current Investment)',
            value: true
          },
          {
            isActive: false,
            key: 'account_cluster_risk_initial_investment',
            name: 'Account Cluster Risk (Initial Investment)'
          }
        ]
      },
      {
        key: 'currency_cluster_risk',
        name: 'Currency Cluster Risk',
        rules: [
          {
            evaluation: 'High USD concentration: 95%',
            isActive: true,
            key: 'currency_cluster_risk_base_currency',
            name: 'Currency Cluster Risk (Base Currency)',
            value: false
          }
        ]
      }
    ],
    statistics: {
      rulesActiveCount: 2,
      rulesFulfilledCount: 1
    }
  }
};

describe('GetRulesReportTool', () => {
  let tool: GetRulesReportTool;
  let portfolioService: jest.Mocked<Pick<PortfolioService, 'getReport'>>;

  beforeEach(async () => {
    portfolioService = {
      getReport: jest.fn().mockResolvedValue(mockReportResponse)
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetRulesReportTool,
        { provide: PortfolioService, useValue: portfolioService }
      ]
    }).compile();

    tool = module.get<GetRulesReportTool>(GetRulesReportTool);
  });

  it('should be defined', () => {
    expect(tool).toBeDefined();
  });

  it('should call getReport with correct parameters', async () => {
    await tool.execute({}, 'user-123');

    expect(portfolioService.getReport).toHaveBeenCalledWith({
      impersonationId: undefined,
      userId: 'user-123'
    });
  });

  it('should return categories and statistics from xRay response', async () => {
    const result = await tool.execute({}, 'user-123');

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.categories).toHaveLength(2);
    expect(result.data!.statistics.rulesActiveCount).toBe(2);
    expect(result.data!.statistics.rulesFulfilledCount).toBe(1);
  });

  it('should correctly map rule categories with rules', async () => {
    const result = await tool.execute({}, 'user-123');

    expect(result.success).toBe(true);
    const accountCategory = result.data!.categories.find(
      (c) => c.key === 'account_cluster_risk'
    );
    expect(accountCategory).toBeDefined();
    expect(accountCategory!.name).toBe('Account Cluster Risk');
    expect(accountCategory!.rules).toHaveLength(2);

    const activeRule = accountCategory!.rules.find(
      (r) => r.key === 'account_cluster_risk_current_investment'
    );
    expect(activeRule!.isActive).toBe(true);
    expect(activeRule!.value).toBe(true);
    expect(activeRule!.evaluation).toBe(
      'No significant account concentration detected'
    );
  });

  it('should correctly identify violated rules (isActive=true, value=false)', async () => {
    const result = await tool.execute({}, 'user-123');

    expect(result.success).toBe(true);
    const currencyCategory = result.data!.categories.find(
      (c) => c.key === 'currency_cluster_risk'
    );
    const violatedRule = currencyCategory!.rules.find(
      (r) => r.key === 'currency_cluster_risk_base_currency'
    );
    expect(violatedRule!.isActive).toBe(true);
    expect(violatedRule!.value).toBe(false);
    expect(violatedRule!.evaluation).toBe('High USD concentration: 95%');
  });

  it('should correctly handle inactive rules (no evaluation or value)', async () => {
    const result = await tool.execute({}, 'user-123');

    expect(result.success).toBe(true);
    const accountCategory = result.data!.categories.find(
      (c) => c.key === 'account_cluster_risk'
    );
    const inactiveRule = accountCategory!.rules.find(
      (r) => r.key === 'account_cluster_risk_initial_investment'
    );
    expect(inactiveRule!.isActive).toBe(false);
    expect(inactiveRule!.value).toBeUndefined();
    expect(inactiveRule!.evaluation).toBeUndefined();
  });

  it('should return error envelope when service throws', async () => {
    portfolioService.getReport.mockRejectedValue(new Error('Rules service down'));

    const result = await tool.execute({}, 'user-123');

    expect(result.success).toBe(false);
    expect(result.data).toBeUndefined();
    expect(result.error).toBe('Rules service down');
  });

  it('should handle empty categories gracefully', async () => {
    portfolioService.getReport.mockResolvedValue({
      xRay: {
        categories: [],
        statistics: { rulesActiveCount: 0, rulesFulfilledCount: 0 }
      }
    });

    const result = await tool.execute({}, 'user-123');

    expect(result.success).toBe(true);
    expect(result.data!.categories).toHaveLength(0);
    expect(result.data!.statistics.rulesActiveCount).toBe(0);
  });
});
