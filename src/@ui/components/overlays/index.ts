/**
 * Material Design 3 Overlay Components
 * Export all overlay components and utilities
 */

// Core components
export { default as FloatingSurface } from './FloatingSurface';
export { default as AvatarContainer } from './AvatarContainer';
export { default as ReactionIndicator } from './ReactionIndicator';
export { default as OverlayManager } from './OverlayManager';

// Hooks
export { useResponsiveOverlays } from './hooks/useResponsiveOverlays';
export { useZIndexManager } from './hooks/useZIndexManager';

// Animations
export * from './animations/overlay-animations';

// Types
export type {
  BaseOverlayProps,
  FloatingSurfaceProps,
  AvatarContainerProps,
  ReactionIndicatorProps,
  OverlayManagerProps,
  Avatar,
  Reaction,
  OverlayConfig,
  OverlayAnimationState,
  OverlayBreakpoints,
  ZIndexManager,
  OverlayAnimationType,
  OverlayPosition,
} from './types';
