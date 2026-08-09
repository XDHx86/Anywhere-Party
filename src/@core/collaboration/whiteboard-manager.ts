/**
 * Enhanced Whiteboard Manager for Collaborative Annotations
 * Extends the existing annotation layer with advanced collaboration features
 * Implements requirements 9.1, 9.3
 */

import {
  WhiteboardSession,
  WhiteboardTool,
  WhiteboardLayer,
  WhiteboardAnnotation,
  WhiteboardAnnotationData,
  CollaborationEvent,
} from './types';

export interface WhiteboardManagerOptions {
  maxLayers?: number;
  maxAnnotationsPerLayer?: number;
  maxParticipants?: number;
  renderIntervalMs?: number;
  onSessionCreated?: (session: WhiteboardSession) => void;
  onAnnotationCreated?: (annotation: WhiteboardAnnotation) => void;
  onAnnotationUpdated?: (annotation: WhiteboardAnnotation) => void;
  onAnnotationDeleted?: (annotationId: string) => void;
  onLayerCreated?: (layer: WhiteboardLayer) => void;
  onLayerUpdated?: (layer: WhiteboardLayer) => void;
  onLayerDeleted?: (layerId: string) => void;
  onCollaborationEvent?: (event: CollaborationEvent) => void;
}

export class WhiteboardManager {
  private sessions: Map<string, WhiteboardSession> = new Map();
  private tools: Map<string, WhiteboardTool> = new Map();
  private options: Required<WhiteboardManagerOptions>;

  constructor(options: WhiteboardManagerOptions = {}) {
    this.options = {
      maxLayers: options.maxLayers ?? 10,
      maxAnnotationsPerLayer: options.maxAnnotationsPerLayer ?? 100,
      maxParticipants: options.maxParticipants ?? 20,
      renderIntervalMs: options.renderIntervalMs ?? 16, // 60fps
      onSessionCreated: options.onSessionCreated ?? (() => {}),
      onAnnotationCreated: options.onAnnotationCreated ?? (() => {}),
      onAnnotationUpdated: options.onAnnotationUpdated ?? (() => {}),
      onAnnotationDeleted: options.onAnnotationDeleted ?? (() => {}),
      onLayerCreated: options.onLayerCreated ?? (() => {}),
      onLayerUpdated: options.onLayerUpdated ?? (() => {}),
      onLayerDeleted: options.onLayerDeleted ?? (() => {}),
      onCollaborationEvent: options.onCollaborationEvent ?? (() => {}),
    };

    this.initializeDefaultTools();
  }

  /**
   * Create a new whiteboard session
   */
  createSession(roomId: string, videoTimestamp: number, creatorId: string): WhiteboardSession {
    const sessionId = this.generateId();

    const session: WhiteboardSession = {
      id: sessionId,
      roomId,
      videoTimestamp,
      participants: [creatorId],
      tools: Array.from(this.tools.values()),
      layers: [this.createDefaultLayer(creatorId)],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.sessions.set(sessionId, session);

    this.options.onSessionCreated(session);
    this.options.onCollaborationEvent({
      type: 'whiteboard_annotation_created',
      userId: creatorId,
      roomId,
      timestamp: session.createdAt,
      data: { sessionId },
    });

    console.log('Whiteboard session created:', sessionId);
    return session;
  }

  /**
   * Join an existing whiteboard session
   */
  joinSession(sessionId: string, userId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    if (session.participants.length >= this.options.maxParticipants) {
      throw new Error('Session is full');
    }

    if (!session.participants.includes(userId)) {
      session.participants.push(userId);
      session.updatedAt = Date.now();
    }

    console.log('User joined whiteboard session:', sessionId, userId);
    return true;
  }

  /**
   * Leave a whiteboard session
   */
  leaveSession(sessionId: string, userId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    const index = session.participants.indexOf(userId);
    if (index !== -1) {
      session.participants.splice(index, 1);
      session.updatedAt = Date.now();
    }

    console.log('User left whiteboard session:', sessionId, userId);
    return true;
  }

  /**
   * Create a new layer in a session
   */
  createLayer(
    sessionId: string,
    userId: string,
    name: string,
    collaborators: string[] = []
  ): WhiteboardLayer {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (!session.participants.includes(userId)) {
      throw new Error('User not in session');
    }

    if (session.layers.length >= this.options.maxLayers) {
      throw new Error('Maximum layers reached');
    }

    const layer: WhiteboardLayer = {
      id: this.generateId(),
      name: name.trim(),
      visible: true,
      locked: false,
      opacity: 1.0,
      zIndex: session.layers.length,
      ownerId: userId,
      collaborators: collaborators.filter((id) => session.participants.includes(id)),
      annotations: [],
    };

    session.layers.push(layer);
    session.updatedAt = Date.now();

    this.options.onLayerCreated(layer);
    this.options.onCollaborationEvent({
      type: 'whiteboard_layer_created',
      userId,
      roomId: session.roomId,
      timestamp: Date.now(),
      data: { sessionId, layerId: layer.id, name },
    });

    console.log('Whiteboard layer created:', layer.id, name);
    return layer;
  }

  /**
   * Update layer properties
   */
  updateLayer(
    sessionId: string,
    layerId: string,
    userId: string,
    updates: Partial<
      Pick<WhiteboardLayer, 'name' | 'visible' | 'locked' | 'opacity' | 'collaborators'>
    >
  ): WhiteboardLayer {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const layer = session.layers.find((l) => l.id === layerId);
    if (!layer) {
      throw new Error('Layer not found');
    }

    // Check permissions
    if (layer.ownerId !== userId && !layer.collaborators.includes(userId)) {
      throw new Error('Not authorized to update this layer');
    }

    // Apply updates
    if (updates.name !== undefined) {
      layer.name = updates.name.trim();
    }
    if (updates.visible !== undefined) {
      layer.visible = updates.visible;
    }
    if (updates.locked !== undefined) {
      layer.locked = updates.locked;
    }
    if (updates.opacity !== undefined) {
      layer.opacity = Math.max(0, Math.min(1, updates.opacity));
    }
    if (updates.collaborators !== undefined) {
      layer.collaborators = updates.collaborators.filter((id) => session.participants.includes(id));
    }

    session.updatedAt = Date.now();

    this.options.onLayerUpdated(layer);
    this.options.onCollaborationEvent({
      type: 'whiteboard_layer_updated',
      userId,
      roomId: session.roomId,
      timestamp: Date.now(),
      data: { sessionId, layerId, updates },
    });

    console.log('Whiteboard layer updated:', layerId);
    return layer;
  }

  /**
   * Delete a layer
   */
  deleteLayer(sessionId: string, layerId: string, userId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    const layerIndex = session.layers.findIndex((l) => l.id === layerId);
    if (layerIndex === -1) {
      return false;
    }

    const layer = session.layers[layerIndex];
    if (!layer) return false;

    // Check permissions (only owner can delete)
    if (layer.ownerId !== userId) {
      throw new Error('Not authorized to delete this layer');
    }

    session.layers.splice(layerIndex, 1);
    session.updatedAt = Date.now();

    this.options.onLayerDeleted(layerId);
    this.options.onCollaborationEvent({
      type: 'whiteboard_layer_deleted',
      userId,
      roomId: session.roomId,
      timestamp: Date.now(),
      data: { sessionId, layerId },
    });

    console.log('Whiteboard layer deleted:', layerId);
    return true;
  }

  /**
   * Create an annotation on a layer
   */
  createAnnotation(
    sessionId: string,
    layerId: string,
    userId: string,
    userName: string,
    type: WhiteboardAnnotation['type'],
    data: WhiteboardAnnotationData,
    videoTimestamp: number
  ): WhiteboardAnnotation {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const layer = session.layers.find((l) => l.id === layerId);
    if (!layer) {
      throw new Error('Layer not found');
    }

    // Check permissions
    if (layer.locked || (!layer.collaborators.includes(userId) && layer.ownerId !== userId)) {
      throw new Error('Not authorized to annotate this layer');
    }

    if (layer.annotations.length >= this.options.maxAnnotationsPerLayer) {
      throw new Error('Maximum annotations per layer reached');
    }

    const annotation: WhiteboardAnnotation = {
      id: this.generateId(),
      userId,
      userName,
      type,
      data: { ...data },
      videoTimestamp,
      visible: true,
      locked: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    layer.annotations.push(annotation);
    session.updatedAt = Date.now();

    this.options.onAnnotationCreated(annotation);
    this.options.onCollaborationEvent({
      type: 'whiteboard_annotation_created',
      userId,
      userName,
      roomId: session.roomId,
      timestamp: annotation.createdAt,
      data: { sessionId, layerId, annotation },
    });

    console.log('Whiteboard annotation created:', annotation.id, type);
    return annotation;
  }

  /**
   * Update an existing annotation
   */
  updateAnnotation(
    sessionId: string,
    layerId: string,
    annotationId: string,
    userId: string,
    updates: Partial<Pick<WhiteboardAnnotation, 'data' | 'visible' | 'locked'>>
  ): WhiteboardAnnotation {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const layer = session.layers.find((l) => l.id === layerId);
    if (!layer) {
      throw new Error('Layer not found');
    }

    const annotation = layer.annotations.find((a) => a.id === annotationId);
    if (!annotation) {
      throw new Error('Annotation not found');
    }

    // Check permissions (only creator can update)
    if (annotation.userId !== userId) {
      throw new Error('Not authorized to update this annotation');
    }

    if (annotation.locked) {
      throw new Error('Annotation is locked');
    }

    // Apply updates
    if (updates.data !== undefined) {
      annotation.data = { ...annotation.data, ...updates.data };
    }
    if (updates.visible !== undefined) {
      annotation.visible = updates.visible;
    }
    if (updates.locked !== undefined) {
      annotation.locked = updates.locked;
    }

    annotation.updatedAt = Date.now();
    session.updatedAt = Date.now();

    this.options.onAnnotationUpdated(annotation);
    this.options.onCollaborationEvent({
      type: 'whiteboard_annotation_updated',
      userId,
      userName: annotation.userName,
      roomId: session.roomId,
      timestamp: annotation.updatedAt,
      data: { sessionId, layerId, annotationId, updates },
    });

    console.log('Whiteboard annotation updated:', annotationId);
    return annotation;
  }

  /**
   * Delete an annotation
   */
  deleteAnnotation(
    sessionId: string,
    layerId: string,
    annotationId: string,
    userId: string
  ): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    const layer = session.layers.find((l) => l.id === layerId);
    if (!layer) {
      return false;
    }

    const annotationIndex = layer.annotations.findIndex((a) => a.id === annotationId);
    if (annotationIndex === -1) {
      return false;
    }

    const annotation = layer.annotations[annotationIndex];
    if (!annotation) return false;

    // Check permissions (creator or layer owner can delete)
    if (annotation.userId !== userId && layer.ownerId !== userId) {
      throw new Error('Not authorized to delete this annotation');
    }

    layer.annotations.splice(annotationIndex, 1);
    session.updatedAt = Date.now();

    this.options.onAnnotationDeleted(annotationId);
    this.options.onCollaborationEvent({
      type: 'whiteboard_annotation_deleted',
      userId,
      userName: annotation.userName,
      roomId: session.roomId,
      timestamp: Date.now(),
      data: { sessionId, layerId, annotationId },
    });

    console.log('Whiteboard annotation deleted:', annotationId);
    return true;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): WhiteboardSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get sessions by room
   */
  getSessionsByRoom(roomId: string): WhiteboardSession[] {
    return Array.from(this.sessions.values()).filter((session) => session.roomId === roomId);
  }

  /**
   * Get sessions by participant
   */
  getSessionsByParticipant(userId: string): WhiteboardSession[] {
    return Array.from(this.sessions.values()).filter((session) =>
      session.participants.includes(userId)
    );
  }

  /**
   * Get available tools
   */
  getTools(): WhiteboardTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tools by category
   */
  getToolsByCategory(category: WhiteboardTool['category']): WhiteboardTool[] {
    return Array.from(this.tools.values()).filter((tool) => tool.category === category);
  }

  /**
   * Add custom tool
   */
  addTool(tool: WhiteboardTool): void {
    this.tools.set(tool.id, tool);
    console.log('Whiteboard tool added:', tool.id, tool.name);
  }

  /**
   * Remove custom tool
   */
  removeTool(toolId: string): boolean {
    const removed = this.tools.delete(toolId);
    if (removed) {
      console.log('Whiteboard tool removed:', toolId);
    }
    return removed;
  }

  /**
   * Export session data
   */
  exportSession(sessionId: string): WhiteboardSession | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    // Deep clone to avoid mutations
    return JSON.parse(JSON.stringify(session));
  }

  /**
   * Import session data
   */
  importSession(sessionData: WhiteboardSession): void {
    // Validate session data
    if (!sessionData.id || !sessionData.roomId) {
      throw new Error('Invalid session data');
    }

    // Deep clone to avoid mutations
    const session = JSON.parse(JSON.stringify(sessionData));
    this.sessions.set(session.id, session);

    console.log('Whiteboard session imported:', session.id);
  }

  /**
   * Clear all sessions
   */
  clear(): void {
    this.sessions.clear();
  }

  /**
   * Initialize default drawing tools
   */
  private initializeDefaultTools(): void {
    const defaultTools: WhiteboardTool[] = [
      {
        id: 'pen',
        name: 'Pen',
        icon: '✏️',
        category: 'drawing',
        type: 'pen',
        color: '#000000',
        strokeWidth: 2,
        opacity: 1.0,
      },
      {
        id: 'highlighter',
        name: 'Highlighter',
        icon: '🖍️',
        category: 'drawing',
        type: 'highlighter',
        color: '#ffff00',
        strokeWidth: 8,
        opacity: 0.5,
      },
      {
        id: 'eraser',
        name: 'Eraser',
        icon: '🧽',
        category: 'drawing',
        type: 'eraser',
        color: '#ffffff',
        strokeWidth: 10,
        opacity: 1.0,
      },
      {
        id: 'rectangle',
        name: 'Rectangle',
        icon: '⬜',
        category: 'shapes',
        type: 'rectangle',
        color: '#000000',
        strokeWidth: 2,
        opacity: 1.0,
      },
      {
        id: 'circle',
        name: 'Circle',
        icon: '⭕',
        category: 'shapes',
        type: 'circle',
        color: '#000000',
        strokeWidth: 2,
        opacity: 1.0,
      },
      {
        id: 'arrow',
        name: 'Arrow',
        icon: '➡️',
        category: 'shapes',
        type: 'arrow',
        color: '#000000',
        strokeWidth: 2,
        opacity: 1.0,
      },
      {
        id: 'text',
        name: 'Text',
        icon: '📝',
        category: 'text',
        type: 'text',
        color: '#000000',
        strokeWidth: 1,
        opacity: 1.0,
        fontSize: 16,
        fontFamily: 'Arial',
      },
      {
        id: 'sticky_note',
        name: 'Sticky Note',
        icon: '📋',
        category: 'collaboration',
        type: 'sticky_note',
        color: '#000000',
        strokeWidth: 1,
        opacity: 1.0,
        fontSize: 14,
        fontFamily: 'Arial',
      },
    ];

    defaultTools.forEach((tool) => {
      this.tools.set(tool.id, tool);
    });
  }

  /**
   * Create default layer for new sessions
   */
  private createDefaultLayer(ownerId: string): WhiteboardLayer {
    return {
      id: 'default',
      name: 'Default Layer',
      visible: true,
      locked: false,
      opacity: 1.0,
      zIndex: 0,
      ownerId,
      collaborators: [],
      annotations: [],
    };
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
