import { Injectable } from '@nestjs/common';
import type { CoreMessage } from 'ai';

const MAX_MESSAGES_PER_SESSION = 20;

@Injectable()
export class ConversationMemory {
  private readonly sessions = new Map<string, CoreMessage[]>();

  public getHistory(sessionId: string): CoreMessage[] {
    return this.sessions.get(sessionId) ?? [];
  }

  public addMessages(sessionId: string, messages: CoreMessage[]): void {
    const existing = this.sessions.get(sessionId) ?? [];
    const combined = [...existing, ...messages];

    if (combined.length > MAX_MESSAGES_PER_SESSION) {
      this.sessions.set(
        sessionId,
        combined.slice(combined.length - MAX_MESSAGES_PER_SESSION)
      );
    } else {
      this.sessions.set(sessionId, combined);
    }
  }

  public clear(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  public size(sessionId: string): number {
    return this.sessions.get(sessionId)?.length ?? 0;
  }
}
