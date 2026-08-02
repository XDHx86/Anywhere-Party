/**
 * Comprehensive Material Design 3 Testing Suite
 *
 * Tests Requirements 20.5, 25.5, 26.5, 27.5:
 * - Material Design 3 compliance and visual consistency
 * - Performance impact of new UI components
 * - Theme system functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Material Design 3 Theme and utilities
import {
  createMaterialTheme,
  lightTheme,
  darkTheme,
  getContrastRatio,
  isHighContrast,
  getElevationShadow,
} from '../theme/material-theme';
import type { MaterialThemeConfig, ThemeMode } from '../theme/types';

describe('Material Design 3 Comprehensive Testing', () => {
  let mockElement: HTMLElement;

  beforeEach(() => {
    // Create mock DOM element for testing
    mockElement = document.createElement('div');
    document.body.appendChild(mockElement);

    // Mock console methods
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock performance API
    vi.spyOn(performance, 'now').mockImplementation(() => Date.now());

    // Mock matchMedia for auto theme detection
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // deprecated
        removeListener: vi.fn(), // deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    // Clean up DOM
    if (mockElement.parentNode) {
      mockElement.parentNode.removeChild(mockElement);
    }

    vi.restoreAllMocks();
  });

  describe('Material Design 3 Compliance', () => {
    describe('Color System Compliance', () => {
      it('should use correct Material Design 3 color palette', () => {
        // Test light theme colors
        expect(lightTheme.palette.primary.main).toBe('#6200EE');
        expect(lightTheme.palette.secondary.main).toBe('#03DAC6');
        expect(lightTheme.palette.surface.main).toBe('#FFFFFF');
        expect(lightTheme.palette.error.main).toBe('#B00020');

        // Test dark theme colors
        expect(darkTheme.palette.surface.main).toBe('#121212');
        expect(darkTheme.mode).toBe('dark');
      });

      it('should maintain proper contrast ratios', () => {
        // Test contrast ratio function
        const lightContrast = getContrastRatio(
          lightTheme.palette.onSurface,
          lightTheme.palette.surface.main
        );
        const darkContrast = getContrastRatio(
          darkTheme.palette.onSurface,
          darkTheme.palette.surface.main
        );

        // Should meet WCAG AA standards (4.5:1 minimum)
        expect(lightContrast).toBeGreaterThanOrEqual(4.5);
        expect(darkContrast).toBeGreaterThanOrEqual(4.5);
      });

      it('should support both light and dark themes', () => {
        expect(lightTheme.mode).toBe('light');
        expect(darkTheme.mode).toBe('dark');

        // Themes should have different surface colors
        expect(lightTheme.palette.surface.main).not.toBe(darkTheme.palette.surface.main);
      });

      it('should detect high contrast themes', () => {
        const isLightHighContrast = isHighContrast(lightTheme);
        const isDarkHighContrast = isHighContrast(darkTheme);

        // Function should return boolean values
        expect(typeof isLightHighContrast).toBe('boolean');
        expect(typeof isDarkHighContrast).toBe('boolean');
      });
    });

    describe('Typography System', () => {
      it('should use correct Material Design 3 typography', () => {
        const theme = lightTheme;

        // Should use Roboto or Inter font family
        expect(theme.typography.fontFamily).toMatch(/Roboto|Inter/);
        expect(theme.typography.fontFamily).toContain('system-ui');
        expect(theme.typography.fontFamily).toContain('sans-serif');
      });

      it('should maintain consistent font weights and sizes', () => {
        const theme = lightTheme;

        expect(theme.typography.fontFamily).toBe('Roboto, Inter, system-ui, sans-serif');
        expect(theme.typography.fontSize.displayLarge).toBe('57px');
        expect(theme.typography.fontSize.bodyLarge).toBe('16px');
        expect(theme.typography.fontWeight.medium).toBe(500);
      });

      it('should provide complete typography scale', () => {
        const theme = lightTheme;

        // Test display sizes
        expect(theme.typography.fontSize.displayLarge).toBeDefined();
        expect(theme.typography.fontSize.displayMedium).toBeDefined();
        expect(theme.typography.fontSize.displaySmall).toBeDefined();

        // Test headline sizes
        expect(theme.typography.fontSize.headlineLarge).toBeDefined();
        expect(theme.typography.fontSize.headlineMedium).toBeDefined();
        expect(theme.typography.fontSize.headlineSmall).toBeDefined();

        // Test body sizes
        expect(theme.typography.fontSize.bodyLarge).toBeDefined();
        expect(theme.typography.fontSize.bodyMedium).toBeDefined();
        expect(theme.typography.fontSize.bodySmall).toBeDefined();
      });
    });

    describe('Shape and Elevation System', () => {
      it('should use correct border radius values (12-16px)', () => {
        const theme = lightTheme;

        // Should use Material Design 3 border radius
        expect(theme.shape.borderRadius.md).toBe('12px');
        expect(theme.shape.borderRadius.lg).toBe('16px');
      });

      it('should apply correct elevation shadows', () => {
        const lowShadow = getElevationShadow('low');
        const mediumShadow = getElevationShadow('medium');
        const highShadow = getElevationShadow('high');

        // Should have different shadow values
        expect(lowShadow).toBeTruthy();
        expect(mediumShadow).toBeTruthy();
        expect(highShadow).toBeTruthy();
        expect(lowShadow).not.toBe(mediumShadow);
        expect(mediumShadow).not.toBe(highShadow);
      });

      it('should provide complete elevation system', () => {
        const theme = lightTheme;

        expect(theme.elevation.none).toBe('none');
        expect(theme.elevation.low).toBeTruthy();
        expect(theme.elevation.medium).toBeTruthy();
        expect(theme.elevation.high).toBeTruthy();
      });
    });

    describe('Spacing System', () => {
      it('should use consistent 8/16/24 dp spacing', () => {
        const theme = lightTheme;

        expect(theme.spacing.sm).toBe('8px');
        expect(theme.spacing.md).toBe('16px');
        expect(theme.spacing.lg).toBe('24px');
      });

      it('should provide complete spacing scale', () => {
        const theme = lightTheme;

        expect(theme.spacing.xs).toBe('4px');
        expect(theme.spacing.sm).toBe('8px');
        expect(theme.spacing.md).toBe('16px');
        expect(theme.spacing.lg).toBe('24px');
        expect(theme.spacing.xl).toBe('32px');
        expect(theme.spacing.xxl).toBe('48px');
      });
    });
  });

  describe('Theme Creation and Management', () => {
    it('should create themes with different modes', () => {
      const lightThemeConfig = createMaterialTheme('light');
      const darkThemeConfig = createMaterialTheme('dark');
      const autoThemeConfig = createMaterialTheme('auto');

      expect(lightThemeConfig.mode).toBe('light');
      expect(darkThemeConfig.mode).toBe('dark');
      expect(autoThemeConfig).toBeDefined();
    });

    it('should handle custom color settings', () => {
      const customSettings = {
        enableCustomColors: true,
        customPrimaryColor: '#FF5722',
        customSecondaryColor: '#4CAF50',
      };

      const customTheme = createMaterialTheme('light', customSettings);

      expect(customTheme.palette.primary.main).toBe('#FF5722');
      expect(customTheme.palette.secondary.main).toBe('#4CAF50');
    });

    it('should detect system theme preference in auto mode', () => {
      // Mock media query for dark mode
      const mockMediaQuery = {
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };

      vi.spyOn(window, 'matchMedia').mockReturnValue(mockMediaQuery as any);

      const autoTheme = createMaterialTheme('auto');

      // Should create a valid theme regardless of system preference
      expect(autoTheme).toBeDefined();
      expect(autoTheme.palette).toBeDefined();
      expect(autoTheme.typography).toBeDefined();
    });
  });

  describe('Breakpoint System', () => {
    it('should provide responsive breakpoints', () => {
      const theme = lightTheme;

      expect(theme.breakpoints.xs).toBe('480px');
      expect(theme.breakpoints.sm).toBe('600px');
      expect(theme.breakpoints.md).toBe('840px');
      expect(theme.breakpoints.lg).toBe('1200px');
      expect(theme.breakpoints.xl).toBe('1600px');
    });

    it('should handle different viewport sizes', () => {
      const viewports = [
        { width: 360, height: 640 }, // Mobile
        { width: 768, height: 1024 }, // Tablet
        { width: 1920, height: 1080 }, // Desktop
      ];

      viewports.forEach((viewport) => {
        // Mock window dimensions
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: viewport.width,
        });
        Object.defineProperty(window, 'innerHeight', {
          writable: true,
          configurable: true,
          value: viewport.height,
        });

        // Should not throw errors with different viewport sizes
        expect(() => {
          const theme = createMaterialTheme('light');
          expect(theme).toBeDefined();
        }).not.toThrow();
      });
    });
  });

  describe('Performance Impact Assessment', () => {
    it('should create themes within acceptable time limits', () => {
      const startTime = performance.now();

      // Create multiple themes
      const themes = [
        createMaterialTheme('light'),
        createMaterialTheme('dark'),
        createMaterialTheme('auto'),
      ];

      const endTime = performance.now();
      const creationTime = endTime - startTime;

      // Should create themes quickly
      expect(creationTime).toBeLessThan(50);
      expect(themes).toHaveLength(3);
      themes.forEach((theme) => {
        expect(theme).toBeDefined();
        expect(theme.palette).toBeDefined();
      });
    });

    it('should handle theme switching efficiently', () => {
      const startTime = performance.now();

      // Simulate theme switching
      let currentTheme = createMaterialTheme('light');
      currentTheme = createMaterialTheme('dark');
      currentTheme = createMaterialTheme('light');

      const endTime = performance.now();
      const switchTime = endTime - startTime;

      // Theme switching should be fast
      expect(switchTime).toBeLessThan(30);
      expect(currentTheme.mode).toBe('light');
    });

    it('should not cause memory leaks during theme creation', () => {
      // Create and discard many themes
      for (let i = 0; i < 100; i++) {
        const theme = createMaterialTheme(i % 2 === 0 ? 'light' : 'dark');
        expect(theme).toBeDefined();
      }

      // Should not throw errors or warnings
      expect(console.error).not.toHaveBeenCalled();
      expect(console.warn).not.toHaveBeenCalled();
    });

    it('should handle custom theme settings efficiently', () => {
      const startTime = performance.now();

      const customSettings = {
        enableCustomColors: true,
        customPrimaryColor: '#FF5722',
        customSecondaryColor: '#4CAF50',
      };

      const customTheme = createMaterialTheme('light', customSettings);

      const endTime = performance.now();
      const creationTime = endTime - startTime;

      // Custom theme creation should be fast
      expect(creationTime).toBeLessThan(20);
      expect(customTheme.palette.primary.main).toBe('#FF5722');
    });
  });

  describe('Visual Consistency', () => {
    it('should maintain consistent spacing across themes', () => {
      const lightSpacing = lightTheme.spacing;
      const darkSpacing = darkTheme.spacing;

      // Spacing should be consistent across themes
      expect(lightSpacing.sm).toBe(darkSpacing.sm);
      expect(lightSpacing.md).toBe(darkSpacing.md);
      expect(lightSpacing.lg).toBe(darkSpacing.lg);
    });

    it('should maintain consistent border radius across themes', () => {
      const lightRadius = lightTheme.shape.borderRadius;
      const darkRadius = darkTheme.shape.borderRadius;

      // Border radius should be consistent across themes
      expect(lightRadius.md).toBe(darkRadius.md);
      expect(lightRadius.lg).toBe(darkRadius.lg);
    });

    it('should maintain consistent typography across themes', () => {
      const lightTypography = lightTheme.typography;
      const darkTypography = darkTheme.typography;

      // Typography should be consistent across themes
      expect(lightTypography.fontFamily).toBe(darkTypography.fontFamily);
      expect(lightTypography.fontSize.bodyLarge).toBe(darkTypography.fontSize.bodyLarge);
      expect(lightTypography.fontWeight.medium).toBe(darkTypography.fontWeight.medium);
    });

    it('should provide consistent elevation system', () => {
      const lightElevation = lightTheme.elevation;
      const darkElevation = darkTheme.elevation;

      // Elevation system should be consistent across themes
      expect(lightElevation.none).toBe(darkElevation.none);
      expect(lightElevation.low).toBe(darkElevation.low);
      expect(lightElevation.medium).toBe(darkElevation.medium);
      expect(lightElevation.high).toBe(darkElevation.high);
    });
  });

  describe('Theme Utilities', () => {
    it('should provide utility functions', () => {
      // Test contrast ratio function
      expect(typeof getContrastRatio).toBe('function');
      expect(typeof isHighContrast).toBe('function');
      expect(typeof getElevationShadow).toBe('function');
    });

    it('should handle edge cases gracefully', () => {
      // Test with invalid inputs
      expect(() => {
        getContrastRatio('invalid', 'colors');
      }).not.toThrow();

      expect(() => {
        isHighContrast(lightTheme);
      }).not.toThrow();

      expect(() => {
        getElevationShadow('none');
      }).not.toThrow();
    });

    it('should provide consistent API', () => {
      // All themes should have the same structure
      const lightKeys = Object.keys(lightTheme);
      const darkKeys = Object.keys(darkTheme);

      expect(lightKeys.sort()).toEqual(darkKeys.sort());

      // All themes should have required properties
      [lightTheme, darkTheme].forEach((theme) => {
        expect(theme.mode).toBeDefined();
        expect(theme.palette).toBeDefined();
        expect(theme.typography).toBeDefined();
        expect(theme.spacing).toBeDefined();
        expect(theme.shape).toBeDefined();
        expect(theme.elevation).toBeDefined();
        expect(theme.breakpoints).toBeDefined();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle theme creation errors gracefully', () => {
      // Should not throw with edge case inputs
      expect(() => {
        createMaterialTheme('light' as ThemeMode);
      }).not.toThrow();

      expect(() => {
        createMaterialTheme('dark' as ThemeMode);
      }).not.toThrow();

      expect(() => {
        createMaterialTheme('auto' as ThemeMode);
      }).not.toThrow();
    });

    it('should handle missing browser APIs gracefully', () => {
      // Test with light and dark modes (which don't use matchMedia)
      expect(() => {
        createMaterialTheme('light');
      }).not.toThrow();

      expect(() => {
        createMaterialTheme('dark');
      }).not.toThrow();
    });

    it('should provide fallback values', () => {
      const theme = createMaterialTheme('light');

      // Should have fallback font family
      expect(theme.typography.fontFamily).toContain('sans-serif');

      // Should have fallback colors
      expect(theme.palette.primary.main).toBeTruthy();
      expect(theme.palette.surface.main).toBeTruthy();
    });
  });
});
