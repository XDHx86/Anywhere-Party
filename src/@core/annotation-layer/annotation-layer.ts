/**
 * Annotation Layer - Collaborative drawing overlay system
 *
 * Provides collaborative drawing and markup overlay on video content
 * Renders annotations on independent tick cycle from sync heartbeats
 * Handles cross-origin limitations with fallback UI
 */

import {
  AnnotationLayerOptions,
  Annotation,
  AnnotationLayer as AnnotationLayerType,
  AnnotationState,
  DrawingTool,
  AnnotationAction,
  CanvasEventHandlers,
} from './types';

export class AnnotationLayer {
  protected options: AnnotationLayerOptions;
  protected state: AnnotationState;
  protected video: HTMLVideoElement | null = null;
  protected canvas: HTMLCanvasElement | null = null;
  protected ctx: CanvasRenderingContext2D | null = null;
  protected overlay: HTMLElement | null = null;
  protected renderTimer: number | null = null;
  protected eventHandlers: CanvasEventHandlers | null = null;
  protected crossOriginBlocked = false;
  protected fallbackUI: HTMLElement | null = null;

  constructor(options: AnnotationLayerOptions) {
    this.options = {
      ...options,
      maxAnnotationsPerLayer: options.maxAnnotationsPerLayer || 100,
      maxLayers: options.maxLayers || 10,
    };

    this.state = {
      isActive: false,
      currentTool: {
        type: 'pen',
        color: '#ff0000',
        strokeWidth: 2,
        opacity: 1.0,
      },
      currentLayer: 'default',
      layers: new Map(),
      isDrawing: false,
      currentAnnotation: null,
      undoStack: [],
      redoStack: [],
      maxUndoSteps: 50,
    };

    // Create default layer without adding to undo stack
    const defaultLayer: AnnotationLayerType = {
      id: 'default',
      name: 'Default Layer',
      visible: true,
      locked: false,
      opacity: 1.0,
      annotations: new Map(),
      zIndex: 0,
    };
    this.state.layers.set('default', defaultLayer);
  }

  /**
   * Try to inject annotation overlay on video element
   */
  injectOverlay(video: HTMLVideoElement): boolean {
    try {
      this.video = video;

      // Check if we can access the video element properly
      if (!this.canAccessVideoElement(video)) {
        this.crossOriginBlocked = true;
        this.showFallbackMessage();
        return false;
      }

      // Create overlay container
      this.overlay = this.createOverlayContainer(video);
      if (!this.overlay) {
        this.crossOriginBlocked = true;
        this.showFallbackMessage();
        return false;
      }

      // Create canvas for drawing
      this.canvas = this.createCanvas();
      this.ctx = this.canvas.getContext('2d');

      if (!this.ctx) {
        console.error('Failed to get canvas 2D context');
        this.removeOverlay();
        return false;
      }

      this.overlay.appendChild(this.canvas);
      this.setupEventHandlers();
      this.startRenderLoop();

      this.state.isActive = true;
      console.log('Annotation overlay injected successfully');
      return true;
    } catch (error) {
      console.error('Failed to inject annotation overlay:', error);
      this.crossOriginBlocked = true;
      this.showFallbackMessage();
      return false;
    }
  }

  /**
   * Remove annotation overlay
   */
  removeOverlay(): void {
    this.stopRenderLoop();
    this.removeEventHandlers();

    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }

    if (this.fallbackUI) {
      this.fallbackUI.remove();
      this.fallbackUI = null;
    }

    this.canvas = null;
    this.ctx = null;
    this.video = null;
    this.state.isActive = false;
    this.crossOriginBlocked = false;

    console.log('Annotation overlay removed');
  }

  /**
   * Start independent render loop for smooth annotation performance
   */
  startRenderLoop(): void {
    this.stopRenderLoop();

    this.renderTimer = window.setInterval(() => {
      this.renderAnnotations();
    }, this.options.renderIntervalMs);

    console.log(`Annotation render loop started at ${1000 / this.options.renderIntervalMs}fps`);
  }

  /**
   * Stop render loop
   */
  stopRenderLoop(): void {
    if (this.renderTimer) {
      window.clearInterval(this.renderTimer);
      this.renderTimer = null;
    }
  }

  /**
   * Create a new annotation layer
   */
  createLayer(id: string, name: string): boolean {
    if (this.state.layers.size >= this.options.maxLayers) {
      console.warn('Maximum number of layers reached');
      return false;
    }

    if (this.state.layers.has(id)) {
      console.warn('Layer already exists:', id);
      return false;
    }

    const layer: AnnotationLayerType = {
      id,
      name,
      visible: true,
      locked: false,
      opacity: 1.0,
      annotations: new Map(),
      zIndex: this.state.layers.size,
    };

    this.state.layers.set(id, layer);

    const action: AnnotationAction = {
      type: 'layer_create',
      layerId: id,
      newState: { ...layer },
      timestamp: Date.now(),
    };

    this.addToUndoStack(action);
    console.log('Layer created:', id, name);
    return true;
  }

  /**
   * Delete a layer and all its annotations
   */
  deleteLayer(id: string): boolean {
    if (id === 'default') {
      console.warn('Cannot delete default layer');
      return false;
    }

    const layer = this.state.layers.get(id);
    if (!layer) {
      console.warn('Layer not found:', id);
      return false;
    }

    const action: AnnotationAction = {
      type: 'layer_delete',
      layerId: id,
      previousState: { ...layer, annotations: new Map(layer.annotations) },
      timestamp: Date.now(),
    };

    this.state.layers.delete(id);

    // Switch to default layer if current layer was deleted
    if (this.state.currentLayer === id) {
      this.state.currentLayer = 'default';
    }

    this.addToUndoStack(action);
    console.log('Layer deleted:', id);
    return true;
  }

  /**
   * Set layer visibility
   */
  setLayerVisibility(layerId: string, visible: boolean): void {
    const layer = this.state.layers.get(layerId);
    if (!layer) {
      console.warn('Layer not found:', layerId);
      return;
    }

    const previousVisible = layer.visible;
    layer.visible = visible;

    const action: AnnotationAction = {
      type: 'layer_visibility',
      layerId,
      previousState: { visible: previousVisible },
      newState: { visible },
      timestamp: Date.now(),
    };

    this.addToUndoStack(action);

    if (this.options.onLayerVisibilityChanged) {
      this.options.onLayerVisibilityChanged(layerId, visible);
    }

    console.log('Layer visibility changed:', layerId, visible);
  }

  /**
   * Set layer opacity (0.0–1.0)
   */
  setLayerOpacity(layerId: string, opacity: number): void {
    const layer = this.state.layers.get(layerId);
    if (!layer) {
      console.warn('Layer not found:', layerId);
      return;
    }

    const previousOpacity = layer.opacity;
    layer.opacity = Math.max(0, Math.min(1, opacity));

    const action: AnnotationAction = {
      type: 'layer_opacity',
      layerId,
      previousState: { opacity: previousOpacity },
      newState: { opacity: layer.opacity },
      timestamp: Date.now(),
    };

    this.addToUndoStack(action);
    console.log('Layer opacity changed:', layerId, layer.opacity);
  }

  /**
   * Reorder a layer's z-index
   */
  reorderLayer(layerId: string, newZIndex: number): void {
    const layer = this.state.layers.get(layerId);
    if (!layer) {
      console.warn('Layer not found:', layerId);
      return;
    }

    const previousZIndex = layer.zIndex;
    layer.zIndex = newZIndex;

    const action: AnnotationAction = {
      type: 'layer_reorder',
      layerId,
      previousState: { zIndex: previousZIndex },
      newState: { zIndex: newZIndex },
      timestamp: Date.now(),
    };

    this.addToUndoStack(action);
    console.log('Layer reordered:', layerId, 'zIndex:', newZIndex);
  }

  /**
   * Rename a layer
   */
  renameLayer(layerId: string, name: string): void {
    const layer = this.state.layers.get(layerId);
    if (!layer) {
      console.warn('Layer not found:', layerId);
      return;
    }

    const previousName = layer.name;
    layer.name = name;

    const action: AnnotationAction = {
      type: 'layer_rename',
      layerId,
      previousState: { name: previousName },
      newState: { name },
      timestamp: Date.now(),
    };

    this.addToUndoStack(action);
    console.log('Layer renamed:', layerId, '→', name);
  }

  /**
   * Set current drawing tool
   */
  setTool(tool: Partial<DrawingTool>): void {
    this.state.currentTool = { ...this.state.currentTool, ...tool };
    console.log('Tool changed:', this.state.currentTool);
  }

  /**
   * Set current layer
   */
  setCurrentLayer(layerId: string): boolean {
    if (!this.state.layers.has(layerId)) {
      console.warn('Layer not found:', layerId);
      return false;
    }

    this.state.currentLayer = layerId;
    console.log('Current layer changed:', layerId);
    return true;
  }

  /**
   * Add annotation from external source (e.g., other participants)
   */
  addAnnotation(annotation: Annotation): void {
    const layer = this.state.layers.get(annotation.layerId);
    if (!layer) {
      console.warn('Layer not found for annotation:', annotation.layerId);
      return;
    }

    if (layer.annotations.size >= this.options.maxAnnotationsPerLayer) {
      console.warn('Maximum annotations per layer reached');
      return;
    }

    layer.annotations.set(annotation.id, annotation);

    if (this.options.onAnnotationCreated) {
      this.options.onAnnotationCreated(annotation);
    }

    console.log('Annotation added:', annotation.id);
  }

  /**
   * Update existing annotation
   */
  updateAnnotation(annotationId: string, updates: Partial<Annotation>): void {
    for (const layer of this.state.layers.values()) {
      const annotation = layer.annotations.get(annotationId);
      if (annotation) {
        Object.assign(annotation, updates);
        annotation.updatedAt = Date.now();

        if (this.options.onAnnotationUpdated) {
          this.options.onAnnotationUpdated(annotation);
        }

        console.log('Annotation updated:', annotationId);
        return;
      }
    }

    console.warn('Annotation not found for update:', annotationId);
  }

  /**
   * Delete annotation
   */
  deleteAnnotation(annotationId: string): void {
    for (const layer of this.state.layers.values()) {
      const annotation = layer.annotations.get(annotationId);
      if (annotation !== undefined) {
        layer.annotations.delete(annotationId);

        const action: AnnotationAction = {
          type: 'delete',
          annotationId,
          layerId: layer.id,
          previousState: { ...annotation },
          timestamp: Date.now(),
        };

        this.addToUndoStack(action);

        if (this.options.onAnnotationDeleted) {
          this.options.onAnnotationDeleted(annotationId);
        }

        console.log('Annotation deleted:', annotationId);
        return;
      }
    }

    console.warn('Annotation not found for deletion:', annotationId);
  }

  /**
   * Undo last action
   */
  undo(): boolean {
    const action = this.state.undoStack.pop();
    if (action === undefined) {
      return false;
    }

    this.state.redoStack.push(action);

    this.applyUndoAction(action);
    console.log('Undo applied:', action.type);
    return true;
  }

  /**
   * Redo last undone action
   */
  redo(): boolean {
    const action = this.state.redoStack.pop();
    if (action === undefined) {
      return false;
    }

    this.state.undoStack.push(action);

    this.applyRedoAction(action);
    console.log('Redo applied:', action.type);
    return true;
  }

  /**
   * Clear all annotations
   */
  clearAllAnnotations(): void {
    for (const layer of this.state.layers.values()) {
      layer.annotations.clear();
    }

    this.state.undoStack = [];
    this.state.redoStack = [];
    console.log('All annotations cleared');
  }

  /**
   * Get all annotations for synchronization
   */
  getAllAnnotations(): Annotation[] {
    const annotations: Annotation[] = [];

    for (const layer of this.state.layers.values()) {
      for (const annotation of layer.annotations.values()) {
        annotations.push(annotation);
      }
    }

    return annotations;
  }

  /**
   * Check if overlay is active
   */
  isActive(): boolean {
    return this.state.isActive;
  }

  /**
   * Check if cross-origin blocked
   */
  isCrossOriginBlocked(): boolean {
    return this.crossOriginBlocked;
  }

  private canAccessVideoElement(video: HTMLVideoElement): boolean {
    try {
      // Try to access video properties that might be blocked by CORS
      void video.currentTime;
      void video.duration;
      void video.videoWidth;
      return true;
    } catch (error) {
      console.warn('Video element access blocked by CORS:', error);
      return false;
    }
  }

  private createOverlayContainer(video: HTMLVideoElement): HTMLElement | null {
    try {
      const overlay = document.createElement('div');
      overlay.id = 'watch-party-annotation-overlay';
      overlay.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: auto;
        z-index: 9998;
        user-select: none;
      `;

      // Try to append to video parent or create wrapper
      const videoParent = video.parentElement;
      if (videoParent && window.getComputedStyle(videoParent).position !== 'static') {
        videoParent.appendChild(overlay);
      } else {
        // Create wrapper if parent doesn't have positioning
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'position: relative; display: inline-block;';
        video.parentNode?.insertBefore(wrapper, video);
        wrapper.appendChild(video);
        wrapper.appendChild(overlay);
      }

      return overlay;
    } catch (error) {
      console.error('Failed to create overlay container:', error);
      return null;
    }
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
      cursor: crosshair;
    `;

    // Set canvas size to match video
    if (this.video) {
      const rect = this.video.getBoundingClientRect();
      canvas.width = this.options.canvasWidth || rect.width;
      canvas.height = this.options.canvasHeight || rect.height;
    }

    return canvas;
  }

  private setupEventHandlers(): void {
    if (!this.canvas) return;

    this.eventHandlers = {
      onMouseDown: (event: MouseEvent) => this.handleMouseDown(event),
      onMouseMove: (event: MouseEvent) => this.handleMouseMove(event),
      onMouseUp: (event: MouseEvent) => this.handleMouseUp(event),
      onTouchStart: (event: TouchEvent) => this.handleTouchStart(event),
      onTouchMove: (event: TouchEvent) => this.handleTouchMove(event),
      onTouchEnd: (event: TouchEvent) => this.handleTouchEnd(event),
      onKeyDown: (event: KeyboardEvent) => this.handleKeyDown(event),
    };

    this.canvas.addEventListener('mousedown', this.eventHandlers.onMouseDown);
    this.canvas.addEventListener('mousemove', this.eventHandlers.onMouseMove);
    this.canvas.addEventListener('mouseup', this.eventHandlers.onMouseUp);
    this.canvas.addEventListener('touchstart', this.eventHandlers.onTouchStart);
    this.canvas.addEventListener('touchmove', this.eventHandlers.onTouchMove);
    this.canvas.addEventListener('touchend', this.eventHandlers.onTouchEnd);
    document.addEventListener('keydown', this.eventHandlers.onKeyDown);
  }

  private removeEventHandlers(): void {
    if (!this.canvas || !this.eventHandlers) return;

    this.canvas.removeEventListener('mousedown', this.eventHandlers.onMouseDown);
    this.canvas.removeEventListener('mousemove', this.eventHandlers.onMouseMove);
    this.canvas.removeEventListener('mouseup', this.eventHandlers.onMouseUp);
    this.canvas.removeEventListener('touchstart', this.eventHandlers.onTouchStart);
    this.canvas.removeEventListener('touchmove', this.eventHandlers.onTouchMove);
    this.canvas.removeEventListener('touchend', this.eventHandlers.onTouchEnd);
    document.removeEventListener('keydown', this.eventHandlers.onKeyDown);

    this.eventHandlers = null;
  }

  private showFallbackMessage(): void {
    if (this.fallbackUI || !this.video) return;

    try {
      this.fallbackUI = document.createElement('div');
      this.fallbackUI.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        z-index: 10000;
        max-width: 300px;
        line-height: 1.4;
      `;

      this.fallbackUI.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 8px;">⚠️ Annotations Unavailable</div>
        <div>Collaborative annotations are not available on this page due to cross-origin restrictions. Try opening the video in the same frame or on a supported platform.</div>
      `;

      document.body.appendChild(this.fallbackUI);

      // Auto-hide after 10 seconds
      setTimeout(() => {
        if (this.fallbackUI) {
          this.fallbackUI.remove();
          this.fallbackUI = null;
        }
      }, 10000);
    } catch (error) {
      console.error('Failed to show fallback message:', error);
    }
  }

  private renderAnnotations(): void {
    if (!this.ctx || !this.canvas) return;

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Render layers in z-index order
    const sortedLayers = Array.from(this.state.layers.values()).sort((a, b) => a.zIndex - b.zIndex);

    for (const layer of sortedLayers) {
      if (!layer.visible) continue;

      this.ctx.globalAlpha = layer.opacity;

      for (const annotation of layer.annotations.values()) {
        if (!annotation.visible) continue;
        this.renderAnnotation(annotation);
      }
    }

    // Render current annotation being drawn
    if (this.state.currentAnnotation) {
      this.ctx.globalAlpha = 1.0;
      this.renderAnnotation(this.state.currentAnnotation);
    }
  }

  private renderAnnotation(annotation: Annotation): void {
    if (!this.ctx) return;

    this.ctx.strokeStyle = annotation.data.color;
    this.ctx.lineWidth = annotation.data.strokeWidth;
    this.ctx.globalAlpha = annotation.data.opacity;

    switch (annotation.type) {
      case 'pen':
        this.renderPenAnnotation(annotation);
        break;
      case 'rectangle':
        this.renderRectangleAnnotation(annotation);
        break;
      case 'circle':
        this.renderCircleAnnotation(annotation);
        break;
      case 'arrow':
        this.renderArrowAnnotation(annotation);
        break;
      case 'text':
        this.renderTextAnnotation(annotation);
        break;
      case 'eraser':
        this.renderEraserAnnotation(annotation);
        break;
      case 'highlighter':
        this.renderHighlighterAnnotation(annotation);
        break;
      case 'line':
        this.renderLineAnnotation(annotation);
        break;
    }
  }

  // ─── New Tool Renderers (Milestone 4) ─────────────────────

  private renderEraserAnnotation(annotation: Annotation): void {
    if (!this.ctx || !annotation.data.points || annotation.data.points.length < 2) return;

    const prevComposite = this.ctx.globalCompositeOperation;
    this.ctx.globalCompositeOperation = 'destination-out';
    this.ctx.strokeStyle = 'rgba(0,0,0,1)';
    this.ctx.lineWidth = annotation.data.strokeWidth * 3; // Eraser is wider
    this.ctx.globalAlpha = 1;

    this.ctx.beginPath();
    const firstPoint = annotation.data.points[0];
    if (firstPoint) {
      this.ctx.moveTo(firstPoint.x, firstPoint.y);
      for (let i = 1; i < annotation.data.points.length; i++) {
        const point = annotation.data.points[i];
        if (point) {
          this.ctx.lineTo(point.x, point.y);
        }
      }
      this.ctx.stroke();
    }

    this.ctx.globalCompositeOperation = prevComposite;
  }

  private renderHighlighterAnnotation(annotation: Annotation): void {
    if (!this.ctx || !annotation.data.points || annotation.data.points.length < 2) return;

    const prevComposite = this.ctx.globalCompositeOperation;
    this.ctx.globalCompositeOperation = 'multiply';
    this.ctx.strokeStyle = annotation.data.color;
    this.ctx.lineWidth = annotation.data.strokeWidth * 4; // Wide highlighter
    this.ctx.globalAlpha = 0.3; // Always semi-transparent
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    this.ctx.beginPath();
    const firstPoint = annotation.data.points[0];
    if (firstPoint) {
      this.ctx.moveTo(firstPoint.x, firstPoint.y);
      for (let i = 1; i < annotation.data.points.length; i++) {
        const point = annotation.data.points[i];
        if (point) {
          this.ctx.lineTo(point.x, point.y);
        }
      }
      this.ctx.stroke();
    }

    this.ctx.globalCompositeOperation = prevComposite;
  }

  private renderLineAnnotation(annotation: Annotation): void {
    if (
      !this.ctx ||
      annotation.data.startX === undefined ||
      annotation.data.startY === undefined ||
      annotation.data.endX === undefined ||
      annotation.data.endY === undefined
    )
      return;

    this.ctx.beginPath();

    // Apply line style
    const lineStyle = annotation.data.lineStyle || 'solid';
    if (lineStyle === 'dashed') {
      this.ctx.setLineDash([10, 5]);
    } else if (lineStyle === 'dotted') {
      this.ctx.setLineDash([3, 3]);
    } else {
      this.ctx.setLineDash([]);
    }

    this.ctx.moveTo(annotation.data.startX, annotation.data.startY);
    this.ctx.lineTo(annotation.data.endX, annotation.data.endY);
    this.ctx.stroke();

    this.ctx.setLineDash([]);
  }

  private renderPenAnnotation(annotation: Annotation): void {
    if (!this.ctx || !annotation.data.points || annotation.data.points.length < 2) return;

    this.ctx.beginPath();
    const firstPoint = annotation.data.points[0];
    if (firstPoint) {
      this.ctx.moveTo(firstPoint.x, firstPoint.y);
      for (let i = 1; i < annotation.data.points.length; i++) {
        const point = annotation.data.points[i];
        if (point) {
          this.ctx.lineTo(point.x, point.y);
        }
      }
      this.ctx.stroke();
    }
  }

  private renderRectangleAnnotation(annotation: Annotation): void {
    if (
      !this.ctx ||
      annotation.data.x === undefined ||
      annotation.data.y === undefined ||
      annotation.data.width === undefined ||
      annotation.data.height === undefined
    )
      return;

    this.ctx.strokeRect(
      annotation.data.x,
      annotation.data.y,
      annotation.data.width,
      annotation.data.height
    );
  }

  private renderCircleAnnotation(annotation: Annotation): void {
    if (
      !this.ctx ||
      annotation.data.x === undefined ||
      annotation.data.y === undefined ||
      annotation.data.radius === undefined
    )
      return;

    this.ctx.beginPath();
    this.ctx.arc(annotation.data.x, annotation.data.y, annotation.data.radius, 0, 2 * Math.PI);
    this.ctx.stroke();
  }

  private renderArrowAnnotation(annotation: Annotation): void {
    if (
      !this.ctx ||
      annotation.data.startX === undefined ||
      annotation.data.startY === undefined ||
      annotation.data.endX === undefined ||
      annotation.data.endY === undefined
    )
      return;

    const { startX, startY, endX, endY } = annotation.data;

    // Draw line
    this.ctx.beginPath();
    this.ctx.moveTo(startX, startY);
    this.ctx.lineTo(endX, endY);
    this.ctx.stroke();

    // Draw arrowhead
    const angle = Math.atan2(endY - startY, endX - startX);
    const arrowLength = 15;
    const arrowAngle = Math.PI / 6;

    this.ctx.beginPath();
    this.ctx.moveTo(endX, endY);
    this.ctx.lineTo(
      endX - arrowLength * Math.cos(angle - arrowAngle),
      endY - arrowLength * Math.sin(angle - arrowAngle)
    );
    this.ctx.moveTo(endX, endY);
    this.ctx.lineTo(
      endX - arrowLength * Math.cos(angle + arrowAngle),
      endY - arrowLength * Math.sin(angle + arrowAngle)
    );
    this.ctx.stroke();
  }

  private renderTextAnnotation(annotation: Annotation): void {
    if (
      !this.ctx ||
      !annotation.data.text ||
      annotation.data.x === undefined ||
      annotation.data.y === undefined
    )
      return;

    this.ctx.fillStyle = annotation.data.color;
    this.ctx.font = `${annotation.data.fontSize || 16}px ${annotation.data.fontFamily || 'Arial'}`;
    this.ctx.fillText(annotation.data.text, annotation.data.x, annotation.data.y);
  }

  private handleMouseDown(event: MouseEvent): void {
    if (!this.canvas) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    this.startDrawing(x, y);
  }

  private handleMouseMove(event: MouseEvent): void {
    if (!this.state.isDrawing || !this.canvas) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    this.continueDrawing(x, y);
  }

  private handleMouseUp(_event: MouseEvent): void {
    if (!this.state.isDrawing) return;
    this.finishDrawing();
  }

  private handleTouchStart(event: TouchEvent): void {
    event.preventDefault();
    if (!this.canvas || event.touches.length !== 1) return;

    const rect = this.canvas.getBoundingClientRect();
    const touch = event.touches[0];
    if (!touch) return;
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    this.startDrawing(x, y);
  }

  private handleTouchMove(event: TouchEvent): void {
    event.preventDefault();
    if (!this.state.isDrawing || !this.canvas || event.touches.length !== 1) return;

    const rect = this.canvas.getBoundingClientRect();
    const touch = event.touches[0];
    if (!touch) return;
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    this.continueDrawing(x, y);
  }

  private handleTouchEnd(event: TouchEvent): void {
    event.preventDefault();
    if (!this.state.isDrawing) return;
    this.finishDrawing();
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case 'z':
          event.preventDefault();
          if (event.shiftKey) {
            this.redo();
          } else {
            this.undo();
          }
          break;
        case 'y':
          event.preventDefault();
          this.redo();
          break;
      }
    }
  }

  protected startDrawing(x: number, y: number): void {
    if (!this.video) return;

    const currentLayer = this.state.layers.get(this.state.currentLayer);
    if (!currentLayer || currentLayer.locked) return;

    this.state.isDrawing = true;

    const isPenLike = ['pen', 'eraser', 'highlighter'].includes(this.state.currentTool.type);
    const isArrowLike = ['arrow', 'line'].includes(this.state.currentTool.type);

    const annotation: Annotation = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: 'current-user', // Overridden by CollaborativeAnnotationLayer.startDrawing
      videoTimestamp: this.video.currentTime,
      type: this.state.currentTool.type,
      layerId: this.state.currentLayer,
      data: {
        color: this.state.currentTool.color,
        strokeWidth: this.state.currentTool.strokeWidth,
        opacity: this.state.currentTool.opacity,
        points: isPenLike ? [{ x, y }] : undefined,
        x: !isPenLike ? x : undefined,
        y: !isPenLike ? y : undefined,
        startX: isArrowLike ? x : undefined,
        startY: isArrowLike ? y : undefined,
        fontSize: this.state.currentTool.fontSize,
        fontFamily: this.state.currentTool.fontFamily,
      },
      visible: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.state.currentAnnotation = annotation;
  }

  private continueDrawing(x: number, y: number): void {
    if (!this.state.currentAnnotation) return;

    const type = this.state.currentAnnotation.type;

    if (type === 'pen' || type === 'eraser' || type === 'highlighter') {
      if (this.state.currentAnnotation.data.points) {
        this.state.currentAnnotation.data.points.push({ x, y });
      }
    } else if (type === 'rectangle') {
      if (
        this.state.currentAnnotation.data.x !== undefined &&
        this.state.currentAnnotation.data.y !== undefined
      ) {
        this.state.currentAnnotation.data.width = x - this.state.currentAnnotation.data.x;
        this.state.currentAnnotation.data.height = y - this.state.currentAnnotation.data.y;
      }
    } else if (type === 'circle') {
      if (
        this.state.currentAnnotation.data.x !== undefined &&
        this.state.currentAnnotation.data.y !== undefined
      ) {
        const dx = x - this.state.currentAnnotation.data.x;
        const dy = y - this.state.currentAnnotation.data.y;
        this.state.currentAnnotation.data.radius = Math.sqrt(dx * dx + dy * dy);
      }
    } else if (type === 'arrow' || type === 'line') {
      this.state.currentAnnotation.data.endX = x;
      this.state.currentAnnotation.data.endY = y;
    }

    this.state.currentAnnotation.updatedAt = Date.now();
  }

  private finishDrawing(): void {
    if (!this.state.currentAnnotation) return;

    const currentLayer = this.state.layers.get(this.state.currentLayer);
    if (!currentLayer) return;

    // Add annotation to layer
    currentLayer.annotations.set(this.state.currentAnnotation.id, this.state.currentAnnotation);

    // Add to undo stack
    const action: AnnotationAction = {
      type: 'create',
      annotationId: this.state.currentAnnotation.id,
      layerId: this.state.currentLayer,
      newState: { ...this.state.currentAnnotation },
      timestamp: Date.now(),
    };

    this.addToUndoStack(action);

    // Notify callback
    if (this.options.onAnnotationCreated) {
      this.options.onAnnotationCreated(this.state.currentAnnotation);
    }

    this.state.currentAnnotation = null;
    this.state.isDrawing = false;
  }

  protected addToUndoStack(action: AnnotationAction): void {
    this.state.undoStack.push(action);

    // Limit undo stack size
    if (this.state.undoStack.length > this.state.maxUndoSteps) {
      this.state.undoStack.shift();
    }

    // Clear redo stack when new action is added
    this.state.redoStack = [];
  }

  private applyUndoAction(action: AnnotationAction): void {
    switch (action.type) {
      case 'create':
        if (action.annotationId && action.layerId) {
          const layer = this.state.layers.get(action.layerId);
          if (layer) {
            layer.annotations.delete(action.annotationId);
          }
        }
        break;
      case 'delete':
        if (action.annotationId && action.layerId && action.previousState) {
          const layer = this.state.layers.get(action.layerId);
          if (layer) {
            const annotation = action.previousState as Annotation;
            layer.annotations.set(action.annotationId, annotation);
          }
        }
        break;
      case 'layer_create':
        if (action.layerId) {
          this.state.layers.delete(action.layerId);
        }
        break;
      case 'layer_delete':
        if (action.layerId && action.previousState) {
          const layer = action.previousState as AnnotationLayerType;
          this.state.layers.set(action.layerId, layer);
        }
        break;
      case 'layer_visibility':
        if (action.layerId && action.previousState) {
          const layer = this.state.layers.get(action.layerId);
          if (layer) {
            const prevState = action.previousState as { visible: boolean };
            layer.visible = prevState.visible;
          }
        }
        break;
    }
  }

  private applyRedoAction(action: AnnotationAction): void {
    switch (action.type) {
      case 'create':
        if (action.annotationId && action.layerId && action.newState) {
          const layer = this.state.layers.get(action.layerId);
          if (layer) {
            const annotation = action.newState as Annotation;
            layer.annotations.set(action.annotationId, annotation);
          }
        }
        break;
      case 'delete':
        if (action.annotationId && action.layerId) {
          const layer = this.state.layers.get(action.layerId);
          if (layer) {
            layer.annotations.delete(action.annotationId);
          }
        }
        break;
      case 'layer_create':
        if (action.layerId && action.newState) {
          const layer = action.newState as AnnotationLayerType;
          this.state.layers.set(action.layerId, layer);
        }
        break;
      case 'layer_delete':
        if (action.layerId) {
          this.state.layers.delete(action.layerId);
        }
        break;
      case 'layer_visibility':
        if (action.layerId && action.newState) {
          const layer = this.state.layers.get(action.layerId);
          if (layer) {
            const newState = action.newState as { visible: boolean };
            layer.visible = newState.visible;
          }
        }
        break;
    }
  }
}
