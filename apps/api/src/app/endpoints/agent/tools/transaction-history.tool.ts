import { OrderService } from '@ghostfolio/api/app/order/order.service';
import { UserService } from '@ghostfolio/api/app/user/user.service';
import { DEFAULT_CURRENCY } from '@ghostfolio/common/config';

import { Injectable, Logger } from '@nestjs/common';

import type {
  TransactionHistoryInput,
  TransactionHistoryOutput
} from '../schemas';
import type { ToolResponse } from '../types';

@Injectable()
export class TransactionHistoryTool {
  private readonly logger = new Logger(TransactionHistoryTool.name);

  public constructor(
    private readonly orderService: OrderService,
    private readonly userService: UserService
  ) {}

  public async execute(
    input: TransactionHistoryInput,
    userId = ''
  ): Promise<ToolResponse<TransactionHistoryOutput>> {
    try {
      const user = await this.userService.user({ id: userId });
      const userCurrency =
        (user?.Settings?.settings as { baseCurrency?: string })
          ?.baseCurrency ?? DEFAULT_CURRENCY;

      const filters = input.accountIds?.map((id) => ({
        id,
        type: 'ACCOUNT' as const
      }));

      const result = await this.orderService.getOrders({
        endDate: input.endDate ? new Date(input.endDate) : undefined,
        filters,
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        userCurrency,
        userId
      });

      const transactions = result.activities.map((activity) => ({
        accountName: activity.Account?.name ?? undefined,
        currency: activity.SymbolProfile?.currency ?? userCurrency,
        date: activity.date.toISOString(),
        fee: Number(activity.fee),
        id: activity.id,
        quantity: Number(activity.quantity),
        symbol: activity.SymbolProfile?.symbol ?? null,
        type: activity.type as TransactionHistoryOutput['transactions'][number]['type'],
        unitPrice: Number(activity.unitPrice)
      }));

      return {
        data: { totalCount: result.count, transactions },
        success: true
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`transaction_history tool failed: ${message}`);

      return { error: message, success: false };
    }
  }
}
