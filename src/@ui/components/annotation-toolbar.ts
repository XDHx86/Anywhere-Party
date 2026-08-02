/**
 * Annotation Toolbar Component
 *
 * Provides UI controls for annotation tools, layers, and actions
 */

import { AnnotationType, DrawingTool } from '../../@core/annotation-layer/types';

export interface AnnotationToolbarOptions {
  onToolChange: (tool: Partial<DrawingTool>) => void;
  onLayerChange: (layerId: string) => void;
  onLayerVisibilityToggle: (layerId: string, visible: boolean) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onCreateLayer: (name: string) => void;
  onDeleteLayer: (layerId: string) => void;
}

export class AnnotationToolbar {
  private container: HTMLElement;
  private options: AnnotationToolbarOptions;
  private currentTool: DrawingTool;
  private layers: Map<string, { name: string; visible: boolean }> = new Map();
  private currentLayerId = 'default';

  constructor(container: HTMLElement, options: AnnotationToolbarOptions) {
    this.container = container;
    this.options = options;
    this.currentTool = {
      type: 'pen',
      color: '#ff0000',
      strokeWidth: 2,
      opacity: 1.0,
    };

    // Add default layer
    this.layers.set('default', { name: 'Default Layer', visible: true });

    this.render();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="annotation-toolbar">
        <div class="toolbar-section">
          <h4>Drawing Tools</h4>
          <div class="tool-buttons">
            <button class="tool-btn active" data-tool="pen" title="Pen Tool">
              <svg width="16" height="16" viewBox="0 0 16 16">
                <path d="M13.5 0a2.5 2.5 0 0 1 2.5 2.5c0 .6-.2 1.2-.6 1.6L4.9 14.6c-.4.4-1 .6-1.6.6H1a1 1 0 0 1-1-1v-2.3c0-.6.2-1.2.6-1.6L11.1.8c.4-.4 1-.6 1.6-.6h.8z"/>
              </svg>
            </button>
            <button class="tool-btn" data-tool="rectangle" title="Rectangle Tool">
              <svg width="16" height="16" viewBox="0 0 16 16">
                <rect x="2" y="2" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"/>
              </svg>
            </button>
            <button class="tool-btn" data-tool="circle" title="Circle Tool">
              <svg width="16" height="16" viewBox="0 0 16 16">
                <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="2"/>
              </svg>
            </button>
            <button class="tool-btn" data-tool="arrow" title="Arrow Tool">
              <svg width="16" height="16" viewBox="0 0 16 16">
                <path d="M2 8h10m-4-4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="2"/>
              </svg>
            </button>
            <button class="tool-btn" data-tool="text" title="Text Tool">
              <svg width="16" height="16" viewBox="0 0 16 16">
                <path d="M4 2h8v2H9v10H7V4H4V2z"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="toolbar-section">
          <h4>Tool Properties</h4>
          <div class="tool-properties">
            <div class="property-group">
              <label for="color-picker">Color:</label>
              <input type="color" id="color-picker" value="#ff0000">
            </div>
            <div class="property-group">
              <label for="stroke-width">Width:</label>
              <input type="range" id="stroke-width" min="1" max="10" value="2">
              <span class="value-display">2</span>
            </div>
            <div class="property-group">
              <label for="opacity">Opacity:</label>
              <input type="range" id="opacity" min="0.1" max="1" step="0.1" value="1">
              <span class="value-display">100%</span>
            </div>
          </div>
        </div>

        <div class="toolbar-section">
          <h4>Layers</h4>
          <div class="layer-controls">
            <div class="layer-list" id="layer-list">
              <!-- Layers will be populated here -->
            </div>
            <div class="layer-actions">
              <button id="add-layer-btn" class="action-btn">Add Layer</button>
              <button id="delete-layer-btn" class="action-btn" disabled>Delete Layer</button>
            </div>
          </div>
        </div>

        <div class="toolbar-section">
          <h4>Actions</h4>
          <div class="action-buttons">
            <button id="undo-btn" class="action-btn" title="Undo (Ctrl+Z)">Undo</button>
            <button id="redo-btn" class="action-btn" title="Redo (Ctrl+Y)">Redo</button>
            <button id="clear-btn" class="action-btn danger" title="Clear All">Clear All</button>
          </div>
        </div>
      </div>
    `;

    this.addStyles();
    this.attachEventListeners();
    this.updateLayerList();
  }

  private addStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .annotation-toolbar {
        padding: 16px;
        background: #f5f5f5;
        border-radius: 8px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
      }

      .toolbar-section {
        margin-bottom: 20px;
      }

      .toolbar-section h4 {
        margin: 0 0 8px 0;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        color: #666;
      }

      .tool-buttons {
        display: flex;
        gap: 4px;
        flex-wrap: wrap;
      }

      .tool-btn {
        width: 32px;
        height: 32px;
        border: 1px solid #ddd;
        background: white;
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
      }

      .tool-btn:hover {
        background: #f0f0f0;
        border-color: #ccc;
      }

      .tool-btn.active {
        background: #007bff;
        border-color: #007bff;
        color: white;
      }

      .tool-properties {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .property-group {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .property-group label {
        min-width: 50px;
        font-size: 12px;
        color: #666;
      }

      .property-group input[type="color"] {
        width: 32px;
        height: 24px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      }

      .property-group input[type="range"] {
        flex: 1;
        min-width: 80px;
      }

      .value-display {
        min-width: 30px;
        font-size: 12px;
        color: #666;
        text-align: right;
      }

      .layer-list {
        max-height: 120px;
        overflow-y: auto;
        border: 1px solid #ddd;
        border-radius: 4px;
        background: white;
      }

      .layer-item {
        display: flex;
        align-items: center;
        padding: 8px;
        border-bottom: 1px solid #eee;
        cursor: pointer;
        transition: background 0.2s;
      }

      .layer-item:last-child {
        border-bottom: none;
      }

      .layer-item:hover {
        background: #f8f9fa;
      }

      .layer-item.active {
        background: #e3f2fd;
      }

      .layer-visibility {
        width: 16px;
        height: 16px;
        margin-right: 8px;
        cursor: pointer;
      }

      .layer-name {
        flex: 1;
        font-size: 12px;
      }

      .layer-actions {
        display: flex;
        gap: 8px;
        margin-top: 8px;
      }

      .action-buttons {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .action-btn {
        padding: 6px 12px;
        border: 1px solid #ddd;
        background: white;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        transition: all 0.2s;
      }

      .action-btn:hover {
        background: #f0f0f0;
        border-color: #ccc;
      }

      .action-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .action-btn.danger {
        color: #dc3545;
        border-color: #dc3545;
      }

      .action-btn.danger:hover {
        background: #dc3545;
        color: white;
      }
    `;

    document.head.appendChild(style);
  }

  private attachEventListeners(): void {
    // Tool selection
    this.container.querySelectorAll('.tool-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const tool = target.dataset.tool as AnnotationType;

        // Update active state
        this.container.querySelectorAll('.tool-btn').forEach((b) => b.classList.remove('active'));
        target.classList.add('active');

        // Update current tool
        this.currentTool.type = tool;
        this.options.onToolChange(this.currentTool);
      });
    });

    // Color picker
    const colorPicker = this.container.querySelector('#color-picker') as HTMLInputElement;
    colorPicker.addEventListener('change', (e) => {
      this.currentTool.color = (e.target as HTMLInputElement).value;
      this.options.onToolChange(this.currentTool);
    });

    // Stroke width
    const strokeWidth = this.container.querySelector('#stroke-width') as HTMLInputElement;
    const strokeWidthDisplay = strokeWidth.nextElementSibling as HTMLElement;
    strokeWidth.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      this.currentTool.strokeWidth = value;
      strokeWidthDisplay.textContent = value.toString();
      this.options.onToolChange(this.currentTool);
    });

    // Opacity
    const opacity = this.container.querySelector('#opacity') as HTMLInputElement;
    const opacityDisplay = opacity.nextElementSibling as HTMLElement;
    opacity.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.currentTool.opacity = value;
      opacityDisplay.textContent = Math.round(value * 100) + '%';
      this.options.onToolChange(this.currentTool);
    });

    // Layer actions
    this.container.querySelector('#add-layer-btn')?.addEventListener('click', () => {
      const name = prompt('Enter layer name:');
      if (name && name.trim()) {
        this.options.onCreateLayer(name.trim());
      }
    });

    this.container.querySelector('#delete-layer-btn')?.addEventListener('click', () => {
      if (this.currentLayerId !== 'default') {
        if (confirm('Are you sure you want to delete this layer?')) {
          this.options.onDeleteLayer(this.currentLayerId);
        }
      }
    });

    // Action buttons
    this.container.querySelector('#undo-btn')?.addEventListener('click', () => {
      this.options.onUndo();
    });

    this.container.querySelector('#redo-btn')?.addEventListener('click', () => {
      this.options.onRedo();
    });

    this.container.querySelector('#clear-btn')?.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear all annotations?')) {
        this.options.onClear();
      }
    });
  }

  private updateLayerList(): void {
    const layerList = this.container.querySelector('#layer-list');
    if (!layerList) return;

    layerList.innerHTML = '';

    this.layers.forEach((layer, layerId) => {
      const layerItem = document.createElement('div');
      layerItem.className = `layer-item ${layerId === this.currentLayerId ? 'active' : ''}`;

      layerItem.innerHTML = `
        <input type="checkbox" class="layer-visibility" ${layer.visible ? 'checked' : ''}>
        <span class="layer-name">${layer.name}</span>
      `;

      // Layer selection
      layerItem.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).classList.contains('layer-visibility')) {
          return; // Handle visibility toggle separately
        }

        this.currentLayerId = layerId;
        this.updateLayerList();
        this.options.onLayerChange(layerId);

        // Update delete button state
        const deleteBtn = this.container.querySelector('#delete-layer-btn') as HTMLButtonElement;
        deleteBtn.disabled = layerId === 'default';
      });

      // Visibility toggle
      const visibilityCheckbox = layerItem.querySelector('.layer-visibility') as HTMLInputElement;
      visibilityCheckbox.addEventListener('change', (e) => {
        e.stopPropagation();
        const visible = (e.target as HTMLInputElement).checked;
        layer.visible = visible;
        this.options.onLayerVisibilityToggle(layerId, visible);
      });

      layerList.appendChild(layerItem);
    });
  }

  public addLayer(layerId: string, name: string): void {
    this.layers.set(layerId, { name, visible: true });
    this.updateLayerList();
  }

  public removeLayer(layerId: string): void {
    if (layerId === 'default') return;

    this.layers.delete(layerId);

    if (this.currentLayerId === layerId) {
      this.currentLayerId = 'default';
    }

    this.updateLayerList();
  }

  public setLayerVisibility(layerId: string, visible: boolean): void {
    const layer = this.layers.get(layerId);
    if (layer) {
      layer.visible = visible;
      this.updateLayerList();
    }
  }

  public getCurrentTool(): DrawingTool {
    return { ...this.currentTool };
  }

  public getCurrentLayer(): string {
    return this.currentLayerId;
  }
}
