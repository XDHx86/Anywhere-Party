/**
 * Material Design 3 Video Overlays
 * Export all overlay components and types
 * Requirements: 28.1, 28.2, 28.3, 28.4, 28.5
 */

// Core overlay system
export { MaterialVideoOverlay } from './material-video-overlay';
export { MaterialReactionOverlay } from './material-reaction-overlay';
export { MaterialAvatarOverlay } from './material-avatar-overlay';
export { MaterialOverlayManager } from './material-overlay-manager';

// Types and interfaces
export type {
  MaterialOverlayOptions,
  MaterialSurface,
  OverlayAnimation,
  ReactionSurfaceConfig,
  AvatarSurfaceConfig,
  MaterialThemeTokens,
  OverlayIntegrationConfig,
  OverlayEventHandlers,
  ElevationLevel,
  CornerRadius,
  AnimationType,
  SurfaceType,
} from './types';

// Re-export enhanced overlay options
export type { MaterialReactionOverlayOptions } from './material-reaction-overlay';
export type { MaterialAvatarOverlayOptions } from './material-avatar-overlay';
export type { MaterialOverlayManagerOptions } from './material-overlay-manager';
