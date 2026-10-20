/**
 * Annotation System Integration Component
 *
 * Integrates the collaborative annotation layer with Material Design 3 UI
 * Handles real-time synchronization and cross-origin restrictions
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  CollaborativeAnnotationLayer,
  CollaborativeAnnotationOptions,
} from '../../../@core/annotation-layer/collaborative-annotation-layer';
import { MaterialAnnotationToolbar } from './MaterialAnnotationToolbar';
import { AnnotationMessage, DrawingTool, Annotation } from '../../../@core/annotation-layer/types';
import FloatingSurface from '../overlays/FloatingSurface';

export interface AnnotationSystemProps {
  videoElement?: HTMLVideoElement;
  roomId: string;
  userId: string;
  userName: string;
  isVisible?: boolean;
  onSyncMessage?: (message: AnnotationMessage) => void;
  onAnnotationCreated?: (annotation: Annotation) => void;
  onAnnotationDeleted?: (annotationId: string) => void;
  onCrossOriginBlocked?: () => void;
  className?: string;
}

export const AnnotationSystem: React.FC<AnnotationSystemProps> = ({
  videoElement,
  roomId,
  userId,
  userName,
  isVisible = true,
  onSyncMessage,
  onAnnotationCreated,
  onAnnotationDeleted,
  onCrossOriginBlocked,
  className = '',
}) => {
  const [annotationLayer, setAnnotationLayer] = useState<CollaborativeAnnotationLayer | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isCrossOriginBlocked, setIsCrossOriginBlocked] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [syncStats, setSyncStats] = useState({
    isConnected: false,
    lastSyncTime: 0,
    pendingMessages: 0,
    participantCount: 0,
    syncErrors: [] as string[],
  });

  const layerRef = useRef<CollaborativeAnnotationLayer | null>(null);

  // Stable refs for callbacks to avoid effect re-fires
  const onSyncMessageRef = useRef(onSyncMessage);
  const onAnnotationCreatedRef = useRef(onAnnotationCreated);
  const onAnnotationDeletedRef = useRef(onAnnotationDeleted);
  const onCrossOriginBlockedRef = useRef(onCrossOriginBlocked);

  useEffect(() => {
    onSyncMessageRef.current = onSyncMessage;
    onAnnotationCreatedRef.current = onAnnotationCreated;
    onAnnotationDeletedRef.current = onAnnotationDeleted;
    onCrossOriginBlockedRef.current = onCrossOriginBlocked;
  });

  // Initialize annotation layer
  useEffect(() => {
    if (!videoElement || !roomId || !userId) return;

    const options: CollaborativeAnnotationOptions = {
      roomId,
      userId,
      userName,
      renderIntervalMs: 33, // 30fps
      maxAnnotationsPerLayer: 100,
      maxLayers: 10,
      syncIntervalMs: 100, // 10fps sync
      maxSyncRetries: 3,
      onAnnotationCreated: (annotation: Annotation) => {
        onAnnotationCreatedRef.current?.(annotation);
        updateUndoRedoState();
      },
      onAnnotationDeleted: (annotationId: string) => {
        onAnnotationDeletedRef.current?.(annotationId);
        updateUndoRedoState();
      },
      onSyncMessage: (message: AnnotationMessage) => {
        onSyncMessageRef.current?.(message);
      },
      onCrossOriginBlocked: () => {
        setIsCrossOriginBlocked(true);
        onCrossOriginBlockedRef.current?.();
      },
    };

    let layer: CollaborativeAnnotationLayer;
    try {
      layer = new CollaborativeAnnotationLayer(options);
    } catch (error) {
      console.error('Failed to initialize annotation layer:', error);
      return;
    }

    layerRef.current = layer;
    setAnnotationLayer(layer);

    // Try to inject overlay
    const success = layer.injectOverlay(videoElement);
    setIsActive(success);
    const blocked = !success && layer.isCrossOriginBlocked();
    setIsCrossOriginBlocked(blocked);

    // Populate sync stats immediately so the UI reflects current state
    setSyncStats(layer.getSyncStats());

    // Notify parent when cross-origin is detected
    if (blocked) {
      onCrossOriginBlockedRef.current?.();
    }

    // Start sync stats monitoring
    const statsInterval = setInterval(() => {
      if (layer) {
        setSyncStats(layer.getSyncStats());
      }
    }, 1000);

    return () => {
      clearInterval(statsInterval);
      layer.removeOverlay();
      layerRef.current = null;
      setAnnotationLayer(null);
    };
  }, [videoElement, roomId, userId, userName]);

  // Update undo/redo state
  const updateUndoRedoState = useCallback(() => {
    if (!layerRef.current) return;

    // Check if undo/redo is available (simplified check)
    const layer = layerRef.current as CollaborativeAnnotationLayer & {
      state?: { undoStack: unknown[]; redoStack: unknown[] };
    };
    const undoStack = layer.state?.undoStack || [];
    const redoStack = layer.state?.redoStack || [];

    setCanUndo(undoStack.length > 0);
    setCanRedo(redoStack.length > 0);
  }, []);

  // Handle tool changes
  const handleToolChange = useCallback((tool: Partial<DrawingTool>) => {
    if (layerRef.current) {
      layerRef.current.setTool(tool);
    }
  }, []);

  // Handle layer changes
  const handleLayerChange = useCallback((layerId: string) => {
    if (layerRef.current) {
      layerRef.current.setCurrentLayer(layerId);
    }
  }, []);

  // Handle layer visibility toggle
  const handleLayerVisibilityToggle = useCallback((layerId: string, visible: boolean) => {
    if (layerRef.current) {
      layerRef.current.setLayerVisibility(layerId, visible);
    }
  }, []);

  // Handle undo
  const handleUndo = useCallback(() => {
    if (layerRef.current) {
      const success = layerRef.current.undo();
      if (success) {
        updateUndoRedoState();
      }
    }
  }, [updateUndoRedoState]);

  // Handle redo
  const handleRedo = useCallback(() => {
    if (layerRef.current) {
      const success = layerRef.current.redo();
      if (success) {
        updateUndoRedoState();
      }
    }
  }, [updateUndoRedoState]);

  // Handle clear all
  const handleClear = useCallback(() => {
    if (layerRef.current && window.confirm('Are you sure you want to clear all annotations?')) {
      layerRef.current.clearAllAnnotations();
      updateUndoRedoState();
    }
  }, [updateUndoRedoState]);

  // Handle create layer
  const handleCreateLayer = useCallback(
    (name: string) => {
      if (layerRef.current) {
        const layerId = `layer_${Date.now()}`;
        const success = layerRef.current.createLayer(layerId, name);
        if (success) {
          layerRef.current.setCurrentLayer(layerId);
          updateUndoRedoState();
        }
      }
    },
    [updateUndoRedoState]
  );

  // Handle delete layer
  const handleDeleteLayer = useCallback(
    (layerId: string) => {
      if (annotationLayer && window.confirm('Are you sure you want to delete this layer?')) {
        const success = annotationLayer.deleteLayer(layerId);
        if (success) {
          updateUndoRedoState();
        }
      }
    },
    [annotationLayer, updateUndoRedoState]
  );

  // Expose method to handle incoming messages
  React.useImperativeHandle<
    CollaborativeAnnotationLayer | null,
    CollaborativeAnnotationLayer | null
  >(layerRef, () => annotationLayer);

  if (!isVisible) {
    return null;
  }

  return (
    <div className={`annotation-system ${className}`}>
      <FloatingSurface
        position="top-right"
        offset={{ x: 20, y: 20 }}
        elevation="medium"
        opacity={0.95}
        borderRadius="md"
        padding="sm"
        maxWidth={280}
        maxHeight={600}
        visible={isVisible}
        animationType="slide"
        data-testid="annotation-toolbar-surface"
      >
        <MaterialAnnotationToolbar
          onToolChange={handleToolChange}
          onLayerChange={handleLayerChange}
          onLayerVisibilityToggle={handleLayerVisibilityToggle}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onClear={handleClear}
          onCreateLayer={handleCreateLayer}
          onDeleteLayer={handleDeleteLayer}
          canUndo={canUndo}
          canRedo={canRedo}
          isActive={isActive && !isCrossOriginBlocked}
          data-testid="annotation-toolbar"
        />
      </FloatingSurface>

      {/* Sync Status Indicator */}
      {isActive && !isCrossOriginBlocked && (
        <FloatingSurface
          position="bottom-right"
          offset={{ x: 20, y: 20 }}
          elevation="low"
          opacity={0.9}
          borderRadius="sm"
          padding="sm"
          visible={syncStats.participantCount > 0 || syncStats.syncErrors.length > 0}
          animationType="fade"
          data-testid="sync-status-indicator"
        >
          <div className="text-xs text-gray-600">
            {syncStats.isConnected ? (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>
                  {syncStats.participantCount} participant
                  {syncStats.participantCount !== 1 ? 's' : ''}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span>Disconnected</span>
              </div>
            )}

            {syncStats.syncErrors.length > 0 && (
              <div className="mt-1 text-red-600">
                {syncStats.syncErrors.length} sync error
                {syncStats.syncErrors.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </FloatingSurface>
      )}

      {/* Cross-origin blocked message is handled by the annotation layer itself */}
    </div>
  );
};

export default AnnotationSystem;

// Export ref type for parent components
export interface AnnotationSystemRef {
  handleSyncMessage: (message: AnnotationMessage) => void;
  getAnnotationLayer: () => CollaborativeAnnotationLayer | null;
  getSyncStats: () => {
    isConnected: boolean;
    lastSyncTime: number;
    pendingMessages: number;
    participantCount: number;
    syncErrors: string[];
  };
}
