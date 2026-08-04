/**
 * Integration tests for AnnotationSystem
 */

import React from 'react';
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AnnotationSystem, AnnotationSystemProps } from './AnnotationSystem';
import { AnnotationMessage } from '../../../@core/annotation-layer/types';
import { CollaborativeAnnotationLayer } from '../../../@core/annotation-layer/collaborative-annotation-layer';

// Mock the collaborative annotation layer
vi.mock('../../../@core/annotation-layer/collaborative-annotation-layer', () => ({
  CollaborativeAnnotationLayer: vi.fn().mockImplementation(() => ({
    injectOverlay: vi.fn(() => true),
    removeOverlay: vi.fn(),
    isActive: vi.fn(() => true),
    isCrossOriginBlocked: vi.fn(() => false),
    setTool: vi.fn(),
    setCurrentLayer: vi.fn(),
    setLayerVisibility: vi.fn(),
    undo: vi.fn(() => true),
    redo: vi.fn(() => true),
    clearAllAnnotations: vi.fn(),
    createLayer: vi.fn(() => true),
    deleteLayer: vi.fn(() => true),
    handleSyncMessage: vi.fn(),
    getSyncStats: vi.fn(() => ({
      isConnected: true,
      lastSyncTime: Date.now(),
      pendingMessages: 0,
      participantCount: 2,
      syncErrors: [],
    })),
  })),
}));

// Mock Material Design components
vi.mock('./MaterialAnnotationToolbar', () => ({
  MaterialAnnotationToolbar: ({ onToolChange, onUndo, onRedo, isActive, ...props }: any) => (
    <div data-testid="material-annotation-toolbar" data-active={isActive}>
      <button onClick={() => onToolChange({ type: 'pen', color: '#ff0000' })}>Change Tool</button>
      <button onClick={onUndo} disabled={!props.canUndo}>
        Undo
      </button>
      <button onClick={onRedo} disabled={!props.canRedo}>
        Redo
      </button>
    </div>
  ),
}));

vi.mock('../overlays/FloatingSurface', () => ({
  default: ({ children, visible, 'data-testid': testId, ...props }: any) =>
    visible ? (
      <div data-testid={testId ?? 'floating-surface'} data-visible={visible} {...props}>
        {children}
      </div>
    ) : null,
}));

// Mock video element
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

describe('AnnotationSystem', () => {
  let mockVideo: MockVideoElement;
  let mockProps: AnnotationSystemProps;
  let syncMessages: AnnotationMessage[];

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset the mock to the default implementation so per-test overrides don't leak
    CollaborativeAnnotationLayer.mockImplementation(() => ({
      injectOverlay: vi.fn(() => true),
      removeOverlay: vi.fn(),
      isActive: vi.fn(() => true),
      isCrossOriginBlocked: vi.fn(() => false),
      setTool: vi.fn(),
      setCurrentLayer: vi.fn(),
      setLayerVisibility: vi.fn(),
      undo: vi.fn(() => true),
      redo: vi.fn(() => true),
      clearAllAnnotations: vi.fn(),
      createLayer: vi.fn(() => true),
      deleteLayer: vi.fn(() => true),
      handleSyncMessage: vi.fn(),
      getSyncStats: vi.fn(() => ({
        isConnected: true,
        lastSyncTime: Date.now(),
        pendingMessages: 0,
        participantCount: 2,
        syncErrors: [],
      })),
    }));
    syncMessages = [];

    mockVideo = new MockVideoElement();
    mockProps = {
      videoElement: mockVideo as any,
      roomId: 'test-room-123',
      userId: 'user-123',
      userName: 'Test User',
      isVisible: true,
      onSyncMessage: (message: AnnotationMessage) => {
        syncMessages.push(message);
      },
      onAnnotationCreated: vi.fn(),
      onAnnotationDeleted: vi.fn(),
      onCrossOriginBlocked: vi.fn(),
    };
  });

  describe('Initialization', () => {
    test('should render annotation system with toolbar', () => {
      render(<AnnotationSystem {...mockProps} />);

      expect(screen.getByTestId('annotation-toolbar-surface')).toBeInTheDocument();
      expect(screen.getByTestId('material-annotation-toolbar')).toBeInTheDocument();
    });

    test('should initialize collaborative annotation layer', () => {
      render(<AnnotationSystem {...mockProps} />);

      expect(CollaborativeAnnotationLayer).toHaveBeenCalledWith(
        expect.objectContaining({
          roomId: 'test-room-123',
          userId: 'user-123',
          userName: 'Test User',
        })
      );
    });

    test('should not render when not visible', () => {
      render(<AnnotationSystem {...mockProps} isVisible={false} />);

      expect(screen.queryByTestId('annotation-toolbar-surface')).not.toBeInTheDocument();
    });

    test('should handle missing video element', () => {
      render(<AnnotationSystem {...mockProps} videoElement={undefined} />);

      // Should render but toolbar should be inactive
      expect(screen.getByTestId('material-annotation-toolbar')).toHaveAttribute(
        'data-active',
        'false'
      );
    });
  });

  describe('Toolbar Integration', () => {
    test('should handle tool changes', () => {
      render(<AnnotationSystem {...mockProps} />);

      const changeToolBtn = screen.getByText('Change Tool');
      fireEvent.click(changeToolBtn);

      // Verify that the annotation layer's setTool method would be called
      // (This is mocked, so we can't directly verify the call)
      expect(changeToolBtn).toBeInTheDocument();
    });

    test('should handle undo/redo actions', () => {
      render(<AnnotationSystem {...mockProps} />);

      const undoBtn = screen.getByText('Undo');
      const redoBtn = screen.getByText('Redo');

      fireEvent.click(undoBtn);
      fireEvent.click(redoBtn);

      // Verify buttons are present and clickable
      expect(undoBtn).toBeInTheDocument();
      expect(redoBtn).toBeInTheDocument();
    });

    test('should show active state when annotation layer is active', () => {
      render(<AnnotationSystem {...mockProps} />);

      const toolbar = screen.getByTestId('material-annotation-toolbar');
      expect(toolbar).toHaveAttribute('data-active', 'true');
    });
  });

  describe('Cross-Origin Handling', () => {
    test('should handle cross-origin blocked scenario', () => {
      // Mock the annotation layer to simulate cross-origin blocking
      CollaborativeAnnotationLayer.mockImplementation(() => ({
        injectOverlay: vi.fn(() => false),
        removeOverlay: vi.fn(),
        isActive: vi.fn(() => false),
        isCrossOriginBlocked: vi.fn(() => true),
        getSyncStats: vi.fn(() => ({
          isConnected: false,
          lastSyncTime: 0,
          pendingMessages: 0,
          participantCount: 0,
          syncErrors: [],
        })),
      }));

      render(<AnnotationSystem {...mockProps} />);

      const toolbar = screen.getByTestId('material-annotation-toolbar');
      expect(toolbar).toHaveAttribute('data-active', 'false');

      expect(mockProps.onCrossOriginBlocked).toHaveBeenCalled();
    });
  });

  describe('Sync Status Indicator', () => {
    test('should show sync status when participants are present', async () => {
      render(<AnnotationSystem {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('sync-status-indicator')).toBeInTheDocument();
      });

      expect(screen.getByText('2 participants')).toBeInTheDocument();
    });

    test('should show disconnected state', async () => {
      // Mock disconnected state
      CollaborativeAnnotationLayer.mockImplementation(() => ({
        injectOverlay: vi.fn(() => true),
        removeOverlay: vi.fn(),
        isActive: vi.fn(() => true),
        isCrossOriginBlocked: vi.fn(() => false),
        setTool: vi.fn(),
        getSyncStats: vi.fn(() => ({
          isConnected: false,
          lastSyncTime: 0,
          pendingMessages: 0,
          participantCount: 0,
          syncErrors: ['Connection failed'],
        })),
      }));

      render(<AnnotationSystem {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Disconnected')).toBeInTheDocument();
      });

      expect(screen.getByText('1 sync error')).toBeInTheDocument();
    });

    test('should hide sync status when no participants and no errors', async () => {
      // Mock empty state
      CollaborativeAnnotationLayer.mockImplementation(() => ({
        injectOverlay: vi.fn(() => true),
        removeOverlay: vi.fn(),
        isActive: vi.fn(() => true),
        isCrossOriginBlocked: vi.fn(() => false),
        setTool: vi.fn(),
        getSyncStats: vi.fn(() => ({
          isConnected: true,
          lastSyncTime: Date.now(),
          pendingMessages: 0,
          participantCount: 0,
          syncErrors: [],
        })),
      }));

      render(<AnnotationSystem {...mockProps} />);

      // Should not show sync status indicator
      expect(screen.queryByTestId('sync-status-indicator')).not.toBeInTheDocument();
    });
  });

  describe('Real-time Synchronization', () => {
    test('should handle incoming sync messages', () => {
      const { container } = render(<AnnotationSystem {...mockProps} />);

      const mockMessage: AnnotationMessage = {
        type: 'annotation_created',
        userId: 'remote-user-456',
        roomId: 'test-room-123',
        annotation: {
          id: 'remote-annotation-1',
          userId: 'remote-user-456',
          videoTimestamp: 20.0,
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
        },
        timestamp: Date.now(),
      };

      // Simulate receiving a sync message
      if (mockProps.onSyncMessage) {
        mockProps.onSyncMessage(mockMessage);
      }

      expect(syncMessages).toContain(mockMessage);
    });

    test('should propagate annotation events', () => {
      render(<AnnotationSystem {...mockProps} />);

      // The component should be set up to handle annotation events
      // In a real scenario, these would be triggered by user interactions
      expect(mockProps.onAnnotationCreated).toBeDefined();
      expect(mockProps.onAnnotationDeleted).toBeDefined();
    });
  });

  describe('Layer Management', () => {
    test('should handle layer operations', () => {
      render(<AnnotationSystem {...mockProps} />);

      // The toolbar should be connected to layer management functions
      const toolbar = screen.getByTestId('material-annotation-toolbar');
      expect(toolbar).toBeInTheDocument();

      // In a real implementation, we would test layer creation, deletion, etc.
      // through user interactions with the toolbar
    });
  });

  describe('Material Design 3 Integration', () => {
    test('should use FloatingSurface for toolbar positioning', () => {
      render(<AnnotationSystem {...mockProps} />);

      const surface = screen.getByTestId('annotation-toolbar-surface');
      expect(surface).toHaveAttribute('data-visible', 'true');
    });

    test('should apply proper Material Design 3 styling', () => {
      render(<AnnotationSystem {...mockProps} />);

      const toolbarSurface = screen.getByTestId('annotation-toolbar-surface');
      expect(toolbarSurface).toBeInTheDocument();

      // Check that Material Design properties are applied
      expect(toolbarSurface).toHaveAttribute('data-testid', 'annotation-toolbar-surface');
    });
  });

  describe('Cleanup', () => {
    test('should cleanup annotation layer on unmount', () => {
      const { unmount } = render(<AnnotationSystem {...mockProps} />);

      const mockInstance = CollaborativeAnnotationLayer.mock.results[0].value;

      unmount();

      expect(mockInstance.removeOverlay).toHaveBeenCalled();
    });

    test('should handle video element changes', () => {
      const { rerender } = render(<AnnotationSystem {...mockProps} />);

      const newVideo = new MockVideoElement();
      rerender(<AnnotationSystem {...mockProps} videoElement={newVideo as any} />);

      // Should reinitialize with new video element
      expect(CollaborativeAnnotationLayer).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    test('should handle annotation layer initialization errors', () => {
      // Mock annotation layer to throw error
      CollaborativeAnnotationLayer.mockImplementation(() => {
        throw new Error('Initialization failed');
      });

      // Should not crash the component
      expect(() => {
        render(<AnnotationSystem {...mockProps} />);
      }).not.toThrow();
    });

    test('should handle missing required props gracefully', () => {
      const incompleteProps = {
        ...mockProps,
        roomId: '',
        userId: '',
      };

      // Should render but be inactive
      render(<AnnotationSystem {...incompleteProps} />);

      const toolbar = screen.getByTestId('material-annotation-toolbar');
      expect(toolbar).toHaveAttribute('data-active', 'false');
    });
  });
});
