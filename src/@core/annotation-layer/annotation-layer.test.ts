/**
 * Tests for AnnotationLayer
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { AnnotationLayer } from './annotation-layer';
import { AnnotationLayerOptions, Annotation, DrawingTool } from './types';

// Mock HTMLVideoElement
class MockVideoElement {
  currentTime = 0;
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

describe('AnnotationLayer', () => {
  let annotationLayer: AnnotationLayer;
  let mockVideo: MockVideoElement;
  let mockParent: MockElement;
  let options: AnnotationLayerOptions;

  beforeEach(() => {
    vi.clearAllMocks();

    options = {
      renderIntervalMs: 33,
      maxAnnotationsPerLayer: 100,
      maxLayers: 10,
    };

    annotationLayer = new AnnotationLayer(options);
    mockVideo = new MockVideoElement();
    mockParent = new MockElement();
    mockParent.style.position = 'relative';
    mockVideo.parentElement = mockParent as any;
    mockVideo.parentNode = mockParent as any;
  });

  afterEach(() => {
    if (annotationLayer.isActive()) {
      annotationLayer.removeOverlay();
    }
  });

  describe('Overlay Injection', () => {
    test('should successfully inject overlay on accessible video', () => {
      const success = annotationLayer.injectOverlay(mockVideo as any);

      expect(success).toBe(true);
      expect(annotationLayer.isActive()).toBe(true);
      expect(mockWindow.setInterval).toHaveBeenCalledWith(
        expect.any(Function),
        options.renderIntervalMs
      );
    });

    test('should handle cross-origin blocked video', () => {
      // Mock video that throws on property access
      const blockedVideo = {
        ...mockVideo,
        get currentTime() {
          throw new Error('Cross-origin access denied');
        },
      };

      const success = annotationLayer.injectOverlay(blockedVideo as any);

      expect(success).toBe(false);
      expect(annotationLayer.isCrossOriginBlocked()).toBe(true);
      expect(annotationLayer.isActive()).toBe(false);
    });

    test('should remove overlay properly', () => {
      annotationLayer.injectOverlay(mockVideo as any);
      expect(annotationLayer.isActive()).toBe(true);

      annotationLayer.removeOverlay();

      expect(annotationLayer.isActive()).toBe(false);
      expect(mockWindow.clearInterval).toHaveBeenCalled();
    });
  });

  describe('Layer Management', () => {
    test('should create default layer on initialization', () => {
      const layers = Array.from((annotationLayer as any).state.layers.keys());
      expect(layers).toContain('default');
    });

    test('should create new layers', () => {
      const success = annotationLayer.createLayer('layer1', 'Test Layer 1');

      expect(success).toBe(true);

      const layers = Array.from((annotationLayer as any).state.layers.keys());
      expect(layers).toContain('layer1');
    });

    test('should not create duplicate layers', () => {
      annotationLayer.createLayer('layer1', 'Test Layer 1');
      const success = annotationLayer.createLayer('layer1', 'Duplicate Layer');

      expect(success).toBe(false);
    });

    test('should not exceed maximum layers', () => {
      // Create maximum number of layers (including default)
      for (let i = 1; i < options.maxLayers!; i++) {
        annotationLayer.createLayer(`layer${i}`, `Layer ${i}`);
      }

      const success = annotationLayer.createLayer('overflow', 'Overflow Layer');
      expect(success).toBe(false);
    });

    test('should delete layers except default', () => {
      annotationLayer.createLayer('layer1', 'Test Layer 1');

      const success1 = annotationLayer.deleteLayer('layer1');
      expect(success1).toBe(true);

      const success2 = annotationLayer.deleteLayer('default');
      expect(success2).toBe(false);
    });

    test('should set layer visibility', () => {
      annotationLayer.createLayer('layer1', 'Test Layer 1');

      const onLayerVisibilityChanged = vi.fn();
      (annotationLayer as any).options.onLayerVisibilityChanged = onLayerVisibilityChanged;

      annotationLayer.setLayerVisibility('layer1', false);

      expect(onLayerVisibilityChanged).toHaveBeenCalledWith('layer1', false);
    });

    test('should set current layer', () => {
      annotationLayer.createLayer('layer1', 'Test Layer 1');

      const success = annotationLayer.setCurrentLayer('layer1');
      expect(success).toBe(true);

      const currentLayer = (annotationLayer as any).state.currentLayer;
      expect(currentLayer).toBe('layer1');
    });
  });

  describe('Drawing Tools', () => {
    test('should set drawing tool properties', () => {
      const tool: Partial<DrawingTool> = {
        type: 'rectangle',
        color: '#ff0000',
        strokeWidth: 3,
      };

      annotationLayer.setTool(tool);

      const currentTool = (annotationLayer as any).state.currentTool;
      expect(currentTool.type).toBe('rectangle');
      expect(currentTool.color).toBe('#ff0000');
      expect(currentTool.strokeWidth).toBe(3);
    });
  });

  describe('Annotation Management', () => {
    let testAnnotation: Annotation;

    beforeEach(() => {
      testAnnotation = {
        id: 'test-annotation-1',
        userId: 'user1',
        videoTimestamp: 10.5,
        type: 'pen',
        layerId: 'default',
        data: {
          color: '#ff0000',
          strokeWidth: 2,
          opacity: 1.0,
          points: [
            { x: 10, y: 10 },
            { x: 20, y: 20 },
          ],
        },
        visible: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    });

    test('should add annotations', () => {
      const onAnnotationCreated = vi.fn();
      (annotationLayer as any).options.onAnnotationCreated = onAnnotationCreated;

      annotationLayer.addAnnotation(testAnnotation);

      expect(onAnnotationCreated).toHaveBeenCalledWith(testAnnotation);

      const annotations = annotationLayer.getAllAnnotations();
      expect(annotations).toContainEqual(testAnnotation);
    });

    test('should update annotations', () => {
      annotationLayer.addAnnotation(testAnnotation);

      const onAnnotationUpdated = vi.fn();
      (annotationLayer as any).options.onAnnotationUpdated = onAnnotationUpdated;

      const updates = { visible: false };
      annotationLayer.updateAnnotation(testAnnotation.id, updates);

      expect(onAnnotationUpdated).toHaveBeenCalled();

      const annotations = annotationLayer.getAllAnnotations();
      const updatedAnnotation = annotations.find((a) => a.id === testAnnotation.id);
      expect(updatedAnnotation?.visible).toBe(false);
    });

    test('should delete annotations', () => {
      annotationLayer.addAnnotation(testAnnotation);

      const onAnnotationDeleted = vi.fn();
      (annotationLayer as any).options.onAnnotationDeleted = onAnnotationDeleted;

      annotationLayer.deleteAnnotation(testAnnotation.id);

      expect(onAnnotationDeleted).toHaveBeenCalledWith(testAnnotation.id);

      const annotations = annotationLayer.getAllAnnotations();
      expect(annotations.find((a) => a.id === testAnnotation.id)).toBeUndefined();
    });

    test('should not exceed maximum annotations per layer', () => {
      const layer = (annotationLayer as any).state.layers.get('default');

      // Fill layer to maximum
      for (let i = 0; i < options.maxAnnotationsPerLayer!; i++) {
        const annotation = {
          ...testAnnotation,
          id: `annotation-${i}`,
        };
        annotationLayer.addAnnotation(annotation);
      }

      // Try to add one more
      const overflowAnnotation = {
        ...testAnnotation,
        id: 'overflow-annotation',
      };

      const initialCount = layer.annotations.size;
      annotationLayer.addAnnotation(overflowAnnotation);

      expect(layer.annotations.size).toBe(initialCount);
    });
  });

  describe('Undo/Redo Functionality', () => {
    test('should support undo operations', () => {
      annotationLayer.createLayer('layer1', 'Test Layer');

      const undoSuccess = annotationLayer.undo();
      expect(undoSuccess).toBe(true);

      const layers = Array.from((annotationLayer as any).state.layers.keys());
      expect(layers).not.toContain('layer1');
    });

    test('should support redo operations', () => {
      annotationLayer.createLayer('layer1', 'Test Layer');
      annotationLayer.undo();

      const redoSuccess = annotationLayer.redo();
      expect(redoSuccess).toBe(true);

      const layers = Array.from((annotationLayer as any).state.layers.keys());
      expect(layers).toContain('layer1');
    });

    test('should return false when no undo/redo available', () => {
      const undoSuccess = annotationLayer.undo();
      expect(undoSuccess).toBe(false);

      const redoSuccess = annotationLayer.redo();
      expect(redoSuccess).toBe(false);
    });
  });

  describe('Render Loop Independence', () => {
    test('should start render loop with correct interval', () => {
      annotationLayer.injectOverlay(mockVideo as any);

      expect(mockWindow.setInterval).toHaveBeenCalledWith(
        expect.any(Function),
        options.renderIntervalMs
      );
    });

    test('should stop render loop when overlay removed', () => {
      annotationLayer.injectOverlay(mockVideo as any);
      annotationLayer.removeOverlay();

      expect(mockWindow.clearInterval).toHaveBeenCalled();
    });

    test('should restart render loop when interval changes', () => {
      annotationLayer.injectOverlay(mockVideo as any);

      // Simulate interval change by stopping and starting
      annotationLayer.stopRenderLoop();
      annotationLayer.startRenderLoop();

      expect(mockWindow.setInterval).toHaveBeenCalledTimes(2);
    });
  });

  describe('Clear Operations', () => {
    test('should clear all annotations', () => {
      const testAnnotation = {
        id: 'test-annotation',
        userId: 'user1',
        videoTimestamp: 10,
        type: 'pen' as const,
        layerId: 'default',
        data: {
          color: '#ff0000',
          strokeWidth: 2,
          opacity: 1.0,
          points: [{ x: 10, y: 10 }],
        },
        visible: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      annotationLayer.addAnnotation(testAnnotation);
      expect(annotationLayer.getAllAnnotations()).toHaveLength(1);

      annotationLayer.clearAllAnnotations();
      expect(annotationLayer.getAllAnnotations()).toHaveLength(0);
    });
  });
});
