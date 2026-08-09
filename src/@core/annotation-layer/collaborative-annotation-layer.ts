/**
 * Collaborative Annotation Layer - Enhanced with real-time synchronization
 *
 * Extends the base annotation layer with collaborative features:
 * - Real-time synchronization across participants
 * - Video timestamp integration
 * - Material Design 3 styling
 * - Cross-origin restriction handling
 */

import { AnnotationLayer } from './annotation-layer';
import {
  AnnotationLayerOptions,
  Annotation,
  AnnotationMessage,
  AnnotationAction,
  DrawingTool,
  AnnotationType,
  AnnotationData,
} from './types';

export interface CollaborativeAnnotationOptions extends AnnotationLayerOptions {
  roomId: string;
  userId: string;
  userName: string;
  onSyncMessage?: (message: AnnotationMessage) => void;
  onCrossOriginBlocked?: () => void;
  syncIntervalMs?: number;
  maxSyncRetries?: number;
}

export interface SyncState {
  isConnected: boolean;
  lastSyncTime: number;
  pendingMessages: AnnotationMessage[];
  retryCount: number;
  syncErrors: string[];
}

export class CollaborativeAnnotationLayer extends AnnotationLayer {
  private collaborativeOptions: CollaborativeAnnotationOptions;
  private syncState: SyncState;
  private syncTimer: number | null = null;
  private messageQueue: AnnotationMessage[] = [];
  private participantCursors: Map<string, { x: number; y: number; tool: DrawingTool }> = new Map();
  private sequenceCounter: number = 0;
  private lastAppliedSequence: number = 0;

  /** Monotonically increasing sequence for sync messages. */
  private nextSequence(): number {
    return ++this.sequenceCounter;
  }

  constructor(options: CollaborativeAnnotationOptions) {
    super(options);

    this.collaborativeOptions = {
      ...options,
      syncIntervalMs: options.syncIntervalMs || 100, // 10fps sync rate
      maxSyncRetries: options.maxSyncRetries || 3,
    };

    this.syncState = {
      isConnected: false,
      lastSyncTime: 0,
      pendingMessages: [],
      retryCount: 0,
      syncErrors: [],
    };

    // Override callbacks to include synchronization
    this.setupCollaborativeCallbacks();
  }

  /**
   * Update collaborative options after construction (e.g., when room info arrives).
   */
  updateOptions(userId: string, roomId: string, userName: string): void {
    this.collaborativeOptions.userId = userId;
    this.collaborativeOptions.roomId = roomId;
    this.collaborativeOptions.userName = userName;
    console.log('CollaborativeAnnotationLayer options updated:', { userId, roomId });
  }

  /**
   * Inject overlay with collaborative features
   */
  override injectOverlay(video: HTMLVideoElement): boolean {
    const success = super.injectOverlay(video);

    if (!success && this.isCrossOriginBlocked()) {
      // Handle cross-origin restrictions
      this.handleCrossOriginRestriction();
      return false;
    }

    if (success) {
      this.startCollaborativeSync();
      this.setupParticipantCursors();
    }

    return success;
  }

  /**
   * Remove overlay and stop collaborative features
   */
  override removeOverlay(): void {
    this.stopCollaborativeSync();
    this.clearParticipantCursors();
    super.removeOverlay();
  }

  /**
   * Create annotation with video timestamp and sync
   */
  createTimestampedAnnotation(
    type: AnnotationType,
    data: Partial<AnnotationData>,
    position: { x: number; y: number }
  ): Annotation | null {
    if (!this.isActive() || !this.video) {
      return null;
    }

    const annotation: Annotation = {
      id: `${this.collaborativeOptions.userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: this.collaborativeOptions.userId,
      videoTimestamp: this.video.currentTime,
      type,
      layerId: this.state.currentLayer,
      data: {
        ...data,
        color: data.color || '#ff0000',
        strokeWidth: data.strokeWidth || 2,
        opacity: data.opacity || 1.0,
        x: position.x,
        y: position.y,
        // Note: timestamp and userName are not in AnnotationData, they're handled separately
      },
      visible: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Add to local layer — the wrapped onAnnotationCreated callback
    // handles syncing via queueSyncMessage (no double-sync)
    this.addAnnotation(annotation);

    // Record undo action for local creation (remote syncs bypass this path)
    const action: AnnotationAction = {
      type: 'create',
      annotationId: annotation.id,
      layerId: annotation.layerId,
      newState: { ...annotation },
      timestamp: Date.now(),
    };
    this.addToUndoStack(action);

    return annotation;
  }

  /**
   * Override startDrawing to inject the real user ID instead of hardcoded 'current-user'.
   */
  protected override startDrawing(x: number, y: number): void {
    if (!this.isActive() || !this.video) return;

    const currentLayer = this.state.layers.get(this.state.currentLayer);
    if (currentLayer?.locked) {
      console.warn('Cannot draw on a locked layer');
      return;
    }

    const tool = this.state.currentTool;
    if (!tool) return;

    const annotation: Annotation = {
      id: `${this.collaborativeOptions.userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: this.collaborativeOptions.userId,
      videoTimestamp: this.video.currentTime,
      type: tool.type,
      layerId: this.state.currentLayer || 'default',
      data: {
        color: tool.color,
        strokeWidth: tool.strokeWidth,
        opacity: tool.opacity,
        points: [{ x, y, pressure: 0, timestamp: Date.now() }],
        x,
        y,
        startX: x,
        startY: y,
      },
      visible: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.state.currentAnnotation = annotation;
    this.state.isDrawing = true;
  }

  /**
   * Handle incoming sync messages from other participants
   */
  handleSyncMessage(message: AnnotationMessage): void {
    // Don't process our own messages
    if (message.userId === this.collaborativeOptions.userId) {
      return;
    }

    // Sequence-based deduplication: skip if already applied
    if (message.sequence && message.sequence <= this.lastAppliedSequence) {
      return; // Duplicate or out-of-order — already handled
    }

    switch (message.type) {
      case 'annotation_created':
        if (message.annotation) {
          this.addAnnotation(message.annotation);
        }
        break;

      case 'annotation_updated':
        if (message.annotation) {
          this.updateAnnotation(message.annotation.id, message.annotation);
        }
        break;

      case 'annotation_deleted':
        if (message.annotationId) {
          this.deleteAnnotation(message.annotationId);
        }
        break;

      case 'layer_visibility_changed':
        if (message.layerId !== undefined && message.visible !== undefined) {
          this.setLayerVisibility(message.layerId, message.visible);
        }
        break;

      case 'annotation_state_snapshot':
        // Full state replacement — used on join/reconnect
        if (message.annotations) {
          this.clearAllAnnotations();
          for (const annotation of message.annotations) {
            this.addAnnotation(annotation);
          }
        }
        break;
    }

    // Track applied sequence
    if (message.sequence) {
      this.lastAppliedSequence = Math.max(this.lastAppliedSequence, message.sequence);
    }

    this.syncState.lastSyncTime = Date.now();
  }

  /**
   * Get annotations for specific video timestamp
   */
  getAnnotationsAtTimestamp(timestamp: number, tolerance: number = 0.5): Annotation[] {
    const allAnnotations = this.getAllAnnotations();

    return allAnnotations.filter(
      (annotation) => Math.abs(annotation.videoTimestamp - timestamp) <= tolerance
    );
  }

  /**
   * Show annotations for current video time
   */
  showAnnotationsForCurrentTime(): void {
    if (!this.video) return;

    const currentTime = this.video.currentTime;
    const relevantAnnotations = this.getAnnotationsAtTimestamp(currentTime);

    // Hide all annotations first
    this.getAllAnnotations().forEach((annotation) => {
      annotation.visible = false;
    });

    // Show relevant annotations
    relevantAnnotations.forEach((annotation) => {
      annotation.visible = true;
    });
  }

  /**
   * Update participant cursor position
   */
  updateParticipantCursor(
    userId: string,
    position: { x: number; y: number },
    tool: DrawingTool
  ): void {
    if (userId === this.collaborativeOptions.userId) return;

    this.participantCursors.set(userId, { ...position, tool });
    this.renderParticipantCursors();
  }

  /**
   * Get sync statistics
   */
  getSyncStats(): {
    isConnected: boolean;
    lastSyncTime: number;
    pendingMessages: number;
    participantCount: number;
    syncErrors: string[];
  } {
    return {
      isConnected: this.syncState.isConnected,
      lastSyncTime: this.syncState.lastSyncTime,
      pendingMessages: this.messageQueue.length,
      participantCount: this.participantCursors.size,
      syncErrors: [...this.syncState.syncErrors],
    };
  }

  private setupCollaborativeCallbacks(): void {
    // Wrap the base options callbacks (this.options) — those are what
    // addAnnotation/updateAnnotation/deleteAnnotation/setLayerVisibility actually invoke.
    // collaborativeOptions is a separate spread object, so wrapping it alone would be a no-op.
    const originalOptions = this.options;

    // Wrap original callbacks to include sync
    const originalOnAnnotationCreated = originalOptions.onAnnotationCreated;
    originalOptions.onAnnotationCreated = (annotation: Annotation) => {
      if (originalOnAnnotationCreated) {
        originalOnAnnotationCreated(annotation);
      }

      // Only sync if this annotation was created by current user
      if (annotation.userId === this.collaborativeOptions.userId) {
        this.queueSyncMessage({
          type: 'annotation_created',
          protocolVersion: 1,
          sequence: this.nextSequence(),
          userId: this.collaborativeOptions.userId,
          roomId: this.collaborativeOptions.roomId,
          annotation,
          timestamp: Date.now(),
        });
      }
    };

    // Wrap onAnnotationUpdated — was previously missing, breaking sync for edits
    const originalOnAnnotationUpdated = originalOptions.onAnnotationUpdated;
    originalOptions.onAnnotationUpdated = (annotation: Annotation) => {
      if (originalOnAnnotationUpdated) {
        originalOnAnnotationUpdated(annotation);
      }

      if (annotation.userId === this.collaborativeOptions.userId) {
        this.queueSyncMessage({
          type: 'annotation_updated',
          protocolVersion: 1,
          sequence: this.nextSequence(),
          userId: this.collaborativeOptions.userId,
          roomId: this.collaborativeOptions.roomId,
          annotation,
          annotationId: annotation.id,
          updates: annotation.data,
          timestamp: Date.now(),
        });
      }
    };

    const originalOnAnnotationDeleted = originalOptions.onAnnotationDeleted;
    originalOptions.onAnnotationDeleted = (annotationId: string) => {
      if (originalOnAnnotationDeleted) {
        originalOnAnnotationDeleted(annotationId);
      }

      this.queueSyncMessage({
        type: 'annotation_deleted',
        protocolVersion: 1,
        sequence: this.nextSequence(),
        userId: this.collaborativeOptions.userId,
        roomId: this.collaborativeOptions.roomId,
        annotationId,
        timestamp: Date.now(),
      });
    };

    const originalOnLayerVisibilityChanged = originalOptions.onLayerVisibilityChanged;
    originalOptions.onLayerVisibilityChanged = (layerId: string, visible: boolean) => {
      if (originalOnLayerVisibilityChanged) {
        originalOnLayerVisibilityChanged(layerId, visible);
      }

      this.queueSyncMessage({
        type: 'layer_visibility_changed',
        protocolVersion: 1,
        sequence: this.nextSequence(),
        userId: this.collaborativeOptions.userId,
        roomId: this.collaborativeOptions.roomId,
        layerId,
        visible,
        timestamp: Date.now(),
      });
    };
  }

  private startCollaborativeSync(): void {
    this.stopCollaborativeSync();

    this.syncTimer = window.setInterval(() => {
      this.processSyncQueue();
      this.showAnnotationsForCurrentTime();
    }, this.collaborativeOptions.syncIntervalMs);

    this.syncState.isConnected = true;
    console.log('Collaborative annotation sync started');
  }

  private stopCollaborativeSync(): void {
    if (this.syncTimer) {
      window.clearInterval(this.syncTimer);
      this.syncTimer = null;
    }

    this.syncState.isConnected = false;
    this.messageQueue = [];
    console.log('Collaborative annotation sync stopped');
  }

  private queueSyncMessage(message: AnnotationMessage): void {
    this.messageQueue.push(message);

    // Limit queue size to prevent memory issues
    if (this.messageQueue.length > 100) {
      this.messageQueue.shift();
    }
  }

  private processSyncQueue(): void {
    if (this.messageQueue.length === 0) return;

    const messages = [...this.messageQueue];
    this.messageQueue = [];

    messages.forEach((message) => {
      try {
        if (this.collaborativeOptions.onSyncMessage) {
          this.collaborativeOptions.onSyncMessage(message);
        }
      } catch (error) {
        console.error('Failed to process sync message:', error);
        this.syncState.syncErrors.push(`Sync error: ${error}`);

        // Limit error log size
        if (this.syncState.syncErrors.length > 10) {
          this.syncState.syncErrors.shift();
        }
      }
    });
  }

  private handleCrossOriginRestriction(): void {
    console.warn('Annotations blocked by cross-origin restrictions');

    if (this.collaborativeOptions.onCrossOriginBlocked) {
      this.collaborativeOptions.onCrossOriginBlocked();
    }

    // Show fallback UI with Material Design 3 styling
    this.showMaterialFallbackMessage();
  }

  private showMaterialFallbackMessage(): void {
    if (this.fallbackUI) return;

    try {
      this.fallbackUI = document.createElement('div');
      this.fallbackUI.style.cssText = `
        position: fixed;
        top: 24px;
        right: 24px;
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(8px);
        color: #1C1B1F;
        padding: 16px 20px;
        border-radius: 12px;
        font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 14px;
        z-index: 10000;
        max-width: 320px;
        line-height: 1.5;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        border: 1px solid rgba(121, 116, 126, 0.12);
      `;

      this.fallbackUI.innerHTML = `
        <div style="display: flex; align-items: flex-start; gap: 12px;">
          <div style="
            width: 24px;
            height: 24px;
            background: #F9AB00;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            font-weight: bold;
            color: white;
            font-size: 16px;
          ">!</div>
          <div>
            <div style="font-weight: 500; margin-bottom: 4px; color: #1C1B1F;">
              Annotations Unavailable
            </div>
            <div style="color: #49454F; font-size: 13px;">
              Collaborative annotations are not available on this page due to cross-origin restrictions. 
              Try opening the video in the same frame or on a supported platform.
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(this.fallbackUI);

      // Auto-hide after 8 seconds with fade out
      setTimeout(() => {
        if (this.fallbackUI) {
          this.fallbackUI.style.transition = 'opacity 0.3s ease-out';
          this.fallbackUI.style.opacity = '0';

          setTimeout(() => {
            if (this.fallbackUI) {
              this.fallbackUI.remove();
              this.fallbackUI = null;
            }
          }, 300);
        }
      }, 8000);
    } catch (error) {
      console.error('Failed to show fallback message:', error);
    }
  }

  private setupParticipantCursors(): void {
    // Create cursor overlay for showing other participants' cursors
    if (!this.overlay) return;

    const cursorOverlay = document.createElement('div');
    cursorOverlay.id = 'participant-cursors';
    cursorOverlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 9999;
    `;

    this.overlay.appendChild(cursorOverlay);
  }

  private clearParticipantCursors(): void {
    this.participantCursors.clear();

    const cursorOverlay = document.getElementById('participant-cursors');
    if (cursorOverlay) {
      cursorOverlay.remove();
    }
  }

  private renderParticipantCursors(): void {
    const cursorOverlay = document.getElementById('participant-cursors');
    if (!cursorOverlay) return;

    cursorOverlay.innerHTML = '';

    this.participantCursors.forEach((cursor, userId) => {
      const cursorElement = document.createElement('div');
      cursorElement.style.cssText = `
        position: absolute;
        left: ${cursor.x}px;
        top: ${cursor.y}px;
        width: 12px;
        height: 12px;
        background: ${cursor.tool.color};
        border: 2px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        transform: translate(-50%, -50%);
        pointer-events: none;
        z-index: 10000;
      `;

      // Add user name tooltip
      const tooltip = document.createElement('div');
      tooltip.style.cssText = `
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 11px;
        white-space: nowrap;
        margin-bottom: 4px;
      `;
      tooltip.textContent = userId;

      cursorElement.appendChild(tooltip);
      cursorOverlay.appendChild(cursorElement);
    });
  }

  // Expose private properties for testing
  public getVideo(): HTMLVideoElement | null {
    return this.video;
  }

  public getOverlay(): HTMLElement | null {
    return this.overlay;
  }

  public getFallbackUI(): HTMLElement | null {
    return this.fallbackUI;
  }
}
