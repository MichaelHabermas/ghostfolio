import { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';

import { Injectable, Logger } from '@nestjs/common';

import type { GetRulesReportInput, GetRulesReportOutput } from '../schemas';
import type { ToolResponse } from '../types';

@Injectable()
export class GetRulesReportTool {
  private readonly logger = new Logger(GetRulesReportTool.name);

  public constructor(private readonly portfolioService: PortfolioService) {}

  public async execute(
    _input: GetRulesReportInput,
    userId = ''
  ): Promise<ToolResponse<GetRulesReportOutput>> {
    try {
      const result = await this.portfolioService.getReport({
        impersonationId: undefined,
        userId
      });

      const categories = result.xRay.categories.map((category) => ({
        key: category.key,
        name: category.name,
        rules: (category.rules ?? []).map((rule) => ({
          evaluation: rule.evaluation,
          isActive: rule.isActive,
          key: rule.key,
          name: rule.name,
          value: rule.value
        }))
      }));

      return {
        data: {
          categories,
          statistics: result.xRay.statistics
        },
        success: true
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`get_rules_report tool failed: ${message}`);

      return { error: message, success: false };
    }
  }
}
