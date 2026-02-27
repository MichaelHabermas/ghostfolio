import { Injectable } from '@nestjs/common';

export enum AgentErrorType {
  DB_TIMEOUT = 'DB_TIMEOUT',
  LLM_RATE_LIMIT = 'LLM_RATE_LIMIT',
  LLM_AUTH = 'LLM_AUTH',
  LLM_UNAVAILABLE = 'LLM_UNAVAILABLE',
  VERIFICATION_MISMATCH = 'VERIFICATION_MISMATCH',
  CONTEXT_OVERFLOW = 'CONTEXT_OVERFLOW',
  MARKET_DATA_DOWN = 'MARKET_DATA_DOWN',
  MALFORMED_LLM_OUTPUT = 'MALFORMED_LLM_OUTPUT'
}

const ERROR_MESSAGES: Record<AgentErrorType, string> = {
  [AgentErrorType.DB_TIMEOUT]:
    "I'm unable to access your portfolio data right now. Please try again in a moment.",
  [AgentErrorType.LLM_RATE_LIMIT]:
    'The analysis service is temporarily busy. Please try again shortly.',
  [AgentErrorType.LLM_AUTH]:
    'The AI provider credentials are missing or invalid. Add a valid OpenRouter API key in settings and try again.',
  [AgentErrorType.LLM_UNAVAILABLE]:
    'The AI analysis provider is temporarily unavailable. Please try again in a moment.',
  [AgentErrorType.VERIFICATION_MISMATCH]:
    'I detected an inconsistency in my analysis and stopped to avoid giving you incorrect information. Please try again.',
  [AgentErrorType.CONTEXT_OVERFLOW]:
    "Your portfolio is very large. I'll focus on your top holdings for this analysis.",
  [AgentErrorType.MARKET_DATA_DOWN]:
    'Market data is temporarily unavailable. My analysis will be limited to your most recent portfolio snapshot.',
  [AgentErrorType.MALFORMED_LLM_OUTPUT]:
    'Something went wrong generating the analysis. Please try again.'
};

const FALLBACK_MESSAGE =
  'I was unable to process your request at this time. Please try again shortly.';

@Injectable()
export class ErrorMapperService {
  public toUserMessage(errorType: AgentErrorType): string {
    return ERROR_MESSAGES[errorType] ?? FALLBACK_MESSAGE;
  }

  public classify(error: unknown): AgentErrorType {
    const message = this.extractMessage(error).toLowerCase();

    if (
      message.includes('database') ||
      message.includes('db') ||
      message.includes('prisma') ||
      message.includes('connection') ||
      message.includes('timeout') && message.includes('data')
    ) {
      return AgentErrorType.DB_TIMEOUT;
    }

    if (
      message.includes('rate limit') ||
      message.includes('429') ||
      message.includes('too many requests')
    ) {
      return AgentErrorType.LLM_RATE_LIMIT;
    }

    if (
      message.includes('openrouter api key not configured') ||
      message.includes('api_key_openrouter') ||
      message.includes('invalid api key') ||
      message.includes('unauthorized') ||
      message.includes('401')
    ) {
      return AgentErrorType.LLM_AUTH;
    }

    if (
      message.includes('econnrefused') ||
      message.includes('econnreset') ||
      message.includes('etimedout') ||
      message.includes('fetch failed') ||
      message.includes('socket hang up') ||
      message.includes('service unavailable') ||
      message.includes('503') ||
      message.includes('bad gateway') ||
      message.includes('502')
    ) {
      return AgentErrorType.LLM_UNAVAILABLE;
    }

    if (
      message.includes('context_length') ||
      message.includes('context length') ||
      message.includes('maximum context')
    ) {
      return AgentErrorType.CONTEXT_OVERFLOW;
    }

    if (
      message.includes('marketdata') ||
      message.includes('market data') ||
      message.includes('market_data')
    ) {
      return AgentErrorType.MARKET_DATA_DOWN;
    }

    if (
      error instanceof SyntaxError ||
      message.includes('json') ||
      message.includes('parse') ||
      message.includes('unexpected token')
    ) {
      return AgentErrorType.MALFORMED_LLM_OUTPUT;
    }

    return AgentErrorType.MALFORMED_LLM_OUTPUT;
  }

  public toUserMessageFromError(error: unknown): string {
    return this.toUserMessage(this.classify(error));
  }

  private extractMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    return String(error);
  }
}
