/**
 * Material Design 3 Overlay Manager
 * Unified management system for reactions and avatars with Material Design 3 styling
 * Requirements: 28.1, 28.2, 28.3, 28.4, 28.5
 */

import {
  MaterialReactionOverlay,
  MaterialReactionOverlayOptions,
} from './material-reaction-overlay';
import { MaterialAvatarOverlay, MaterialAvatarOverlayOptions } from './material-avatar-overlay';
import { OverlayIntegrationConfig, OverlayEventHandlers } from './types';
import { ReactionType } from '../../@core/chat/types';
import { Avatar } from '../../@core/avatar-overlay/types';

export interface MaterialOverlayManagerOptions {
  reactionOverlay?: MaterialReactionOverlayOptions;
  avatarOverlay?: MaterialAvatarOverlayOptions;
  integration?: OverlayIntegrationConfig;
  eventHandlers?: OverlayEventHandlers;
}

export class MaterialOverlayManager {
  private reactionOverlay: MaterialReactionOverlay;
  private avatarOverlay: MaterialAvatarOverlay;
  private options: MaterialOverlayManagerOptions;
  private isInjected = false;
  private videoElement: HTMLVideoElement | null = null;

  // Integration state
  private integrationConfig: Required<OverlayIntegrationConfig>;
  private eventHandlers: OverlayEventHandlers;

  constructor(options: MaterialOverlayManagerOptions = {}) {
    this.options = options;
    this.eventHandlers = options.eventHandlers || {};

    // Set up integration configuration with defaults
    this.integrationConfig = {
      reactionOverlay: {
        enabled: true,
        maxConcurrentReactions: 10,
        defaultDuration: 3000,
        animationType: 'scaleIn',
        ...options.integration?.reactionOverlay,
      },
      avatarOverlay: {
        enabled: true,
        showNameLabels: true,
        showVoiceIndicators: true,
        avatarSize: 48,
        elevation: 'level3',
        ...options.integration?.avatarOverlay,
      },
      theme: {
        respectSystemTheme: true,
        reducedMotion: true,
        ...options.integration?.theme,
      },
    };

    // Initialize reaction overlay
    this.reactionOverlay = new MaterialReactionOverlay({
      displayDuration: this.integrationConfig.reactionOverlay.defaultDuration,
      maxConcurrentReactions: this.integrationConfig.reactionOverlay.maxConcurrentReactions,
      respectsReducedMotion: this.integrationConfig.theme.reducedMotion,
      eventHandlers: this.eventHandlers,
      ...options.reactionOverlay,
    });

    // Initialize avatar overlay
    this.avatarOverlay = new MaterialAvatarOverlay({
      avatarSize: this.integrationConfig.avatarOverlay.avatarSize,
      showNameLabels: this.integrationConfig.avatarOverlay.showNameLabels,
      showVoiceIndicators: this.integrationConfig.avatarOverlay.showVoiceIndicators,
      defaultElevation: this.integrationConfig.avatarOverlay.elevation,
      respectsReducedMotion: this.integrationConfig.theme.reducedMotion,
      eventHandlers: this.eventHandlers,
      ...options.avatarOverlay,
    });

    console.log('Material Overlay Manager initialized');
  }

  /**
   * Inject both overlay systems into video element
   */
  injectOverlays(videoElement: HTMLVideoElement): boolean {
    try {
      this.videoElement = videoElement;
      let success = true;

      // Inject reaction overlay if enabled
      if (this.integrationConfig.reactionOverlay.enabled) {
        const reactionSuccess = this.reactionOverlay.injectOverlay(videoElement);
        if (!reactionSuccess) {
          console.warn('Failed to inject reaction overlay');
          success = false;
        }
      }

      // Inject avatar overlay if enabled
      if (this.integrationConfig.avatarOverlay.enabled) {
        const avatarSuccess = this.avatarOverlay.injectOverlay(videoElement);
        if (!avatarSuccess) {
          console.warn('Failed to inject avatar overlay');
          success = false;
        }
      }

      this.isInjected = success;

      if (success) {
        console.log('Material overlays injected successfully');
      }

      return success;
    } catch (error) {
      console.error('Failed to inject Material overlays:', error);
      this.eventHandlers.onOverlayError?.(error as Error, 'injection');
      return false;
    }
  }

  /**
   * Remove both overlay systems
   */
  removeOverlays(): void {
    if (this.integrationConfig.reactionOverlay.enabled) {
      this.reactionOverlay.removeOverlay();
    }

    if (this.integrationConfig.avatarOverlay.enabled) {
      this.avatarOverlay.removeOverlay();
    }

    this.isInjected = false;
    this.videoElement = null;
    console.log('Material overlays removed');
  }

  /**
   * Show reaction with Material Design 3 styling
   */
  showReaction(
    reactionId: string,
    type: ReactionType,
    videoTimestamp: number,
    options: {
      position?: { x: number; y: number };
      duration?: number;
      elevation?: 'level1' | 'level2' | 'level3' | 'level4' | 'level5';
    } = {}
  ): boolean {
    if (!this.integrationConfig.reactionOverlay.enabled) {
      console.warn('Reaction overlay is disabled');
      return false;
    }

    return this.reactionOverlay.showReaction(reactionId, type, videoTimestamp, {
      ...options,
      animation: this.integrationConfig.reactionOverlay.animationType,
    });
  }

  /**
   * Update or add avatar with Material Design 3 styling
   */
  updateAvatar(avatar: Avatar): boolean {
    if (!this.integrationConfig.avatarOverlay.enabled) {
      console.warn('Avatar overlay is disabled');
      return false;
    }

    return this.avatarOverlay.updateAvatar(avatar);
  }

  /**
   * Update avatar position with smooth Material motion
   */
  updateAvatarPosition(avatarId: string, position: { x: number; y: number }): void {
    if (this.integrationConfig.avatarOverlay.enabled) {
      this.avatarOverlay.updateAvatarPosition(avatarId, position);
    }
  }

  /**
   * Update avatar voice activity indicators
   */
  updateAvatarVoiceActivity(avatarId: string, speaking: boolean, muted: boolean): void {
    if (this.integrationConfig.avatarOverlay.enabled) {
      this.avatarOverlay.updateAvatarVoiceActivity(avatarId, speaking, muted);
    }
  }

  /**
   * Remove specific reaction
   */
  removeReaction(reactionId: string): void {
    if (this.integrationConfig.reactionOverlay.enabled) {
      this.reactionOverlay.removeReaction(reactionId);
    }
  }

  /**
   * Remove specific avatar
   */
  removeAvatar(avatarId: string): void {
    if (this.integrationConfig.avatarOverlay.enabled) {
      this.avatarOverlay.removeAvatar(avatarId);
    }
  }

  /**
   * Set local avatar ID for special handling
   */
  setLocalAvatarId(avatarId: string): void {
    if (this.integrationConfig.avatarOverlay.enabled) {
      this.avatarOverlay.setLocalAvatarId(avatarId);
    }
  }

  /**
   * Clear all reactions
   */
  clearAllReactions(): void {
    if (this.integrationConfig.reactionOverlay.enabled) {
      this.reactionOverlay.clearReactions();
    }
  }

  /**
   * Clear all avatars
   */
  clearAllAvatars(): void {
    if (this.integrationConfig.avatarOverlay.enabled) {
      this.avatarOverlay.clearAllAvatars();
    }
  }

  /**
   * Clear all overlays
   */
  clearAll(): void {
    this.clearAllReactions();
    this.clearAllAvatars();
  }

  /**
   * Check if overlays are injected
   */
  areOverlaysInjected(): boolean {
    return this.isInjected;
  }

  /**
   * Get reaction overlay status
   */
  getReactionOverlayStatus(): {
    enabled: boolean;
    injected: boolean;
    activeCount: number;
    stats: any;
  } {
    return {
      enabled: this.integrationConfig.reactionOverlay.enabled,
      injected:
        this.integrationConfig.reactionOverlay.enabled && this.reactionOverlay.isOverlayInjected(),
      activeCount: this.integrationConfig.reactionOverlay.enabled
        ? this.reactionOverlay.getActiveReactionCount()
        : 0,
      stats: this.integrationConfig.reactionOverlay.enabled
        ? this.reactionOverlay.getReactionStats()
        : null,
    };
  }

  /**
   * Get avatar overlay status
   */
  getAvatarOverlayStatus(): {
    enabled: boolean;
    injected: boolean;
    activeCount: number;
    stats: any;
  } {
    return {
      enabled: this.integrationConfig.avatarOverlay.enabled,
      injected:
        this.integrationConfig.avatarOverlay.enabled && this.avatarOverlay.isOverlayInjected(),
      activeCount: this.integrationConfig.avatarOverlay.enabled
        ? this.avatarOverlay.getActiveAvatarCount()
        : 0,
      stats: this.integrationConfig.avatarOverlay.enabled
        ? this.avatarOverlay.getAvatarStats()
        : null,
    };
  }

  /**
   * Get comprehensive overlay status
   */
  getOverlayStatus(): {
    injected: boolean;
    reactions: ReturnType<MaterialOverlayManager['getReactionOverlayStatus']>;
    avatars: ReturnType<MaterialOverlayManager['getAvatarOverlayStatus']>;
    integration: OverlayIntegrationConfig;
  } {
    return {
      injected: this.isInjected,
      reactions: this.getReactionOverlayStatus(),
      avatars: this.getAvatarOverlayStatus(),
      integration: this.integrationConfig,
    };
  }

  /**
   * Update integration configuration
   */
  updateIntegrationConfig(newConfig: Partial<OverlayIntegrationConfig>): void {
    // Deep merge configuration
    if (newConfig.reactionOverlay) {
      Object.assign(this.integrationConfig.reactionOverlay, newConfig.reactionOverlay);
    }
    if (newConfig.avatarOverlay) {
      Object.assign(this.integrationConfig.avatarOverlay, newConfig.avatarOverlay);
    }
    if (newConfig.theme) {
      Object.assign(this.integrationConfig.theme, newConfig.theme);
    }

    // Update overlay options
    this.reactionOverlay.updateOptions({
      maxConcurrentReactions: this.integrationConfig.reactionOverlay.maxConcurrentReactions,
      displayDuration: this.integrationConfig.reactionOverlay.defaultDuration,
      respectsReducedMotion: this.integrationConfig.theme.reducedMotion,
    });

    this.avatarOverlay.updateOptions({
      avatarSize: this.integrationConfig.avatarOverlay.avatarSize,
      showNameLabels: this.integrationConfig.avatarOverlay.showNameLabels,
      showVoiceIndicators: this.integrationConfig.avatarOverlay.showVoiceIndicators,
      defaultElevation: this.integrationConfig.avatarOverlay.elevation,
      respectsReducedMotion: this.integrationConfig.theme.reducedMotion,
    });

    console.log('Integration configuration updated');
  }

  /**
   * Enable or disable specific overlay systems
   */
  toggleOverlaySystem(system: 'reactions' | 'avatars', enabled: boolean): void {
    if (system === 'reactions') {
      this.integrationConfig.reactionOverlay.enabled = enabled;
      if (!enabled) {
        this.reactionOverlay.removeOverlay();
      } else if (this.videoElement) {
        this.reactionOverlay.injectOverlay(this.videoElement);
      }
    } else if (system === 'avatars') {
      this.integrationConfig.avatarOverlay.enabled = enabled;
      if (!enabled) {
        this.avatarOverlay.removeOverlay();
      } else if (this.videoElement) {
        this.avatarOverlay.injectOverlay(this.videoElement);
      }
    }

    console.log(`${system} overlay system ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get all avatars
   */
  getAvatars(): Avatar[] {
    if (!this.integrationConfig.avatarOverlay.enabled) {
      return [];
    }
    return this.avatarOverlay.getAvatars();
  }

  /**
   * Get specific avatar
   */
  getAvatar(avatarId: string): Avatar | null {
    if (!this.integrationConfig.avatarOverlay.enabled) {
      return null;
    }
    return this.avatarOverlay.getAvatar(avatarId);
  }

  /**
   * Destroy overlay manager and clean up resources
   */
  destroy(): void {
    this.removeOverlays();
    console.log('Material Overlay Manager destroyed');
  }
}

export default MaterialOverlayManager;
