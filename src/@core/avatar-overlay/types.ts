/**
 * Types for Avatar Overlay System
 * Real-time synchronized avatars with movement, chat bubbles, and reactions
 */

export interface Avatar {
  id: string;
  userId: string;
  displayName: string;
  imageUrl?: string; // static PNG/SVG
  animationUrl?: string; // optional GIF/sprite
  x: number; // normalized position 0..1
  y: number; // normalized position 0..1
  visible: boolean;
  speaking: boolean;
  muted: boolean;
  lastUpdate: number;
}

export interface AvatarPosition {
  x: number;
  y: number;
  timestamp: number;
}

export interface AvatarAnimation {
  id: string;
  animationKey: string;
  durationMs: number;
  startTime: number;
}

export interface ChatBubble {
  id: string;
  avatarId: string;
  message: string;
  durationMs: number;
  startTime: number;
  x: number;
  y: number;
}

export interface AvatarConfig {
  id: string;
  imageUrl?: string;
  animationUrl?: string;
  displayName: string;
}

// Message types for synchronization
export type AvatarMessage =
  | AvatarUpdateMessage
  | AvatarAnimateMessage
  | AvatarChatBubbleMessage
  | AvatarConfigMessage
  | AvatarVisibilityMessage;

export interface AvatarUpdateMessage {
  type: 'AVATAR_UPDATE';
  id: string;
  x: number;
  y: number;
  timestamp: number;
}

export interface AvatarAnimateMessage {
  type: 'AVATAR_ANIMATE';
  id: string;
  animationKey: string;
  durationMs: number;
}

export interface AvatarChatBubbleMessage {
  type: 'AVATAR_CHAT_BUBBLE';
  id: string;
  message: string;
  durationMs: number;
}

export interface AvatarConfigMessage {
  type: 'AVATAR_CONFIG';
  id: string;
  imageUrl?: string;
  animationUrl?: string;
  displayName: string;
}

export interface AvatarVisibilityMessage {
  type: 'AVATAR_VISIBILITY';
  id: string;
  visible: boolean;
}

export interface AvatarOverlayOptions {
  updateRate?: number; // Hz for position updates (default: 30)
  lerpFactor?: number; // Linear interpolation smoothing (default: 0.15)
  avatarSize?: number; // Avatar size in pixels (default: 48)
  chatBubbleDuration?: number; // Chat bubble display time in ms (default: 4000)
  animationDuration?: number; // Default animation duration in ms (default: 2000)
  collisionAvoidance?: boolean; // Enable collision avoidance (default: true)
  voiceActivityGlow?: boolean; // Show glow when speaking (default: true)
  maxAvatars?: number; // Maximum avatars per room (default: 20)
  onAvatarMove?: (avatar: Avatar) => void;
  onAvatarAnimate?: (avatar: Avatar, animationKey: string) => void;
  onChatBubble?: (avatar: Avatar, message: string) => void;
  onVoiceActivity?: (avatar: Avatar, speaking: boolean) => void;
}

export interface MovementState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  mouseDown: boolean;
  lastMouseX: number;
  lastMouseY: number;
}

export interface AvatarRenderData {
  avatar: Avatar;
  screenX: number;
  screenY: number;
  image?: HTMLImageElement;
  animation?: AvatarAnimation;
  chatBubble?: ChatBubble;
  glowing: boolean;
}

export interface AvatarSyncOptions {
  roomId: string;
  userId: string;
  userName: string;
  signalingSend?: (message: any) => void;
  onAvatarUpdate?: (avatar: Avatar) => void;
  onAvatarAnimate?: (avatarId: string, animationKey: string) => void;
  onChatBubble?: (avatarId: string, message: string) => void;
  onConfigUpdate?: (avatarId: string, config: AvatarConfig) => void;
}

// Animation presets
export const AVATAR_ANIMATIONS = {
  HEART: 'heart',
  LAUGH: 'laugh',
  THUMBS_UP: 'thumbs_up',
  CLAP: 'clap',
  WAVE: 'wave',
  DANCE: 'dance',
  SURPRISED: 'surprised',
  THINKING: 'thinking',
} as const;

export type AvatarAnimationKey = (typeof AVATAR_ANIMATIONS)[keyof typeof AVATAR_ANIMATIONS];

// Default avatar configuration
export const DEFAULT_AVATAR_CONFIG = {
  updateRate: 30,
  lerpFactor: 0.15,
  avatarSize: 48,
  chatBubbleDuration: 4000,
  animationDuration: 2000,
  collisionAvoidance: true,
  voiceActivityGlow: true,
  maxAvatars: 20,
};

// Movement constants
export const MOVEMENT_SPEED = 0.002; // Units per frame at 60fps
export const COLLISION_RADIUS = 0.05; // Normalized collision radius
export const VOICE_GLOW_RADIUS = 8; // Pixels for voice activity glow
export const CHAT_BUBBLE_OFFSET_Y = -60; // Pixels above avatar
export const CHAT_BUBBLE_MAX_WIDTH = 200; // Max bubble width in pixels
