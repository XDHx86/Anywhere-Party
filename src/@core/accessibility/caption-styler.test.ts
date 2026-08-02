/**
 * Tests for CaptionStyler
 */

import { CaptionStyler, CaptionStyle } from './caption-styler';

describe('CaptionStyler', () => {
  let captionStyler: CaptionStyler;

  beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
    captionStyler = new CaptionStyler();
  });

  afterEach(() => {
    captionStyler.destroy();
  });

  describe('initialization', () => {
    it('should create style element', () => {
      const styleElement = document.getElementById('caption-styles');
      expect(styleElement).toBeTruthy();
      expect(styleElement?.tagName).toBe('STYLE');
    });

    it('should have default style', () => {
      const style = captionStyler.getCurrentStyle();
      expect(style.fontSize).toBe(16);
      expect(style.fontFamily).toBe('Arial, sans-serif');
      expect(style.color).toBe('#ffffff');
      expect(style.position).toBe('bottom');
    });

    it('should have default presets', () => {
      const presets = captionStyler.getPresets();
      expect(presets.length).toBeGreaterThan(0);

      const defaultPreset = presets.find((p) => p.name === 'Default');
      expect(defaultPreset).toBeTruthy();

      const highContrastPreset = presets.find((p) => p.name === 'High Contrast');
      expect(highContrastPreset).toBeTruthy();
    });
  });

  describe('style management', () => {
    it('should update style', () => {
      const newStyle: Partial<CaptionStyle> = {
        fontSize: 20,
        color: '#ff0000',
      };

      captionStyler.updateStyle(newStyle);
      const currentStyle = captionStyler.getCurrentStyle();

      expect(currentStyle.fontSize).toBe(20);
      expect(currentStyle.color).toBe('#ff0000');
    });

    it('should apply preset', () => {
      const success = captionStyler.applyPreset('high-contrast');
      expect(success).toBe(true);

      const style = captionStyler.getCurrentStyle();
      expect(style.fontSize).toBe(18);
      expect(style.fontWeight).toBe('bold');
    });

    it('should fail to apply non-existent preset', () => {
      const success = captionStyler.applyPreset('non-existent');
      expect(success).toBe(false);
    });

    it('should add custom preset', () => {
      const customStyle: CaptionStyle = {
        fontSize: 24,
        fontFamily: 'Georgia, serif',
        fontWeight: 'bold',
        color: '#00ff00',
        backgroundColor: 'rgba(255, 0, 0, 0.8)',
        outlineColor: '#ffffff',
        outlineWidth: 2,
        shadowColor: 'rgba(0, 0, 0, 0.7)',
        shadowBlur: 3,
        shadowOffsetX: 2,
        shadowOffsetY: 2,
        position: 'top',
        alignment: 'left',
        opacity: 0.9,
        lineHeight: 1.6,
        maxWidth: 70,
        marginBottom: 30,
        borderRadius: 8,
        padding: 12,
        letterSpacing: 1,
        wordSpacing: 2,
      };

      captionStyler.addPreset('custom', 'Custom style', customStyle);

      const presets = captionStyler.getPresets();
      const customPreset = presets.find((p) => p.name === 'custom');
      expect(customPreset).toBeTruthy();
      expect(customPreset?.style.fontSize).toBe(24);
    });

    it('should remove custom preset', () => {
      captionStyler.addPreset('test', 'Test style', captionStyler.getCurrentStyle());

      let presets = captionStyler.getPresets();
      expect(presets.find((p) => p.name === 'test')).toBeTruthy();

      const success = captionStyler.removePreset('test');
      expect(success).toBe(true);

      presets = captionStyler.getPresets();
      expect(presets.find((p) => p.name === 'test')).toBeFalsy();
    });

    it('should not remove default preset', () => {
      const success = captionStyler.removePreset('default');
      expect(success).toBe(false);

      const presets = captionStyler.getPresets();
      expect(presets.find((p) => p.name === 'Default')).toBeTruthy();
    });
  });

  describe('style application', () => {
    it('should apply style to element', () => {
      const element = document.createElement('div');
      element.textContent = 'Test caption';
      document.body.appendChild(element);

      const customStyle: Partial<CaptionStyle> = {
        fontSize: 20,
        color: '#ff0000',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
      };

      captionStyler.applyStyle(element, customStyle);

      expect(element.style.fontSize).toBe('20px');
      expect(element.style.color).toBe('#ff0000');
      expect(element.style.backgroundColor).toBe('rgba(0, 0, 0, 0.9)');
      expect(element.classList.contains('caption-text')).toBe(true);
    });

    it('should apply position classes', () => {
      const element = document.createElement('div');
      document.body.appendChild(element);

      captionStyler.applyStyle(element, { position: 'top' });
      expect(element.classList.contains('position-top')).toBe(true);

      captionStyler.applyStyle(element, { position: 'center' });
      expect(element.classList.contains('position-center')).toBe(true);

      captionStyler.applyStyle(element, { position: 'bottom' });
      expect(element.classList.contains('position-bottom')).toBe(true);
    });

    it('should update CSS when style changes', () => {
      const styleElement = document.getElementById('caption-styles') as HTMLStyleElement;
      const initialCSS = styleElement.textContent;

      captionStyler.updateStyle({ fontSize: 24 });

      const updatedCSS = styleElement.textContent;
      expect(updatedCSS).not.toBe(initialCSS);
      expect(updatedCSS).toContain('font-size: 24px');
    });
  });

  describe('UI creation', () => {
    it('should create styler UI', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      captionStyler.createStylerUI(container);

      expect(container.querySelector('.caption-styler')).toBeTruthy();
      expect(container.querySelector('.styler-header')).toBeTruthy();
      expect(container.querySelector('.preset-buttons')).toBeTruthy();
      expect(container.querySelector('.style-controls')).toBeTruthy();
      expect(container.querySelector('#captionPreview')).toBeTruthy();
    });

    it('should populate preset buttons', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      captionStyler.createStylerUI(container);

      const presetButtons = container.querySelectorAll('.preset-btn');
      expect(presetButtons.length).toBeGreaterThan(0);

      const defaultButton = Array.from(presetButtons).find((btn) => btn.textContent === 'Default');
      expect(defaultButton).toBeTruthy();
    });

    it('should have working controls', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      captionStyler.createStylerUI(container);

      const fontSizeControl = container.querySelector('#fontSize') as HTMLInputElement;
      expect(fontSizeControl).toBeTruthy();
      expect(fontSizeControl.type).toBe('range');

      const colorControl = container.querySelector('#color') as HTMLInputElement;
      expect(colorControl).toBeTruthy();
      expect(colorControl.type).toBe('color');
    });
  });

  describe('saved styles', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('should load saved style from localStorage', () => {
      const savedStyle = {
        fontSize: 22,
        color: '#00ff00',
      };

      localStorage.setItem('captionStyle', JSON.stringify(savedStyle));

      const newStyler = new CaptionStyler();
      newStyler.loadSavedStyle();

      const currentStyle = newStyler.getCurrentStyle();
      expect(currentStyle.fontSize).toBe(22);
      expect(currentStyle.color).toBe('#00ff00');

      newStyler.destroy();
    });

    it('should handle invalid saved style gracefully', () => {
      localStorage.setItem('captionStyle', 'invalid json');

      const newStyler = new CaptionStyler();
      newStyler.loadSavedStyle();

      // Should fall back to default style
      const currentStyle = newStyler.getCurrentStyle();
      expect(currentStyle.fontSize).toBe(16);

      newStyler.destroy();
    });
  });

  describe('accessibility features', () => {
    it('should include dyslexia-friendly preset', () => {
      const presets = captionStyler.getPresets();
      const dyslexiaPreset = presets.find((p) => p.name === 'Dyslexia Friendly');

      expect(dyslexiaPreset).toBeTruthy();
      expect(dyslexiaPreset?.style.fontFamily).toContain('OpenDyslexic');
      expect(dyslexiaPreset?.style.letterSpacing).toBeGreaterThan(0);
      expect(dyslexiaPreset?.style.wordSpacing).toBeGreaterThan(0);
    });

    it('should include high contrast preset', () => {
      const presets = captionStyler.getPresets();
      const highContrastPreset = presets.find((p) => p.name === 'High Contrast');

      expect(highContrastPreset).toBeTruthy();
      expect(highContrastPreset?.style.fontWeight).toBe('bold');
      expect(highContrastPreset?.style.outlineWidth).toBeGreaterThan(1);
    });

    it('should include large text preset', () => {
      const presets = captionStyler.getPresets();
      const largeTextPreset = presets.find((p) => p.name === 'Large Text');

      expect(largeTextPreset).toBeTruthy();
      expect(largeTextPreset?.style.fontSize).toBeGreaterThan(16);
    });
  });

  describe('cleanup', () => {
    it('should remove style element on destroy', () => {
      const styleElement = document.getElementById('caption-styles');
      expect(styleElement).toBeTruthy();

      captionStyler.destroy();

      const styleElementAfter = document.getElementById('caption-styles');
      expect(styleElementAfter).toBeFalsy();
    });
  });
});
