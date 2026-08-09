/**
 * Avatar Overlay Renderer
 * Renders avatars, chat bubbles, and animations on video overlay with Material Design 3 styling
 * Requirements: 28.1, 28.2, 28.3, 28.4, 28.5
 */

import {
  Avatar,
  AvatarOverlayOptions,
  AvatarRenderData,
  AvatarAnimation,
  ChatBubble,
  MovementState,
  DEFAULT_AVATAR_CONFIG,
  MOVEMENT_SPEED,
  COLLISION_RADIUS,
  VOICE_GLOW_RADIUS,
  CHAT_BUBBLE_OFFSET_Y,
  CHAT_BUBBLE_MAX_WIDTH,
  AvatarAnimationKey,
} from '../../@core/avatar-overlay/types';
import { MaterialAvatarOverlay } from '../overlays/material-avatar-overlay';

export class AvatarOverlay {
  private container: HTMLElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private options: Required<AvatarOverlayOptions>;
  private materialOverlay: MaterialAvatarOverlay | null = null;

  private avatars: Map<string, Avatar> = new Map();
  private renderData: Map<string, AvatarRenderData> = new Map();
  private animations: Map<string, AvatarAnimation> = new Map();
  private chatBubbles: Map<string, ChatBubble> = new Map();
  private imageCache: Map<string, HTMLImageElement> = new Map();

  private movementState: MovementState = {
    up: false,
    down: false,
    left: false,
    right: false,
    mouseDown: false,
    lastMouseX: 0,
    lastMouseY: 0,
  };

  private renderTimer: number | null = null;
  private isInjected = false;
  private localAvatarId: string | null = null;

  constructor(options: AvatarOverlayOptions = {}) {
    this.options = {
      updateRate: options.updateRate ?? DEFAULT_AVATAR_CONFIG.updateRate,
      lerpFactor: options.lerpFactor ?? DEFAULT_AVATAR_CONFIG.lerpFactor,
      avatarSize: options.avatarSize ?? DEFAULT_AVATAR_CONFIG.avatarSize,
      chatBubbleDuration: options.chatBubbleDuration ?? DEFAULT_AVATAR_CONFIG.chatBubbleDuration,
      animationDuration: options.animationDuration ?? DEFAULT_AVATAR_CONFIG.animationDuration,
      collisionAvoidance: options.collisionAvoidance ?? DEFAULT_AVATAR_CONFIG.collisionAvoidance,
      voiceActivityGlow: options.voiceActivityGlow ?? DEFAULT_AVATAR_CONFIG.voiceActivityGlow,
      maxAvatars: options.maxAvatars ?? DEFAULT_AVATAR_CONFIG.maxAvatars,
      onAvatarMove: options.onAvatarMove ?? (() => {}),
      onAvatarAnimate: options.onAvatarAnimate ?? (() => {}),
      onChatBubble: options.onChatBubble ?? (() => {}),
      onVoiceActivity: options.onVoiceActivity ?? (() => {}),
    };

    // Initialize Material Design 3 overlay
    this.materialOverlay = new MaterialAvatarOverlay({
      avatarSize: this.options.avatarSize,
      showNameLabels: true,
      showVoiceIndicators: this.options.voiceActivityGlow,
      enableTranslucency: false,
      defaultElevation: 'level3',
      animationDuration: this.options.animationDuration,
      collisionAvoidance: this.options.collisionAvoidance,
      maxAvatars: this.options.maxAvatars,
      respectsReducedMotion: true,
      eventHandlers: {
        onAvatarMove: (avatarId: string, _position: { x: number; y: number }) => {
          const avatar = this.avatars.get(avatarId);
          if (avatar && this.options.onAvatarMove) {
            this.options.onAvatarMove(avatar);
          }
        },
        onAvatarUpdate: (avatarId: string, _data: unknown) => {
          const avatar = this.avatars.get(avatarId);
          if (avatar && this.options.onAvatarMove) {
            this.options.onAvatarMove(avatar);
          }
        },
      },
    });
  }

  /**
   * Inject avatar overlay on video element with Material Design 3 styling
   */
  injectOverlay(videoElement: HTMLVideoElement): boolean {
    try {
      this.videoElement = videoElement;

      // Try Material Design 3 overlay first
      if (this.materialOverlay) {
        const materialSuccess = this.materialOverlay.injectOverlay(videoElement);
        if (materialSuccess) {
          this.isInjected = true;
          console.log('Material avatar overlay injected successfully');
          return true;
        }
      }

      // Fallback to legacy canvas overlay
      if (!this.canInjectOverlay(videoElement)) {
        console.warn('Cannot inject avatar overlay due to cross-origin restrictions');
        return false;
      }

      this.container = this.createOverlayContainer(videoElement);
      this.canvas = this.createCanvas();
      this.ctx = this.canvas.getContext('2d');

      if (!this.ctx) {
        console.error('Failed to get canvas 2D context');
        this.removeOverlay();
        return false;
      }

      this.container.appendChild(this.canvas);
      this.setupEventHandlers();
      this.startRenderLoop();

      this.isInjected = true;
      console.log('Legacy avatar overlay injected successfully');
      return true;
    } catch (error) {
      console.error('Failed to inject avatar overlay:', error);
      return false;
    }
  }

  /**
   * Remove avatar overlay
   */
  removeOverlay(): void {
    // Remove Material overlay if active
    if (this.materialOverlay) {
      this.materialOverlay.removeOverlay();
    }

    // Remove legacy overlay
    this.stopRenderLoop();
    this.removeEventHandlers();

    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }

    this.container = null;
    this.canvas = null;
    this.ctx = null;
    this.videoElement = null;
    this.isInjected = false;

    console.log('Avatar overlay removed');
  }

  /**
   * Add or update avatar with Material Design 3 styling
   */
  updateAvatar(avatar: Avatar): void {
    // Try Material overlay first
    if (this.materialOverlay && this.materialOverlay.isOverlayInjected()) {
      const success = this.materialOverlay.updateAvatar(avatar);
      if (success) {
        this.avatars.set(avatar.id, { ...avatar });
        return;
      }
    }

    // Fallback to legacy canvas overlay
    const existing = this.avatars.get(avatar.id);

    if (existing) {
      // Smooth interpolation for remote avatars
      if (avatar.id !== this.localAvatarId) {
        existing.x = this.lerp(existing.x, avatar.x, this.options.lerpFactor);
        existing.y = this.lerp(existing.y, avatar.y, this.options.lerpFactor);
      } else {
        existing.x = avatar.x;
        existing.y = avatar.y;
      }

      existing.visible = avatar.visible;
      existing.speaking = avatar.speaking;
      existing.muted = avatar.muted;
      existing.displayName = avatar.displayName;
      existing.imageUrl = avatar.imageUrl;
      existing.animationUrl = avatar.animationUrl;
      existing.lastUpdate = avatar.lastUpdate;
    } else {
      this.avatars.set(avatar.id, { ...avatar });
      this.loadAvatarImage(avatar);
    }

    // Apply collision avoidance
    if (this.options.collisionAvoidance) {
      this.applyCollisionAvoidance(avatar.id);
    }

    this.updateRenderData(avatar.id);
  }

  /**
   * Remove avatar
   */
  removeAvatar(avatarId: string): void {
    // Try Material overlay first
    if (this.materialOverlay && this.materialOverlay.isOverlayInjected()) {
      this.materialOverlay.removeAvatar(avatarId);
    }

    // Remove from legacy overlay
    this.avatars.delete(avatarId);
    this.renderData.delete(avatarId);
    this.animations.delete(avatarId);
    this.chatBubbles.delete(avatarId);
  }

  /**
   * Set local avatar ID for special handling
   */
  setLocalAvatarId(avatarId: string): void {
    this.localAvatarId = avatarId;

    // Set in Material overlay as well
    if (this.materialOverlay) {
      this.materialOverlay.setLocalAvatarId(avatarId);
    }
  }

  /**
   * Trigger avatar animation
   */
  triggerAnimation(avatarId: string, animationKey: AvatarAnimationKey, durationMs?: number): void {
    const avatar = this.avatars.get(avatarId);
    if (!avatar) return;

    const animation: AvatarAnimation = {
      id: `${avatarId}_${Date.now()}`,
      animationKey,
      durationMs: durationMs ?? this.options.animationDuration,
      startTime: Date.now(),
    };

    this.animations.set(avatarId, animation);
    this.options.onAvatarAnimate(avatar, animationKey);
  }

  /**
   * Show chat bubble
   */
  showChatBubble(avatarId: string, message: string, durationMs?: number): void {
    const avatar = this.avatars.get(avatarId);
    if (!avatar || !this.canvas) return;

    const bubble: ChatBubble = {
      id: `${avatarId}_bubble_${Date.now()}`,
      avatarId,
      message,
      durationMs: durationMs ?? this.options.chatBubbleDuration,
      startTime: Date.now(),
      x: avatar.x * this.canvas.width,
      y: avatar.y * this.canvas.height + CHAT_BUBBLE_OFFSET_Y,
    };

    this.chatBubbles.set(avatarId, bubble);
    this.options.onChatBubble(avatar, message);
  }

  /**
   * Handle keyboard input for movement
   */
  handleKeyDown(event: KeyboardEvent): void {
    if (!this.localAvatarId) return;

    switch (event.key.toLowerCase()) {
      case 'w':
      case 'arrowup':
        this.movementState.up = true;
        event.preventDefault();
        break;
      case 's':
      case 'arrowdown':
        this.movementState.down = true;
        event.preventDefault();
        break;
      case 'a':
      case 'arrowleft':
        this.movementState.left = true;
        event.preventDefault();
        break;
      case 'd':
      case 'arrowright':
        this.movementState.right = true;
        event.preventDefault();
        break;
    }
  }

  /**
   * Handle keyboard release
   */
  handleKeyUp(event: KeyboardEvent): void {
    if (!this.localAvatarId) return;

    switch (event.key.toLowerCase()) {
      case 'w':
      case 'arrowup':
        this.movementState.up = false;
        break;
      case 's':
      case 'arrowdown':
        this.movementState.down = false;
        break;
      case 'a':
      case 'arrowleft':
        this.movementState.left = false;
        break;
      case 'd':
      case 'arrowright':
        this.movementState.right = false;
        break;
    }
  }

  /**
   * Get all avatars
   */
  getAvatars(): Avatar[] {
    return Array.from(this.avatars.values());
  }

  /**
   * Check if overlay is injected
   */
  isOverlayInjected(): boolean {
    return this.isInjected || (this.materialOverlay?.isOverlayInjected() ?? false);
  }

  private canInjectOverlay(videoElement: HTMLVideoElement): boolean {
    try {
      const parent = videoElement.parentElement;
      if (!parent) return false;

      // Try to access parent's style to check for cross-origin restrictions
      void parent.style.position;
      return true;
    } catch {
      return false;
    }
  }

  private createOverlayContainer(videoElement: HTMLVideoElement): HTMLElement {
    const container = document.createElement('div');
    container.id = 'watch-party-avatar-overlay';
    container.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: auto;
      z-index: 9997;
      overflow: hidden;
    `;

    const parent = videoElement.parentElement;
    if (!parent) {
      throw new Error('Cannot create overlay container: video element has no parent');
    }
    const parentStyle = window.getComputedStyle(parent);
    if (parentStyle.position === 'static') {
      parent.style.position = 'relative';
    }

    parent.appendChild(container);
    return container;
  }

  private createCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: auto;
    `;

    if (this.videoElement) {
      const rect = this.videoElement.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    }

    return canvas;
  }

  private setupEventHandlers(): void {
    if (!this.canvas) return;

    // Mouse events for dragging
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));

    // Touch events for mobile
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));

    // Keyboard events for WASD movement
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));

    // Resize observer
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => {
        this.updateCanvasSize();
      });

      if (this.videoElement) {
        observer.observe(this.videoElement);
      }
    }
  }

  private removeEventHandlers(): void {
    if (!this.canvas) return;

    this.canvas.removeEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.removeEventListener('mouseleave', this.handleMouseUp.bind(this));
    this.canvas.removeEventListener('touchstart', this.handleTouchStart.bind(this));
    this.canvas.removeEventListener('touchmove', this.handleTouchMove.bind(this));
    this.canvas.removeEventListener('touchend', this.handleTouchEnd.bind(this));

    document.removeEventListener('keydown', this.handleKeyDown.bind(this));
    document.removeEventListener('keyup', this.handleKeyUp.bind(this));
  }

  private handleMouseDown(event: MouseEvent): void {
    if (!this.localAvatarId || !this.canvas) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;

    const localAvatar = this.avatars.get(this.localAvatarId);
    if (!localAvatar) return;

    // Check if clicking on local avatar
    const distance = Math.sqrt(Math.pow(x - localAvatar.x, 2) + Math.pow(y - localAvatar.y, 2));

    if (distance < COLLISION_RADIUS) {
      this.movementState.mouseDown = true;
      this.movementState.lastMouseX = x;
      this.movementState.lastMouseY = y;
      event.preventDefault();
    }
  }

  private handleMouseMove(event: MouseEvent): void {
    if (!this.movementState.mouseDown || !this.localAvatarId || !this.canvas) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;

    this.moveLocalAvatar(x, y);
    event.preventDefault();
  }

  private handleMouseUp(_event: MouseEvent): void {
    this.movementState.mouseDown = false;
  }

  private handleTouchStart(event: TouchEvent): void {
    if (event.touches.length !== 1) return;

    const touch = event.touches[0];
    if (!touch) return;
    const mouseEvent = new MouseEvent('mousedown', {
      clientX: touch.clientX,
      clientY: touch.clientY,
    });

    this.handleMouseDown(mouseEvent);
    event.preventDefault();
  }

  private handleTouchMove(event: TouchEvent): void {
    if (event.touches.length !== 1) return;

    const touch = event.touches[0];
    if (!touch) return;
    const mouseEvent = new MouseEvent('mousemove', {
      clientX: touch.clientX,
      clientY: touch.clientY,
    });

    this.handleMouseMove(mouseEvent);
    event.preventDefault();
  }

  private handleTouchEnd(event: TouchEvent): void {
    this.handleMouseUp(new MouseEvent('mouseup'));
    event.preventDefault();
  }

  private startRenderLoop(): void {
    const render = () => {
      this.updateMovement();
      this.updateAnimations();
      this.updateChatBubbles();
      this.render();

      this.renderTimer = requestAnimationFrame(render);
    };

    this.renderTimer = requestAnimationFrame(render);
  }

  private stopRenderLoop(): void {
    if (this.renderTimer) {
      cancelAnimationFrame(this.renderTimer);
      this.renderTimer = null;
    }
  }

  private updateMovement(): void {
    if (!this.localAvatarId) return;

    const localAvatar = this.avatars.get(this.localAvatarId);
    if (!localAvatar) return;

    let moved = false;
    let newX = localAvatar.x;
    let newY = localAvatar.y;

    // WASD movement
    if (this.movementState.up) {
      newY -= MOVEMENT_SPEED;
      moved = true;
    }
    if (this.movementState.down) {
      newY += MOVEMENT_SPEED;
      moved = true;
    }
    if (this.movementState.left) {
      newX -= MOVEMENT_SPEED;
      moved = true;
    }
    if (this.movementState.right) {
      newX += MOVEMENT_SPEED;
      moved = true;
    }

    if (moved) {
      this.moveLocalAvatar(newX, newY);
    }
  }

  private moveLocalAvatar(x: number, y: number): void {
    if (!this.localAvatarId) return;

    const localAvatar = this.avatars.get(this.localAvatarId);
    if (!localAvatar) return;

    // Clamp to bounds
    x = Math.max(0.05, Math.min(0.95, x));
    y = Math.max(0.05, Math.min(0.95, y));

    localAvatar.x = x;
    localAvatar.y = y;
    localAvatar.lastUpdate = Date.now();

    this.options.onAvatarMove(localAvatar);
    this.updateRenderData(this.localAvatarId);
  }

  private updateAnimations(): void {
    const now = Date.now();

    for (const [avatarId, animation] of this.animations.entries()) {
      if (now - animation.startTime > animation.durationMs) {
        this.animations.delete(avatarId);
      }
    }
  }

  private updateChatBubbles(): void {
    const now = Date.now();

    for (const [avatarId, bubble] of this.chatBubbles.entries()) {
      if (now - bubble.startTime > bubble.durationMs) {
        this.chatBubbles.delete(avatarId);
      }
    }
  }

  private applyCollisionAvoidance(avatarId: string): void {
    const avatar = this.avatars.get(avatarId);
    if (!avatar) return;

    for (const [otherId, other] of this.avatars.entries()) {
      if (otherId === avatarId) continue;

      const dx = avatar.x - other.x;
      const dy = avatar.y - other.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < COLLISION_RADIUS && distance > 0) {
        const pushX = (dx / distance) * (COLLISION_RADIUS - distance) * 0.5;
        const pushY = (dy / distance) * (COLLISION_RADIUS - distance) * 0.5;

        avatar.x = Math.max(0.05, Math.min(0.95, avatar.x + pushX));
        avatar.y = Math.max(0.05, Math.min(0.95, avatar.y + pushY));
      }
    }
  }

  private updateRenderData(avatarId: string): void {
    const avatar = this.avatars.get(avatarId);
    if (!avatar || !this.canvas) return;

    const screenX = avatar.x * this.canvas.width;
    const screenY = avatar.y * this.canvas.height;

    const renderData: AvatarRenderData = {
      avatar,
      screenX,
      screenY,
      image: this.imageCache.get(avatar.imageUrl || 'default'),
      animation: this.animations.get(avatarId),
      chatBubble: this.chatBubbles.get(avatarId),
      glowing: this.options.voiceActivityGlow && avatar.speaking,
    };

    this.renderData.set(avatarId, renderData);
  }

  private render(): void {
    if (!this.ctx || !this.canvas) return;

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Update all render data
    for (const avatarId of this.avatars.keys()) {
      this.updateRenderData(avatarId);
    }

    // Render avatars
    for (const renderData of this.renderData.values()) {
      if (renderData.avatar.visible) {
        this.renderAvatar(renderData);
      }
    }
  }

  private renderAvatar(data: AvatarRenderData): void {
    if (!this.ctx) return;

    const { avatar, screenX, screenY, image, animation, chatBubble, glowing } = data;
    const size = this.options.avatarSize;

    // Draw voice activity glow
    if (glowing) {
      this.ctx.save();
      this.ctx.globalAlpha = 0.6;
      this.ctx.fillStyle = '#00ff00';
      this.ctx.beginPath();
      this.ctx.arc(screenX, screenY, size / 2 + VOICE_GLOW_RADIUS, 0, 2 * Math.PI);
      this.ctx.fill();
      this.ctx.restore();
    }

    // Draw avatar image or default circle
    if (image) {
      this.ctx.drawImage(image, screenX - size / 2, screenY - size / 2, size, size);
    } else {
      this.ctx.fillStyle = this.getAvatarColor(avatar.userId);
      this.ctx.beginPath();
      this.ctx.arc(screenX, screenY, size / 2, 0, 2 * Math.PI);
      this.ctx.fill();
    }

    // Draw mute indicator
    if (avatar.muted) {
      this.ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
      this.ctx.beginPath();
      this.ctx.arc(screenX + size / 3, screenY - size / 3, 8, 0, 2 * Math.PI);
      this.ctx.fill();

      this.ctx.strokeStyle = 'white';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(screenX + size / 3 - 5, screenY - size / 3 - 5);
      this.ctx.lineTo(screenX + size / 3 + 5, screenY - size / 3 + 5);
      this.ctx.stroke();
    }

    // Draw display name
    this.ctx.fillStyle = 'white';
    this.ctx.strokeStyle = 'black';
    this.ctx.lineWidth = 2;
    this.ctx.font = '12px Arial';
    this.ctx.textAlign = 'center';

    const nameY = screenY + size / 2 + 16;
    this.ctx.strokeText(avatar.displayName, screenX, nameY);
    this.ctx.fillText(avatar.displayName, screenX, nameY);

    // Draw chat bubble
    if (chatBubble) {
      this.renderChatBubble(chatBubble, screenX, screenY);
    }

    // Draw animation overlay
    if (animation) {
      this.renderAnimation(animation, screenX, screenY);
    }
  }

  private renderChatBubble(bubble: ChatBubble, avatarX: number, avatarY: number): void {
    if (!this.ctx) return;

    const bubbleY = avatarY + CHAT_BUBBLE_OFFSET_Y;
    const padding = 8;
    const borderRadius = 8;

    // Measure text
    this.ctx.font = '14px Arial';
    const textMetrics = this.ctx.measureText(bubble.message);
    const textWidth = Math.min(textMetrics.width, CHAT_BUBBLE_MAX_WIDTH);
    const textHeight = 16;

    const bubbleWidth = textWidth + padding * 2;
    const bubbleHeight = textHeight + padding * 2;
    const bubbleX = avatarX - bubbleWidth / 2;

    // Draw bubble background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.beginPath();
    this.drawRoundedRect(this.ctx, bubbleX, bubbleY, bubbleWidth, bubbleHeight, borderRadius);
    this.ctx.fill();

    // Draw bubble tail
    this.ctx.beginPath();
    this.ctx.moveTo(avatarX - 8, bubbleY + bubbleHeight);
    this.ctx.lineTo(avatarX, bubbleY + bubbleHeight + 8);
    this.ctx.lineTo(avatarX + 8, bubbleY + bubbleHeight);
    this.ctx.fill();

    // Draw text
    this.ctx.fillStyle = 'white';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(bubble.message, avatarX, bubbleY + padding + textHeight / 2);
  }

  private renderAnimation(animation: AvatarAnimation, avatarX: number, avatarY: number): void {
    if (!this.ctx) return;

    // Simple animation rendering - could be enhanced with sprites
    const progress = (Date.now() - animation.startTime) / animation.durationMs;
    const scale = 1 + Math.sin(progress * Math.PI * 4) * 0.2;
    const alpha = 1 - progress;

    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.translate(avatarX, avatarY);
    this.ctx.scale(scale, scale);

    // Draw animation emoji/icon
    this.ctx.font = '24px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillStyle = 'yellow';

    const emoji = this.getAnimationEmoji(animation.animationKey);
    this.ctx.fillText(emoji, 0, -this.options.avatarSize);

    this.ctx.restore();
  }

  private loadAvatarImage(avatar: Avatar): void {
    const imageUrl = avatar.imageUrl;
    if (!imageUrl || this.imageCache.has(imageUrl)) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      this.imageCache.set(imageUrl, img);
    };
    img.onerror = () => {
      console.warn('Failed to load avatar image:', imageUrl);
    };
    img.src = imageUrl;
  }

  private getAvatarColor(userId: string): string {
    const colors = [
      '#FF6B6B',
      '#4ECDC4',
      '#45B7D1',
      '#96CEB4',
      '#FFEAA7',
      '#DDA0DD',
      '#98D8C8',
      '#F7DC6F',
      '#BB8FCE',
      '#85C1E9',
    ];

    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length] ?? '#FF6B6B';
  }

  private getAnimationEmoji(animationKey: string): string {
    const emojiMap: Record<string, string> = {
      heart: '❤️',
      laugh: '😂',
      thumbs_up: '👍',
      clap: '👏',
      wave: '👋',
      dance: '💃',
      surprised: '😲',
      thinking: '🤔',
    };

    return emojiMap[animationKey] || '✨';
  }

  private updateCanvasSize(): void {
    if (!this.canvas || !this.videoElement) return;

    const rect = this.videoElement.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
  }

  private lerp(start: number, end: number, factor: number): number {
    return start + (end - start) * factor;
  }

  private drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}
