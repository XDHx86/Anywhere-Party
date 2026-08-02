/**
 * Chat system types and interfaces
 */

export interface ChatMessage {
  id: string;
  userId: string;
  userName?: string;
  message: string;
  timestamp: number;
  type: 'text' | 'system';
}

export interface Reaction {
  id: string;
  userId: string;
  userName?: string;
  type: ReactionType;
  videoTimestamp: number;
  timestamp: number;
}

export type ReactionType = 'thumbs_up' | 'heart' | 'laugh' | 'clap' | 'fire';

export interface ChatState {
  messages: ChatMessage[];
  reactions: Reaction[];
  isEnabled: boolean;
}

export interface ChatManagerOptions {
  maxMessages?: number;
  maxReactions?: number;
  reactionDisplayDuration?: number;
}
