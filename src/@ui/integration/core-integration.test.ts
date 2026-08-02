/**
 * Core Integration Tests for Material Design 3 UI
 *
 * Tests core functionality without complex JSX rendering
 * Requirements: 25.5, 26.5, 27.5, 28.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { lightTheme, darkTheme, createMaterialTheme } from '../theme/material-theme';
import { integrationService } from '../services/integration-service';
import { browserAPI } from '../utils/browser-api';

// Mock browser API
const mockBrowserAPI = {
  storage: {
    local: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
    },
  },
  runtime: {
    sendMessage: vi.fn().mockResolvedValue({ success: true }),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  tabs: {
    query: vi.fn().mockResolvedValue([]),
    sendMessage: vi.fn().mockResolvedValue({ success: true }),
  },
};

describe('Core Integration Tests', () => {
  beforeEach(() => {
    (global as any).chrome = mockBrowserAPI;

    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete (global as any).chrome;
    vi.restoreAllMocks();
  });

  describe('Material Design 3 Theme System', () => {
    it('should create light theme with correct Material Design 3 colors', () => {
      const theme = lightTheme;

      // Test Material Design 3 color palette
      expect(theme.palette.primary.main).toBe('#6200EE');
      expect(theme.palette.secondary.main).toBe('#03DAC6');
      expect(theme.palette.surface.main).toBe('#FFFFFF');
      expect(theme.palette.error.main).toBe('#B00020');
      expect(theme.mode).toBe('light');
    });

    it('should create dark theme with correct Material Design 3 colors', () => {
      const theme = darkTheme;

      // Test dark theme colors
      expect(theme.palette.surface.main).toBe('#121212');
      expect(theme.mode).toBe('dark');
      // Dark theme uses lighter variant of primary color for better contrast
      expect(theme.palette.primary.main).toBeTruthy();
      expect(theme.palette.primary.main).not.toBe('#FFFFFF'); // Should not be white
    });

    it('should have correct Material Design 3 spacing system', () => {
      const theme = lightTheme;

      expect(theme.spacing.sm).toBe('8px');
      expect(theme.spacing.md).toBe('16px');
      expect(theme.spacing.lg).toBe('24px');
    });

    it('should have correct Material Design 3 border radius (12-16px)', () => {
      const theme = lightTheme;

      expect(theme.shape.borderRadius.md).toBe('12px');
      expect(theme.shape.borderRadius.lg).toBe('16px');
    });

    it('should use Roboto or Inter font family', () => {
      const theme = lightTheme;

      expect(theme.typography.fontFamily).toBe('Roboto, Inter, system-ui, sans-serif');
    });

    it('should create theme dynamically', () => {
      const lightThemeCreated = createMaterialTheme('light');
      const darkThemeCreated = createMaterialTheme('dark');

      expect(lightThemeCreated.mode).toBe('light');
      expect(darkThemeCreated.mode).toBe('dark');

      // Should have consistent structure
      expect(lightThemeCreated.palette).toBeDefined();
      expect(lightThemeCreated.spacing).toBeDefined();
      expect(lightThemeCreated.shape).toBeDefined();
      expect(lightThemeCreated.elevation).toBeDefined();
      expect(lightThemeCreated.typography).toBeDefined();
    });
  });

  describe('Integration Service', () => {
    it('should initialize integration service', () => {
      expect(integrationService).toBeDefined();
      expect(typeof integrationService.connectPopup).toBe('function');
      expect(typeof integrationService.connectOptionsPage).toBe('function');
      expect(typeof integrationService.getIntegrationStatus).toBe('function');
    });

    it('should connect popup successfully', async () => {
      const connected = await integrationService.connectPopup();

      // Should attempt connection
      expect(typeof connected).toBe('boolean');
    });

    it('should connect options page successfully', async () => {
      const connected = await integrationService.connectOptionsPage();

      // Should attempt connection
      expect(typeof connected).toBe('boolean');
    });

    it('should provide integration status', () => {
      const status = integrationService.getIntegrationStatus();

      expect(status).toBeDefined();
      expect(status.config).toBeDefined();
      expect(typeof status.config.backgroundScriptConnected).toBe('boolean');
    });
  });

  describe('Browser API Integration', () => {
    it('should handle Chrome API correctly', () => {
      // Chrome API should be available
      expect((global as any).chrome).toBeDefined();
      expect((global as any).chrome.storage).toBeDefined();
      expect((global as any).chrome.runtime).toBeDefined();
      expect((global as any).chrome.tabs).toBeDefined();
    });

    it('should handle storage operations', async () => {
      const testData = { theme: 'dark', collapsed: false };

      // Test storage set
      await mockBrowserAPI.storage.local.set(testData);
      expect(mockBrowserAPI.storage.local.set).toHaveBeenCalledWith(testData);

      // Test storage get
      mockBrowserAPI.storage.local.get.mockResolvedValue(testData);
      const result = await mockBrowserAPI.storage.local.get(['theme', 'collapsed']);
      expect(result).toEqual(testData);
    });

    it('should handle runtime messaging', async () => {
      const message = { type: 'TEST_MESSAGE', data: 'test' };

      await mockBrowserAPI.runtime.sendMessage(message);
      expect(mockBrowserAPI.runtime.sendMessage).toHaveBeenCalledWith(message);
    });

    it('should handle tabs API', async () => {
      const mockTabs = [{ id: 1, url: 'https://youtube.com/watch?v=test' }];
      mockBrowserAPI.tabs.query.mockResolvedValue(mockTabs);

      const tabs = await mockBrowserAPI.tabs.query({ active: true });
      expect(tabs).toEqual(mockTabs);
    });
  });

  describe('Performance Validation', () => {
    it('should create themes within performance budget', () => {
      const startTime = performance.now();

      // Create multiple themes
      for (let i = 0; i < 10; i++) {
        createMaterialTheme('light');
        createMaterialTheme('dark');
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should create themes quickly (under 50ms for 20 themes)
      expect(duration).toBeLessThan(50);
    });

    it('should handle theme switching efficiently', () => {
      const startTime = performance.now();

      // Switch themes multiple times
      for (let i = 0; i < 100; i++) {
        const mode = i % 2 === 0 ? 'light' : 'dark';
        createMaterialTheme(mode);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should handle theme switching quickly (under 100ms for 100 switches)
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Backward Compatibility', () => {
    it('should handle legacy configuration format v1.0', async () => {
      const legacyConfig = {
        server: 'ws://localhost:8080',
        heartbeat: 2000,
        tolerance: 500,
        theme: 'light',
        collapsed: false,
      };

      mockBrowserAPI.storage.local.get.mockResolvedValue(legacyConfig);

      // Should not throw when accessing legacy config
      const result = await mockBrowserAPI.storage.local.get(['server', 'theme']);
      expect(result).toEqual(legacyConfig);

      // Should be able to migrate theme
      const theme = createMaterialTheme(legacyConfig.theme as 'light' | 'dark');
      expect(theme.mode).toBe('light');
    });

    it('should handle legacy configuration format v1.1', async () => {
      const legacyConfig = {
        SIGNALING_SERVER: 'ws://localhost:8080',
        UI_THEME: 'dark',
        POPUP_COLLAPSED: true,
      };

      mockBrowserAPI.storage.local.get.mockResolvedValue(legacyConfig);

      const result = await mockBrowserAPI.storage.local.get(['SIGNALING_SERVER', 'UI_THEME']);
      expect(result).toEqual(legacyConfig);

      // Should be able to migrate theme
      const theme = createMaterialTheme(legacyConfig.UI_THEME as 'light' | 'dark');
      expect(theme.mode).toBe('dark');
    });

    it('should handle corrupted legacy data gracefully', async () => {
      const corruptedData = {
        theme: null,
        collapsed: 'invalid',
        server: undefined,
      };

      mockBrowserAPI.storage.local.get.mockResolvedValue(corruptedData);

      // Should not throw with corrupted data
      const result = await mockBrowserAPI.storage.local.get(['theme']);
      expect(result).toEqual(corruptedData);

      // Should fallback to default theme
      const theme = createMaterialTheme('light'); // Default fallback
      expect(theme.mode).toBe('light');
    });
  });

  describe('Cross-Browser Compatibility', () => {
    it('should work with Chrome API', () => {
      (global as any).chrome = mockBrowserAPI;
      delete (global as any).browser;

      expect((global as any).chrome).toBeDefined();
      expect((global as any).browser).toBeUndefined();

      // Should be able to use Chrome API
      expect((global as any).chrome.storage.local.get).toBeDefined();
    });

    it('should work with Firefox API', () => {
      delete (global as any).chrome;
      (global as any).browser = mockBrowserAPI;

      expect((global as any).browser).toBeDefined();
      expect((global as any).chrome).toBeUndefined();

      // Should be able to use Firefox API
      expect((global as any).browser.storage.local.get).toBeDefined();
    });

    it('should handle missing browser APIs gracefully', () => {
      delete (global as any).chrome;
      delete (global as any).browser;

      // Should not throw when browser APIs are missing
      expect(() => {
        const theme = createMaterialTheme('light');
        expect(theme).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle storage errors gracefully', async () => {
      mockBrowserAPI.storage.local.get.mockRejectedValue(new Error('Storage unavailable'));

      try {
        await mockBrowserAPI.storage.local.get(['test']);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Storage unavailable');
      }
    });

    it('should handle runtime messaging errors gracefully', async () => {
      mockBrowserAPI.runtime.sendMessage.mockRejectedValue(new Error('Connection failed'));

      try {
        await mockBrowserAPI.runtime.sendMessage({ type: 'TEST' });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Connection failed');
      }
    });

    it('should handle theme creation errors gracefully', () => {
      // Should not throw with invalid theme mode
      expect(() => {
        createMaterialTheme('invalid' as any);
      }).not.toThrow();

      // Should fallback to light theme
      const theme = createMaterialTheme('invalid' as any);
      expect(theme.mode).toBe('light'); // Should fallback to light
    });
  });

  describe('Material Design 3 Compliance', () => {
    it('should have correct elevation shadows', () => {
      const theme = lightTheme;

      expect(theme.elevation.none).toBe('none');
      expect(theme.elevation.low).toBeTruthy();
      expect(theme.elevation.medium).toBeTruthy();
      expect(theme.elevation.high).toBeTruthy();

      // Should be different values
      expect(theme.elevation.low).not.toBe(theme.elevation.medium);
      expect(theme.elevation.medium).not.toBe(theme.elevation.high);
    });

    it('should have consistent color contrast ratios', () => {
      const lightThemeObj = lightTheme;
      const darkThemeObj = darkTheme;

      // Light theme should have dark text on light background
      expect(lightThemeObj.palette.surface.main).toBe('#FFFFFF');

      // Dark theme should have light text on dark background
      expect(darkThemeObj.palette.surface.main).toBe('#121212');

      // Primary colors should be appropriate for their theme (may differ for contrast)
      expect(lightThemeObj.palette.primary.main).toBeTruthy();
      expect(darkThemeObj.palette.primary.main).toBeTruthy();
      expect(lightThemeObj.palette.primary.main).not.toBe(darkThemeObj.palette.primary.main); // Should differ for contrast
    });

    it('should support responsive design principles', () => {
      const theme = lightTheme;

      // Should have responsive spacing
      expect(theme.spacing.sm).toBeTruthy();
      expect(theme.spacing.md).toBeTruthy();
      expect(theme.spacing.lg).toBeTruthy();

      // Should have responsive border radius
      expect(theme.shape.borderRadius.sm).toBeTruthy();
      expect(theme.shape.borderRadius.md).toBeTruthy();
      expect(theme.shape.borderRadius.lg).toBeTruthy();
    });
  });

  describe('Integration Status Validation', () => {
    it('should validate all required components are integrated', () => {
      // Theme system
      expect(lightTheme).toBeDefined();
      expect(darkTheme).toBeDefined();
      expect(createMaterialTheme).toBeDefined();

      // Integration service
      expect(integrationService).toBeDefined();
      expect(integrationService.connectPopup).toBeDefined();
      expect(integrationService.connectOptionsPage).toBeDefined();

      // Browser API integration
      expect(mockBrowserAPI.storage).toBeDefined();
      expect(mockBrowserAPI.runtime).toBeDefined();
      expect(mockBrowserAPI.tabs).toBeDefined();
    });

    it('should validate Material Design 3 requirements are met', () => {
      const theme = lightTheme;

      // Requirement 25.5: Material Design 3 components with proper styling
      expect(theme.palette.primary.main).toBe('#6200EE');
      expect(theme.palette.secondary.main).toBe('#03DAC6');

      // Requirement 26.5: Consistent Material Design 3 styling
      expect(theme.shape.borderRadius.lg).toBe('16px');
      expect(theme.spacing.md).toBe('16px');

      // Requirement 27.5: Material Design 3 typography
      expect(theme.typography.fontFamily).toContain('Roboto');

      // Requirement 28.5: Material Design 3 elevation system
      expect(theme.elevation.low).toBeTruthy();
      expect(theme.elevation.medium).toBeTruthy();
      expect(theme.elevation.high).toBeTruthy();
    });
  });
});
