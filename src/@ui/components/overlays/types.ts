/**
 * Material Design 3 Overlay Component Types
 * Types and interfaces for overlay components following Material Design 3 principles
 */

import { ReactNode, CSSProperties } from 'react';
import { ElevationLevel, SpacingSize, BorderRadiusSize } from '../cards/types';

// Base overlay props
export interface BaseOverlayProps {
  className?: string;
  children?: ReactNode;
  'data-testid'?: string;
  style?: CSSProperties;
}

// Animation types
export type OverlayAnimationType = 'fade' | 'slide' | 'scale' | 'none';
export type OverlayPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';

// Floating Surface Props
export interface FloatingSurfaceProps extends BaseOverlayProps {
  elevation?: ElevationLevel;
  opacity?: number;
  borderRadius?: BorderRadiusSize;
  backdropBlur?: number;
  padding?: SpacingSize;
  maxWidth?: string | number;
  maxHeight?: string | number;
  position?: OverlayPosition;
  offset?: { x: number; y: number };
  zIndex?: number;
  visible?: boolean;
  animationType?: OverlayAnimationType;
  animationDuration?: number;
  onAnimationComplete?: () => void;
}

// Avatar Container Props
export interface AvatarContainerProps extends BaseOverlayProps {
  userId: string;
  name: string;
  avatarUrl?: string;
  color?: string;
  size?: 'small' | 'medium' | 'large';
  position?: { x: number; y: number };
  isActive?: boolean;
  isHost?: boolean;
  isMuted?: boolean;
  elevation?: ElevationLevel;
  borderRadius?: BorderRadiusSize;
  showTooltip?: boolean;
  onClick?: () => void;
  onDoubleClick?: () => void;
  animationType?: OverlayAnimationType;
  animationDelay?: number;
}

// Reaction Indicator Props
export interface ReactionIndicatorProps extends BaseOverlayProps {
  reactionId: string;
  emoji: string;
  userId: string;
  timestamp: number;
  videoTimestamp: number;
  position?: { x: number; y: number };
  size?: 'small' | 'medium' | 'large';
  duration?: number;
  fadeOutDelay?: number;
  elevation?: ElevationLevel;
  animationType?: OverlayAnimationType;
  onComplete?: () => void;
}

// Overlay Manager Props
export interface OverlayManagerProps extends BaseOverlayProps {
  videoElement?: HTMLVideoElement;
  containerElement?: HTMLElement;
  avatars?: Avatar[];
  reactions?: Reaction[];
  overlayConfig?: OverlayConfig;
  responsive?: boolean;
  maxAvatars?: number;
  maxReactions?: number;
  onAvatarClick?: (userId: string) => void;
  onReactionComplete?: (reactionId: string) => void;
}

// Data models
export interface Avatar {
  id: string;
  userId: string;
  name: string;
  avatarUrl?: string;
  color: string;
  position: { x: number; y: number };
  isActive: boolean;
  isHost: boolean;
  isMuted: boolean;
  lastSeen: Date;
}

export interface Reaction {
  id: string;
  emoji: string;
  userId: string;
  timestamp: Date;
  videoTimestamp: number;
  position: { x: number; y: number };
  duration: number;
  fadeOutDelay: number;
}

// Overlay configuration
export interface OverlayConfig {
  surface: {
    elevation: ElevationLevel;
    opacity: number;
    borderRadius: BorderRadiusSize;
    backdropBlur: number;
    padding: SpacingSize;
  };
  animation: {
    duration: number;
    easing: string;
    type: OverlayAnimationType;
    staggerDelay: number;
  };
  positioning: {
    responsive: boolean;
    maxAvatarsPerRow: number;
    avatarSpacing: number;
    reactionSpacing: number;
    edgeOffset: number;
  };
  zIndex: {
    base: number;
    avatar: number;
    reaction: number;
    tooltip: number;
  };
}

// Animation state
export interface OverlayAnimationState {
  isVisible: boolean;
  isAnimating: boolean;
  animationType: OverlayAnimationType;
  progress: number;
}

// Responsive breakpoints for overlays
export interface OverlayBreakpoints {
  mobile: {
    maxWidth: number;
    avatarSize: 'small';
    reactionSize: 'small';
    maxAvatars: number;
  };
  tablet: {
    maxWidth: number;
    avatarSize: 'medium';
    reactionSize: 'medium';
    maxAvatars: number;
  };
  desktop: {
    maxWidth: number;
    avatarSize: 'large';
    reactionSize: 'large';
    maxAvatars: number;
  };
}

// Z-index management
export interface ZIndexManager {
  getBaseZIndex(): number;
  getAvatarZIndex(userId: string): number;
  getReactionZIndex(reactionId: string): number;
  getTooltipZIndex(): number;
  reserveZIndex(component: string): number;
  releaseZIndex(component: string): void;
}
