/**
 * Chat Component Types
 * Types and interfaces for chat sidebar components
 */

import { ReactNode } from 'react';
import { BaseComponentProps } from '../cards/types';

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: Date;
  reactions: Reaction[];
  type: 'sent' | 'received';
}

export interface Reaction {
  id: string;
  emoji: string;
  userId: string;
  userName: string;
  timestamp: Date;
}

export interface MessageCardProps extends BaseComponentProps {
  message: ChatMessage;
  onReaction: (messageId: string, emoji: string) => void;
  onRemoveReaction: (messageId: string, reactionId: string) => void;
  currentUserId: string;
}

export interface ReactionButtonsProps extends BaseComponentProps {
  messageId: string;
  reactions: Reaction[];
  onReaction: (messageId: string, emoji: string) => void;
  onRemoveReaction: (messageId: string, reactionId: string) => void;
  currentUserId: string;
}

export interface InputBarProps extends BaseComponentProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export interface ChatSidebarProps extends BaseComponentProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  onReaction: (messageId: string, emoji: string) => void;
  onRemoveReaction: (messageId: string, reactionId: string) => void;
  currentUserId: string;
  isOpen: boolean;
  onClose?: () => void;
}

export interface VirtualScrollProps {
  items: ChatMessage[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: ChatMessage, index: number) => ReactNode;
  overscan?: number;
}

export type ReactionEmoji = '❤️' | '😂' | '😮' | '😢' | '👍' | '👎' | '🎉' | '🔥';

export const REACTION_EMOJIS: ReactionEmoji[] = ['❤️', '😂', '😮', '😢', '👍', '👎', '🎉', '🔥'];
