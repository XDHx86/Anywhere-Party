/**
 * Material Design 3 Video Overlay Types
 * Type definitions for Material surfaces, animations, and overlay system
 * Requirements: 28.1, 28.2, 28.3, 28.4, 28.5
 */

export interface MaterialOverlayOptions {
  enableTranslucency?: boolean;
  defaultElevation?: 'level1' | 'level2' | 'level3' | 'level4' | 'level5';
  cornerRadius?: 'medium' | 'large';
  animationDuration?: number;
  maxConcurrentSurfaces?: number;
  autoCleanup?: boolean;
  respectsReducedMotion?: boolean;
  onSurfaceCreate?: (surface: MaterialSurface) => void;
  onSurfaceDestroy?: (surface: MaterialSurface) => void;
  onAnimationComplete?: (surface: MaterialSurface) => void;
}

export interface MaterialSurface {
  id: string;
  type: 'reaction' | 'avatar';
  element: HTMLElement;
  position: { x: number; y: number };
  elevation: 'level1' | 'level2' | 'level3' | 'level4' | 'level5';
  cornerRadius: 'medium' | 'large';
  translucent: boolean;
  content: unknown;
  duration: number;
  size: number;
  showIndicators: boolean;
  persistent: boolean;
  createdAt: number;
  speaking: boolean;
  muted: boolean;
}

export interface OverlayAnimation {
  id: string;
  type: 'fadeIn' | 'fadeOut' | 'scaleIn' | 'scaleOut' | 'slideUp' | 'slideDown';
  startTime: number;
  duration: number;
  easing: string;
  update?: (surface: MaterialSurface, progress: number) => void;
  onComplete?: () => void;
}

export interface ReactionSurfaceConfig {
  emoji: string;
  position: { x: number; y: number };
  elevation?: 'level1' | 'level2' | 'level3' | 'level4' | 'level5';
  duration?: number;
  animation?: 'fadeIn' | 'scaleIn' | 'slideUp';
  size?: number;
}

export interface AvatarSurfaceConfig {
  imageUrl?: string;
  displayName: string;
  color: string;
  speaking?: boolean;
  muted?: boolean;
  position: { x: number; y: number };
  elevation?: 'level1' | 'level2' | 'level3' | 'level4' | 'level5';
  size?: number;
  showIndicators?: boolean;
}

export interface MaterialThemeTokens {
  elevation: {
    level1: string;
    level2: string;
    level3: string;
    level4: string;
    level5: string;
  };
  shape: {
    cornerMedium: string;
    cornerLarge: string;
  };
  motion: {
    durationShort2: string;
    durationShort4: string;
    durationMedium1: string;
    durationMedium2: string;
    easingStandard: string;
    easingEmphasized: string;
    easingEmphasizedDecelerate: string;
  };
  colors: {
    primary: string;
    secondary: string;
    surface: string;
    surfaceContainer: string;
    surfaceContainerHigh: string;
    onSurface: string;
    onSurfaceVariant: string;
    outline: string;
  };
}

export interface OverlayIntegrationConfig {
  reactionOverlay?: {
    enabled: boolean;
    maxConcurrentReactions: number;
    defaultDuration: number;
    animationType: 'fadeIn' | 'scaleIn' | 'slideUp';
  };
  avatarOverlay?: {
    enabled: boolean;
    showNameLabels: boolean;
    showVoiceIndicators: boolean;
    avatarSize: number;
    elevation: 'level1' | 'level2' | 'level3' | 'level4' | 'level5';
  };
  theme?: {
    respectSystemTheme: boolean;
    customColors?: Partial<MaterialThemeTokens['colors']>;
    reducedMotion: boolean;
  };
}

export interface OverlayEventHandlers {
  onReactionShow?: (reactionId: string, emoji: string, position: { x: number; y: number }) => void;
  onReactionHide?: (reactionId: string) => void;
  onAvatarMove?: (avatarId: string, position: { x: number; y: number }) => void;
  onAvatarUpdate?: (avatarId: string, data: Partial<AvatarSurfaceConfig>) => void;
  onOverlayError?: (error: Error, context: string) => void;
}

export type ElevationLevel = 'level1' | 'level2' | 'level3' | 'level4' | 'level5';
export type CornerRadius = 'medium' | 'large';
export type AnimationType = 'fadeIn' | 'fadeOut' | 'scaleIn' | 'scaleOut' | 'slideUp' | 'slideDown';
export type SurfaceType = 'reaction' | 'avatar';
