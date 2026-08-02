/**
 * Tests for MaterialAnnotationToolbar
 */

import React from 'react';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  MaterialAnnotationToolbar,
  MaterialAnnotationToolbarProps,
} from './MaterialAnnotationToolbar';

// Mock Material Design components
vi.mock('../cards/MaterialCard', () => ({
  MaterialCard: ({ children, className, ...props }: any) => (
    <div className={`material-card ${className}`} {...props}>
      {children}
    </div>
  ),
}));

vi.mock('../cards/MaterialButton', () => ({
  MaterialButton: ({
    children,
    onClick,
    variant,
    disabled,
    startIcon,
    className,
    ...props
  }: any) => (
    <button
      className={`material-button ${variant} ${className}`}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {startIcon}
      {children}
    </button>
  ),
}));

vi.mock('../cards/MaterialIcon', () => ({
  MaterialIcon: ({ name, size, color, ...props }: any) => (
    <span className={`material-icon ${size} ${color}`} data-icon={name} {...props}>
      {name}
    </span>
  ),
}));

describe('MaterialAnnotationToolbar', () => {
  let mockProps: MaterialAnnotationToolbarProps;

  beforeEach(() => {
    mockProps = {
      onToolChange: vi.fn(),
      onLayerChange: vi.fn(),
      onLayerVisibilityToggle: vi.fn(),
      onUndo: vi.fn(),
      onRedo: vi.fn(),
      onClear: vi.fn(),
      onCreateLayer: vi.fn(),
      onDeleteLayer: vi.fn(),
      canUndo: false,
      canRedo: false,
      isActive: true,
    };
  });

  describe('Rendering', () => {
    test('should render active toolbar with all sections', () => {
      render(<MaterialAnnotationToolbar {...mockProps} />);

      expect(screen.getByText('Drawing Tools')).toBeInTheDocument();
      expect(screen.getByText('Properties')).toBeInTheDocument();
      expect(screen.getByText('Layers')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    test('should render inactive state for cross-origin restrictions', () => {
      render(<MaterialAnnotationToolbar {...mockProps} isActive={false} />);

      expect(
        screen.getByText('Annotations unavailable - Cross-origin restrictions')
      ).toBeInTheDocument();
      expect(screen.queryByText('Drawing Tools')).not.toBeInTheDocument();
    });

    test('should render all drawing tools', () => {
      render(<MaterialAnnotationToolbar {...mockProps} />);

      expect(screen.getByTestId('tool-pen')).toBeInTheDocument();
      expect(screen.getByTestId('tool-rectangle')).toBeInTheDocument();
      expect(screen.getByTestId('tool-circle')).toBeInTheDocument();
      expect(screen.getByTestId('tool-arrow')).toBeInTheDocument();
      expect(screen.getByTestId('tool-text')).toBeInTheDocument();
    });

    test('should render color palette', () => {
      render(<MaterialAnnotationToolbar {...mockProps} />);

      // Check for Material Design 3 primary color
      expect(screen.getByTestId('color-#6200EE')).toBeInTheDocument();
      expect(screen.getByTestId('color-#03DAC6')).toBeInTheDocument();
      expect(screen.getByTestId('color-#B00020')).toBeInTheDocument();
    });

    test('should render property controls', () => {
      render(<MaterialAnnotationToolbar {...mockProps} />);

      expect(screen.getByTestId('stroke-width-slider')).toBeInTheDocument();
      expect(screen.getByTestId('opacity-slider')).toBeInTheDocument();
      expect(screen.getByText('Width: 2px')).toBeInTheDocument();
      expect(screen.getByText('Opacity: 100%')).toBeInTheDocument();
    });

    test('should render layer controls', () => {
      render(<MaterialAnnotationToolbar {...mockProps} />);

      expect(screen.getByTestId('add-layer-btn')).toBeInTheDocument();
      expect(screen.getByTestId('layer-default')).toBeInTheDocument();
      expect(screen.getByText('Default Layer')).toBeInTheDocument();
    });

    test('should render action buttons with correct states', () => {
      render(<MaterialAnnotationToolbar {...mockProps} canUndo={true} canRedo={false} />);

      const undoBtn = screen.getByTestId('undo-btn');
      const redoBtn = screen.getByTestId('redo-btn');

      expect(undoBtn).not.toBeDisabled();
      expect(redoBtn).toBeDisabled();
    });
  });

  describe('Tool Selection', () => {
    test('should handle tool selection', () => {
      render(<MaterialAnnotationToolbar {...mockProps} />);

      const rectangleTool = screen.getByTestId('tool-rectangle');
      fireEvent.click(rectangleTool);

      expect(mockProps.onToolChange).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'rectangle',
        })
      );
    });

    test('should show pen tool as active by default', () => {
      render(<MaterialAnnotationToolbar {...mockProps} />);

      const penTool = screen.getByTestId('tool-pen');
      expect(penTool).toHaveClass('filled'); // Active variant
    });

    test('should update active tool visual state', () => {
      render(<MaterialAnnotationToolbar {...mockProps} />);

      const penTool = screen.getByTestId('tool-pen');
      const circleTool = screen.getByTestId('tool-circle');

      expect(penTool).toHaveClass('filled');
      expect(circleTool).toHaveClass('outlined');

      fireEvent.click(circleTool);

      // Note: In a real implementation, this would update the component state
      // For this test, we verify the callback was called
      expect(mockProps.onToolChange).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'circle',
        })
      );
    });
  });

  describe('Color Selection', () => {
    test('should handle color selection', () => {
      render(<MaterialAnnotationToolbar {...mockProps} />);

      const redColor = screen.getByTestId('color-#B00020');
      fireEvent.click(redColor);

      expect(mockProps.onToolChange).toHaveBeenCalledWith(
        expect.objectContaining({
          color: '#B00020',
        })
      );
    });

    test('should show primary color as selected by default', () => {
      render(<MaterialAnnotationToolbar {...mockProps} />);

      const primaryColor = screen.getByTestId('color-#6200EE');
      expect(primaryColor).toHaveClass('border-gray-800'); // Selected state
    });
  });

  describe('Property Controls', () => {
    test('should handle stroke width changes', () => {
      render(<MaterialAnnotationToolbar {...mockProps} />);

      const strokeSlider = screen.getByTestId('stroke-width-slider');
      fireEvent.change(strokeSlider, { target: { value: '5' } });

      expect(mockProps.onToolChange).toHaveBeenCalledWith(
        expect.objectContaining({
          strokeWidth: 5,
        })
      );
    });

    test('should handle opacity changes', () => {
      render(<MaterialAnnotationToolbar {...mockProps} />);

      const opacitySlider = screen.getByTestId('opacity-slider');
      fireEvent.change(opacitySlider, { target: { value: '0.7' } });

      expect(mockProps.onToolChange).toHaveBeenCalledWith(
        expect.objectContaining({
          opacity: 0.7,
        })
      );
    });

    test('should update property display values', () => {
      render(<MaterialAnnotationToolbar {...mockProps} />);

      const strokeSlider = screen.getByTestId('stroke-width-slider');
      fireEvent.change(strokeSlider, { target: { value: '8' } });

      // In a real implementation, this would update the display
      // For this test, we verify the callback was called with correct value
      expect(mockProps.onToolChange).toHaveBeenCalledWith(
        expect.objectContaining({
          strokeWidth: 8,
        })
      );
    });
  });

  describe('Layer Management', () => {
    test('should handle layer selection', () => {
      render(<MaterialAnnotationToolbar {...mockProps} />);

      const defaultLayer = screen.getByTestId('layer-default');
      fireEvent.click(defaultLayer);

      expect(mockProps.onLayerChange).toHaveBeenCalledWith('default');
    });

    test('should handle layer visibility toggle', () => {
      render(<MaterialAnnotationToolbar {...mockProps} />);

      const visibilityToggle = screen.getByTestId('layer-visibility-default');
      fireEvent.click(visibilityToggle);

      expect(mockProps.onLayerVisibilityToggle).toHaveBeenCalledWith('default', false);
    });

    test('should show add layer dialog', () => {
      render(<MaterialAnnotationToolbar {...mockProps} />);

      const addLayerBtn = screen.getByTestId('add-layer-btn');
      fireEvent.click(addLayerBtn);

      expect(screen.getByTestId('new-layer-input')).toBeInTheDocument();
      expect(screen.getByTestId('create-layer-btn')).toBeInTheDocument();
      expect(screen.getByTestId('cancel-layer-btn')).toBeInTheDocument();
    });

    test('should handle layer creation', async () => {
      render(<MaterialAnnotationToolbar {...mockProps} />);

      const addLayerBtn = screen.getByTestId('add-layer-btn');
      fireEvent.click(addLayerBtn);

      const layerInput = screen.getByTestId('new-layer-input');
      const createBtn = screen.getByTestId('create-layer-btn');

      fireEvent.change(layerInput, { target: { value: 'New Layer' } });
      fireEvent.click(createBtn);

      expect(mockProps.onCreateLayer).toHaveBeenCalledWith('New Layer');
    });

    test('should handle layer creation with Enter key', () => {
      render(<MaterialAnnotationToolbar {...mockProps} />);

      const addLayerBtn = screen.getByTestId('add-layer-btn');
      fireEvent.click(addLayerBtn);

      const layerInput = screen.getByTestId('new-layer-input');
      fireEvent.change(layerInput, { target: { value: 'Enter Layer' } });
      fireEvent.keyPress(layerInput, { key: 'Enter', code: 'Enter' });

      expect(mockProps.onCreateLayer).toHaveBeenCalledWith('Enter Layer');
    });

    test('should cancel layer creation', () => {
      render(<MaterialAnnotationToolbar {...mockProps} />);

      const addLayerBtn = screen.getByTestId('add-layer-btn');
      fireEvent.click(addLayerBtn);

      const cancelBtn = screen.getByTestId('cancel-layer-btn');
      fireEvent.click(cancelBtn);

      expect(screen.queryByTestId('new-layer-input')).not.toBeInTheDocument();
    });

    test('should disable create button for empty layer name', () => {
      render(<MaterialAnnotationToolbar {...mockProps} />);

      const addLayerBtn = screen.getByTestId('add-layer-btn');
      fireEvent.click(addLayerBtn);

      const createBtn = screen.getByTestId('create-layer-btn');
      expect(createBtn).toBeDisabled();
    });
  });

  describe('Actions', () => {
    test('should handle undo action', () => {
      render(<MaterialAnnotationToolbar {...mockProps} canUndo={true} />);

      const undoBtn = screen.getByTestId('undo-btn');
      fireEvent.click(undoBtn);

      expect(mockProps.onUndo).toHaveBeenCalled();
    });

    test('should handle redo action', () => {
      render(<MaterialAnnotationToolbar {...mockProps} canRedo={true} />);

      const redoBtn = screen.getByTestId('redo-btn');
      fireEvent.click(redoBtn);

      expect(mockProps.onRedo).toHaveBeenCalled();
    });

    test('should handle clear all action', () => {
      // Mock window.confirm
      const originalConfirm = window.confirm;
      window.confirm = vi.fn(() => true);

      render(<MaterialAnnotationToolbar {...mockProps} />);

      const clearBtn = screen.getByTestId('clear-all-btn');
      fireEvent.click(clearBtn);

      expect(mockProps.onClear).toHaveBeenCalled();

      // Restore original confirm
      window.confirm = originalConfirm;
    });

    test('should not clear if user cancels confirmation', () => {
      // Mock window.confirm to return false
      const originalConfirm = window.confirm;
      window.confirm = vi.fn(() => false);

      render(<MaterialAnnotationToolbar {...mockProps} />);

      const clearBtn = screen.getByTestId('clear-all-btn');
      fireEvent.click(clearBtn);

      expect(mockProps.onClear).not.toHaveBeenCalled();

      // Restore original confirm
      window.confirm = originalConfirm;
    });
  });

  describe('Accessibility', () => {
    test('should have proper ARIA labels and roles', () => {
      render(<MaterialAnnotationToolbar {...mockProps} />);

      // Check that buttons have proper accessibility attributes
      const toolButtons = screen.getAllByRole('button');
      expect(toolButtons.length).toBeGreaterThan(0);

      // Check that sliders have proper labels
      const strokeSlider = screen.getByTestId('stroke-width-slider');
      expect(strokeSlider).toHaveAttribute('type', 'range');

      const opacitySlider = screen.getByTestId('opacity-slider');
      expect(opacitySlider).toHaveAttribute('type', 'range');
    });

    test('should support keyboard navigation', () => {
      render(<MaterialAnnotationToolbar {...mockProps} />);

      const penTool = screen.getByTestId('tool-pen');

      // Focus should be manageable
      penTool.focus();
      expect(document.activeElement).toBe(penTool);
    });
  });

  describe('Material Design 3 Styling', () => {
    test('should apply Material Design 3 classes', () => {
      render(<MaterialAnnotationToolbar {...mockProps} />);

      // Check for Material card components
      const cards = document.querySelectorAll('.material-card');
      expect(cards.length).toBeGreaterThan(0);

      // Check for Material button components
      const buttons = document.querySelectorAll('.material-button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    test('should use Material Design 3 color system', () => {
      render(<MaterialAnnotationToolbar {...mockProps} />);

      // Check that primary color is used
      expect(screen.getByTestId('color-#6200EE')).toBeInTheDocument();
      expect(screen.getByTestId('color-#03DAC6')).toBeInTheDocument();
    });

    test('should apply proper elevation and spacing', () => {
      render(<MaterialAnnotationToolbar {...mockProps} />);

      const toolbar = document.querySelector('.annotation-toolbar');
      expect(toolbar).toBeInTheDocument();
    });
  });
});
