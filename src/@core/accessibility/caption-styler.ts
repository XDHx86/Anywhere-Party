/**
 * Caption Styler
 *
 * Provides customizable caption styling options for accessibility
 */

export interface CaptionStyle {
  fontSize: number;
  fontFamily: string;
  fontWeight: 'normal' | 'bold';
  color: string;
  backgroundColor: string;
  outlineColor: string;
  outlineWidth: number;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  position: 'top' | 'center' | 'bottom';
  alignment: 'left' | 'center' | 'right';
  opacity: number;
  lineHeight: number;
  maxWidth: number;
  marginBottom: number;
  borderRadius: number;
  padding: number;
  letterSpacing: number;
  wordSpacing: number;
}

export interface CaptionPreset {
  name: string;
  description: string;
  style: CaptionStyle;
}

export class CaptionStyler {
  private currentStyle: CaptionStyle;
  private presets: Map<string, CaptionPreset> = new Map();
  private styleElement: HTMLStyleElement | null = null;

  constructor() {
    this.currentStyle = this.getDefaultStyle();
    this.setupDefaultPresets();
    this.createStyleElement();
  }

  /**
   * Get default caption style
   */
  private getDefaultStyle(): CaptionStyle {
    return {
      fontSize: 16,
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'normal',
      color: '#ffffff',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      outlineColor: '#000000',
      outlineWidth: 1,
      shadowColor: 'rgba(0, 0, 0, 0.5)',
      shadowBlur: 2,
      shadowOffsetX: 1,
      shadowOffsetY: 1,
      position: 'bottom',
      alignment: 'center',
      opacity: 1,
      lineHeight: 1.4,
      maxWidth: 80,
      marginBottom: 20,
      borderRadius: 4,
      padding: 8,
      letterSpacing: 0,
      wordSpacing: 0,
    };
  }

  /**
   * Setup default presets
   */
  private setupDefaultPresets(): void {
    // Default preset
    this.presets.set('default', {
      name: 'Default',
      description: 'Standard caption styling',
      style: this.getDefaultStyle(),
    });

    // High contrast preset
    this.presets.set('high-contrast', {
      name: 'High Contrast',
      description: 'High contrast for better visibility',
      style: {
        ...this.getDefaultStyle(),
        fontSize: 18,
        fontWeight: 'bold',
        color: '#ffffff',
        backgroundColor: '#000000',
        outlineColor: '#ffffff',
        outlineWidth: 2,
        shadowBlur: 0,
      },
    });

    // Large text preset
    this.presets.set('large-text', {
      name: 'Large Text',
      description: 'Larger text for better readability',
      style: {
        ...this.getDefaultStyle(),
        fontSize: 24,
        fontWeight: 'bold',
        lineHeight: 1.5,
        padding: 12,
      },
    });

    // Minimal preset
    this.presets.set('minimal', {
      name: 'Minimal',
      description: 'Clean, minimal styling',
      style: {
        ...this.getDefaultStyle(),
        backgroundColor: 'transparent',
        outlineColor: '#000000',
        outlineWidth: 2,
        shadowBlur: 4,
        shadowOffsetX: 2,
        shadowOffsetY: 2,
      },
    });

    // Colorful preset
    this.presets.set('colorful', {
      name: 'Colorful',
      description: 'Bright, colorful styling',
      style: {
        ...this.getDefaultStyle(),
        color: '#ffff00',
        backgroundColor: 'rgba(128, 0, 128, 0.9)',
        outlineColor: '#ffffff',
        outlineWidth: 1,
        borderRadius: 8,
      },
    });

    // Dyslexia-friendly preset
    this.presets.set('dyslexia-friendly', {
      name: 'Dyslexia Friendly',
      description: 'Optimized for dyslexic users',
      style: {
        ...this.getDefaultStyle(),
        fontFamily: 'OpenDyslexic, Arial, sans-serif',
        fontSize: 18,
        letterSpacing: 1,
        wordSpacing: 2,
        lineHeight: 1.6,
        color: '#000000',
        backgroundColor: 'rgba(255, 255, 204, 0.95)',
      },
    });
  }

  /**
   * Create style element for caption styling
   */
  private createStyleElement(): void {
    this.styleElement = document.createElement('style');
    this.styleElement.id = 'caption-styles';
    document.head.appendChild(this.styleElement);
    this.updateStyleElement();
  }

  /**
   * Update the style element with current styles
   */
  private updateStyleElement(): void {
    if (!this.styleElement) return;

    const style = this.currentStyle;
    const css = `
      .caption-text,
      .subtitle-text,
      [data-caption-text] {
        font-size: ${style.fontSize}px !important;
        font-family: ${style.fontFamily} !important;
        font-weight: ${style.fontWeight} !important;
        color: ${style.color} !important;
        background-color: ${style.backgroundColor} !important;
        text-shadow: 
          ${style.outlineWidth}px ${style.outlineWidth}px 0 ${style.outlineColor},
          -${style.outlineWidth}px -${style.outlineWidth}px 0 ${style.outlineColor},
          ${style.outlineWidth}px -${style.outlineWidth}px 0 ${style.outlineColor},
          -${style.outlineWidth}px ${style.outlineWidth}px 0 ${style.outlineColor},
          ${style.shadowOffsetX}px ${style.shadowOffsetY}px ${style.shadowBlur}px ${style.shadowColor} !important;
        opacity: ${style.opacity} !important;
        line-height: ${style.lineHeight} !important;
        max-width: ${style.maxWidth}% !important;
        margin-bottom: ${style.marginBottom}px !important;
        border-radius: ${style.borderRadius}px !important;
        padding: ${style.padding}px !important;
        letter-spacing: ${style.letterSpacing}px !important;
        word-spacing: ${style.wordSpacing}px !important;
        text-align: ${style.alignment} !important;
        position: absolute !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        z-index: 1000 !important;
        box-sizing: border-box !important;
        white-space: pre-wrap !important;
        word-wrap: break-word !important;
      }

      .caption-text.position-top,
      .subtitle-text.position-top,
      [data-caption-text].position-top {
        top: ${style.marginBottom}px !important;
        bottom: auto !important;
      }

      .caption-text.position-center,
      .subtitle-text.position-center,
      [data-caption-text].position-center {
        top: 50% !important;
        bottom: auto !important;
        transform: translate(-50%, -50%) !important;
      }

      .caption-text.position-bottom,
      .subtitle-text.position-bottom,
      [data-caption-text].position-bottom {
        bottom: ${style.marginBottom}px !important;
        top: auto !important;
      }

      /* Ensure captions are visible over video */
      video + .caption-text,
      video + .subtitle-text,
      .video-container .caption-text,
      .video-container .subtitle-text {
        position: absolute !important;
        z-index: 1001 !important;
      }

      /* High contrast mode overrides */
      .high-contrast .caption-text,
      .high-contrast .subtitle-text,
      .high-contrast [data-caption-text] {
        color: #ffffff !important;
        background-color: #000000 !important;
        text-shadow: 2px 2px 0 #ffffff, -2px -2px 0 #ffffff, 2px -2px 0 #ffffff, -2px 2px 0 #ffffff !important;
        border: 2px solid #ffffff !important;
      }

      /* Reduced motion overrides */
      .reduced-motion .caption-text,
      .reduced-motion .subtitle-text,
      .reduced-motion [data-caption-text] {
        transition: none !important;
        animation: none !important;
      }

      /* Print styles */
      @media print {
        .caption-text,
        .subtitle-text,
        [data-caption-text] {
          position: static !important;
          background-color: transparent !important;
          color: black !important;
          text-shadow: none !important;
          border: 1px solid black !important;
          margin: 10px 0 !important;
        }
      }
    `;

    this.styleElement.textContent = css;
  }

  /**
   * Apply style to caption element
   */
  public applyStyle(element: HTMLElement, customStyle?: Partial<CaptionStyle>): void {
    const style = customStyle ? { ...this.currentStyle, ...customStyle } : this.currentStyle;

    element.classList.add('caption-text');
    element.classList.add(`position-${style.position}`);

    // Apply inline styles for immediate effect
    Object.assign(element.style, {
      fontSize: `${style.fontSize}px`,
      fontFamily: style.fontFamily,
      fontWeight: style.fontWeight,
      color: style.color,
      backgroundColor: style.backgroundColor,
      textShadow: `
        ${style.outlineWidth}px ${style.outlineWidth}px 0 ${style.outlineColor},
        -${style.outlineWidth}px -${style.outlineWidth}px 0 ${style.outlineColor},
        ${style.outlineWidth}px -${style.outlineWidth}px 0 ${style.outlineColor},
        -${style.outlineWidth}px ${style.outlineWidth}px 0 ${style.outlineColor},
        ${style.shadowOffsetX}px ${style.shadowOffsetY}px ${style.shadowBlur}px ${style.shadowColor}
      `,
      opacity: style.opacity.toString(),
      lineHeight: style.lineHeight.toString(),
      maxWidth: `${style.maxWidth}%`,
      marginBottom: `${style.marginBottom}px`,
      borderRadius: `${style.borderRadius}px`,
      padding: `${style.padding}px`,
      letterSpacing: `${style.letterSpacing}px`,
      wordSpacing: `${style.wordSpacing}px`,
      textAlign: style.alignment,
      position: 'absolute',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: '1000',
      boxSizing: 'border-box',
      whiteSpace: 'pre-wrap',
      wordWrap: 'break-word',
    });

    // Position-specific styles
    if (style.position === 'top') {
      element.style.top = `${style.marginBottom}px`;
      element.style.bottom = 'auto';
    } else if (style.position === 'center') {
      element.style.top = '50%';
      element.style.bottom = 'auto';
      element.style.transform = 'translate(-50%, -50%)';
    } else {
      element.style.bottom = `${style.marginBottom}px`;
      element.style.top = 'auto';
    }
  }

  /**
   * Update current style
   */
  public updateStyle(newStyle: Partial<CaptionStyle>): void {
    this.currentStyle = { ...this.currentStyle, ...newStyle };
    this.updateStyleElement();
  }

  /**
   * Get current style
   */
  public getCurrentStyle(): CaptionStyle {
    return { ...this.currentStyle };
  }

  /**
   * Apply preset
   */
  public applyPreset(presetName: string): boolean {
    const preset = this.presets.get(presetName);
    if (!preset) return false;

    this.currentStyle = { ...preset.style };
    this.updateStyleElement();
    return true;
  }

  /**
   * Get available presets
   */
  public getPresets(): CaptionPreset[] {
    return Array.from(this.presets.values());
  }

  /**
   * Add custom preset
   */
  public addPreset(name: string, description: string, style: CaptionStyle): void {
    this.presets.set(name, { name, description, style: { ...style } });
  }

  /**
   * Remove preset
   */
  public removePreset(name: string): boolean {
    if (name === 'default') return false; // Cannot remove default preset
    return this.presets.delete(name);
  }

  /**
   * Create caption styling UI
   */
  public createStylerUI(container: HTMLElement): void {
    container.innerHTML = `
      <div class="caption-styler">
        <div class="styler-header">
          <h3>Caption Styling</h3>
          <button class="styler-close" aria-label="Close caption styler">&times;</button>
        </div>
        
        <div class="styler-content">
          <div class="preset-section">
            <h4>Presets</h4>
            <div class="preset-buttons">
              ${Array.from(this.presets.values())
                .map(
                  (preset) => `
                <button class="preset-btn" data-preset="${preset.name.toLowerCase().replace(/\s+/g, '-')}" 
                        title="${preset.description}">
                  ${preset.name}
                </button>
              `
                )
                .join('')}
            </div>
          </div>

          <div class="style-controls">
            <div class="control-group">
              <h4>Text</h4>
              <div class="control-row">
                <label>Font Size: <input type="range" id="fontSize" min="12" max="48" value="${this.currentStyle.fontSize}"> <span>${this.currentStyle.fontSize}px</span></label>
              </div>
              <div class="control-row">
                <label>Font Family: 
                  <select id="fontFamily">
                    <option value="Arial, sans-serif" ${this.currentStyle.fontFamily === 'Arial, sans-serif' ? 'selected' : ''}>Arial</option>
                    <option value="Georgia, serif" ${this.currentStyle.fontFamily === 'Georgia, serif' ? 'selected' : ''}>Georgia</option>
                    <option value="'Courier New', monospace" ${this.currentStyle.fontFamily === "'Courier New', monospace" ? 'selected' : ''}>Courier New</option>
                    <option value="Verdana, sans-serif" ${this.currentStyle.fontFamily === 'Verdana, sans-serif' ? 'selected' : ''}>Verdana</option>
                    <option value="OpenDyslexic, Arial, sans-serif" ${this.currentStyle.fontFamily === 'OpenDyslexic, Arial, sans-serif' ? 'selected' : ''}>OpenDyslexic</option>
                  </select>
                </label>
              </div>
              <div class="control-row">
                <label>Font Weight: 
                  <select id="fontWeight">
                    <option value="normal" ${this.currentStyle.fontWeight === 'normal' ? 'selected' : ''}>Normal</option>
                    <option value="bold" ${this.currentStyle.fontWeight === 'bold' ? 'selected' : ''}>Bold</option>
                  </select>
                </label>
              </div>
            </div>

            <div class="control-group">
              <h4>Colors</h4>
              <div class="control-row">
                <label>Text Color: <input type="color" id="color" value="${this.rgbaToHex(this.currentStyle.color)}"></label>
              </div>
              <div class="control-row">
                <label>Background: <input type="color" id="backgroundColor" value="${this.rgbaToHex(this.currentStyle.backgroundColor)}"></label>
              </div>
              <div class="control-row">
                <label>Outline: <input type="color" id="outlineColor" value="${this.rgbaToHex(this.currentStyle.outlineColor)}"></label>
              </div>
            </div>

            <div class="control-group">
              <h4>Position</h4>
              <div class="control-row">
                <label>Position: 
                  <select id="position">
                    <option value="top" ${this.currentStyle.position === 'top' ? 'selected' : ''}>Top</option>
                    <option value="center" ${this.currentStyle.position === 'center' ? 'selected' : ''}>Center</option>
                    <option value="bottom" ${this.currentStyle.position === 'bottom' ? 'selected' : ''}>Bottom</option>
                  </select>
                </label>
              </div>
              <div class="control-row">
                <label>Alignment: 
                  <select id="alignment">
                    <option value="left" ${this.currentStyle.alignment === 'left' ? 'selected' : ''}>Left</option>
                    <option value="center" ${this.currentStyle.alignment === 'center' ? 'selected' : ''}>Center</option>
                    <option value="right" ${this.currentStyle.alignment === 'right' ? 'selected' : ''}>Right</option>
                  </select>
                </label>
              </div>
            </div>

            <div class="control-group">
              <h4>Advanced</h4>
              <div class="control-row">
                <label>Opacity: <input type="range" id="opacity" min="0.1" max="1" step="0.1" value="${this.currentStyle.opacity}"> <span>${Math.round(this.currentStyle.opacity * 100)}%</span></label>
              </div>
              <div class="control-row">
                <label>Line Height: <input type="range" id="lineHeight" min="1" max="2" step="0.1" value="${this.currentStyle.lineHeight}"> <span>${this.currentStyle.lineHeight}</span></label>
              </div>
              <div class="control-row">
                <label>Max Width: <input type="range" id="maxWidth" min="50" max="100" value="${this.currentStyle.maxWidth}"> <span>${this.currentStyle.maxWidth}%</span></label>
              </div>
            </div>
          </div>

          <div class="preview-section">
            <h4>Preview</h4>
            <div class="preview-container">
              <div class="preview-caption" id="captionPreview">Sample caption text</div>
            </div>
          </div>

          <div class="styler-actions">
            <button id="resetStyle" class="btn-secondary">Reset to Default</button>
            <button id="saveStyle" class="btn-primary">Save Style</button>
          </div>
        </div>
      </div>
    `;

    this.attachStylerEventListeners(container);
    this.updatePreview(container);
  }

  /**
   * Attach event listeners to styler UI
   */
  private attachStylerEventListeners(container: HTMLElement): void {
    // Preset buttons
    container.querySelectorAll('.preset-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const presetName = (e.target as HTMLElement).dataset.preset;
        if (presetName) {
          this.applyPreset(presetName);
          this.updateStylerUI(container);
          this.updatePreview(container);
        }
      });
    });

    // Style controls
    const controls = [
      'fontSize',
      'fontFamily',
      'fontWeight',
      'color',
      'backgroundColor',
      'outlineColor',
      'position',
      'alignment',
      'opacity',
      'lineHeight',
      'maxWidth',
    ];

    controls.forEach((controlId) => {
      const control = container.querySelector(`#${controlId}`) as
        HTMLInputElement | HTMLSelectElement;
      if (control) {
        control.addEventListener('input', () => {
          this.updateStyleFromControl(controlId, control.value);
          this.updatePreview(container);
          this.updateValueDisplay(container, controlId, control.value);
        });
      }
    });

    // Action buttons
    container.querySelector('#resetStyle')?.addEventListener('click', () => {
      this.currentStyle = this.getDefaultStyle();
      this.updateStyleElement();
      this.updateStylerUI(container);
      this.updatePreview(container);
    });

    container.querySelector('#saveStyle')?.addEventListener('click', () => {
      // Save to localStorage or emit event
      localStorage.setItem('captionStyle', JSON.stringify(this.currentStyle));
      this.announce('Caption style saved');
    });

    // Close button
    container.querySelector('.styler-close')?.addEventListener('click', () => {
      container.style.display = 'none';
    });
  }

  /**
   * Update style from control input
   */
  private updateStyleFromControl(controlId: string, value: string): void {
    const updates: Partial<CaptionStyle> = {};

    switch (controlId) {
      case 'fontSize':
        updates.fontSize = parseInt(value);
        break;
      case 'fontFamily':
        updates.fontFamily = value;
        break;
      case 'fontWeight':
        updates.fontWeight = value as 'normal' | 'bold';
        break;
      case 'color':
        updates.color = value;
        break;
      case 'backgroundColor':
        updates.backgroundColor = value;
        break;
      case 'outlineColor':
        updates.outlineColor = value;
        break;
      case 'position':
        updates.position = value as 'top' | 'center' | 'bottom';
        break;
      case 'alignment':
        updates.alignment = value as 'left' | 'center' | 'right';
        break;
      case 'opacity':
        updates.opacity = parseFloat(value);
        break;
      case 'lineHeight':
        updates.lineHeight = parseFloat(value);
        break;
      case 'maxWidth':
        updates.maxWidth = parseInt(value);
        break;
    }

    this.updateStyle(updates);
  }

  /**
   * Update value display for range inputs
   */
  private updateValueDisplay(container: HTMLElement, controlId: string, value: string): void {
    const control = container.querySelector(`#${controlId}`) as HTMLInputElement;
    const span = control?.parentElement?.querySelector('span');

    if (span) {
      switch (controlId) {
        case 'fontSize':
          span.textContent = `${value}px`;
          break;
        case 'opacity':
          span.textContent = `${Math.round(parseFloat(value) * 100)}%`;
          break;
        case 'lineHeight':
          span.textContent = value;
          break;
        case 'maxWidth':
          span.textContent = `${value}%`;
          break;
      }
    }
  }

  /**
   * Update styler UI with current values
   */
  private updateStylerUI(container: HTMLElement): void {
    const controls = {
      fontSize: this.currentStyle.fontSize,
      fontFamily: this.currentStyle.fontFamily,
      fontWeight: this.currentStyle.fontWeight,
      color: this.rgbaToHex(this.currentStyle.color),
      backgroundColor: this.rgbaToHex(this.currentStyle.backgroundColor),
      outlineColor: this.rgbaToHex(this.currentStyle.outlineColor),
      position: this.currentStyle.position,
      alignment: this.currentStyle.alignment,
      opacity: this.currentStyle.opacity,
      lineHeight: this.currentStyle.lineHeight,
      maxWidth: this.currentStyle.maxWidth,
    };

    Object.entries(controls).forEach(([id, value]) => {
      const control = container.querySelector(`#${id}`) as HTMLInputElement | HTMLSelectElement;
      if (control) {
        control.value = value.toString();
        this.updateValueDisplay(container, id, value.toString());
      }
    });
  }

  /**
   * Update preview
   */
  private updatePreview(container: HTMLElement): void {
    const preview = container.querySelector('#captionPreview') as HTMLElement;
    if (preview) {
      this.applyStyle(preview);
      preview.style.position = 'relative';
      preview.style.transform = 'none';
      preview.style.left = 'auto';
      preview.style.bottom = 'auto';
      preview.style.top = 'auto';
    }
  }

  /**
   * Convert rgba to hex (simplified)
   */
  private rgbaToHex(rgba: string): string {
    if (rgba.startsWith('#')) return rgba;

    // Simple fallback for color inputs
    const colorMap: { [key: string]: string } = {
      '#ffffff': '#ffffff',
      '#000000': '#000000',
      'rgba(0, 0, 0, 0.8)': '#000000',
      'rgba(255, 255, 255, 0.8)': '#ffffff',
    };

    return colorMap[rgba] || '#ffffff';
  }

  /**
   * Announce message (placeholder for accessibility manager integration)
   */
  private announce(message: string): void {
    // This would integrate with the accessibility manager's announce method
    console.log('Caption Styler:', message);
  }

  /**
   * Load saved style from storage
   */
  public loadSavedStyle(): void {
    const saved = localStorage.getItem('captionStyle');
    if (saved) {
      try {
        const style = JSON.parse(saved);
        this.currentStyle = { ...this.getDefaultStyle(), ...style };
        this.updateStyleElement();
      } catch (e) {
        console.warn('Failed to load saved caption style:', e);
      }
    }
  }

  /**
   * Destroy caption styler
   */
  public destroy(): void {
    if (this.styleElement) {
      this.styleElement.remove();
      this.styleElement = null;
    }
  }
}
