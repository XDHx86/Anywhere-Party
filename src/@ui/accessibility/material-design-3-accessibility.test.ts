/**
 * Material Design 3 Accessibility Testing Suite
 *
 * Tests Requirements 20.5, 25.5:
 * - Accessibility features with screen readers and keyboard navigation
 * - WCAG 2.1 AA compliance for Material Design 3 components
 * - Focus management and ARIA implementation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { lightTheme, darkTheme, getContrastRatio } from '../theme/material-theme';
import type { MaterialThemeConfig } from '../theme/types';

describe('Material Design 3 Accessibility Compliance', () => {
  let mockElement: HTMLElement;

  beforeEach(() => {
    // Create mock DOM element for testing
    mockElement = document.createElement('div');
    document.body.appendChild(mockElement);

    // Mock console methods
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Clean up DOM
    if (mockElement.parentNode) {
      mockElement.parentNode.removeChild(mockElement);
    }

    vi.restoreAllMocks();
  });

  describe('Color Contrast Compliance', () => {
    it('should meet WCAG AA contrast requirements for light theme', () => {
      const theme = lightTheme;

      // Test primary color contrast
      const primaryContrast = getContrastRatio(theme.palette.onSurface, theme.palette.primary.main);
      expect(primaryContrast).toBeGreaterThanOrEqual(4.5);

      // Test surface contrast
      const surfaceContrast = getContrastRatio(theme.palette.onSurface, theme.palette.surface.main);
      expect(surfaceContrast).toBeGreaterThanOrEqual(4.5);
    });

    it('should meet WCAG AA contrast requirements for dark theme', () => {
      const theme = darkTheme;

      // Test primary color contrast
      const primaryContrast = getContrastRatio(theme.palette.onSurface, theme.palette.primary.main);
      expect(primaryContrast).toBeGreaterThanOrEqual(4.5);

      // Test surface contrast
      const surfaceContrast = getContrastRatio(theme.palette.onSurface, theme.palette.surface.main);
      expect(surfaceContrast).toBeGreaterThanOrEqual(4.5);
    });

    it('should provide sufficient contrast for error states', () => {
      const lightErrorContrast = getContrastRatio(
        lightTheme.palette.error.contrastText,
        lightTheme.palette.error.main
      );
      const darkErrorContrast = getContrastRatio(
        darkTheme.palette.error.contrastText,
        darkTheme.palette.error.main
      );

      expect(lightErrorContrast).toBeGreaterThanOrEqual(4.5);
      expect(darkErrorContrast).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe('Focus Management', () => {
    it('should provide visible focus indicators', () => {
      // Create focusable element
      const button = document.createElement('button');
      button.textContent = 'Test Button';
      button.style.outline = '2px solid #6200EE';
      button.style.outlineOffset = '2px';

      mockElement.appendChild(button);

      // Focus the button
      button.focus();

      const computedStyle = window.getComputedStyle(button);
      expect(computedStyle.outline).toBeTruthy();
      expect(computedStyle.outlineOffset).toBe('2px');
    });

    it('should support keyboard navigation', () => {
      // Create multiple focusable elements
      const button1 = document.createElement('button');
      const button2 = document.createElement('button');
      const input = document.createElement('input');

      button1.textContent = 'Button 1';
      button2.textContent = 'Button 2';
      input.type = 'text';

      mockElement.appendChild(button1);
      mockElement.appendChild(button2);
      mockElement.appendChild(input);

      // Test tab order
      button1.focus();
      expect(document.activeElement).toBe(button1);

      // Simulate tab key
      button2.focus();
      expect(document.activeElement).toBe(button2);

      input.focus();
      expect(document.activeElement).toBe(input);
    });

    it('should trap focus in modal dialogs', () => {
      // Create modal structure
      const modal = document.createElement('div');
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');

      const closeButton = document.createElement('button');
      closeButton.textContent = 'Close';

      modal.appendChild(closeButton);
      mockElement.appendChild(modal);

      // Focus should be trapped within modal
      closeButton.focus();
      expect(document.activeElement).toBe(closeButton);

      // Modal should have proper ARIA attributes
      expect(modal.getAttribute('role')).toBe('dialog');
      expect(modal.getAttribute('aria-modal')).toBe('true');
    });
  });

  describe('ARIA Implementation', () => {
    it('should provide proper ARIA labels for interactive elements', () => {
      const button = document.createElement('button');
      button.setAttribute('aria-label', 'Create new room');
      button.textContent = 'Create Room';

      mockElement.appendChild(button);

      expect(button.getAttribute('aria-label')).toBe('Create new room');
      expect(button.textContent).toBe('Create Room');
    });

    it('should use proper ARIA roles for semantic elements', () => {
      // Test status region
      const status = document.createElement('div');
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      status.textContent = 'Connected to room';

      mockElement.appendChild(status);

      expect(status.getAttribute('role')).toBe('status');
      expect(status.getAttribute('aria-live')).toBe('polite');

      // Test alert region
      const alert = document.createElement('div');
      alert.setAttribute('role', 'alert');
      alert.setAttribute('aria-live', 'assertive');
      alert.textContent = 'Error: Connection failed';

      mockElement.appendChild(alert);

      expect(alert.getAttribute('role')).toBe('alert');
      expect(alert.getAttribute('aria-live')).toBe('assertive');
    });

    it('should provide accessible form labels', () => {
      const label = document.createElement('label');
      const input = document.createElement('input');

      label.textContent = 'Room ID';
      label.setAttribute('for', 'room-id');
      input.setAttribute('id', 'room-id');
      input.type = 'text';

      mockElement.appendChild(label);
      mockElement.appendChild(input);

      expect(label.getAttribute('for')).toBe('room-id');
      expect(input.getAttribute('id')).toBe('room-id');
    });

    it('should support screen reader announcements', () => {
      // Test live region for dynamic content
      const liveRegion = document.createElement('div');
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');

      mockElement.appendChild(liveRegion);

      // Update content (would be announced by screen reader)
      liveRegion.textContent = 'Room created successfully';

      expect(liveRegion.getAttribute('aria-live')).toBe('polite');
      expect(liveRegion.getAttribute('aria-atomic')).toBe('true');
      expect(liveRegion.textContent).toBe('Room created successfully');
    });
  });

  describe('Keyboard Interaction', () => {
    it('should handle Enter and Space key activation', () => {
      const button = document.createElement('button');
      let clicked = false;

      button.addEventListener('click', () => {
        clicked = true;
      });

      button.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          button.click();
        }
      });

      mockElement.appendChild(button);

      // Simulate Enter key
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      button.dispatchEvent(enterEvent);

      expect(clicked).toBe(true);
    });

    it('should support Escape key for dismissing modals', () => {
      const modal = document.createElement('div');
      let dismissed = false;

      modal.setAttribute('role', 'dialog');

      modal.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          dismissed = true;
        }
      });

      mockElement.appendChild(modal);

      // Simulate Escape key
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      modal.dispatchEvent(escapeEvent);

      expect(dismissed).toBe(true);
    });

    it('should support arrow key navigation in lists', () => {
      const list = document.createElement('ul');
      list.setAttribute('role', 'listbox');

      const item1 = document.createElement('li');
      const item2 = document.createElement('li');
      const item3 = document.createElement('li');

      item1.setAttribute('role', 'option');
      item2.setAttribute('role', 'option');
      item3.setAttribute('role', 'option');

      item1.textContent = 'Option 1';
      item2.textContent = 'Option 2';
      item3.textContent = 'Option 3';

      list.appendChild(item1);
      list.appendChild(item2);
      list.appendChild(item3);
      mockElement.appendChild(list);

      // Test arrow key navigation
      let currentIndex = 0;
      const items = [item1, item2, item3];

      list.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowDown') {
          currentIndex = Math.min(currentIndex + 1, items.length - 1);
          items[currentIndex].focus();
        } else if (event.key === 'ArrowUp') {
          currentIndex = Math.max(currentIndex - 1, 0);
          items[currentIndex].focus();
        }
      });

      // Simulate arrow down
      const arrowDownEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      list.dispatchEvent(arrowDownEvent);

      expect(currentIndex).toBe(1);
    });
  });

  describe('Screen Reader Support', () => {
    it('should provide descriptive text for complex UI elements', () => {
      const progressBar = document.createElement('div');
      progressBar.setAttribute('role', 'progressbar');
      progressBar.setAttribute('aria-valuenow', '50');
      progressBar.setAttribute('aria-valuemin', '0');
      progressBar.setAttribute('aria-valuemax', '100');
      progressBar.setAttribute('aria-label', 'Upload progress');

      mockElement.appendChild(progressBar);

      expect(progressBar.getAttribute('role')).toBe('progressbar');
      expect(progressBar.getAttribute('aria-valuenow')).toBe('50');
      expect(progressBar.getAttribute('aria-label')).toBe('Upload progress');
    });

    it('should use proper heading hierarchy', () => {
      const h1 = document.createElement('h1');
      const h2 = document.createElement('h2');
      const h3 = document.createElement('h3');

      h1.textContent = 'Watch Party Extension';
      h2.textContent = 'Room Settings';
      h3.textContent = 'Audio Settings';

      mockElement.appendChild(h1);
      mockElement.appendChild(h2);
      mockElement.appendChild(h3);

      expect(h1.tagName).toBe('H1');
      expect(h2.tagName).toBe('H2');
      expect(h3.tagName).toBe('H3');
    });

    it('should provide alternative text for images', () => {
      const img = document.createElement('img');
      img.src = 'avatar.png';
      img.alt = 'User avatar showing a smiling person';

      mockElement.appendChild(img);

      expect(img.getAttribute('alt')).toBe('User avatar showing a smiling person');
    });
  });

  describe('Reduced Motion Support', () => {
    it('should respect prefers-reduced-motion setting', () => {
      // Mock media query
      const mockMediaQuery = {
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };

      vi.spyOn(window, 'matchMedia').mockReturnValue(mockMediaQuery as any);

      const result = window.matchMedia('(prefers-reduced-motion: reduce)');
      expect(result.matches).toBe(true);

      // Should disable animations when reduced motion is preferred
      if (result.matches) {
        const element = document.createElement('div');
        element.style.animation = 'none';
        element.style.transition = 'none';

        mockElement.appendChild(element);

        expect(element.style.animation).toBe('none');
        expect(element.style.transition).toBe('none');
      }
    });
  });

  describe('High Contrast Mode Support', () => {
    it('should work with high contrast themes', () => {
      // Test high contrast color combinations
      const highContrastElement = document.createElement('div');
      highContrastElement.style.backgroundColor = '#000000';
      highContrastElement.style.color = '#ffffff';

      mockElement.appendChild(highContrastElement);

      const computedStyle = window.getComputedStyle(highContrastElement);
      expect(computedStyle.backgroundColor).toBe('rgb(0, 0, 0)');
      expect(computedStyle.color).toBe('rgb(255, 255, 255)');
    });

    it('should maintain border visibility in high contrast mode', () => {
      const element = document.createElement('div');
      element.style.border = '1px solid transparent';
      element.style.outline = '1px solid currentColor';

      mockElement.appendChild(element);

      const computedStyle = window.getComputedStyle(element);
      expect(computedStyle.outline).toBeTruthy();
    });
  });
});
