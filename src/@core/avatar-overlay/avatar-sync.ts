/**
 * Avatar Synchronization Manager
 * Handles real-time avatar position and state synchronization
 */

import {
  Avatar,
  AvatarMessage,
  AvatarSyncOptions,
  AvatarConfig,
  AvatarUpdateMessage,
  AvatarAnimateMessage,
  AvatarChatBubbleMessage,
  AvatarConfigMessage,
  AvatarVisibilityMessage,
} from './types';

export class AvatarSync {
  private options: Required<AvatarSyncOptions>;
  private avatars: Map<string, Avatar> = new Map();
  private localAvatar: Avatar | null = null;
  private updateTimer: number | null = null;
  private lastUpdateTime = 0;
  private pendingUpdates: Map<string, AvatarUpdateMessage> = new Map();

  constructor(options: AvatarSyncOptions) {
    this.options = {
      roomId: options.roomId,
      userId: options.userId,
      userName: options.userName,
      signalingSend: options.signalingSend ?? (() => {}),
      onAvatarUpdate: options.onAvatarUpdate ?? (() => {}),
      onAvatarAnimate: options.onAvatarAnimate ?? (() => {}),
      onChatBubble: options.onChatBubble ?? (() => {}),
      onConfigUpdate: options.onConfigUpdate ?? (() => {}),
    };

    this.createLocalAvatar();
    this.startUpdateLoop();
  }

  /**
   * Create local user's avatar
   */
  private createLocalAvatar(): void {
    this.localAvatar = {
      id: `avatar_${this.options.userId}`,
      userId: this.options.userId,
      displayName: this.options.userName,
      x: Math.random() * 0.8 + 0.1, // Random position avoiding edges
      y: Math.random() * 0.8 + 0.1,
      visible: true,
      speaking: false,
      muted: false,
      lastUpdate: Date.now(),
    };

    this.avatars.set(this.localAvatar.id, this.localAvatar);
    console.log('Local avatar created:', this.localAvatar.id);
  }

  /**
   * Update local avatar position
   */
  updateLocalPosition(x: number, y: number): void {
    if (!this.localAvatar) return;

    // Clamp position to valid range
    x = Math.max(0, Math.min(1, x));
    y = Math.max(0, Math.min(1, y));

    this.localAvatar.x = x;
    this.localAvatar.y = y;
    this.localAvatar.lastUpdate = Date.now();

    // Queue update for next sync cycle
    const updateMessage: AvatarUpdateMessage = {
      type: 'AVATAR_UPDATE',
      id: this.localAvatar.id,
      x,
      y,
      timestamp: this.localAvatar.lastUpdate,
    };

    this.pendingUpdates.set(this.localAvatar.id, updateMessage);
  }

  /**
   * Trigger animation on local avatar
   */
  triggerAnimation(animationKey: string, durationMs = 2000): void {
    if (!this.localAvatar) return;

    const message: AvatarAnimateMessage = {
      type: 'AVATAR_ANIMATE',
      id: this.localAvatar.id,
      animationKey,
      durationMs,
    };

    this.sendMessage(message);
    this.options.onAvatarAnimate(this.localAvatar.id, animationKey);
  }

  /**
   * Show chat bubble on local avatar
   */
  showChatBubble(message: string, durationMs = 4000): void {
    if (!this.localAvatar) return;

    const bubbleMessage: AvatarChatBubbleMessage = {
      type: 'AVATAR_CHAT_BUBBLE',
      id: this.localAvatar.id,
      message,
      durationMs,
    };

    this.sendMessage(bubbleMessage);
    this.options.onChatBubble(this.localAvatar.id, message);
  }

  /**
   * Update local avatar configuration
   */
  updateConfig(config: Partial<AvatarConfig>): void {
    if (!this.localAvatar) return;

    if (config.imageUrl !== undefined) {
      this.localAvatar.imageUrl = config.imageUrl;
    }
    if (config.animationUrl !== undefined) {
      this.localAvatar.animationUrl = config.animationUrl;
    }
    if (config.displayName !== undefined) {
      this.localAvatar.displayName = config.displayName;
    }

    const message: AvatarConfigMessage = {
      type: 'AVATAR_CONFIG',
      id: this.localAvatar.id,
      imageUrl: this.localAvatar.imageUrl,
      animationUrl: this.localAvatar.animationUrl,
      displayName: this.localAvatar.displayName,
    };

    this.sendMessage(message);
    this.options.onConfigUpdate(this.localAvatar.id, {
      id: this.localAvatar.id,
      imageUrl: this.localAvatar.imageUrl,
      animationUrl: this.localAvatar.animationUrl,
      displayName: this.localAvatar.displayName,
    });
  }

  /**
   * Set local avatar visibility
   */
  setVisibility(visible: boolean): void {
    if (!this.localAvatar) return;

    this.localAvatar.visible = visible;

    const message: AvatarVisibilityMessage = {
      type: 'AVATAR_VISIBILITY',
      id: this.localAvatar.id,
      visible,
    };

    this.sendMessage(message);
  }

  /**
   * Update voice activity status
   */
  setVoiceActivity(speaking: boolean, muted: boolean): void {
    if (!this.localAvatar) return;

    this.localAvatar.speaking = speaking;
    this.localAvatar.muted = muted;

    this.options.onAvatarUpdate(this.localAvatar);
  }

  /**
   * Handle incoming avatar messages
   */
  handleMessage(message: AvatarMessage): void {
    switch (message.type) {
      case 'AVATAR_UPDATE':
        this.handleAvatarUpdate(message);
        break;
      case 'AVATAR_ANIMATE':
        this.handleAvatarAnimate(message);
        break;
      case 'AVATAR_CHAT_BUBBLE':
        this.handleChatBubble(message);
        break;
      case 'AVATAR_CONFIG':
        this.handleConfigUpdate(message);
        break;
      case 'AVATAR_VISIBILITY':
        this.handleVisibilityUpdate(message);
        break;
    }
  }

  /**
   * Handle avatar position update
   */
  private handleAvatarUpdate(message: AvatarUpdateMessage): void {
    // Don't update our own avatar from remote messages
    if (message.id === this.localAvatar?.id) return;

    let avatar = this.avatars.get(message.id);

    if (!avatar) {
      // Create new remote avatar
      avatar = {
        id: message.id,
        userId: message.id.replace('avatar_', ''),
        displayName: 'Unknown User',
        x: message.x,
        y: message.y,
        visible: true,
        speaking: false,
        muted: false,
        lastUpdate: message.timestamp,
      };
      this.avatars.set(message.id, avatar);
    } else {
      // Update existing avatar
      avatar.x = message.x;
      avatar.y = message.y;
      avatar.lastUpdate = message.timestamp;
    }

    this.options.onAvatarUpdate(avatar);
  }

  /**
   * Handle avatar animation
   */
  private handleAvatarAnimate(message: AvatarAnimateMessage): void {
    this.options.onAvatarAnimate(message.id, message.animationKey);
  }

  /**
   * Handle chat bubble
   */
  private handleChatBubble(message: AvatarChatBubbleMessage): void {
    this.options.onChatBubble(message.id, message.message);
  }

  /**
   * Handle configuration update
   */
  private handleConfigUpdate(message: AvatarConfigMessage): void {
    let avatar = this.avatars.get(message.id);

    if (!avatar) {
      // Create new remote avatar with config
      avatar = {
        id: message.id,
        userId: message.id.replace('avatar_', ''),
        displayName: message.displayName,
        imageUrl: message.imageUrl,
        animationUrl: message.animationUrl,
        x: Math.random() * 0.8 + 0.1,
        y: Math.random() * 0.8 + 0.1,
        visible: true,
        speaking: false,
        muted: false,
        lastUpdate: Date.now(),
      };
      this.avatars.set(message.id, avatar);
    } else {
      // Update existing avatar config
      avatar.displayName = message.displayName;
      avatar.imageUrl = message.imageUrl;
      avatar.animationUrl = message.animationUrl;
    }

    this.options.onConfigUpdate(message.id, {
      id: message.id,
      imageUrl: message.imageUrl,
      animationUrl: message.animationUrl,
      displayName: message.displayName,
    });
  }

  /**
   * Handle visibility update
   */
  private handleVisibilityUpdate(message: AvatarVisibilityMessage): void {
    const avatar = this.avatars.get(message.id);
    if (avatar) {
      avatar.visible = message.visible;
      this.options.onAvatarUpdate(avatar);
    }
  }

  /**
   * Start position update loop
   */
  private startUpdateLoop(): void {
    const updateInterval = 1000 / 30; // 30 Hz

    this.updateTimer = window.setInterval(() => {
      this.sendPendingUpdates();
    }, updateInterval);
  }

  /**
   * Send pending position updates
   */
  private sendPendingUpdates(): void {
    if (this.pendingUpdates.size === 0) return;

    // Send all pending updates
    this.pendingUpdates.forEach((update) => {
      this.sendMessage(update);
    });

    this.pendingUpdates.clear();
  }

  /**
   * Send message via signaling
   */
  private sendMessage(message: AvatarMessage): void {
    try {
      this.options.signalingSend({
        type: 'AVATAR_MESSAGE',
        roomId: this.options.roomId,
        message,
      });
    } catch (error) {
      console.error('Failed to send avatar message:', error);
    }
  }

  /**
   * Get all avatars
   */
  getAvatars(): Avatar[] {
    return Array.from(this.avatars.values());
  }

  /**
   * Get local avatar
   */
  getLocalAvatar(): Avatar | null {
    return this.localAvatar;
  }

  /**
   * Get avatar by ID
   */
  getAvatar(id: string): Avatar | undefined {
    return this.avatars.get(id);
  }

  /**
   * Remove avatar (when user leaves)
   */
  removeAvatar(id: string): void {
    this.avatars.delete(id);
  }

  /**
   * Clean up expired avatars
   */
  cleanup(): void {
    const now = Date.now();
    const timeout = 30000; // 30 seconds

    for (const [id, avatar] of this.avatars.entries()) {
      if (id !== this.localAvatar?.id && now - avatar.lastUpdate > timeout) {
        this.avatars.delete(id);
        console.log('Removed expired avatar:', id);
      }
    }
  }

  /**
   * Destroy sync manager
   */
  destroy(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }

    this.avatars.clear();
    this.localAvatar = null;
    this.pendingUpdates.clear();
  }
}
