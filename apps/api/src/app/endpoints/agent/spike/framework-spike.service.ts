import {
  PROPERTY_API_KEY_OPENROUTER,
  PROPERTY_OPENROUTER_MODEL
} from '@ghostfolio/common/config';

import { Injectable, Logger } from '@nestjs/common';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText, tool } from 'ai';
import { z } from 'zod';

import { PropertyService } from '../../../../../../services/property/property.service';

const PINNED_MODEL = 'anthropic/claude-3.5-sonnet';

export interface SpikeResult {
  text: string;
  toolCalls: Array<{
    toolName: string;
    args: Record<string, unknown>;
  }>;
  toolResults: Array<{
    toolName: string;
    result: unknown;
  }>;
  steps: number;
  latencyMs: number;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

@Injectable()
export class FrameworkSpikeService {
  private readonly logger = new Logger(FrameworkSpikeService.name);

  public constructor(private readonly propertyService: PropertyService) {}

  public async runSpike(): Promise<SpikeResult> {
    const start = Date.now();

    const openRouterApiKey = await this.propertyService.getByKey<string>(
      PROPERTY_API_KEY_OPENROUTER
    );

    const openRouterModel =
      (await this.propertyService.getByKey<string>(
        PROPERTY_OPENROUTER_MODEL
      )) ?? PINNED_MODEL;

    const openRouterService = createOpenRouter({
      apiKey: openRouterApiKey
    });

    const result = await generateText({
      model: openRouterService.chat(openRouterModel),
      prompt: 'Greet the user whose name is John.',
      maxSteps: 3,
      tools: {
        get_greeting: tool({
          description:
            'Generate a personalized greeting for a user given their name.',
          parameters: z.object({
            name: z.string().describe('The name of the user to greet')
          }),
          execute: async ({ name }) => {
            return { greeting: `Hello, ${name}! Welcome to Ghostfolio.` };
          }
        })
      }
    });

    const latencyMs = Date.now() - start;

    const toolCalls = result.steps.flatMap((step) =>
      step.toolCalls.map((tc) => ({
        toolName: tc.toolName,
        args: tc.args as Record<string, unknown>
      }))
    );

    const toolResults = result.steps.flatMap((step) =>
      step.toolResults.map((tr) => ({
        toolName: tr.toolName,
        result: tr.result
      }))
    );

    const spikeResult: SpikeResult = {
      text: result.text,
      toolCalls,
      toolResults,
      steps: result.steps.length,
      latencyMs,
      usage: {
        promptTokens: result.usage?.promptTokens ?? 0,
        completionTokens: result.usage?.completionTokens ?? 0,
        totalTokens:
          (result.usage?.promptTokens ?? 0) +
          (result.usage?.completionTokens ?? 0)
      }
    };

    this.logger.log(
      `Spike result: ${JSON.stringify(spikeResult, null, 2)}`
    );

    return spikeResult;
  }
}
