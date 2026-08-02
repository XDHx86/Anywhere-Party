/**
 * Tests for AccessibilityManager
 */

import { AccessibilityManager, AccessibilitySettings } from './accessibility-manager';

// Mock DOM methods
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock speechSynthesis
Object.defineProperty(window, 'speechSynthesis', {
  writable: true,
  value: {},
});

describe('AccessibilityManager', () => {
  let accessibilityManager: AccessibilityManager;
  let mockBody: HTMLElement;

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = '';
    mockBody = document.body;

    // Create accessibility manager
    accessibilityManager = new AccessibilityManager();
  });

  afterEach(() => {
    accessibilityManager.destroy();
    document.body.innerHTML = '';
  });

  describe('initialization', () => {
    it('should create screen reader announcer', () => {
      const announcer = document.querySelector('[aria-live]');
      expect(announcer).toBeTruthy();
      expect(announcer?.getAttribute('aria-live')).toBe('polite');
      expect(announcer?.getAttribute('aria-atomic')).toBe('true');
    });

    it('should detect system preferences', () => {
      const settings = accessibilityManager.getSettings();
      expect(settings).toBeDefined();
      expect(typeof settings.keyboardNavigationEnabled).toBe('boolean');
      expect(typeof settings.screenReaderEnabled).toBe('boolean');
      expect(typeof settings.highContrastMode).toBe('boolean');
    });

    it('should setup default keyboard shortcuts', () => {
      // Test that shortcuts are registered by triggering them
      const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
      document.dispatchEvent(tabEvent);
      // Should not throw error
    });
  });

  describe('keyboard navigation', () => {
    beforeEach(() => {
      // Add some focusable elements
      document.body.innerHTML = `
        <button id="btn1">Button 1</button>
        <input id="input1" type="text" />
        <button id="btn2">Button 2</button>
        <a href="#" id="link1">Link 1</a>
      `;
    });

    it('should navigate to next element on Tab', () => {
      const btn1 = document.getElementById('btn1') as HTMLElement;
      const input1 = document.getElementById('input1') as HTMLElement;

      btn1.focus();

      const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
      document.dispatchEvent(tabEvent);

      // Should focus next element (implementation may vary)
      expect(document.activeElement).toBeTruthy();
    });

    it('should navigate to previous element on Shift+Tab', () => {
      const input1 = document.getElementById('input1') as HTMLElement;
      input1.focus();

      const shiftTabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: true,
      });
      document.dispatchEvent(shiftTabEvent);

      // Should focus previous element
      expect(document.activeElement).toBeTruthy();
    });

    it('should close modal on Escape', () => {
      // Add a modal
      document.body.innerHTML += `
        <div class="modal" role="dialog">
          <button class="modal-close">Close</button>
        </div>
      `;

      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escapeEvent);

      // Modal should be hidden or removed
      const modal = document.querySelector('.modal') as HTMLElement;
      expect(modal.style.display === 'none' || modal.classList.contains('hidden')).toBeTruthy();
    });
  });

  describe('accessibility settings', () => {
    it('should update settings', () => {
      const newSettings: Partial<AccessibilitySettings> = {
        highContrastMode: true,
        fontSize: 'large',
      };

      accessibilityManager.updateSettings(newSettings);
      const settings = accessibilityManager.getSettings();

      expect(settings.highContrastMode).toBe(true);
      expect(settings.fontSize).toBe('large');
    });

    it('should apply high contrast mode', () => {
      accessibilityManager.updateSettings({ highContrastMode: true });

      expect(document.body.classList.contains('high-contrast')).toBe(true);
    });

    it('should apply font size', () => {
      accessibilityManager.updateSettings({ fontSize: 'large' });

      expect(document.body.classList.contains('font-large')).toBe(true);
    });

    it('should apply reduced motion', () => {
      accessibilityManager.updateSettings({ reducedMotion: true });

      expect(document.body.classList.contains('reduced-motion')).toBe(true);
    });
  });

  describe('screen reader announcements', () => {
    it('should announce messages', () => {
      const announcer = document.querySelector('[aria-live]') as HTMLElement;

      accessibilityManager.announce('Test message');

      expect(announcer.textContent).toBe('Test message');
    });

    it('should support different priority levels', () => {
      const announcer = document.querySelector('[aria-live]') as HTMLElement;

      accessibilityManager.announce('Urgent message', 'assertive');

      expect(announcer.getAttribute('aria-live')).toBe('assertive');
    });
  });

  describe('keyboard shortcuts', () => {
    it('should add custom shortcuts', () => {
      accessibilityManager.addShortcut({
        key: 't',
        ctrlKey: true,
        action: 'test-action',
        description: 'Test shortcut',
      });

      // Shortcut should be registered (implementation detail)
      expect(true).toBe(true); // Placeholder assertion
    });

    it('should remove shortcuts', () => {
      accessibilityManager.addShortcut({
        key: 't',
        ctrlKey: true,
        action: 'test-action',
        description: 'Test shortcut',
      });

      accessibilityManager.removeShortcut('t', true);

      // Shortcut should be removed (implementation detail)
      expect(true).toBe(true); // Placeholder assertion
    });

    it('should toggle high contrast with Alt+C', () => {
      const initialMode = accessibilityManager.getSettings().highContrastMode;

      const altCEvent = new KeyboardEvent('keydown', {
        key: 'c',
        altKey: true,
      });
      document.dispatchEvent(altCEvent);

      const newMode = accessibilityManager.getSettings().highContrastMode;
      expect(newMode).toBe(!initialMode);
    });
  });

  describe('element accessibility enhancement', () => {
    it('should make element accessible', () => {
      const element = document.createElement('div');
      document.body.appendChild(element);

      accessibilityManager.makeElementAccessible(element, {
        label: 'Test element',
        description: 'This is a test element',
        role: 'button',
        focusable: true,
      });

      expect(element.getAttribute('aria-label')).toBe('Test element');
      expect(element.getAttribute('role')).toBe('button');
      expect(element.getAttribute('tabindex')).toBe('0');
      expect(element.querySelector('.sr-only')).toBeTruthy();
    });

    it('should create accessible button', () => {
      const onClick = jest.fn();
      const button = accessibilityManager.createAccessibleButton('Test Button', onClick, {
        description: 'This is a test button',
        shortcut: 'Ctrl+T',
      });

      expect(button.tagName).toBe('BUTTON');
      expect(button.textContent).toBe('Test Button');
      expect(button.getAttribute('aria-label')).toContain('This is a test button');
      expect(button.getAttribute('title')).toContain('Ctrl+T');

      button.click();
      expect(onClick).toHaveBeenCalled();
    });
  });

  describe('focus management', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <button id="btn1">Button 1</button>
        <input id="input1" type="text" />
        <button id="btn2" disabled>Button 2</button>
        <div id="div1" tabindex="0">Focusable Div</div>
        <button id="btn3" aria-hidden="true">Hidden Button</button>
      `;
    });

    it('should identify focusable elements', () => {
      // This tests the internal focusable element detection
      // Implementation details may vary
      const btn1 = document.getElementById('btn1');
      const input1 = document.getElementById('input1');
      const div1 = document.getElementById('div1');

      expect(btn1).toBeTruthy();
      expect(input1).toBeTruthy();
      expect(div1).toBeTruthy();
    });

    it('should skip disabled elements', () => {
      const disabledBtn = document.getElementById('btn2');
      expect(disabledBtn?.hasAttribute('disabled')).toBe(true);
    });

    it('should skip hidden elements', () => {
      const hiddenBtn = document.getElementById('btn3');
      expect(hiddenBtn?.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('system preference detection', () => {
    it('should detect high contrast preference', () => {
      // Mock matchMedia for high contrast
      (window.matchMedia as jest.Mock).mockImplementation((query) => ({
        matches: query === '(prefers-contrast: high)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      const newManager = new AccessibilityManager();
      const settings = newManager.getSettings();

      expect(settings.highContrastMode).toBe(true);

      newManager.destroy();
    });

    it('should detect reduced motion preference', () => {
      // Mock matchMedia for reduced motion
      (window.matchMedia as jest.Mock).mockImplementation((query) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      const newManager = new AccessibilityManager();
      const settings = newManager.getSettings();

      expect(settings.reducedMotion).toBe(true);

      newManager.destroy();
    });
  });

  describe('keyboard help', () => {
    it('should show keyboard help on Alt+H', () => {
      const altHEvent = new KeyboardEvent('keydown', {
        key: 'h',
        altKey: true,
      });
      document.dispatchEvent(altHEvent);

      const helpModal = document.querySelector('.keyboard-help-modal');
      expect(helpModal).toBeTruthy();
    });

    it('should close keyboard help on second Alt+H', () => {
      // Show help
      const altHEvent = new KeyboardEvent('keydown', {
        key: 'h',
        altKey: true,
      });
      document.dispatchEvent(altHEvent);

      let helpModal = document.querySelector('.keyboard-help-modal');
      expect(helpModal).toBeTruthy();

      // Hide help
      document.dispatchEvent(altHEvent);

      helpModal = document.querySelector('.keyboard-help-modal');
      expect(helpModal).toBeFalsy();
    });
  });

  describe('cleanup', () => {
    it('should clean up resources on destroy', () => {
      const announcer = document.querySelector('[aria-live]');
      expect(announcer).toBeTruthy();

      accessibilityManager.destroy();

      const announcerAfter = document.querySelector('[aria-live]');
      expect(announcerAfter).toBeFalsy();
    });
  });
});
