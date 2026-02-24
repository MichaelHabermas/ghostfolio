import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';
import { RulesService } from '@ghostfolio/api/app/portfolio/rules.service';
import { MarketDataService } from '@ghostfolio/api/services/market-data/market-data.service';
import { PropertyService } from '@ghostfolio/api/services/property/property.service';

import { INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { PassportStrategy } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { ExtractJwt, Strategy } from 'passport-jwt';
import request = require('supertest');

import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';

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
    it('should compile and resolve AgentController and AgentService', async () => {
      const moduleRef = await Test.createTestingModule({
        controllers: [AgentController],
        providers: [
          AgentService,
          HasPermissionGuard,
          Reflector,
          { provide: PortfolioService, useValue: {} },
          { provide: RulesService, useValue: {} },
          { provide: MarketDataService, useValue: {} },
          { provide: PropertyService, useValue: {} },
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

      expect(controller).toBeDefined();
      expect(service).toBeDefined();
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
          Reflector,
          { provide: AgentService, useValue: { processQuery: jest.fn() } },
          { provide: 'REQUEST', useValue: {} }
        ]
      }).compile();

      app = moduleRef.createNestApplication();
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
