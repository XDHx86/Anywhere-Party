/**
 * Integration tests for collaborative annotation system
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { CollaborativeAnnotationLayer } from './collaborative-annotation-layer';
import { AnnotationMessage } from './types';

// Simple mock setup
const mockVideo = {
  currentTime: 10.5,
  duration: 100,
  videoWidth: 640,
  videoHeight: 480,
  parentElement: {
    style: { position: 'relative' },
    appendChild: vi.fn(),
    insertBefore: vi.fn(),
  },
  getBoundingClientRect: () => ({
    left: 0,
    top: 0,
    width: 640,
    height: 480,
    right: 640,
    bottom: 480,
    x: 0,
    y: 0,
  }),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

const mockDocument = {
  createElement: vi.fn(() => ({
    style: {},
    appendChild: vi.fn(),
    remove: vi.fn(),
    getContext: () => ({
      clearRect: vi.fn(),
      strokeRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
    }),
    width: 640,
    height: 480,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
  body: { appendChild: vi.fn() },
  getElementById: vi.fn(() => null),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

const mockWindow = {
  setInterval: vi.fn((fn, interval) => setInterval(fn, interval)),
  clearInterval: vi.fn(clearInterval),
  getComputedStyle: vi.fn(() => ({ position: 'relative' })),
};

// Setup globals
(global as any).document = mockDocument;
(global as any).window = mockWindow;

describe('Collaborative Annotation Integration', () => {
  let collaborativeLayer: CollaborativeAnnotationLayer;
  let syncMessages: AnnotationMessage[];

  beforeEach(() => {
    vi.clearAllMocks();
    syncMessages = [];

    collaborativeLayer = new CollaborativeAnnotationLayer({
      roomId: 'test-room-123',
      userId: 'user-123',
      userName: 'Test User',
      renderIntervalMs: 33,
      maxAnnotationsPerLayer: 100,
      maxLayers: 10,
      onSyncMessage: (message) => syncMessages.push(message),
      onCrossOriginBlocked: vi.fn(),
    });
  });

  test('should initialize collaborative annotation layer', () => {
    expect(collaborativeLayer).toBeDefined();
    expect(collaborativeLayer.getSyncStats().isConnected).toBe(false);
  });

  test('should inject overlay and start sync', () => {
    const success = collaborativeLayer.injectOverlay(mockVideo as any);

    expect(success).toBe(true);
    expect(collaborativeLayer.isActive()).toBe(true);
    expect(collaborativeLayer.getSyncStats().isConnected).toBe(true);
  });

  test('should create timestamped annotations', () => {
    collaborativeLayer.injectOverlay(mockVideo as any);

    const annotation = collaborativeLayer.createTimestampedAnnotation(
      'pen',
      { color: '#ff0000', strokeWidth: 2, opacity: 1.0 },
      { x: 100, y: 150 }
    );

    expect(annotation).toBeDefined();
    expect(annotation!.videoTimestamp).toBe(mockVideo.currentTime);
    expect(annotation!.userId).toBe('user-123');
    expect(annotation!.data.userName).toBe('Test User');
  });

  test('should handle real-time sync messages', () => {
    collaborativeLayer.injectOverlay(mockVideo as any);

    const remoteAnnotation = {
      id: 'remote-annotation-1',
      userId: 'remote-user-456',
      videoTimestamp: 20.0,
      type: 'rectangle' as const,
      layerId: 'default',
      data: {
        color: '#00ff00',
        strokeWidth: 3,
        opacity: 0.8,
        x: 200,
        y: 250,
        width: 100,
        height: 80,
      },
      visible: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const message: AnnotationMessage = {
      type: 'annotation_created',
      userId: 'remote-user-456',
      roomId: 'test-room-123',
      annotation: remoteAnnotation,
      timestamp: Date.now(),
    };

    collaborativeLayer.handleSyncMessage(message);

    const allAnnotations = collaborativeLayer.getAllAnnotations();
    expect(allAnnotations.find((a) => a.id === remoteAnnotation.id)).toBeDefined();
  });

  test('should filter annotations by timestamp', () => {
    collaborativeLayer.injectOverlay(mockVideo as any);

    // Create annotations at different timestamps
    mockVideo.currentTime = 10.0;
    const annotation1 = collaborativeLayer.createTimestampedAnnotation(
      'pen',
      { color: '#ff0000', strokeWidth: 2, opacity: 1.0 },
      { x: 100, y: 100 }
    );

    mockVideo.currentTime = 15.0;
    const annotation2 = collaborativeLayer.createTimestampedAnnotation(
      'circle',
      { color: '#00ff00', strokeWidth: 2, opacity: 1.0 },
      { x: 200, y: 200 }
    );

    // Get annotations around timestamp 10.0
    const annotationsAt10 = collaborativeLayer.getAnnotationsAtTimestamp(10.0, 0.5);

    expect(annotationsAt10).toHaveLength(1);
    expect(annotationsAt10[0].id).toBe(annotation1!.id);
  });

  test('should manage participant cursors', () => {
    collaborativeLayer.injectOverlay(mockVideo as any);

    const tool = {
      type: 'pen' as const,
      color: '#ff0000',
      strokeWidth: 2,
      opacity: 1.0,
    };

    collaborativeLayer.updateParticipantCursor('remote-user-456', { x: 250, y: 300 }, tool);

    const stats = collaborativeLayer.getSyncStats();
    expect(stats.participantCount).toBe(1);
  });

  test('should provide sync statistics', () => {
    const stats = collaborativeLayer.getSyncStats();

    expect(stats).toEqual({
      isConnected: false,
      lastSyncTime: 0,
      pendingMessages: 0,
      participantCount: 0,
      syncErrors: [],
    });
  });

  test('should handle cross-origin restrictions', () => {
    const blockedVideo = {
      ...mockVideo,
      get currentTime() {
        throw new Error('Cross-origin access denied');
      },
    };

    const success = collaborativeLayer.injectOverlay(blockedVideo as any);

    expect(success).toBe(false);
    expect(collaborativeLayer.isCrossOriginBlocked()).toBe(true);
  });

  test('should support undo/redo with collaboration', () => {
    collaborativeLayer.injectOverlay(mockVideo as any);

    // Create annotation
    const annotation = collaborativeLayer.createTimestampedAnnotation(
      'pen',
      { color: '#ff0000', strokeWidth: 2, opacity: 1.0 },
      { x: 100, y: 100 }
    );

    expect(collaborativeLayer.getAllAnnotations()).toHaveLength(1);

    // Undo
    const undoSuccess = collaborativeLayer.undo();
    expect(undoSuccess).toBe(true);
    expect(collaborativeLayer.getAllAnnotations()).toHaveLength(0);

    // Redo
    const redoSuccess = collaborativeLayer.redo();
    expect(redoSuccess).toBe(true);
    expect(collaborativeLayer.getAllAnnotations()).toHaveLength(1);
  });

  test('should clean up on overlay removal', () => {
    collaborativeLayer.injectOverlay(mockVideo as any);
    expect(collaborativeLayer.isActive()).toBe(true);

    collaborativeLayer.removeOverlay();

    expect(collaborativeLayer.isActive()).toBe(false);
    expect(collaborativeLayer.getSyncStats().isConnected).toBe(false);
  });
});
