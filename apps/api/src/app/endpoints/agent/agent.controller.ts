import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { permissions } from '@ghostfolio/common/permissions';
import type { RequestWithUser } from '@ghostfolio/common/types';

import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  ServiceUnavailableException,
  UseGuards
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

import { AgentService } from './agent.service';
import type { AgentRequest, AgentResponse } from './types';
import { InputValidationService, ValidationError } from './validation/input-validation.service';

const VALIDATION_MESSAGES: Record<ValidationError, string> = {
  [ValidationError.QUERY_EMPTY]: 'Query must not be empty.',
  [ValidationError.QUERY_TOO_LONG]: 'Query exceeds the maximum length of 2000 characters.',
  [ValidationError.INVALID_SESSION_ID]: 'Session ID must be a valid UUID.'
};

@Controller('agent')
export class AgentController {
  public constructor(
    private readonly agentService: AgentService,
    @Inject(REQUEST) private readonly request: RequestWithUser,
    private readonly inputValidationService: InputValidationService
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @HasPermission(permissions.readAiPrompt)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async query(@Body() body: AgentRequest): Promise<AgentResponse> {
    if (process.env['AGENT_ENABLED'] !== 'true') {
      throw new ServiceUnavailableException(
        'The agent feature is currently disabled.'
      );
    }

    const validation = this.inputValidationService.validate({
      query: body.query,
      sessionId: body.sessionId
    });

    if (!validation.valid) {
      throw new BadRequestException(
        VALIDATION_MESSAGES[validation.error!] ?? 'Invalid request.'
      );
    }

    return this.agentService.processQuery({
      query: validation.sanitizedQuery!,
      sessionId: body.sessionId,
      userId: this.request.user.id
    });
  }
}
