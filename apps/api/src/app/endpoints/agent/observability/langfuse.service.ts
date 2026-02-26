import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit
} from '@nestjs/common';

/**
 * Error categories for structured error tracking in Langfuse.
 */
export type ErrorCategory =
  | 'input_validation'
  | 'llm_error'
  | 'llm_timeout'
  | 'tool_failure'
  | 'verification_failure';

/**
 * Metadata attached to each Langfuse trace.
 */
export interface TraceMetadata {
  errorCategory?: ErrorCategory;
  errorMessage?: string;
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  estimatedCostUsd?: number;
  verificationPassed?: boolean;
  verificationReason?: string;
  toolsCalled?: string[];
  durationMs?: number;
}

/**
 * Lightweight Langfuse integration using @langfuse/tracing.
 *
 * Gracefully degrades to no-op when LANGFUSE_SECRET_KEY is not configured,
 * so the agent works identically in environments without Langfuse.
 */
@Injectable()
export class LangfuseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LangfuseService.name);
  private langfuseModule: typeof import('@langfuse/tracing') | null = null;
  private isEnabled = false;

  public onModuleInit() {
    const secretKey = process.env['LANGFUSE_SECRET_KEY'];
    const publicKey = process.env['LANGFUSE_PUBLIC_KEY'];

    if (!secretKey || !publicKey) {
      this.logger.log(
        'Langfuse keys not configured — observability disabled'
      );
      return;
    }

    this.isEnabled = true;
    this.logger.log('Langfuse observability enabled');
  }

  public async onModuleDestroy() {
    if (!this.isEnabled) {
      return;
    }

    try {
      const mod = await this.getLangfuseModule();
      if (mod) {
        await (mod as any).shutdown?.();
      }
    } catch {
      // Best-effort shutdown
    }
  }

  public get enabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Creates a trace for an agent query and returns a handle for recording
   * metadata, scores, and errors after the query completes.
   */
  public async createTrace(params: {
    userId: string;
    sessionId: string;
    query: string;
  }): Promise<TraceHandle> {
    if (!this.isEnabled) {
      return new NoopTraceHandle();
    }

    try {
      const mod = await this.getLangfuseModule();
      if (!mod) {
        return new NoopTraceHandle();
      }

      const observation = mod.startObservation('agent-query', {
        input: { query: params.query },
        metadata: {
          userId: params.userId,
          sessionId: params.sessionId
        }
      });

      return new LangfuseTraceHandle(observation, mod, this.logger);
    } catch (error) {
      this.logger.warn(`Failed to create Langfuse trace: ${error}`);
      return new NoopTraceHandle();
    }
  }

  /**
   * Records a user feedback score (thumbs up/down) for a session.
   */
  public async recordFeedback(params: {
    sessionId: string;
    score: 'up' | 'down';
    comment?: string;
  }): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    try {
      const mod = await this.getLangfuseModule();
      if (!mod) {
        return;
      }

      const observation = mod.startObservation('user-feedback', {
        input: {
          sessionId: params.sessionId,
          score: params.score,
          comment: params.comment
        },
        metadata: {
          feedbackScore: params.score === 'up' ? 1 : 0
        }
      });

      observation.end();
    } catch (error) {
      this.logger.warn(`Failed to record Langfuse feedback: ${error}`);
    }
  }

  private async getLangfuseModule(): Promise<typeof import('@langfuse/tracing') | null> {
    if (this.langfuseModule) {
      return this.langfuseModule;
    }

    try {
      this.langfuseModule = await import('@langfuse/tracing');
      return this.langfuseModule;
    } catch (error) {
      this.logger.warn(`Failed to load @langfuse/tracing: ${error}`);
      this.isEnabled = false;
      return null;
    }
  }
}

/**
 * Handle returned by createTrace() for recording post-query metadata.
 */
export interface TraceHandle {
  recordMetadata(metadata: TraceMetadata): void;
  end(): void;
}

class LangfuseTraceHandle implements TraceHandle {
  constructor(
    private readonly observation: any,
    private readonly mod: any,
    private readonly logger: Logger
  ) {}

  public recordMetadata(metadata: TraceMetadata): void {
    try {
      this.observation.update({
        output: {
          toolsCalled: metadata.toolsCalled,
          verificationPassed: metadata.verificationPassed
        },
        metadata: {
          ...metadata,
          toolsCalled: undefined // avoid duplication in metadata
        }
      });
    } catch (error) {
      this.logger.warn(`Failed to record trace metadata: ${error}`);
    }
  }

  public end(): void {
    try {
      this.observation.end();
    } catch (error) {
      this.logger.warn(`Failed to end trace: ${error}`);
    }
  }
}

class NoopTraceHandle implements TraceHandle {
  public recordMetadata(): void {
    // no-op
  }

  public end(): void {
    // no-op
  }
}
