/**
 * Chat Manager for Watch Party Extension
 * Handles text messages and reactions with session storage
 * Implements requirements 5.1, 5.4
 */

import { ChatMessage, Reaction, ChatState, ChatManagerOptions, ReactionType } from './types';

export class ChatManager {
  private state: ChatState = {
    messages: [],
    reactions: [],
    isEnabled: true,
  };

  private options: Required<ChatManagerOptions>;
  private messageListeners: Set<(message: ChatMessage) => void> = new Set();
  private reactionListeners: Set<(reaction: Reaction) => void> = new Set();
  private stateChangeListeners: Set<(state: ChatState) => void> = new Set();

  constructor(options: ChatManagerOptions = {}) {
    this.options = {
      maxMessages: options.maxMessages ?? 100,
      maxReactions: options.maxReactions ?? 50,
      reactionDisplayDuration: options.reactionDisplayDuration ?? 5000,
    };
  }

  /**
   * Add a text message to the chat
   */
  addMessage(userId: string, messageText: string, userName?: string): ChatMessage {
    const message: ChatMessage = {
      id: this.generateId(),
      userId,
      userName,
      message: messageText.trim(),
      timestamp: Date.now(),
      type: 'text',
    };

    this.state.messages.push(message);
    this.trimMessages();
    this.notifyMessageListeners(message);
    this.notifyStateChange();

    return message;
  }

  /**
   * Add a system message to the chat
   */
  addSystemMessage(messageText: string): ChatMessage {
    const message: ChatMessage = {
      id: this.generateId(),
      userId: 'system',
      message: messageText,
      timestamp: Date.now(),
      type: 'system',
    };

    this.state.messages.push(message);
    this.trimMessages();
    this.notifyMessageListeners(message);
    this.notifyStateChange();

    return message;
  }

  /**
   * Add a reaction with video timestamp
   */
  addReaction(
    userId: string,
    reactionType: ReactionType,
    videoTimestamp: number,
    userName?: string
  ): Reaction {
    const reaction: Reaction = {
      id: this.generateId(),
      userId,
      userName,
      type: reactionType,
      videoTimestamp,
      timestamp: Date.now(),
    };

    this.state.reactions.push(reaction);
    this.trimReactions();
    this.notifyReactionListeners(reaction);
    this.notifyStateChange();

    // Auto-remove reaction after display duration
    setTimeout(() => {
      this.removeReaction(reaction.id);
    }, this.options.reactionDisplayDuration);

    return reaction;
  }

  /**
   * Remove a reaction by ID
   */
  removeReaction(reactionId: string): boolean {
    const index = this.state.reactions.findIndex((r) => r.id === reactionId);
    if (index !== -1) {
      this.state.reactions.splice(index, 1);
      this.notifyStateChange();
      return true;
    }
    return false;
  }

  /**
   * Get all messages
   */
  getMessages(): ChatMessage[] {
    return [...this.state.messages];
  }

  /**
   * Get recent messages (last N messages)
   */
  getRecentMessages(count: number = 20): ChatMessage[] {
    return this.state.messages.slice(-count);
  }

  /**
   * Get active reactions (not expired)
   */
  getActiveReactions(): Reaction[] {
    const now = Date.now();
    return this.state.reactions.filter(
      (r) => now - r.timestamp < this.options.reactionDisplayDuration
    );
  }

  /**
   * Get reactions for a specific video timestamp range
   */
  getReactionsForTimeRange(startTime: number, endTime: number): Reaction[] {
    return this.state.reactions.filter(
      (r) => r.videoTimestamp >= startTime && r.videoTimestamp <= endTime
    );
  }

  /**
   * Clear all messages and reactions
   */
  clear(): void {
    this.state.messages = [];
    this.state.reactions = [];
    this.notifyStateChange();
  }

  /**
   * Get current chat state
   */
  getState(): ChatState {
    return {
      messages: [...this.state.messages],
      reactions: [...this.state.reactions],
      isEnabled: this.state.isEnabled,
    };
  }

  /**
   * Enable or disable chat functionality
   */
  setEnabled(enabled: boolean): void {
    this.state.isEnabled = enabled;
    this.notifyStateChange();
  }

  /**
   * Check if chat is enabled
   */
  isEnabled(): boolean {
    return this.state.isEnabled;
  }

  /**
   * Add listener for new messages
   */
  onMessage(listener: (message: ChatMessage) => void): () => void {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  /**
   * Add listener for new reactions
   */
  onReaction(listener: (reaction: Reaction) => void): () => void {
    this.reactionListeners.add(listener);
    return () => this.reactionListeners.delete(listener);
  }

  /**
   * Add listener for state changes
   */
  onStateChange(listener: (state: ChatState) => void): () => void {
    this.stateChangeListeners.add(listener);
    return () => this.stateChangeListeners.delete(listener);
  }

  /**
   * Validate message content
   */
  validateMessage(message: string): { valid: boolean; error?: string } {
    if (!message || typeof message !== 'string') {
      return { valid: false, error: 'Message must be a non-empty string' };
    }

    const trimmed = message.trim();
    if (trimmed.length === 0) {
      return { valid: false, error: 'Message must be a non-empty string' };
    }

    if (trimmed.length > 1000) {
      return { valid: false, error: 'Message too long (max 1000 characters)' };
    }

    return { valid: true };
  }

  /**
   * Validate reaction type
   */
  validateReactionType(type: string): type is ReactionType {
    const validTypes: ReactionType[] = ['thumbs_up', 'heart', 'laugh', 'clap', 'fire'];
    return validTypes.includes(type as ReactionType);
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private trimMessages(): void {
    if (this.state.messages.length > this.options.maxMessages) {
      const excess = this.state.messages.length - this.options.maxMessages;
      this.state.messages.splice(0, excess);
    }
  }

  private trimReactions(): void {
    if (this.state.reactions.length > this.options.maxReactions) {
      const excess = this.state.reactions.length - this.options.maxReactions;
      this.state.reactions.splice(0, excess);
    }
  }

  private notifyMessageListeners(message: ChatMessage): void {
    this.messageListeners.forEach((listener) => {
      try {
        listener(message);
      } catch (error) {
        console.error('Error in message listener:', error);
      }
    });
  }

  private notifyReactionListeners(reaction: Reaction): void {
    this.reactionListeners.forEach((listener) => {
      try {
        listener(reaction);
      } catch (error) {
        console.error('Error in reaction listener:', error);
      }
    });
  }

  private notifyStateChange(): void {
    const state = this.getState();
    this.stateChangeListeners.forEach((listener) => {
      try {
        listener(state);
      } catch (error) {
        console.error('Error in state change listener:', error);
      }
    });
  }
}
