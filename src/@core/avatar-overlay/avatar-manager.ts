/**
 * Avatar Manager
 * Coordinates avatar synchronization and overlay rendering
 */

import { AvatarSync } from './avatar-sync';
import { AvatarOverlay } from '../../@ui/avatar-overlay/avatar-overlay';
import {
  Avatar,
  AvatarMessage,
  AvatarOverlayOptions,
  AvatarSyncOptions,
  AvatarAnimationKey,
  AvatarConfig,
} from './types';

export interface AvatarManagerOptions {
  roomId: string;
  userId: string;
  userName: string;
  overlayOptions?: AvatarOverlayOptions;
  signalingSend?: (message: unknown) => void;
  onAvatarUpdate?: (avatar: Avatar) => void;
  onAvatarMove?: (avatar: Avatar) => void;
  onAvatarAnimate?: (avatar: Avatar, animationKey: string) => void;
  onChatBubble?: (avatar: Avatar, message: string) => void;
  onVoiceActivity?: (avatar: Avatar, speaking: boolean) => void;
}

export class AvatarManager {
  private avatarSync: AvatarSync;
  private avatarOverlay: AvatarOverlay;
  private options: AvatarManagerOptions;
  private isActive = false;

  constructor(options: AvatarManagerOptions) {
    this.options = options;

    // Initialize avatar synchronization
    const syncOptions: AvatarSyncOptions = {
      roomId: options.roomId,
      userId: options.userId,
      userName: options.userName,
      signalingSend: options.signalingSend,
      onAvatarUpdate: (avatar) => this.handleAvatarUpdate(avatar),
      onAvatarAnimate: (avatarId, animationKey) => this.handleAvatarAnimate(avatarId, animationKey),
      onChatBubble: (avatarId, message) => this.handleChatBubble(avatarId, message),
      onConfigUpdate: (avatarId, config) => this.handleConfigUpdate(avatarId, config),
    };

    this.avatarSync = new AvatarSync(syncOptions);

    // Initialize avatar overlay
    const overlayOptions: AvatarOverlayOptions = {
      ...options.overlayOptions,
      onAvatarMove: (avatar) => this.handleAvatarMove(avatar),
      onAvatarAnimate: (avatar, animationKey) => {
        // Don't trigger overlay animation from overlay callback to avoid infinite loop
        this.options.onAvatarAnimate?.(avatar, animationKey);
      },
      onChatBubble: (avatar, message) => {
        // Don't trigger overlay chat bubble from overlay callback to avoid infinite loop
        this.options.onChatBubble?.(avatar, message);
      },
      onVoiceActivity: (avatar, speaking) => this.handleVoiceActivity(avatar, speaking),
    };

    this.avatarOverlay = new AvatarOverlay(overlayOptions);

    console.log('Avatar manager initialized for room:', options.roomId);
  }

  /**
   * Inject avatar overlay on video element
   */
  injectOverlay(videoElement: HTMLVideoElement): boolean {
    const success = this.avatarOverlay.injectOverlay(videoElement);

    if (success) {
      const localAvatar = this.avatarSync.getLocalAvatar();
      if (localAvatar) {
        this.avatarOverlay.setLocalAvatarId(localAvatar.id);
        this.avatarOverlay.updateAvatar(localAvatar);
      }

      this.isActive = true;
      console.log('Avatar overlay injected successfully');
    }

    return success;
  }

  /**
   * Remove avatar overlay
   */
  removeOverlay(): void {
    this.avatarOverlay.removeOverlay();
    this.isActive = false;
    console.log('Avatar overlay removed');
  }

  /**
   * Handle incoming avatar messages from signaling
   */
  handleMessage(message: AvatarMessage): void {
    this.avatarSync.handleMessage(message);
  }

  /**
   * Trigger animation on local avatar
   */
  triggerAnimation(animationKey: AvatarAnimationKey, durationMs?: number): void {
    this.avatarSync.triggerAnimation(animationKey, durationMs);

    const localAvatar = this.avatarSync.getLocalAvatar();
    if (localAvatar) {
      this.avatarOverlay.triggerAnimation(localAvatar.id, animationKey, durationMs);
    }
  }

  /**
   * Show chat bubble on local avatar
   */
  showChatBubble(message: string, durationMs?: number): void {
    this.avatarSync.showChatBubble(message, durationMs);

    const localAvatar = this.avatarSync.getLocalAvatar();
    if (localAvatar) {
      this.avatarOverlay.showChatBubble(localAvatar.id, message, durationMs);
    }
  }

  /**
   * Update local avatar configuration
   */
  updateConfig(config: { imageUrl?: string; animationUrl?: string; displayName?: string }): void {
    this.avatarSync.updateConfig(config);
  }

  /**
   * Set local avatar visibility
   */
  setVisibility(visible: boolean): void {
    this.avatarSync.setVisibility(visible);
  }

  /**
   * Update voice activity status
   */
  setVoiceActivity(speaking: boolean, muted: boolean): void {
    this.avatarSync.setVoiceActivity(speaking, muted);
  }

  /**
   * Handle keyboard input for avatar movement
   */
  handleKeyDown(event: KeyboardEvent): void {
    if (this.isActive) {
      this.avatarOverlay.handleKeyDown(event);
    }
  }

  /**
   * Handle keyboard release
   */
  handleKeyUp(event: KeyboardEvent): void {
    if (this.isActive) {
      this.avatarOverlay.handleKeyUp(event);
    }
  }

  /**
   * Get all avatars
   */
  getAvatars(): Avatar[] {
    return this.avatarSync.getAvatars();
  }

  /**
   * Get local avatar
   */
  getLocalAvatar(): Avatar | null {
    return this.avatarSync.getLocalAvatar();
  }

  /**
   * Check if overlay is active
   */
  isOverlayActive(): boolean {
    return this.isActive && this.avatarOverlay.isOverlayInjected();
  }

  /**
   * Clean up expired avatars
   */
  cleanup(): void {
    this.avatarSync.cleanup();
  }

  /**
   * Destroy avatar manager
   */
  destroy(): void {
    this.removeOverlay();
    this.avatarSync.destroy();
    this.isActive = false;
  }

  private handleAvatarUpdate(avatar: Avatar): void {
    if (this.isActive) {
      this.avatarOverlay.updateAvatar(avatar);
    }

    this.options.onAvatarUpdate?.(avatar);
  }

  private handleAvatarMove(avatar: Avatar): void {
    // Update sync with new position
    if (avatar.id === this.avatarSync.getLocalAvatar()?.id) {
      this.avatarSync.updateLocalPosition(avatar.x, avatar.y);
    }

    this.options.onAvatarMove?.(avatar);
  }

  private handleAvatarAnimate(avatarId: string, animationKey: string): void {
    // Only trigger overlay animation for remote avatars or when called from sync
    if (this.isActive && avatarId !== this.avatarSync.getLocalAvatar()?.id) {
      this.avatarOverlay.triggerAnimation(avatarId, animationKey as AvatarAnimationKey);
    }

    const avatar = this.avatarSync.getAvatar(avatarId);
    if (avatar) {
      this.options.onAvatarAnimate?.(avatar, animationKey);
    }
  }

  private handleChatBubble(avatarId: string, message: string): void {
    // Only trigger overlay chat bubble for remote avatars or when called from sync
    if (this.isActive && avatarId !== this.avatarSync.getLocalAvatar()?.id) {
      this.avatarOverlay.showChatBubble(avatarId, message);
    }

    const avatar = this.avatarSync.getAvatar(avatarId);
    if (avatar) {
      this.options.onChatBubble?.(avatar, message);
    }
  }

  private handleConfigUpdate(avatarId: string, config: AvatarConfig): void {
    // Config updates are handled automatically by sync
    console.log('Avatar config updated:', avatarId, config);
  }

  private handleVoiceActivity(avatar: Avatar, speaking: boolean): void {
    // Update the avatar in sync
    const syncAvatar = this.avatarSync.getAvatar(avatar.id);
    if (syncAvatar) {
      syncAvatar.speaking = speaking;
    }

    this.options.onVoiceActivity?.(avatar, speaking);
  }
}
