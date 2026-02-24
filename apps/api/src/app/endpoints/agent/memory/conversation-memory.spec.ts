import type { CoreMessage } from 'ai';

import { ConversationMemory } from './conversation-memory';

describe('ConversationMemory', () => {
  let memory: ConversationMemory;
  const sessionId = 'test-session-123';

  beforeEach(() => {
    memory = new ConversationMemory();
  });

  describe('getHistory', () => {
    it('should return empty array for unknown sessionId', () => {
      expect(memory.getHistory('unknown-session')).toEqual([]);
    });

    it('should return messages for known sessionId', () => {
      const messages: CoreMessage[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' }
      ];

      memory.addMessages(sessionId, messages);

      expect(memory.getHistory(sessionId)).toEqual(messages);
    });
  });

  describe('addMessages', () => {
    it('should append messages to an existing session', () => {
      const first: CoreMessage[] = [{ role: 'user', content: 'First' }];
      const second: CoreMessage[] = [{ role: 'assistant', content: 'Response' }];

      memory.addMessages(sessionId, first);
      memory.addMessages(sessionId, second);

      const history = memory.getHistory(sessionId);
      expect(history).toHaveLength(2);
      expect(history[0]).toEqual(first[0]);
      expect(history[1]).toEqual(second[0]);
    });

    it('should handle multiple sessions independently', () => {
      const session1 = 'session-1';
      const session2 = 'session-2';

      memory.addMessages(session1, [{ role: 'user', content: 'Session 1 message' }]);
      memory.addMessages(session2, [{ role: 'user', content: 'Session 2 message' }]);

      expect(memory.getHistory(session1)).toHaveLength(1);
      expect(memory.getHistory(session2)).toHaveLength(1);
      expect(memory.getHistory(session1)[0].content).toBe('Session 1 message');
      expect(memory.getHistory(session2)[0].content).toBe('Session 2 message');
    });
  });

  describe('message cap (20 messages max)', () => {
    it('should cap history at 20 messages using FIFO eviction', () => {
      const messages: CoreMessage[] = Array.from({ length: 25 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`
      } as CoreMessage));

      memory.addMessages(sessionId, messages);

      const history = memory.getHistory(sessionId);
      expect(history).toHaveLength(20);
      expect(history[0].content).toBe('Message 5');
      expect(history[19].content).toBe('Message 24');
    });

    it('should keep exactly 20 messages when at the limit', () => {
      const messages: CoreMessage[] = Array.from({ length: 20 }, (_, i) => ({
        role: 'user',
        content: `Message ${i}`
      } as CoreMessage));

      memory.addMessages(sessionId, messages);

      expect(memory.getHistory(sessionId)).toHaveLength(20);
    });

    it('should evict oldest messages when adding beyond the 20-message cap', () => {
      const initial: CoreMessage[] = Array.from({ length: 19 }, (_, i) => ({
        role: 'user',
        content: `Old ${i}`
      } as CoreMessage));

      memory.addMessages(sessionId, initial);
      memory.addMessages(sessionId, [
        { role: 'user', content: 'New message 1' },
        { role: 'assistant', content: 'New message 2' }
      ]);

      const history = memory.getHistory(sessionId);
      expect(history).toHaveLength(20);
      expect(history[0].content).toBe('Old 1');
      expect(history[18].content).toBe('New message 1');
      expect(history[19].content).toBe('New message 2');
    });
  });

  describe('clear', () => {
    it('should remove all messages for a session', () => {
      memory.addMessages(sessionId, [{ role: 'user', content: 'Hello' }]);
      memory.clear(sessionId);
      expect(memory.getHistory(sessionId)).toEqual([]);
    });

    it('should not affect other sessions when clearing', () => {
      const other = 'other-session';
      memory.addMessages(sessionId, [{ role: 'user', content: 'Hello' }]);
      memory.addMessages(other, [{ role: 'user', content: 'Other' }]);
      memory.clear(sessionId);

      expect(memory.getHistory(sessionId)).toEqual([]);
      expect(memory.getHistory(other)).toHaveLength(1);
    });
  });

  describe('size', () => {
    it('should return 0 for unknown session', () => {
      expect(memory.size('unknown')).toBe(0);
    });

    it('should return correct count of messages', () => {
      memory.addMessages(sessionId, [
        { role: 'user', content: 'A' },
        { role: 'assistant', content: 'B' }
      ]);
      expect(memory.size(sessionId)).toBe(2);
    });
  });
});
