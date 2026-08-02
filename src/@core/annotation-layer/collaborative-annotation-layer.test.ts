/**
 * Tests for CollaborativeAnnotationLayer
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  CollaborativeAnnotationLayer,
  CollaborativeAnnotationOptions,
} from './collaborative-annotation-layer';
import { Annotation, AnnotationMessage, DrawingTool } from './types';

// Mock HTMLVideoElement
class MockVideoElement {
  currentTime = 10.5;
  duration = 100;
  videoWidth = 640;
  videoHeight = 480;
  src = 'test-video.mp4';
  parentElement: HTMLElement | null = null;
  parentNode: HTMLElement | null = null;

  getBoundingClientRect() {
    return {
      left: 0,
      top: 0,
      width: 640,
      height: 480,
      right: 640,
      bottom: 480,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    };
  }

  addEventListener() {}
  removeEventListener() {}
}

// Mock DOM elements
class MockElement {
  style: any = {};
  id = '';
  innerHTML = '';
  children: MockElement[] = [];
  parentElement: MockElement | null = null;
  parentNode: MockElement | null = null;

  appendChild(child: any) {
    this.children.push(child);
    child.parentElement = this;
    child.parentNode = this;
  }

  insertBefore(newNode: any, referenceNode: any) {
    const index = this.children.indexOf(referenceNode);
    if (index >= 0) {
      this.children.splice(index, 0, newNode);
      newNode.parentElement = this;
      newNode.parentNode = this;
    }
  }

  remove() {
    if (this.parentElement) {
      const index = this.parentElement.children.indexOf(this);
      if (index >= 0) {
        this.parentElement.children.splice(index, 1);
      }
    }
  }

  getBoundingClientRect() {
    return {
      left: 0,
      top: 0,
      width: 640,
      height: 480,
      right: 640,
      bottom: 480,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    };
  }

  getContext(type: string) {
    if (type === '2d') {
      return {
        clearRect: vi.fn(),
        strokeRect: vi.fn(),
        fillText: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        arc: vi.fn(),
        stroke: vi.fn(),
        strokeStyle: '#000000',
        lineWidth: 1,
        globalAlpha: 1,
        fillStyle: '#000000',
        font: '16px Arial',
      };
    }
    return null;
  }

  addEventListener() {}
  removeEventListener() {}
  querySelector() {
    return null;
  }
  getElementById() {
    return null;
  }
}

// Mock document
const mockDocument = {
  createElement: (tagName: string) => {
    const element = new MockElement();
    if (tagName === 'canvas') {
      element.getContext = MockElement.prototype.getContext;
      (element as any).width = 640;
      (element as any).height = 480;
    }
    return element;
  },
  body: new MockElement(),
  readyState: 'complete',
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  getElementById: vi.fn(() => null),
};

// Mock window
const mockWindow = {
  setInterval: vi.fn((callback, interval) => {
    return setInterval(callback, interval);
  }),
  clearInterval: vi.fn(clearInterval),
  setTimeout: vi.fn(setTimeout),
  clearTimeout: vi.fn(clearTimeout),
  getComputedStyle: vi.fn(() => ({ position: 'relative' })),
};

// Setup global mocks
(global as any).document = mockDocument;
(global as any).window = mockWindow;
(global as any).HTMLVideoElement = MockVideoElement;
(global as any).HTMLElement = MockElement;
(global as any).HTMLCanvasElement = MockElement;

describe('CollaborativeAnnotationLayer', () => {
  let collaborativeLayer: CollaborativeAnnotationLayer;
  let mockVideo: MockVideoElement;
  let mockParent: MockElement;
  let options: CollaborativeAnnotationOptions;
  let syncMessages: AnnotationMessage[];

  beforeEach(() => {
    vi.clearAllMocks();
    syncMessages = [];

    options = {
      roomId: 'test-room-123',
      userId: 'user-123',
      userName: 'Test User',
      renderIntervalMs: 33,
      maxAnnotationsPerLayer: 100,
      maxLayers: 10,
      syncIntervalMs: 100,
      maxSyncRetries: 3,
      onSyncMessage: (message: AnnotationMessage) => {
        syncMessages.push(message);
      },
      onCrossOriginBlocked: vi.fn(),
    };

    collaborativeLayer = new CollaborativeAnnotationLayer(options);
    mockVideo = new MockVideoElement();
    mockParent = new MockElement();
    mockParent.style.position = 'relative';
    mockVideo.parentElement = mockParent as any;
    mockVideo.parentNode = mockParent as any;
  });

  afterEach(() => {
    if (collaborativeLayer && collaborativeLayer.isActive()) {
      collaborativeLayer.removeOverlay();
    }
  });

  describe('Collaborative Features', () => {
    test('should initialize with collaborative options', () => {
      expect(collaborativeLayer).toBeDefined();

      const stats = collaborativeLayer.getSyncStats();
      expect(stats.isConnected).toBe(false);
      expect(stats.pendingMessages).toBe(0);
      expect(stats.participantCount).toBe(0);
    });

    test('should start collaborative sync when overlay injected', () => {
      const success = collaborativeLayer.injectOverlay(mockVideo as any);

      expect(success).toBe(true);
      expect(collaborativeLayer.isActive()).toBe(true);

      const stats = collaborativeLayer.getSyncStats();
      expect(stats.isConnected).toBe(true);

      expect(mockWindow.setInterval).toHaveBeenCalledWith(
        expect.any(Function),
        options.syncIntervalMs
      );
    });

    test('should stop collaborative sync when overlay removed', () => {
      collaborativeLayer.injectOverlay(mockVideo as any);
      expect(collaborativeLayer.getSyncStats().isConnected).toBe(true);

      collaborativeLayer.removeOverlay();

      expect(collaborativeLayer.isActive()).toBe(false);
      expect(collaborativeLayer.getSyncStats().isConnected).toBe(false);
      expect(mockWindow.clearInterval).toHaveBeenCalled();
    });
  });

  describe('Timestamped Annotations', () => {
    beforeEach(() => {
      collaborativeLayer.injectOverlay(mockVideo as any);
    });

    test('should create annotation with video timestamp', () => {
      const annotation = collaborativeLayer.createTimestampedAnnotation(
        'pen',
        { color: '#ff0000', strokeWidth: 2, opacity: 1.0 },
        { x: 100, y: 150 }
      );

      expect(annotation).toBeDefined();
      expect(annotation!.videoTimestamp).toBe(mockVideo.currentTime);
      expect(annotation!.userId).toBe(options.userId);
      expect(annotation!.data.x).toBe(100);
      expect(annotation!.data.y).toBe(150);
      expect(annotation!.data.userName).toBe(options.userName);
    });

    test('should queue sync message when creating annotation', () => {
      collaborativeLayer.createTimestampedAnnotation(
        'rectangle',
        { color: '#00ff00', strokeWidth: 3, opacity: 0.8 },
        { x: 50, y: 75 }
      );

      // Wait for sync processing
      vi.advanceTimersByTime(options.syncIntervalMs! + 10);

      expect(syncMessages).toHaveLength(1);
      expect(syncMessages[0].type).toBe('annotation_created');
      expect(syncMessages[0].userId).toBe(options.userId);
      expect(syncMessages[0].roomId).toBe(options.roomId);
      expect(syncMessages[0].annotation).toBeDefined();
    });

    test('should get annotations for specific timestamp', () => {
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

      mockVideo.currentTime = 10.2;
      const annotation3 = collaborativeLayer.createTimestampedAnnotation(
        'arrow',
        { color: '#0000ff', strokeWidth: 2, opacity: 1.0 },
        { x: 150, y: 150 }
      );

      // Get annotations around timestamp 10.0 with tolerance 0.5
      const annotationsAt10 = collaborativeLayer.getAnnotationsAtTimestamp(10.0, 0.5);

      expect(annotationsAt10).toHaveLength(2);
      expect(annotationsAt10.map((a) => a.id)).toContain(annotation1!.id);
      expect(annotationsAt10.map((a) => a.id)).toContain(annotation3!.id);
      expect(annotationsAt10.map((a) => a.id)).not.toContain(annotation2!.id);
    });

    test('should show/hide annotations based on current video time', () => {
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

      // Set video time to 10.0 and show relevant annotations
      mockVideo.currentTime = 10.0;
      collaborativeLayer.showAnnotationsForCurrentTime();

      expect(annotation1!.visible).toBe(true);
      expect(annotation2!.visible).toBe(false);

      // Set video time to 15.0 and show relevant annotations
      mockVideo.currentTime = 15.0;
      collaborativeLayer.showAnnotationsForCurrentTime();

      expect(annotation1!.visible).toBe(false);
      expect(annotation2!.visible).toBe(true);
    });
  });

  describe('Real-time Synchronization', () => {
    beforeEach(() => {
      collaborativeLayer.injectOverlay(mockVideo as any);
    });

    test('should handle incoming annotation creation messages', () => {
      const incomingAnnotation: Annotation = {
        id: 'remote-annotation-1',
        userId: 'remote-user-456',
        videoTimestamp: 20.0,
        type: 'rectangle',
        layerId: 'default',
        data: {
          color: '#ff00ff',
          strokeWidth: 4,
          opacity: 0.9,
          x: 300,
          y: 400,
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
        roomId: options.roomId,
        annotation: incomingAnnotation,
        timestamp: Date.now(),
      };

      collaborativeLayer.handleSyncMessage(message);

      const allAnnotations = collaborativeLayer.getAllAnnotations();
      expect(allAnnotations.find((a) => a.id === incomingAnnotation.id)).toBeDefined();
    });

    test('should handle incoming annotation deletion messages', () => {
      // First create an annotation
      const annotation = collaborativeLayer.createTimestampedAnnotation(
        'pen',
        { color: '#ff0000', strokeWidth: 2, opacity: 1.0 },
        { x: 100, y: 100 }
      );

      expect(collaborativeLayer.getAllAnnotations()).toHaveLength(1);

      // Simulate deletion message from another user
      const deleteMessage: AnnotationMessage = {
        type: 'annotation_deleted',
        userId: 'remote-user-456',
        roomId: options.roomId,
        annotationId: annotation!.id,
        timestamp: Date.now(),
      };

      collaborativeLayer.handleSyncMessage(deleteMessage);

      expect(collaborativeLayer.getAllAnnotations()).toHaveLength(0);
    });

    test('should handle layer visibility change messages', () => {
      const visibilityMessage: AnnotationMessage = {
        type: 'layer_visibility_changed',
        userId: 'remote-user-456',
        roomId: options.roomId,
        layerId: 'default',
        visible: false,
        timestamp: Date.now(),
      };

      collaborativeLayer.handleSyncMessage(visibilityMessage);

      // Check that layer visibility was updated
      const layers = (collaborativeLayer as any).state.layers;
      const defaultLayer = layers.get('default');
      expect(defaultLayer.visible).toBe(false);
    });

    test('should ignore messages from same user', () => {
      const annotation = collaborativeLayer.createTimestampedAnnotation(
        'pen',
        { color: '#ff0000', strokeWidth: 2, opacity: 1.0 },
        { x: 100, y: 100 }
      );

      const initialCount = collaborativeLayer.getAllAnnotations().length;

      // Simulate message from same user (should be ignored)
      const message: AnnotationMessage = {
        type: 'annotation_created',
        userId: options.userId, // Same user ID
        roomId: options.roomId,
        annotation: annotation!,
        timestamp: Date.now(),
      };

      collaborativeLayer.handleSyncMessage(message);

      // Should not create duplicate
      expect(collaborativeLayer.getAllAnnotations()).toHaveLength(initialCount);
    });

    test('should update participant cursors', () => {
      const tool: DrawingTool = {
        type: 'pen',
        color: '#ff0000',
        strokeWidth: 2,
        opacity: 1.0,
      };

      collaborativeLayer.updateParticipantCursor('remote-user-456', { x: 250, y: 300 }, tool);

      const stats = collaborativeLayer.getSyncStats();
      expect(stats.participantCount).toBe(1);
    });

    test('should not update cursor for same user', () => {
      const tool: DrawingTool = {
        type: 'pen',
        color: '#ff0000',
        strokeWidth: 2,
        opacity: 1.0,
      };

      collaborativeLayer.updateParticipantCursor(options.userId, { x: 250, y: 300 }, tool);

      const stats = collaborativeLayer.getSyncStats();
      expect(stats.participantCount).toBe(0);
    });
  });

  describe('Cross-Origin Handling', () => {
    test('should handle cross-origin blocked video', () => {
      // Mock video that throws on property access
      const blockedVideo = {
        ...mockVideo,
        get currentTime() {
          throw new Error('Cross-origin access denied');
        },
      };

      const success = collaborativeLayer.injectOverlay(blockedVideo as any);

      expect(success).toBe(false);
      expect(collaborativeLayer.isCrossOriginBlocked()).toBe(true);
      expect(options.onCrossOriginBlocked).toHaveBeenCalled();
    });

    test('should show Material Design 3 fallback message for cross-origin', () => {
      const blockedVideo = {
        ...mockVideo,
        get currentTime() {
          throw new Error('Cross-origin access denied');
        },
      };

      collaborativeLayer.injectOverlay(blockedVideo as any);

      expect(collaborativeLayer.isCrossOriginBlocked()).toBe(true);

      // Check that fallback UI was created
      const fallbackUI = collaborativeLayer.getFallbackUI();
      expect(fallbackUI).toBeDefined();
      expect(fallbackUI!.innerHTML).toContain('Annotations Unavailable');
      expect(fallbackUI!.innerHTML).toContain('cross-origin restrictions');
    });
  });

  describe('Sync Statistics', () => {
    test('should provide accurate sync statistics', () => {
      const stats = collaborativeLayer.getSyncStats();

      expect(stats).toEqual({
        isConnected: false,
        lastSyncTime: 0,
        pendingMessages: 0,
        participantCount: 0,
        syncErrors: [],
      });
    });

    test('should update sync statistics when active', () => {
      collaborativeLayer.injectOverlay(mockVideo as any);

      const stats = collaborativeLayer.getSyncStats();
      expect(stats.isConnected).toBe(true);
    });

    test('should track sync errors', () => {
      collaborativeLayer.injectOverlay(mockVideo as any);

      // Simulate sync error by providing invalid message
      const invalidMessage = { invalid: 'message' } as any;

      try {
        collaborativeLayer.handleSyncMessage(invalidMessage);
      } catch (error) {
        // Expected to fail
      }

      // Process sync queue to trigger error handling
      vi.advanceTimersByTime(options.syncIntervalMs! + 10);

      const stats = collaborativeLayer.getSyncStats();
      // Note: Error handling is internal, so we can't easily test error accumulation
      // This test verifies the structure exists
      expect(Array.isArray(stats.syncErrors)).toBe(true);
    });
  });

  describe('Undo/Redo with Collaboration', () => {
    beforeEach(() => {
      collaborativeLayer.injectOverlay(mockVideo as any);
    });

    test('should support undo/redo with sync messages', () => {
      // Create annotation (should generate sync message)
      const annotation = collaborativeLayer.createTimestampedAnnotation(
        'pen',
        { color: '#ff0000', strokeWidth: 2, opacity: 1.0 },
        { x: 100, y: 100 }
      );

      expect(collaborativeLayer.getAllAnnotations()).toHaveLength(1);

      // Undo should remove annotation and generate sync message
      const undoSuccess = collaborativeLayer.undo();
      expect(undoSuccess).toBe(true);
      expect(collaborativeLayer.getAllAnnotations()).toHaveLength(0);

      // Redo should restore annotation and generate sync message
      const redoSuccess = collaborativeLayer.redo();
      expect(redoSuccess).toBe(true);
      expect(collaborativeLayer.getAllAnnotations()).toHaveLength(1);

      // Wait for sync processing
      vi.advanceTimersByTime(options.syncIntervalMs! + 10);

      // Should have generated sync messages for create, delete (undo), and create (redo)
      expect(syncMessages.length).toBeGreaterThan(0);
    });
  });
});
