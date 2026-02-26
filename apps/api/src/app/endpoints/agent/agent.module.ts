import { AccountBalanceService } from '@ghostfolio/api/app/account-balance/account-balance.service';
import { AccountService } from '@ghostfolio/api/app/account/account.service';
import { OrderModule } from '@ghostfolio/api/app/order/order.module';
import { PortfolioCalculatorFactory } from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator.factory';
import { CurrentRateService } from '@ghostfolio/api/app/portfolio/current-rate.service';
import { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';
import { RulesService } from '@ghostfolio/api/app/portfolio/rules.service';
import { RedisCacheModule } from '@ghostfolio/api/app/redis-cache/redis-cache.module';
import { UserModule } from '@ghostfolio/api/app/user/user.module';
import { ApiModule } from '@ghostfolio/api/services/api/api.module';
import { BenchmarkModule } from '@ghostfolio/api/services/benchmark/benchmark.module';
import { ConfigurationModule } from '@ghostfolio/api/services/configuration/configuration.module';
import { DataProviderModule } from '@ghostfolio/api/services/data-provider/data-provider.module';
import { ExchangeRateDataModule } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.module';
import { I18nModule } from '@ghostfolio/api/services/i18n/i18n.module';
import { ImpersonationModule } from '@ghostfolio/api/services/impersonation/impersonation.module';
import { MarketDataModule } from '@ghostfolio/api/services/market-data/market-data.module';
import { MarketDataService } from '@ghostfolio/api/services/market-data/market-data.service';
import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';
import { PropertyModule } from '@ghostfolio/api/services/property/property.module';
import { PortfolioSnapshotQueueModule } from '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.module';
import { SymbolProfileModule } from '@ghostfolio/api/services/symbol-profile/symbol-profile.module';

import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';

import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { ErrorMapperService } from './errors/error-mapper.service';
import { ResponseFormatter } from './formatters/response-formatter';
import { ConversationMemory } from './memory/conversation-memory';
import { LangfuseService } from './observability/langfuse.service';
import { RedactionService } from './redaction/redaction.service';
import { UserThrottlerGuard } from './security/user-throttler.guard';
import { InputValidationService } from './validation/input-validation.service';
import { GetHoldingsTool } from './tools/get-holdings.tool';
import { GetRulesReportTool } from './tools/get-rules-report.tool';
import { MarketDataTool } from './tools/market-data.tool';
import { PortfolioPerformanceTool } from './tools/portfolio-performance.tool';
import { RebalanceSimulatorTool } from './tools/rebalance-simulator.tool';
import { TransactionHistoryTool } from './tools/transaction-history.tool';
import { EscalationChecker } from './verification/escalation.checker';
import { MathConsistencyChecker } from './verification/math-consistency.checker';
import { RulesValidationChecker } from './verification/rules-validation.checker';
import { SourceCitationChecker } from './verification/source-citation.checker';
import { VerificationService } from './verification/verification.service';

@Module({
  controllers: [AgentController],
  imports: [
    ApiModule,
    BenchmarkModule,
    ConfigurationModule,
    DataProviderModule,
    ExchangeRateDataModule,
    I18nModule,
    ImpersonationModule,
    MarketDataModule,
    OrderModule,
    PortfolioSnapshotQueueModule,
    PrismaModule,
    PropertyModule,
    RedisCacheModule,
    SymbolProfileModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10
      }
    ]),
    UserModule
  ],
  providers: [
    AccountBalanceService,
    AccountService,
    AgentService,
    ConversationMemory,
    ErrorMapperService,
    InputValidationService,
    LangfuseService,
    CurrentRateService,
    GetHoldingsTool,
    GetRulesReportTool,
    MarketDataService,
    MarketDataTool,
    PortfolioCalculatorFactory,
    PortfolioPerformanceTool,
    RebalanceSimulatorTool,
    TransactionHistoryTool,
    PortfolioService,
    RedactionService,
    ResponseFormatter,
    RulesService,
    EscalationChecker,
    MathConsistencyChecker,
    RulesValidationChecker,
    SourceCitationChecker,
    {
      inject: [RulesValidationChecker, MathConsistencyChecker, SourceCitationChecker, EscalationChecker],
      provide: VerificationService,
      useFactory: (
        rulesChecker: RulesValidationChecker,
        mathChecker: MathConsistencyChecker,
        citationChecker: SourceCitationChecker,
        escalationChecker: EscalationChecker
      ) =>
        new VerificationService([rulesChecker, mathChecker, citationChecker, escalationChecker])
    },
    {
      provide: APP_GUARD,
      useClass: UserThrottlerGuard
    }
  ]
})
export class AgentModule {}
