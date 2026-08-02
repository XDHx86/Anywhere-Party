/**
 * Reaction Overlay System for Watch Party Extension
 * Displays timestamped reactions as overlays on video with Material Design 3 styling
 * Implements requirements 5.2, 5.3, 28.1, 28.2, 28.3, 28.4, 28.5
 */

import { ReactionOverlayOptions, ReactionDisplay, ReactionPosition } from './types';
import { ReactionType } from '../chat/types';
import { MaterialReactionOverlay } from '../../@ui/overlays/material-reaction-overlay';

export class ReactionOverlay {
  private container: HTMLElement | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private activeReactions: Map<string, ReactionDisplay> = new Map();
  private options: Required<ReactionOverlayOptions>;
  private renderTimer: number | null = null;
  private isInjected = false;
  private materialOverlay: MaterialReactionOverlay | null = null;

  // Reaction type to emoji mapping
  private readonly reactionEmojis: Record<ReactionType, string> = {
    thumbs_up: '👍',
    heart: '❤️',
    laugh: '😂',
    clap: '👏',
    fire: '🔥',
  };

  constructor(options: ReactionOverlayOptions = {}) {
    this.options = {
      displayDuration: options.displayDuration ?? 3000,
      maxConcurrentReactions: options.maxConcurrentReactions ?? 10,
      animationDuration: options.animationDuration ?? 500,
      reactionSize: options.reactionSize ?? 32,
    };

    // Initialize Material Design 3 overlay
    this.materialOverlay = new MaterialReactionOverlay({
      displayDuration: this.options.displayDuration,
      maxConcurrentReactions: this.options.maxConcurrentReactions,
      animationDuration: this.options.animationDuration,
      reactionSize: this.options.reactionSize,
      enableTranslucency: true,
      defaultElevation: 'level2',
      respectsReducedMotion: true,
    });
  }

  /**
   * Inject reaction overlay into video element with Material Design 3 styling
   */
  injectOverlay(videoElement: HTMLVideoElement): boolean {
    try {
      this.videoElement = videoElement;

      // Try Material Design 3 overlay first
      if (this.materialOverlay) {
        const materialSuccess = this.materialOverlay.injectOverlay(videoElement);
        if (materialSuccess) {
          this.isInjected = true;
          console.log('Material reaction overlay injected successfully');
          return true;
        }
      }

      // Fallback to legacy overlay
      // Check if we can inject overlay (cross-origin restrictions)
      if (!this.canInjectOverlay(videoElement)) {
        console.warn('Cannot inject reaction overlay due to cross-origin restrictions');
        return false;
      }

      // Create overlay container
      this.container = this.createOverlayContainer(videoElement);

      // Position overlay relative to video
      this.positionOverlay();

      // Set up resize observer to maintain positioning
      this.setupResizeObserver();

      // Start render loop
      this.startRenderLoop();

      this.isInjected = true;
      console.log('Legacy reaction overlay injected successfully');
      return true;
    } catch (error) {
      console.error('Failed to inject reaction overlay:', error);
      return false;
    }
  }

  /**
   * Remove reaction overlay
   */
  removeOverlay(): void {
    // Remove Material overlay if active
    if (this.materialOverlay) {
      this.materialOverlay.removeOverlay();
    }

    // Remove legacy overlay
    this.stopRenderLoop();

    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }

    this.container = null;
    this.videoElement = null;
    this.activeReactions.clear();
    this.isInjected = false;
  }

  /**
   * Display a reaction at the current video timestamp with Material Design 3 styling
   */
  showReaction(reactionId: string, type: ReactionType, videoTimestamp: number): void {
    // Try Material overlay first
    if (this.materialOverlay && this.materialOverlay.isOverlayInjected()) {
      const success = this.materialOverlay.showReaction(reactionId, type, videoTimestamp);
      if (success) {
        return;
      }
    }

    // Fallback to legacy overlay
    if (!this.isInjected || !this.container) {
      console.warn('Reaction overlay not injected, cannot show reaction');
      return;
    }

    // Remove existing reaction with same ID
    this.removeReaction(reactionId);

    // Check if we've reached max concurrent reactions
    if (this.activeReactions.size >= this.options.maxConcurrentReactions) {
      // Remove oldest reaction
      const oldestId = Array.from(this.activeReactions.keys())[0];
      this.removeReaction(oldestId);
    }

    // Get emoji for reaction type
    const emoji = this.reactionEmojis[type];
    if (!emoji) {
      console.warn('Unknown reaction type:', type);
      return;
    }

    // Generate random position
    const position = this.generateRandomPosition();

    // Create reaction display
    const reaction: ReactionDisplay = {
      id: reactionId,
      type,
      emoji,
      x: position.x,
      y: position.y,
      timestamp: Date.now(),
    };

    // Create DOM element
    reaction.element = this.createReactionElement(reaction);

    // Add to container
    this.container.appendChild(reaction.element);

    // Store active reaction
    this.activeReactions.set(reactionId, reaction);

    // Auto-remove after display duration
    setTimeout(() => {
      this.removeReaction(reactionId);
    }, this.options.displayDuration);
  }

  /**
   * Remove a specific reaction
   */
  removeReaction(reactionId: string): void {
    // Try Material overlay first
    if (this.materialOverlay && this.materialOverlay.isOverlayInjected()) {
      this.materialOverlay.removeReaction(reactionId);
      return;
    }

    // Fallback to legacy overlay
    const reaction = this.activeReactions.get(reactionId);
    if (reaction && reaction.element) {
      // Animate out
      reaction.element.style.opacity = '0';
      reaction.element.style.transform += ' scale(0.5)';

      // Remove from DOM after animation
      setTimeout(() => {
        if (reaction.element && reaction.element.parentNode) {
          reaction.element.parentNode.removeChild(reaction.element);
        }
      }, this.options.animationDuration);

      this.activeReactions.delete(reactionId);
    }
  }

  /**
   * Clear all active reactions
   */
  clearReactions(): void {
    // Try Material overlay first
    if (this.materialOverlay && this.materialOverlay.isOverlayInjected()) {
      this.materialOverlay.clearReactions();
      return;
    }

    // Fallback to legacy overlay
    this.activeReactions.forEach((_, id) => {
      this.removeReaction(id);
    });
  }

  /**
   * Check if overlay is successfully injected
   */
  isOverlayInjected(): boolean {
    return this.isInjected || (this.materialOverlay?.isOverlayInjected() ?? false);
  }

  /**
   * Get count of active reactions
   */
  getActiveReactionCount(): number {
    if (this.materialOverlay && this.materialOverlay.isOverlayInjected()) {
      return this.materialOverlay.getActiveReactionCount();
    }
    return this.activeReactions.size;
  }

  private canInjectOverlay(videoElement: HTMLVideoElement): boolean {
    try {
      // Check if we can access the video element's parent
      const parent = videoElement.parentElement;
      if (!parent) return false;

      // Try to access parent's style (will throw if cross-origin)
      const _ = parent.style.position;

      // Check if video is in an iframe
      if (window !== window.top) {
        // We're in an iframe, check if we can access parent window
        try {
          const _ = window.parent.document;
        } catch (error) {
          return false; // Cross-origin iframe
        }
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  private createOverlayContainer(videoElement: HTMLVideoElement): HTMLElement {
    const container = document.createElement('div');
    container.id = 'watch-party-reaction-overlay';
    container.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 9999;
      overflow: hidden;
    `;

    // Insert overlay relative to video
    const parent = videoElement.parentElement;
    if (!parent) {
      throw new Error('Video element has no parent');
    }

    // Ensure parent has relative positioning
    const parentStyle = window.getComputedStyle(parent);
    if (parentStyle.position === 'static') {
      parent.style.position = 'relative';
    }

    parent.appendChild(container);
    return container;
  }

  private positionOverlay(): void {
    if (!this.container || !this.videoElement) return;

    const videoRect = this.videoElement.getBoundingClientRect();
    const parentRect = this.videoElement.parentElement!.getBoundingClientRect();

    // Position overlay to match video bounds within parent
    this.container.style.left = `${videoRect.left - parentRect.left}px`;
    this.container.style.top = `${videoRect.top - parentRect.top}px`;
    this.container.style.width = `${videoRect.width}px`;
    this.container.style.height = `${videoRect.height}px`;
  }

  private setupResizeObserver(): void {
    if (!this.videoElement || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => {
      this.positionOverlay();
    });

    observer.observe(this.videoElement);

    // Also observe parent element
    if (this.videoElement.parentElement) {
      observer.observe(this.videoElement.parentElement);
    }
  }

  private generateRandomPosition(): ReactionPosition {
    // Generate position within video bounds, avoiding edges
    const margin = this.options.reactionSize;
    const maxX = 100 - margin * 2; // Percentage
    const maxY = 100 - margin * 2;

    return {
      x: margin + Math.random() * maxX,
      y: margin + Math.random() * maxY,
    };
  }

  private createReactionElement(reaction: ReactionDisplay): HTMLElement {
    const element = document.createElement('div');
    element.className = 'watch-party-reaction';
    element.style.cssText = `
      position: absolute;
      left: ${reaction.x}%;
      top: ${reaction.y}%;
      font-size: ${this.options.reactionSize}px;
      line-height: 1;
      pointer-events: none;
      user-select: none;
      z-index: 10000;
      transform: scale(0);
      opacity: 0;
      transition: all ${this.options.animationDuration}ms ease-out;
      text-shadow: 0 0 4px rgba(0,0,0,0.5);
    `;

    element.textContent = reaction.emoji;

    // Animate in
    requestAnimationFrame(() => {
      element.style.transform = 'scale(1)';
      element.style.opacity = '1';
    });

    return element;
  }

  private startRenderLoop(): void {
    if (this.renderTimer) return;

    const render = () => {
      this.updateReactionPositions();
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

  private updateReactionPositions(): void {
    // Update overlay position if video has moved
    this.positionOverlay();

    // Clean up expired reactions
    const now = Date.now();
    this.activeReactions.forEach((reaction, id) => {
      if (now - reaction.timestamp > this.options.displayDuration) {
        this.removeReaction(id);
      }
    });
  }
}
