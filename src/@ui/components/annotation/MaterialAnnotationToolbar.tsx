/**
 * Material Design 3 Annotation Toolbar Component
 *
 * Provides Material Design 3 styled UI controls for annotation tools, layers, and actions
 * Implements collaborative annotation system with real-time synchronization
 */

import React, { useState, useCallback, useEffect } from 'react';
import { AnnotationType, DrawingTool } from '../../../@core/annotation-layer/types';
import { MaterialCard } from '../cards/MaterialCard';
import { MaterialButton } from '../cards/MaterialButton';
import { MaterialIcon } from '../cards/MaterialIcon';

export interface MaterialAnnotationToolbarProps {
  onToolChange: (tool: Partial<DrawingTool>) => void;
  onLayerChange: (layerId: string) => void;
  onLayerVisibilityToggle: (layerId: string, visible: boolean) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onCreateLayer: (name: string) => void;
  onDeleteLayer: (layerId: string) => void;
  canUndo?: boolean;
  canRedo?: boolean;
  isActive?: boolean;
  className?: string;
}

interface LayerInfo {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
}

export const MaterialAnnotationToolbar: React.FC<MaterialAnnotationToolbarProps> = ({
  onToolChange,
  onLayerChange,
  onLayerVisibilityToggle,
  onUndo,
  onRedo,
  onClear,
  onCreateLayer,
  onDeleteLayer,
  canUndo = false,
  canRedo = false,
  isActive = false,
  className = '',
}) => {
  const [currentTool, setCurrentTool] = useState<DrawingTool>({
    type: 'pen',
    color: '#6200EE', // Material Design 3 Primary color
    strokeWidth: 2,
    opacity: 1.0,
    fontSize: 16,
    fontFamily: 'Roboto, sans-serif',
  });

  const [layers, setLayers] = useState<LayerInfo[]>([
    { id: 'default', name: 'Default Layer', visible: true, locked: false },
  ]);

  const [currentLayerId, setCurrentLayerId] = useState('default');
  const [showLayerDialog, setShowLayerDialog] = useState(false);
  const [newLayerName, setNewLayerName] = useState('');

  // Tool definitions with Material Design 3 icons
  const tools: Array<{ type: AnnotationType; icon: string; label: string }> = [
    { type: 'pen', icon: 'edit', label: 'Pen Tool' },
    { type: 'rectangle', icon: 'crop_din', label: 'Rectangle' },
    { type: 'circle', icon: 'radio_button_unchecked', label: 'Circle' },
    { type: 'arrow', icon: 'arrow_forward', label: 'Arrow' },
    { type: 'text', icon: 'text_fields', label: 'Text' },
  ];

  // Color palette - Material Design 3 colors
  const colorPalette = [
    '#6200EE', // Primary
    '#03DAC6', // Secondary
    '#B00020', // Error
    '#000000', // Black
    '#FFFFFF', // White
    '#FF5722', // Deep Orange
    '#4CAF50', // Green
    '#2196F3', // Blue
    '#FF9800', // Orange
    '#9C27B0', // Purple
  ];

  const handleToolChange = useCallback(
    (type: AnnotationType) => {
      const newTool = { ...currentTool, type };
      setCurrentTool(newTool);
      onToolChange(newTool);
    },
    [currentTool, onToolChange]
  );

  const handleColorChange = useCallback(
    (color: string) => {
      const newTool = { ...currentTool, color };
      setCurrentTool(newTool);
      onToolChange(newTool);
    },
    [currentTool, onToolChange]
  );

  const handleStrokeWidthChange = useCallback(
    (strokeWidth: number) => {
      const newTool = { ...currentTool, strokeWidth };
      setCurrentTool(newTool);
      onToolChange(newTool);
    },
    [currentTool, onToolChange]
  );

  const handleOpacityChange = useCallback(
    (opacity: number) => {
      const newTool = { ...currentTool, opacity };
      setCurrentTool(newTool);
      onToolChange(newTool);
    },
    [currentTool, onToolChange]
  );

  const handleLayerSelect = useCallback(
    (layerId: string) => {
      setCurrentLayerId(layerId);
      onLayerChange(layerId);
    },
    [onLayerChange]
  );

  const handleCreateLayer = useCallback(() => {
    if (newLayerName.trim()) {
      const layerId = `layer_${Date.now()}`;
      const newLayer: LayerInfo = {
        id: layerId,
        name: newLayerName.trim(),
        visible: true,
        locked: false,
      };

      setLayers((prev) => [...prev, newLayer]);
      setCurrentLayerId(layerId);
      onCreateLayer(newLayerName.trim());
      onLayerChange(layerId);

      setNewLayerName('');
      setShowLayerDialog(false);
    }
  }, [newLayerName, onCreateLayer, onLayerChange]);

  const handleDeleteLayer = useCallback(
    (layerId: string) => {
      if (layerId === 'default') return;

      setLayers((prev) => prev.filter((layer) => layer.id !== layerId));

      if (currentLayerId === layerId) {
        setCurrentLayerId('default');
        onLayerChange('default');
      }

      onDeleteLayer(layerId);
    },
    [currentLayerId, onLayerChange, onDeleteLayer]
  );

  const handleLayerVisibilityToggle = useCallback(
    (layerId: string) => {
      setLayers((prev) =>
        prev.map((layer) => (layer.id === layerId ? { ...layer, visible: !layer.visible } : layer))
      );

      const layer = layers.find((l) => l.id === layerId);
      if (layer) {
        onLayerVisibilityToggle(layerId, !layer.visible);
      }
    },
    [layers, onLayerVisibilityToggle]
  );

  if (!isActive) {
    return (
      <MaterialCard
        className={`annotation-toolbar-inactive ${className}`}
        elevation="low"
        padding="md"
      >
        <div className="flex items-center justify-center text-center">
          <MaterialIcon name="info" size="medium" color="disabled" />
          <span className="ml-2 text-sm text-gray-500">
            Annotations unavailable - Cross-origin restrictions
          </span>
        </div>
      </MaterialCard>
    );
  }

  return (
    <div className={`annotation-toolbar ${className}`}>
      {/* Drawing Tools Card */}
      <MaterialCard elevation="low" padding="md" className="mb-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
          Drawing Tools
        </h3>
        <div className="grid grid-cols-5 gap-2">
          {tools.map((tool) => (
            <MaterialButton
              key={tool.type}
              variant={currentTool.type === tool.type ? 'filled' : 'outlined'}
              size="small"
              onClick={() => handleToolChange(tool.type)}
              className="aspect-square"
              data-testid={`tool-${tool.type}`}
            >
              <MaterialIcon name={tool.icon} size="small" />
            </MaterialButton>
          ))}
        </div>
      </MaterialCard>

      {/* Tool Properties Card */}
      <MaterialCard elevation="low" padding="md" className="mb-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
          Properties
        </h3>

        {/* Color Palette */}
        <div className="mb-4">
          <label className="block text-xs text-gray-600 mb-2">Color</label>
          <div className="grid grid-cols-5 gap-2">
            {colorPalette.map((color) => (
              <button
                key={color}
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  currentTool.color === color
                    ? 'border-gray-800 scale-110'
                    : 'border-gray-300 hover:border-gray-500'
                }`}
                style={{ backgroundColor: color }}
                onClick={() => handleColorChange(color)}
                data-testid={`color-${color}`}
              />
            ))}
          </div>
        </div>

        {/* Stroke Width */}
        <div className="mb-4">
          <label className="block text-xs text-gray-600 mb-2">
            Width: {currentTool.strokeWidth}px
          </label>
          <input
            type="range"
            min="1"
            max="20"
            value={currentTool.strokeWidth}
            onChange={(e) => handleStrokeWidthChange(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            data-testid="stroke-width-slider"
          />
        </div>

        {/* Opacity */}
        <div>
          <label className="block text-xs text-gray-600 mb-2">
            Opacity: {Math.round(currentTool.opacity * 100)}%
          </label>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.1"
            value={currentTool.opacity}
            onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            data-testid="opacity-slider"
          />
        </div>
      </MaterialCard>

      {/* Layers Card */}
      <MaterialCard elevation="low" padding="md" className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Layers</h3>
          <MaterialButton
            variant="text"
            size="small"
            onClick={() => setShowLayerDialog(true)}
            startIcon={<MaterialIcon name="add" size="small" />}
            data-testid="add-layer-btn"
          >
            Add
          </MaterialButton>
        </div>

        <div className="space-y-2 max-h-32 overflow-y-auto">
          {layers.map((layer) => (
            <div
              key={layer.id}
              className={`flex items-center p-2 rounded-lg cursor-pointer transition-colors ${
                currentLayerId === layer.id
                  ? 'bg-blue-50 border border-blue-200'
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => handleLayerSelect(layer.id)}
              data-testid={`layer-${layer.id}`}
            >
              <button
                className="mr-2"
                onClick={(e) => {
                  e.stopPropagation();
                  handleLayerVisibilityToggle(layer.id);
                }}
                data-testid={`layer-visibility-${layer.id}`}
              >
                <MaterialIcon
                  name={layer.visible ? 'visibility' : 'visibility_off'}
                  size="small"
                  color={layer.visible ? 'primary' : 'disabled'}
                />
              </button>

              <span className="flex-1 text-sm truncate">{layer.name}</span>

              {layer.id !== 'default' && (
                <button
                  className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteLayer(layer.id);
                  }}
                  data-testid={`delete-layer-${layer.id}`}
                >
                  <MaterialIcon name="delete" size="small" color="error" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Layer Creation Dialog */}
        {showLayerDialog && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <input
              type="text"
              placeholder="Layer name"
              value={newLayerName}
              onChange={(e) => setNewLayerName(e.target.value)}
              className="w-full p-2 text-sm border border-gray-300 rounded-md mb-2"
              onKeyPress={(e) => e.key === 'Enter' && handleCreateLayer()}
              data-testid="new-layer-input"
            />
            <div className="flex gap-2">
              <MaterialButton
                variant="filled"
                size="small"
                onClick={handleCreateLayer}
                disabled={!newLayerName.trim()}
                data-testid="create-layer-btn"
              >
                Create
              </MaterialButton>
              <MaterialButton
                variant="outlined"
                size="small"
                onClick={() => {
                  setShowLayerDialog(false);
                  setNewLayerName('');
                }}
                data-testid="cancel-layer-btn"
              >
                Cancel
              </MaterialButton>
            </div>
          </div>
        )}
      </MaterialCard>

      {/* Actions Card */}
      <MaterialCard elevation="low" padding="md">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
          Actions
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <MaterialButton
            variant="outlined"
            size="small"
            onClick={onUndo}
            disabled={!canUndo}
            startIcon={<MaterialIcon name="undo" size="small" />}
            data-testid="undo-btn"
          >
            Undo
          </MaterialButton>
          <MaterialButton
            variant="outlined"
            size="small"
            onClick={onRedo}
            disabled={!canRedo}
            startIcon={<MaterialIcon name="redo" size="small" />}
            data-testid="redo-btn"
          >
            Redo
          </MaterialButton>
        </div>
        <MaterialButton
          variant="outlined"
          size="small"
          color="error"
          onClick={onClear}
          startIcon={<MaterialIcon name="clear_all" size="small" />}
          className="w-full mt-2"
          data-testid="clear-all-btn"
        >
          Clear All
        </MaterialButton>
      </MaterialCard>
    </div>
  );
};

export default MaterialAnnotationToolbar;
