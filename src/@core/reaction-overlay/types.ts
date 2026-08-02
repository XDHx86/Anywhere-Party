/**
 * Reaction overlay types and interfaces
 */

export interface ReactionOverlayOptions {
  displayDuration?: number;
  maxConcurrentReactions?: number;
  animationDuration?: number;
  reactionSize?: number;
}

export interface ReactionDisplay {
  id: string;
  type: string;
  emoji: string;
  x: number;
  y: number;
  timestamp: number;
  element?: HTMLElement;
}

export interface ReactionPosition {
  x: number;
  y: number;
}
