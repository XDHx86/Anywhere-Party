/**
 * Material Design 3 Avatar Overlay
 * Enhanced avatar system with Material surfaces, elevation, and smooth animations
 * Requirements: 28.1, 28.2, 28.3, 28.4, 28.5
 */

import { MaterialVideoOverlay } from './material-video-overlay';
import { AvatarSurfaceConfig, OverlayEventHandlers } from './types';
import { Avatar } from '../../@core/avatar-overlay/types';

export interface MaterialAvatarOverlayOptions {
  avatarSize?: number;
  showNameLabels?: boolean;
  showVoiceIndicators?: boolean;
  enableTranslucency?: boolean;
  defaultElevation?: 'level1' | 'level2' | 'level3' | 'level4' | 'level5';
  animationDuration?: number;
  collisionAvoidance?: boolean;
  maxAvatars?: number;
  respectsReducedMotion?: boolean;
  eventHandlers?: OverlayEventHandlers;
}

export class MaterialAvatarOverlay {
  private materialOverlay: MaterialVideoOverlay;
  private options: Required<MaterialAvatarOverlayOptions>;
  private avatars: Map<string, Avatar> = new Map();
  private avatarPositions: Map<string, { x: number; y: number }> = new Map();
  private localAvatarId: string | null = null;

  // Material Design 3 avatar colors
  private readonly avatarColors = [
    '#6200EE', // Primary Purple
    '#03DAC6', // Secondary Teal
    '#4285F4', // Material Blue
    '#34A853', // Material Green
    '#FBBC04', // Material Yellow
    '#EA4335', // Material Red
    '#FF6D01', // Material Orange
    '#9C27B0', // Material Purple
    '#E91E63', // Material Pink
    '#00BCD4', // Material Cyan
  ];

  constructor(options: MaterialAvatarOverlayOptions = {}) {
    this.options = {
      avatarSize: options.avatarSize ?? 48,
      showNameLabels: options.showNameLabels ?? true,
      showVoiceIndicators: options.showVoiceIndicators ?? true,
      enableTranslucency: options.enableTranslucency ?? false,
      defaultElevation: options.defaultElevation ?? 'level3',
      animationDuration: options.animationDuration ?? 300,
      collisionAvoidance: options.collisionAvoidance ?? true,
      maxAvatars: options.maxAvatars ?? 12,
      respectsReducedMotion: options.respectsReducedMotion ?? true,
      eventHandlers: options.eventHandlers ?? {},
    };

    // Initialize Material overlay system
    this.materialOverlay = new MaterialVideoOverlay({
      enableTranslucency: this.options.enableTranslucency,
      defaultElevation: this.options.defaultElevation,
      cornerRadius: 'large',
      animationDuration: this.options.animationDuration,
      maxConcurrentSurfaces: this.options.maxAvatars,
      autoCleanup: false, // Avatars are persistent
      respectsReducedMotion: this.options.respectsReducedMotion,
      onSurfaceCreate: (surface) => {
        console.log('Avatar surface created:', surface.id);
      },
      onSurfaceDestroy: (surface) => {
        this.avatars.delete(surface.id);
        this.avatarPositions.delete(surface.id);
        console.log('Avatar surface destroyed:', surface.id);
      },
    });
  }

  /**
   * Inject Material avatar overlay into video element
   */
  injectOverlay(videoElement: HTMLVideoElement): boolean {
    try {
      const success = this.materialOverlay.injectOverlay(videoElement);
      if (success) {
        console.log('Material avatar overlay injected successfully');
      }
      return success;
    } catch (error) {
      console.error('Failed to inject Material avatar overlay:', error);
      this.options.eventHandlers.onOverlayError?.(error as Error, 'injection');
      return false;
    }
  }

  /**
   * Remove Material avatar overlay
   */
  removeOverlay(): void {
    this.materialOverlay.removeOverlay();
    this.avatars.clear();
    this.avatarPositions.clear();
    this.localAvatarId = null;
    console.log('Material avatar overlay removed');
  }

  /**
   * Add or update avatar with Material Design 3 styling
   */
  updateAvatar(avatar: Avatar): boolean {
    if (!this.materialOverlay.isOverlayInjected()) {
      console.warn('Material avatar overlay not injected');
      return false;
    }

    const existing = this.avatars.get(avatar.id);
    let position = this.avatarPositions.get(avatar.id);

    // Generate position for new avatars
    if (!position) {
      position = this.generateAvatarPosition(avatar.id);
      this.avatarPositions.set(avatar.id, position);
    } else if (existing) {
      // Update position if avatar moved
      position = { x: avatar.x, y: avatar.y };
      this.avatarPositions.set(avatar.id, position);
    }

    // Apply collision avoidance if enabled
    if (this.options.collisionAvoidance) {
      position = this.applyCollisionAvoidance(avatar.id, position);
    }

    // Get avatar color
    const color = this.getAvatarColor(avatar.userId);

    // Create avatar surface configuration
    const surfaceConfig: AvatarSurfaceConfig = {
      imageUrl: avatar.imageUrl,
      displayName: avatar.displayName,
      color,
      speaking: avatar.speaking,
      muted: avatar.muted,
      position,
      elevation: this.options.defaultElevation,
      size: this.options.avatarSize,
      showIndicators: this.options.showNameLabels || this.options.showVoiceIndicators,
    };

    // Create or update the Material surface
    const success = this.materialOverlay.createAvatarSurface(
      avatar.id,
      {
        imageUrl: surfaceConfig.imageUrl,
        displayName: surfaceConfig.displayName,
        color: surfaceConfig.color,
        speaking: surfaceConfig.speaking,
        muted: surfaceConfig.muted,
      },
      position,
      {
        elevation: surfaceConfig.elevation,
        size: surfaceConfig.size,
        showIndicators: surfaceConfig.showIndicators,
      }
    );

    if (success) {
      // Store avatar data with the collision-adjusted position so the recorded
      // coordinates match where the avatar is actually displayed (consistent
      // with updateAvatarPosition).
      this.avatars.set(avatar.id, { ...avatar, ...position });

      // Notify event handlers
      this.options.eventHandlers.onAvatarUpdate?.(avatar.id, surfaceConfig);

      console.log('Material avatar updated:', avatar.id);
    }

    return success;
  }

  /**
   * Remove avatar
   */
  removeAvatar(avatarId: string): void {
    this.materialOverlay.removeSurface(avatarId);
    this.avatars.delete(avatarId);
    this.avatarPositions.delete(avatarId);
  }

  /**
   * Set local avatar ID for special handling
   */
  setLocalAvatarId(avatarId: string): void {
    this.localAvatarId = avatarId;
  }

  /**
   * Update avatar position with smooth Material motion
   */
  updateAvatarPosition(avatarId: string, position: { x: number; y: number }): void {
    const avatar = this.avatars.get(avatarId);
    if (!avatar) return;

    // Apply collision avoidance
    let finalPosition = position;
    if (this.options.collisionAvoidance) {
      finalPosition = this.applyCollisionAvoidance(avatarId, position);
    }

    // Update stored position
    this.avatarPositions.set(avatarId, finalPosition);

    // Update Material surface position
    this.materialOverlay.updateAvatarPosition(avatarId, finalPosition);

    // Update avatar data
    avatar.x = finalPosition.x;
    avatar.y = finalPosition.y;
    avatar.lastUpdate = Date.now();

    // Notify event handlers
    this.options.eventHandlers.onAvatarMove?.(avatarId, finalPosition);
  }

  /**
   * Update avatar voice activity indicators
   */
  updateAvatarVoiceActivity(avatarId: string, speaking: boolean, muted: boolean): void {
    const avatar = this.avatars.get(avatarId);
    if (!avatar) return;

    // Update avatar data
    avatar.speaking = speaking;
    avatar.muted = muted;

    // Update Material surface indicators
    this.materialOverlay.updateAvatarIndicators(avatarId, { speaking, muted });

    console.log('Avatar voice activity updated:', avatarId, { speaking, muted });
  }

  /**
   * Get all avatars
   */
  getAvatars(): Avatar[] {
    return Array.from(this.avatars.values());
  }

  /**
   * Get avatar by ID
   */
  getAvatar(avatarId: string): Avatar | null {
    return this.avatars.get(avatarId) || null;
  }

  /**
   * Check if overlay is injected
   */
  isOverlayInjected(): boolean {
    return this.materialOverlay.isOverlayInjected();
  }

  /**
   * Get active avatar count
   */
  getActiveAvatarCount(): number {
    return this.materialOverlay.getActiveSurfaceCount();
  }

  /**
   * Update overlay options
   */
  updateOptions(newOptions: Partial<MaterialAvatarOverlayOptions>): void {
    Object.assign(this.options, newOptions);
  }

  /**
   * Clear all avatars
   */
  clearAllAvatars(): void {
    this.materialOverlay.clearAllSurfaces();
    this.avatars.clear();
    this.avatarPositions.clear();
  }

  /**
   * Get avatar statistics
   */
  getAvatarStats(): {
    totalActive: number;
    speakingCount: number;
    mutedCount: number;
    localAvatarId: string | null;
    averagePosition: { x: number; y: number } | null;
  } {
    const avatars = Array.from(this.avatars.values());

    const stats = {
      totalActive: avatars.length,
      speakingCount: avatars.filter((a) => a.speaking).length,
      mutedCount: avatars.filter((a) => a.muted).length,
      localAvatarId: this.localAvatarId,
      averagePosition: null as { x: number; y: number } | null,
    };

    // Calculate average position
    if (avatars.length > 0) {
      const totalX = avatars.reduce((sum, a) => sum + a.x, 0);
      const totalY = avatars.reduce((sum, a) => sum + a.y, 0);
      stats.averagePosition = {
        x: totalX / avatars.length,
        y: totalY / avatars.length,
      };
    }

    return stats;
  }

  private generateAvatarPosition(avatarId: string): { x: number; y: number } {
    const maxAttempts = 20;
    let attempts = 0;

    while (attempts < maxAttempts) {
      // Generate position within safe bounds
      const margin = 0.1; // 10% margin from edges
      const x = margin + Math.random() * (1 - 2 * margin);
      const y = margin + Math.random() * (1 - 2 * margin);

      const position = { x, y };

      // Check for collisions with existing avatars
      if (!this.hasCollision(avatarId, position)) {
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

  private applyCollisionAvoidance(
    avatarId: string,
    targetPosition: { x: number; y: number }
  ): { x: number; y: number } {
    const collisionRadius = 0.08; // 8% of video dimensions
    const adjustedPosition = { ...targetPosition };
    let attempts = 0;
    const maxAttempts = 5;

    // Check for collisions with other avatars
    while (attempts < maxAttempts) {
      let hasCollision = false;

      for (const [otherId, otherPosition] of this.avatarPositions.entries()) {
        if (otherId === avatarId) continue;

        const dx = adjustedPosition.x - otherPosition.x;
        const dy = adjustedPosition.y - otherPosition.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < collisionRadius) {
          hasCollision = true;
          // Push away from collision. When two avatars share the exact same
          // anchor point (distance === 0) the direction is undefined, so nudge
          // diagonally instead of dividing by zero.
          let pushX: number;
          let pushY: number;
          if (distance === 0) {
            pushX = collisionRadius * 0.6;
            pushY = collisionRadius * 0.6;
          } else {
            pushX = (dx / distance) * (collisionRadius - distance) * 0.6;
            pushY = (dy / distance) * (collisionRadius - distance) * 0.6;
          }

          adjustedPosition.x = Math.max(0.05, Math.min(0.95, adjustedPosition.x + pushX));
          adjustedPosition.y = Math.max(0.05, Math.min(0.95, adjustedPosition.y + pushY));
          break;
        }
      }

      if (!hasCollision) break;
      attempts++;
    }

    return adjustedPosition;
  }

  private hasCollision(avatarId: string, position: { x: number; y: number }): boolean {
    const collisionRadius = 0.08; // 8% of video dimensions

    for (const [otherId, otherPosition] of this.avatarPositions.entries()) {
      if (otherId === avatarId) continue;

      const dx = position.x - otherPosition.x;
      const dy = position.y - otherPosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < collisionRadius) {
        return true;
      }
    }

    return false;
  }

  private getAvatarColor(userId: string): string {
    // Generate consistent color based on user ID
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }

    return this.avatarColors[Math.abs(hash) % this.avatarColors.length] ?? '';
  }
}

export default MaterialAvatarOverlay;
