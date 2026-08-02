/**
 * Material Design 3 Video Overlay System
 * Creates floating Material surfaces for reactions and avatars with proper elevation and theming
 * Requirements: 28.1, 28.2, 28.3, 28.4, 28.5
 */

import { MaterialOverlayOptions, MaterialSurface, OverlayAnimation } from './types';

export class MaterialVideoOverlay {
  private container: HTMLElement | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private surfaces: Map<string, MaterialSurface> = new Map();
  private animationQueue: Map<string, OverlayAnimation> = new Map();
  private options: Required<MaterialOverlayOptions>;
  private renderTimer: number | null = null;
  private isInjected = false;
  private resizeObserver: ResizeObserver | null = null;

  // Material Design 3 theme tokens
  private readonly materialTokens = {
    elevation: {
      level1: '0px 1px 2px 0px rgba(0, 0, 0, 0.3), 0px 1px 3px 1px rgba(0, 0, 0, 0.15)',
      level2: '0px 1px 2px 0px rgba(0, 0, 0, 0.3), 0px 2px 6px 2px rgba(0, 0, 0, 0.15)',
      level3: '0px 4px 8px 3px rgba(0, 0, 0, 0.15), 0px 1px 3px 0px rgba(0, 0, 0, 0.3)',
      level4: '0px 6px 10px 4px rgba(0, 0, 0, 0.15), 0px 2px 3px 0px rgba(0, 0, 0, 0.3)',
      level5: '0px 8px 12px 6px rgba(0, 0, 0, 0.15), 0px 4px 4px 0px rgba(0, 0, 0, 0.3)',
    },
    shape: {
      cornerMedium: '12px',
      cornerLarge: '16px',
    },
    motion: {
      durationShort2: '100ms',
      durationShort4: '200ms',
      durationMedium1: '250ms',
      durationMedium2: '300ms',
      easingStandard: 'cubic-bezier(0.2, 0, 0, 1)',
      easingEmphasized: 'cubic-bezier(0.2, 0, 0, 1)',
      easingEmphasizedDecelerate: 'cubic-bezier(0.3, 0, 0.8, 0.15)',
    },
    colors: {
      primary: '#6200EE',
      secondary: '#03DAC6',
      surface: '#FFFFFF',
      surfaceContainer: '#F3EDF7',
      surfaceContainerHigh: '#ECE6F0',
      onSurface: '#1C1B1F',
      onSurfaceVariant: '#49454F',
      outline: '#79747E',
    },
  };

  constructor(options: MaterialOverlayOptions = {}) {
    this.options = {
      enableTranslucency: options.enableTranslucency ?? true,
      defaultElevation: options.defaultElevation ?? 'level2',
      cornerRadius: options.cornerRadius ?? 'medium',
      animationDuration: options.animationDuration ?? 300,
      maxConcurrentSurfaces: options.maxConcurrentSurfaces ?? 20,
      autoCleanup: options.autoCleanup ?? true,
      respectsReducedMotion: options.respectsReducedMotion ?? true,
      onSurfaceCreate: options.onSurfaceCreate ?? (() => {}),
      onSurfaceDestroy: options.onSurfaceDestroy ?? (() => {}),
      onAnimationComplete: options.onAnimationComplete ?? (() => {}),
    };
  }

  /**
   * Inject Material overlay system into video element
   */
  injectOverlay(videoElement: HTMLVideoElement): boolean {
    try {
      this.videoElement = videoElement;

      if (!this.canInjectOverlay(videoElement)) {
        console.warn('Cannot inject Material overlay due to cross-origin restrictions');
        return false;
      }

      this.container = this.createMaterialContainer(videoElement);
      this.setupResizeObserver();
      this.startRenderLoop();

      this.isInjected = true;
      console.log('Material Design 3 video overlay injected successfully');
      return true;
    } catch (error) {
      console.error('Failed to inject Material overlay:', error);
      return false;
    }
  }

  /**
   * Remove Material overlay system
   */
  removeOverlay(): void {
    this.stopRenderLoop();
    this.cleanupResizeObserver();

    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }

    this.surfaces.clear();
    this.animationQueue.clear();
    this.container = null;
    this.videoElement = null;
    this.isInjected = false;

    console.log('Material overlay removed');
  }

  /**
   * Create a floating Material surface for reactions
   */
  createReactionSurface(
    id: string,
    emoji: string,
    position: { x: number; y: number },
    options: {
      elevation?: 'level1' | 'level2' | 'level3' | 'level4' | 'level5';
      duration?: number;
      animation?: 'fadeIn' | 'scaleIn' | 'slideUp';
    } = {}
  ): boolean {
    if (!this.isInjected || !this.container) {
      console.warn('Material overlay not injected');
      return false;
    }

    // Remove existing surface with same ID
    this.removeSurface(id);

    // Check concurrent surface limit
    while (this.surfaces.size >= this.options.maxConcurrentSurfaces) {
      this.cleanupOldestSurface();
    }

    const surface = this.createMaterialSurface({
      id,
      type: 'reaction',
      content: emoji,
      position,
      elevation: options.elevation || this.options.defaultElevation,
      cornerRadius: this.options.cornerRadius,
      translucent: this.options.enableTranslucency,
      animation: options.animation || 'scaleIn',
      duration: options.duration || 3000,
    });

    this.surfaces.set(id, surface);
    this.container.appendChild(surface.element);

    // Trigger entrance animation
    this.animateSurfaceIn(surface);

    // Auto-remove after duration
    setTimeout(() => {
      this.removeSurface(id);
    }, surface.duration);

    this.options.onSurfaceCreate(surface);
    return true;
  }

  /**
   * Create a floating Material surface for avatars
   */
  createAvatarSurface(
    id: string,
    avatarData: {
      imageUrl?: string;
      displayName: string;
      color: string;
      speaking?: boolean;
      muted?: boolean;
    },
    position: { x: number; y: number },
    options: {
      elevation?: 'level1' | 'level2' | 'level3' | 'level4' | 'level5';
      size?: number;
      showIndicators?: boolean;
    } = {}
  ): boolean {
    if (!this.isInjected || !this.container) {
      console.warn('Material overlay not injected');
      return false;
    }

    // Remove existing surface with same ID
    this.removeSurface(id);

    const surface = this.createMaterialSurface({
      id,
      type: 'avatar',
      content: avatarData,
      position,
      elevation: options.elevation || 'level3',
      cornerRadius: 'large',
      translucent: false,
      size: options.size || 48,
      showIndicators: options.showIndicators ?? true,
      persistent: true,
    });

    this.surfaces.set(id, surface);
    this.container.appendChild(surface.element);

    // Trigger entrance animation
    this.animateSurfaceIn(surface);

    this.options.onSurfaceCreate(surface);
    return true;
  }

  /**
   * Update avatar surface position
   */
  updateAvatarPosition(id: string, position: { x: number; y: number }): void {
    const surface = this.surfaces.get(id);
    if (!surface || surface.type !== 'avatar') return;

    surface.position = position;
    this.updateSurfacePosition(surface);
  }

  /**
   * Update avatar surface indicators (speaking, muted)
   */
  updateAvatarIndicators(id: string, indicators: { speaking?: boolean; muted?: boolean }): void {
    const surface = this.surfaces.get(id);
    if (!surface || surface.type !== 'avatar') return;

    if (typeof indicators.speaking !== 'undefined') {
      surface.speaking = indicators.speaking;
    }
    if (typeof indicators.muted !== 'undefined') {
      surface.muted = indicators.muted;
    }

    this.updateAvatarSurfaceContent(surface);
  }

  /**
   * Remove a specific surface
   */
  removeSurface(id: string): void {
    const surface = this.surfaces.get(id);
    if (!surface) return;

    // Animate out
    this.animateSurfaceOut(surface, () => {
      if (surface.element && surface.element.parentNode) {
        surface.element.parentNode.removeChild(surface.element);
      }
      this.surfaces.delete(id);
      this.options.onSurfaceDestroy(surface);
    });
  }

  /**
   * Clear all surfaces
   */
  clearAllSurfaces(): void {
    const surfaceIds = Array.from(this.surfaces.keys());
    surfaceIds.forEach((id) => this.removeSurface(id));
  }

  /**
   * Check if overlay is injected
   */
  isOverlayInjected(): boolean {
    return this.isInjected;
  }

  /**
   * Get active surface count
   */
  getActiveSurfaceCount(): number {
    return this.surfaces.size;
  }

  private canInjectOverlay(videoElement: HTMLVideoElement): boolean {
    try {
      const parent = videoElement.parentElement;
      if (!parent) return false;

      // Try to access parent's style to check for cross-origin restrictions
      const _ = parent.style.position;
      return true;
    } catch (error) {
      return false;
    }
  }

  private createMaterialContainer(videoElement: HTMLVideoElement): HTMLElement {
    const container = document.createElement('div');
    container.id = 'watch-party-material-overlay';
    container.className = 'material-video-overlay-container';

    // Apply Material Design 3 styling
    container.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 9998;
      overflow: hidden;
      font-family: 'Roboto', 'Inter', system-ui, sans-serif;
    `;

    const parent = videoElement.parentElement!;
    const parentStyle = window.getComputedStyle(parent);
    if (parentStyle.position === 'static') {
      parent.style.position = 'relative';
    }

    parent.appendChild(container);
    this.positionContainer();

    return container;
  }

  private createMaterialSurface(config: {
    id: string;
    type: 'reaction' | 'avatar';
    content: any;
    position: { x: number; y: number };
    elevation: 'level1' | 'level2' | 'level3' | 'level4' | 'level5';
    cornerRadius: 'medium' | 'large';
    translucent: boolean;
    animation?: string;
    duration?: number;
    size?: number;
    showIndicators?: boolean;
    persistent?: boolean;
  }): MaterialSurface {
    const element = document.createElement('div');
    element.className = `material-surface material-surface-${config.type}`;
    element.setAttribute('data-surface-id', config.id);

    const surface: MaterialSurface = {
      id: config.id,
      type: config.type,
      element,
      position: config.position,
      elevation: config.elevation,
      cornerRadius: config.cornerRadius,
      translucent: config.translucent,
      content: config.content,
      duration: config.duration || 3000,
      size: config.size || 32,
      showIndicators: config.showIndicators ?? false,
      persistent: config.persistent ?? false,
      createdAt: Date.now(),
      speaking: false,
      muted: false,
    };

    this.applySurfaceStyles(surface);
    this.updateSurfaceContent(surface);
    this.updateSurfacePosition(surface);

    return surface;
  }

  private applySurfaceStyles(surface: MaterialSurface): void {
    const { element, elevation, cornerRadius, translucent, type } = surface;

    // Base Material surface styles
    const baseStyles = `
      position: absolute;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: ${this.materialTokens.elevation[elevation]};
      border-radius: ${this.materialTokens.shape[cornerRadius === 'medium' ? 'cornerMedium' : 'cornerLarge']};
      backdrop-filter: ${translucent ? 'blur(8px)' : 'none'};
      transition: all ${this.materialTokens.motion.durationMedium1} ${this.materialTokens.motion.easingStandard};
      pointer-events: none;
      user-select: none;
      z-index: 10000;
      font-family: 'Roboto', 'Inter', system-ui, sans-serif;
    `;

    if (type === 'reaction') {
      element.style.cssText =
        baseStyles +
        `
        background-color: ${translucent ? 'rgba(255, 255, 255, 0.9)' : this.materialTokens.colors.surfaceContainer};
        color: ${this.materialTokens.colors.onSurface};
        font-size: ${surface.size}px;
        width: ${surface.size + 16}px;
        height: ${surface.size + 16}px;
        line-height: 1;
        transform: scale(0);
        opacity: 0;
      `;
    } else if (type === 'avatar') {
      element.style.cssText =
        baseStyles +
        `
        background-color: ${this.materialTokens.colors.surfaceContainerHigh};
        border: 2px solid ${this.materialTokens.colors.outline};
        width: ${surface.size}px;
        height: ${surface.size}px;
        flex-direction: column;
        gap: 4px;
        padding: 4px;
        transform: scale(0);
        opacity: 0;
      `;
    }

    // Add reduced motion support
    if (
      this.options.respectsReducedMotion &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      element.style.transition = 'none';
    }
  }

  private updateSurfaceContent(surface: MaterialSurface): void {
    const { element, type, content } = surface;

    if (type === 'reaction') {
      element.textContent = content;
    } else if (type === 'avatar') {
      this.updateAvatarSurfaceContent(surface);
    }
  }

  private updateAvatarSurfaceContent(surface: MaterialSurface): void {
    const { element, content, showIndicators, speaking, muted } = surface;

    element.innerHTML = '';

    // Avatar image or colored circle
    const avatarContainer = document.createElement('div');
    avatarContainer.style.cssText = `
      position: relative;
      width: ${surface.size - 16}px;
      height: ${surface.size - 16}px;
      border-radius: 50%;
      overflow: hidden;
      background-color: ${content.color};
      display: flex;
      align-items: center;
      justify-content: center;
      ${speaking ? `box-shadow: 0 0 0 3px ${this.materialTokens.colors.secondary};` : ''}
    `;

    if (content.imageUrl) {
      const img = document.createElement('img');
      img.src = content.imageUrl;
      img.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: cover;
      `;
      img.onerror = () => {
        // Fallback to initials
        avatarContainer.textContent = content.displayName.charAt(0).toUpperCase();
        avatarContainer.style.color = 'white';
        avatarContainer.style.fontSize = `${(surface.size - 16) / 2}px`;
        avatarContainer.style.fontWeight = '500';
      };
      avatarContainer.appendChild(img);
    } else {
      // Show initials
      avatarContainer.textContent = content.displayName.charAt(0).toUpperCase();
      avatarContainer.style.color = 'white';
      avatarContainer.style.fontSize = `${(surface.size - 16) / 2}px`;
      avatarContainer.style.fontWeight = '500';
    }

    element.appendChild(avatarContainer);

    // Add indicators if enabled
    if (showIndicators) {
      // Mute indicator
      if (muted) {
        const muteIndicator = document.createElement('div');
        muteIndicator.style.cssText = `
          position: absolute;
          top: -4px;
          right: -4px;
          width: 16px;
          height: 16px;
          background-color: ${this.materialTokens.colors.primary};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          color: white;
          box-shadow: ${this.materialTokens.elevation.level2};
        `;
        muteIndicator.textContent = '🔇';
        element.appendChild(muteIndicator);
      }

      // Name label
      const nameLabel = document.createElement('div');
      nameLabel.style.cssText = `
        position: absolute;
        bottom: -20px;
        left: 50%;
        transform: translateX(-50%);
        background-color: ${this.materialTokens.colors.surface};
        color: ${this.materialTokens.colors.onSurface};
        padding: 2px 6px;
        border-radius: ${this.materialTokens.shape.cornerMedium};
        font-size: 10px;
        font-weight: 500;
        white-space: nowrap;
        box-shadow: ${this.materialTokens.elevation.level1};
        max-width: 80px;
        overflow: hidden;
        text-overflow: ellipsis;
      `;
      nameLabel.textContent = content.displayName;
      element.appendChild(nameLabel);
    }
  }

  private updateSurfacePosition(surface: MaterialSurface): void {
    if (!this.container) return;

    const { element, position } = surface;
    const containerRect = this.container.getBoundingClientRect();

    const x = position.x * containerRect.width;
    const y = position.y * containerRect.height;

    element.style.left = `${x}px`;
    element.style.top = `${y}px`;
    element.style.transform =
      element.style.transform.replace(/translate[XY]?\([^)]*\)/g, '') +
      ` translateX(-50%) translateY(-50%)`;
  }

  private animateSurfaceIn(surface: MaterialSurface): void {
    const { element } = surface;

    // Use Material Design 3 motion principles
    requestAnimationFrame(() => {
      element.style.transform = element.style.transform.replace('scale(0)', 'scale(1)');
      element.style.opacity = '1';
    });

    // Add entrance animation based on type
    if (surface.type === 'reaction') {
      // Scale and fade in with slight bounce
      element.style.animation = `materialScaleIn ${this.materialTokens.motion.durationMedium2} ${this.materialTokens.motion.easingEmphasizedDecelerate}`;
    } else if (surface.type === 'avatar') {
      // Gentle scale in
      element.style.animation = `materialFadeIn ${this.materialTokens.motion.durationMedium1} ${this.materialTokens.motion.easingStandard}`;
    }
  }

  private animateSurfaceOut(surface: MaterialSurface, onComplete: () => void): void {
    const { element } = surface;

    element.style.transform = element.style.transform.replace(/scale\([^)]*\)/, 'scale(0.8)');
    element.style.opacity = '0';

    setTimeout(() => {
      onComplete();
      this.options.onAnimationComplete(surface);
    }, parseInt(this.materialTokens.motion.durationMedium1));
  }

  private positionContainer(): void {
    if (!this.container || !this.videoElement) return;

    const videoRect = this.videoElement.getBoundingClientRect();
    const parentRect = this.videoElement.parentElement!.getBoundingClientRect();

    this.container.style.left = `${videoRect.left - parentRect.left}px`;
    this.container.style.top = `${videoRect.top - parentRect.top}px`;
    this.container.style.width = `${videoRect.width}px`;
    this.container.style.height = `${videoRect.height}px`;
  }

  private setupResizeObserver(): void {
    if (!this.videoElement || typeof ResizeObserver === 'undefined') return;

    this.resizeObserver = new ResizeObserver(() => {
      this.positionContainer();
      // Update all surface positions
      this.surfaces.forEach((surface) => {
        this.updateSurfacePosition(surface);
      });
    });

    this.resizeObserver.observe(this.videoElement);
    if (this.videoElement.parentElement) {
      this.resizeObserver.observe(this.videoElement.parentElement);
    }
  }

  private cleanupResizeObserver(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  }

  private startRenderLoop(): void {
    if (this.renderTimer) return;

    const render = () => {
      this.updateAnimations();
      if (this.options.autoCleanup) {
        this.cleanupExpiredSurfaces();
      }
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

  private updateAnimations(): void {
    // Update any ongoing animations
    this.animationQueue.forEach((animation, id) => {
      const surface = this.surfaces.get(id);
      if (!surface) {
        this.animationQueue.delete(id);
        return;
      }

      const progress = (Date.now() - animation.startTime) / animation.duration;
      if (progress >= 1) {
        this.animationQueue.delete(id);
        animation.onComplete?.();
      } else {
        animation.update?.(surface, progress);
      }
    });
  }

  private cleanupExpiredSurfaces(): void {
    const now = Date.now();
    this.surfaces.forEach((surface, id) => {
      if (!surface.persistent && now - surface.createdAt > surface.duration) {
        this.removeSurface(id);
      }
    });
  }

  private cleanupOldestSurface(): void {
    let oldestId: string | null = null;
    let oldestTime = Date.now();

    this.surfaces.forEach((surface, id) => {
      if (!surface.persistent && surface.createdAt < oldestTime) {
        oldestTime = surface.createdAt;
        oldestId = id;
      }
    });

    if (oldestId) {
      this.removeSurface(oldestId);
    }
  }
}

// Add CSS animations for Material Design 3 motion
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes materialScaleIn {
    0% {
      transform: translateX(-50%) translateY(-50%) scale(0);
      opacity: 0;
    }
    60% {
      transform: translateX(-50%) translateY(-50%) scale(1.1);
      opacity: 0.8;
    }
    100% {
      transform: translateX(-50%) translateY(-50%) scale(1);
      opacity: 1;
    }
  }

  @keyframes materialFadeIn {
    0% {
      transform: translateX(-50%) translateY(-50%) scale(0.8);
      opacity: 0;
    }
    100% {
      transform: translateX(-50%) translateY(-50%) scale(1);
      opacity: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .material-surface {
      animation: none !important;
      transition: none !important;
    }
  }
`;
document.head.appendChild(styleSheet);
