/**
 * Material Design 3 Reaction Overlay
 * Enhanced reaction system with Material surfaces, elevation, and animations
 * Requirements: 28.1, 28.2, 28.3, 28.4, 28.5
 */

import { MaterialVideoOverlay } from './material-video-overlay';
import { ReactionSurfaceConfig, OverlayEventHandlers } from './types';
import { ReactionType } from '../../@core/chat/types';

export interface MaterialReactionOverlayOptions {
  displayDuration?: number;
  maxConcurrentReactions?: number;
  animationDuration?: number;
  reactionSize?: number;
  enableTranslucency?: boolean;
  defaultElevation?: 'level1' | 'level2' | 'level3' | 'level4' | 'level5';
  respectsReducedMotion?: boolean;
  eventHandlers?: OverlayEventHandlers;
}

export class MaterialReactionOverlay {
  private materialOverlay: MaterialVideoOverlay;
  private options: Required<MaterialReactionOverlayOptions>;
  private activeReactions: Map<string, { timestamp: number; type: ReactionType }> = new Map();
  private reactionPositions: Set<string> = new Set(); // Track used positions to avoid overlap

  // Enhanced reaction type to emoji mapping with Material Design considerations
  private readonly reactionEmojis: Record<ReactionType, string> = {
    thumbs_up: '👍',
    heart: '❤️',
    laugh: '😂',
    clap: '👏',
    fire: '🔥',
  };

  // Reaction type to Material color mapping
  private readonly reactionColors: Record<ReactionType, string> = {
    thumbs_up: '#4285F4', // Material Blue
    heart: '#EA4335', // Material Red
    laugh: '#FBBC04', // Material Yellow
    clap: '#34A853', // Material Green
    fire: '#FF6D01', // Material Orange
  };

  constructor(options: MaterialReactionOverlayOptions = {}) {
    this.options = {
      displayDuration: options.displayDuration ?? 3000,
      maxConcurrentReactions: options.maxConcurrentReactions ?? 10,
      animationDuration: options.animationDuration ?? 300,
      reactionSize: options.reactionSize ?? 32,
      enableTranslucency: options.enableTranslucency ?? true,
      defaultElevation: options.defaultElevation ?? 'level2',
      respectsReducedMotion: options.respectsReducedMotion ?? true,
      eventHandlers: options.eventHandlers ?? {},
    };

    // Initialize Material overlay system
    this.materialOverlay = new MaterialVideoOverlay({
      enableTranslucency: this.options.enableTranslucency,
      defaultElevation: this.options.defaultElevation,
      cornerRadius: 'medium',
      animationDuration: this.options.animationDuration,
      maxConcurrentSurfaces: this.options.maxConcurrentReactions,
      autoCleanup: true,
      respectsReducedMotion: this.options.respectsReducedMotion,
      onSurfaceCreate: (surface) => {
        this.options.eventHandlers.onReactionShow?.(
          surface.id,
          surface.content as string,
          surface.position
        );
      },
      onSurfaceDestroy: (surface) => {
        this.activeReactions.delete(surface.id);
        this.reactionPositions.delete(this.positionToKey(surface.position));
        this.options.eventHandlers.onReactionHide?.(surface.id);
      },
    });
  }

  /**
   * Inject Material reaction overlay into video element
   */
  injectOverlay(videoElement: HTMLVideoElement): boolean {
    try {
      const success = this.materialOverlay.injectOverlay(videoElement);
      if (success) {
        console.log('Material reaction overlay injected successfully');
      }
      return success;
    } catch (error) {
      console.error('Failed to inject Material reaction overlay:', error);
      this.options.eventHandlers.onOverlayError?.(error as Error, 'injection');
      return false;
    }
  }

  /**
   * Remove Material reaction overlay
   */
  removeOverlay(): void {
    this.materialOverlay.removeOverlay();
    this.activeReactions.clear();
    this.reactionPositions.clear();
    console.log('Material reaction overlay removed');
  }

  /**
   * Display a reaction with Material Design 3 styling
   */
  showReaction(
    reactionId: string,
    type: ReactionType,
    videoTimestamp: number,
    options: {
      position?: { x: number; y: number };
      elevation?: 'level1' | 'level2' | 'level3' | 'level4' | 'level5';
      duration?: number;
      animation?: 'fadeIn' | 'scaleIn' | 'slideUp';
      size?: number;
    } = {}
  ): boolean {
    if (!this.materialOverlay.isOverlayInjected()) {
      console.warn('Material reaction overlay not injected, cannot show reaction');
      return false;
    }

    // Get emoji for reaction type
    const emoji = this.reactionEmojis[type];
    if (!emoji) {
      console.warn('Unknown reaction type:', type);
      return false;
    }

    // Generate position if not provided
    const position = options.position || this.generateOptimalPosition();

    // Create enhanced reaction surface configuration
    const surfaceConfig: ReactionSurfaceConfig = {
      emoji,
      position,
      elevation: options.elevation || this.options.defaultElevation,
      duration: options.duration || this.options.displayDuration,
      animation: options.animation || 'scaleIn',
      size: options.size || this.options.reactionSize,
    };

    // Create the Material surface
    const success = this.materialOverlay.createReactionSurface(reactionId, emoji, position, {
      elevation: surfaceConfig.elevation,
      duration: surfaceConfig.duration,
      animation: surfaceConfig.animation,
    });

    if (success) {
      // Track the reaction
      this.activeReactions.set(reactionId, {
        timestamp: videoTimestamp,
        type,
      });

      // Mark position as used
      this.reactionPositions.add(this.positionToKey(position));

      // Auto-cleanup position after reaction expires
      setTimeout(() => {
        this.reactionPositions.delete(this.positionToKey(position));
      }, surfaceConfig.duration);

      console.log('Material reaction displayed:', type, 'at', videoTimestamp);
    }

    return success;
  }

  /**
   * Remove a specific reaction
   */
  removeReaction(reactionId: string): void {
    this.materialOverlay.removeSurface(reactionId);
  }

  /**
   * Clear all active reactions
   */
  clearReactions(): void {
    this.materialOverlay.clearAllSurfaces();
    this.activeReactions.clear();
    this.reactionPositions.clear();
  }

  /**
   * Get count of active reactions
   */
  getActiveReactionCount(): number {
    return this.materialOverlay.getActiveSurfaceCount();
  }

  /**
   * Check if overlay is successfully injected
   */
  isOverlayInjected(): boolean {
    return this.materialOverlay.isOverlayInjected();
  }

  /**
   * Update overlay options
   */
  updateOptions(newOptions: Partial<MaterialReactionOverlayOptions>): void {
    Object.assign(this.options, newOptions);
  }

  /**
   * Get reaction statistics
   */
  getReactionStats(): {
    totalActive: number;
    reactionsByType: Record<ReactionType, number>;
    oldestReaction: number | null;
    newestReaction: number | null;
  } {
    const stats = {
      totalActive: this.activeReactions.size,
      reactionsByType: {} as Record<ReactionType, number>,
      oldestReaction: null as number | null,
      newestReaction: null as number | null,
    };

    // Initialize reaction type counts
    Object.keys(this.reactionEmojis).forEach((type) => {
      stats.reactionsByType[type as ReactionType] = 0;
    });

    // Count reactions by type and find oldest/newest
    this.activeReactions.forEach((reaction) => {
      stats.reactionsByType[reaction.type]++;

      if (stats.oldestReaction === null || reaction.timestamp < stats.oldestReaction) {
        stats.oldestReaction = reaction.timestamp;
      }

      if (stats.newestReaction === null || reaction.timestamp > stats.newestReaction) {
        stats.newestReaction = reaction.timestamp;
      }
    });

    return stats;
  }

  private generateOptimalPosition(): { x: number; y: number } {
    const maxAttempts = 20;
    let attempts = 0;

    while (attempts < maxAttempts) {
      // Generate position within video bounds, avoiding edges
      const margin = 0.1; // 10% margin from edges
      const x = margin + Math.random() * (1 - 2 * margin);
      const y = margin + Math.random() * (1 - 2 * margin);

      const position = { x, y };
      const positionKey = this.positionToKey(position);

      // Check if position is already used
      if (!this.reactionPositions.has(positionKey)) {
        return position;
      }

      attempts++;
    }

    // Fallback to random position if all attempts failed
    const margin = 0.1;
    return {
      x: margin + Math.random() * (1 - 2 * margin),
      y: margin + Math.random() * (1 - 2 * margin),
    };
  }

  private positionToKey(position: { x: number; y: number }): string {
    // Create a grid-based key to prevent overlapping reactions
    const gridSize = 0.1; // 10% grid
    const gridX = Math.floor(position.x / gridSize);
    const gridY = Math.floor(position.y / gridSize);
    return `${gridX},${gridY}`;
  }
}

export default MaterialReactionOverlay;
