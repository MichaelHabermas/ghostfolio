import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';
import { PropertyService } from '@ghostfolio/api/services/property/property.service';

import { INestApplication, VersioningType } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { PassportStrategy } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { ExtractJwt, Strategy } from 'passport-jwt';
import request = require('supertest');

import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { ResponseFormatter } from './formatters/response-formatter';
import { ConversationMemory } from './memory/conversation-memory';
import { GetHoldingsTool } from './tools/get-holdings.tool';
import { GetRulesReportTool } from './tools/get-rules-report.tool';
import { PortfolioPerformanceTool } from './tools/portfolio-performance.tool';
import { ErrorMapperService } from './errors/error-mapper.service';
import { InputValidationService } from './validation/input-validation.service';
import { RulesValidationChecker } from './verification/rules-validation.checker';
import { VerificationService } from './verification/verification.service';

class TestJwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  public constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: 'test-secret-key'
    });
  }

  public async validate(payload: Record<string, unknown>) {
    return payload;
  }
}

describe('AgentModule', () => {
  describe('DI resolution', () => {
    it('should compile and resolve AgentController and AgentService with all new providers', async () => {
      const moduleRef = await Test.createTestingModule({
        controllers: [AgentController],
        providers: [
          AgentService,
          ConversationMemory,
          ResponseFormatter,
          HasPermissionGuard,
          Reflector,
          { provide: PortfolioService, useValue: {} },
          { provide: PropertyService, useValue: {} },
          { provide: GetHoldingsTool, useValue: { execute: jest.fn() } },
          { provide: GetRulesReportTool, useValue: { execute: jest.fn() } },
          { provide: PortfolioPerformanceTool, useValue: { execute: jest.fn() } },
          ErrorMapperService,
          InputValidationService,
          RulesValidationChecker,
          {
            inject: [RulesValidationChecker],
            provide: VerificationService,
            useFactory: (rulesChecker: RulesValidationChecker) =>
              new VerificationService([rulesChecker])
          },
          {
            provide: 'REQUEST',
            useValue: {
              user: { id: 'test', settings: { settings: {} } }
            }
          }
        ]
      }).compile();

      const controller = moduleRef.get<AgentController>(AgentController);
      const service = moduleRef.get<AgentService>(AgentService);
      const memory = moduleRef.get<ConversationMemory>(ConversationMemory);
      const formatter = moduleRef.get<ResponseFormatter>(ResponseFormatter);

      expect(controller).toBeDefined();
      expect(service).toBeDefined();
      expect(memory).toBeDefined();
      expect(formatter).toBeDefined();
    });
  });

  describe('HTTP endpoint auth', () => {
    let app: INestApplication;

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [PassportModule],
        controllers: [AgentController],
        providers: [
          TestJwtStrategy,
          HasPermissionGuard,
          InputValidationService,
          Reflector,
          { provide: AgentService, useValue: { processQuery: jest.fn() } },
          { provide: 'REQUEST', useValue: {} }
        ]
      }).compile();

      app = moduleRef.createNestApplication();
      app.enableVersioning({ defaultVersion: '1', type: VersioningType.URI });
      app.setGlobalPrefix('api');
      await app.init();
    });

    afterAll(async () => {
      await app.close();
    });

    it('should return 401 for POST /api/v1/agent without auth token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/agent')
        .send({ query: 'What are my holdings?' });

      expect(response.status).toBe(401);
    });
  });
});
