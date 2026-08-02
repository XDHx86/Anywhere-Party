/**
 * Tests for ChatManager
 * Focuses on core functional logic only
 */

import { ChatManager } from './chat-manager';
import { ReactionType } from './types';

describe('ChatManager', () => {
  let chatManager: ChatManager;

  beforeEach(() => {
    chatManager = new ChatManager();
  });

  describe('Message Management', () => {
    test('should add and retrieve text messages', () => {
      const message = chatManager.addMessage('user1', 'Hello world', 'Alice');

      expect(message.userId).toBe('user1');
      expect(message.userName).toBe('Alice');
      expect(message.message).toBe('Hello world');
      expect(message.type).toBe('text');
      expect(message.timestamp).toBeGreaterThan(0);

      const messages = chatManager.getMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual(message);
    });

    test('should add system messages', () => {
      const message = chatManager.addSystemMessage('User joined the room');

      expect(message.userId).toBe('system');
      expect(message.message).toBe('User joined the room');
      expect(message.type).toBe('system');

      const messages = chatManager.getMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual(message);
    });

    test('should validate messages correctly', () => {
      expect(chatManager.validateMessage('Valid message')).toEqual({ valid: true });
      expect(chatManager.validateMessage('')).toEqual({
        valid: false,
        error: 'Message must be a non-empty string',
      });
      expect(chatManager.validateMessage('a'.repeat(1001))).toEqual({
        valid: false,
        error: 'Message too long (max 1000 characters)',
      });
    });

    test('should trim messages when exceeding max limit', () => {
      const manager = new ChatManager({ maxMessages: 3 });

      manager.addMessage('user1', 'Message 1');
      manager.addMessage('user1', 'Message 2');
      manager.addMessage('user1', 'Message 3');
      manager.addMessage('user1', 'Message 4');

      const messages = manager.getMessages();
      expect(messages).toHaveLength(3);
      expect(messages[0].message).toBe('Message 2');
      expect(messages[2].message).toBe('Message 4');
    });
  });

  describe('Reaction Management', () => {
    test('should add and retrieve reactions', () => {
      const reaction = chatManager.addReaction('user1', 'thumbs_up', 120.5, 'Alice');

      expect(reaction.userId).toBe('user1');
      expect(reaction.userName).toBe('Alice');
      expect(reaction.type).toBe('thumbs_up');
      expect(reaction.videoTimestamp).toBe(120.5);
      expect(reaction.timestamp).toBeGreaterThan(0);
    });

    test('should validate reaction types', () => {
      expect(chatManager.validateReactionType('thumbs_up')).toBe(true);
      expect(chatManager.validateReactionType('heart')).toBe(true);
      expect(chatManager.validateReactionType('invalid')).toBe(false);
    });

    test('should auto-remove reactions after display duration', async () => {
      const manager = new ChatManager({ reactionDisplayDuration: 100 });

      manager.addReaction('user1', 'heart', 60);
      expect(manager.getActiveReactions()).toHaveLength(1);

      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(manager.getActiveReactions()).toHaveLength(0);
    });

    test('should get reactions for time range', () => {
      chatManager.addReaction('user1', 'thumbs_up', 30);
      chatManager.addReaction('user1', 'heart', 60);
      chatManager.addReaction('user1', 'laugh', 90);

      const reactions = chatManager.getReactionsForTimeRange(50, 80);
      expect(reactions).toHaveLength(1);
      expect(reactions[0].type).toBe('heart');
    });
  });

  describe('Event Listeners', () => {
    test('should notify message listeners', () => {
      const listener = vi.fn();
      chatManager.onMessage(listener);

      const message = chatManager.addMessage('user1', 'Test message');
      expect(listener).toHaveBeenCalledWith(message);
    });

    test('should notify reaction listeners', () => {
      const listener = vi.fn();
      chatManager.onReaction(listener);

      const reaction = chatManager.addReaction('user1', 'thumbs_up', 60);
      expect(listener).toHaveBeenCalledWith(reaction);
    });

    test('should remove listeners correctly', () => {
      const listener = vi.fn();
      const removeListener = chatManager.onMessage(listener);

      chatManager.addMessage('user1', 'Test 1');
      expect(listener).toHaveBeenCalledTimes(1);

      removeListener();
      chatManager.addMessage('user1', 'Test 2');
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('State Management', () => {
    test('should get current state', () => {
      chatManager.addMessage('user1', 'Hello');
      chatManager.addReaction('user1', 'heart', 60);

      const state = chatManager.getState();
      expect(state.messages).toHaveLength(1);
      expect(state.reactions).toHaveLength(1);
      expect(state.isEnabled).toBe(true);
    });

    test('should enable/disable chat', () => {
      expect(chatManager.isEnabled()).toBe(true);

      chatManager.setEnabled(false);
      expect(chatManager.isEnabled()).toBe(false);

      const state = chatManager.getState();
      expect(state.isEnabled).toBe(false);
    });

    test('should clear all data', () => {
      chatManager.addMessage('user1', 'Hello');
      chatManager.addReaction('user1', 'heart', 60);

      chatManager.clear();

      const state = chatManager.getState();
      expect(state.messages).toHaveLength(0);
      expect(state.reactions).toHaveLength(0);
    });
  });
});
