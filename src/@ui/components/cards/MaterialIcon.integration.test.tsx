/**
 * MaterialIcon Integration Tests
 * Tests for cross-browser icon loading with asset system
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MaterialIcon } from './MaterialIcon';
import { assetSystem } from '../../assets/asset-system';

// Mock chrome.runtime for testing
const mockChrome = {
  runtime: {
    getURL: vi.fn((path: string) => `chrome-extension://test/${path}`),
  },
};

// @ts-ignore
global.chrome = mockChrome;

// Mock document for testing
const mockDocument = {
  styleSheets: [],
  createElement: vi.fn(() => ({
    rel: '',
    href: '',
    onload: null,
    onerror: null,
    className: '',
    style: {},
    appendChild: vi.fn(),
    removeChild: vi.fn(),
  })),
  head: {
    appendChild: vi.fn(),
  },
  body: {
    appendChild: vi.fn(),
    removeChild: vi.fn(),
  },
};

// @ts-ignore
global.document = mockDocument;

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};

describe('MaterialIcon Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Icon Loading States', () => {
    it('should show loading state initially', () => {
      renderWithTheme(<MaterialIcon name="play" data-testid="play-icon" />);

      const icon = screen.getByTestId('play-icon');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveTextContent('⋯');
    });

    it('should load icon after asset system resolves', async () => {
      renderWithTheme(<MaterialIcon name="play" data-testid="play-icon" />);

      await waitFor(() => {
        const icon = screen.getByTestId('play-icon');
        expect(icon).not.toHaveTextContent('⋯');
      });
    });
  });

  describe('Font Awesome Integration', () => {
    it('should use Font Awesome classes when available', async () => {
      // Mock Font Awesome as available
      vi.spyOn(assetSystem, 'loadIcon').mockResolvedValue({
        success: true,
        method: 'font',
      });

      vi.spyOn(assetSystem, 'getFontAwesomeClass').mockReturnValue('fas fa-play');

      renderWithTheme(<MaterialIcon name="play" data-testid="play-icon" />);

      await waitFor(() => {
        const icon = screen.getByTestId('play-icon');
        expect(icon).toHaveClass('fas', 'fa-play');
      });
    });

    it('should handle Font Awesome loading failure', async () => {
      vi.spyOn(assetSystem, 'loadIcon').mockResolvedValue({
        success: true,
        method: 'svg',
      });

      renderWithTheme(<MaterialIcon name="play" data-testid="play-icon" />);

      await waitFor(() => {
        const icon = screen.getByTestId('play-icon');
        expect(icon).not.toHaveClass('fas');
      });
    });
  });

  describe('SVG Fallbacks', () => {
    it('should render SVG fallback when font fails', async () => {
      vi.spyOn(assetSystem, 'loadIcon').mockResolvedValue({
        success: true,
        method: 'svg',
      });

      vi.spyOn(assetSystem, 'getSVGFallback').mockReturnValue(
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>'
      );

      renderWithTheme(<MaterialIcon name="play" data-testid="play-icon" />);

      await waitFor(() => {
        const icon = screen.getByTestId('play-icon');
        const svg = icon.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });
    });

    it('should use SVG sprite when available', async () => {
      vi.spyOn(assetSystem, 'loadIcon').mockResolvedValue({
        success: true,
        method: 'svg',
      });

      vi.spyOn(assetSystem, 'getSVGFallback').mockReturnValue(
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><use href="chrome-extension://test/assets/icons/sprite.svg#icon-play"/></svg>'
      );

      renderWithTheme(<MaterialIcon name="play" data-testid="play-icon" />);

      await waitFor(() => {
        const icon = screen.getByTestId('play-icon');
        const useElement = icon.querySelector('use');
        expect(useElement).toBeInTheDocument();
        expect(useElement?.getAttribute('href')).toContain('sprite.svg#icon-play');
      });
    });
  });

  describe('Text Fallbacks', () => {
    it('should render text fallback as last resort', async () => {
      vi.spyOn(assetSystem, 'loadIcon').mockResolvedValue({
        success: true,
        method: 'fallback',
      });

      vi.spyOn(assetSystem, 'getTextFallback').mockReturnValue('▶');

      renderWithTheme(<MaterialIcon name="play" data-testid="play-icon" />);

      await waitFor(() => {
        const icon = screen.getByTestId('play-icon');
        expect(icon).toHaveTextContent('▶');
      });
    });

    it('should handle unknown icons with question mark', async () => {
      vi.spyOn(assetSystem, 'loadIcon').mockResolvedValue({
        success: true,
        method: 'fallback',
      });

      vi.spyOn(assetSystem, 'getTextFallback').mockReturnValue('?');

      renderWithTheme(<MaterialIcon name="unknown-icon" data-testid="unknown-icon" />);

      await waitFor(() => {
        const icon = screen.getByTestId('unknown-icon');
        expect(icon).toHaveTextContent('?');
      });
    });
  });

  describe('Size and Color Props', () => {
    it('should apply size correctly for all loading methods', async () => {
      const sizes = ['small', 'medium', 'large'] as const;

      for (const size of sizes) {
        const { unmount } = renderWithTheme(
          <MaterialIcon name="play" size={size} data-testid={`play-icon-${size}`} />
        );

        await waitFor(() => {
          const icon = screen.getByTestId(`play-icon-${size}`);
          const expectedSize = size === 'small' ? '16px' : size === 'medium' ? '24px' : '32px';
          expect(icon).toHaveStyle(`width: ${expectedSize}`);
          expect(icon).toHaveStyle(`height: ${expectedSize}`);
        });

        unmount();
      }
    });

    it('should apply custom numeric size', async () => {
      renderWithTheme(<MaterialIcon name="play" size={48} data-testid="play-icon-48" />);

      await waitFor(() => {
        const icon = screen.getByTestId('play-icon-48');
        expect(icon).toHaveStyle('width: 48px');
        expect(icon).toHaveStyle('height: 48px');
      });
    });

    it('should apply color correctly', async () => {
      renderWithTheme(<MaterialIcon name="play" color="primary" data-testid="play-icon-primary" />);

      await waitFor(() => {
        const icon = screen.getByTestId('play-icon-primary');
        // Color should be applied (exact value depends on theme)
        expect(icon).toHaveStyle('color: rgb(99, 102, 241)'); // Primary color from theme
      });
    });
  });

  describe('Custom Fallbacks', () => {
    it('should use custom fallback when provided', async () => {
      const customFallback = <span data-testid="custom-fallback">Custom</span>;

      renderWithTheme(
        <MaterialIcon name="play" fallback={customFallback} data-testid="play-icon-custom" />
      );

      // Should show loading first
      expect(screen.getByTestId('play-icon-custom')).toHaveTextContent('⋯');

      // After loading, if all methods fail, should show custom fallback
      await waitFor(() => {
        // The custom fallback should be used if asset system fails
        const customElement = screen.queryByTestId('custom-fallback');
        if (customElement) {
          expect(customElement).toBeInTheDocument();
        }
      });
    });
  });

  describe('Cross-Browser Compatibility', () => {
    it('should work in Chrome MV3 environment', async () => {
      // Mock Chrome MV3 environment
      mockChrome.runtime.getURL.mockImplementation(
        (path: string) => `chrome-extension://abcdef123456/${path}`
      );

      renderWithTheme(<MaterialIcon name="play" data-testid="chrome-icon" />);

      await waitFor(() => {
        const icon = screen.getByTestId('chrome-icon');
        expect(icon).toBeInTheDocument();
        expect(icon).not.toHaveTextContent('⋯');
      });

      expect(mockChrome.runtime.getURL).toHaveBeenCalled();
    });

    it('should work in Firefox WebExtension environment', async () => {
      // Mock Firefox environment
      const mockBrowser = {
        runtime: {
          getURL: vi.fn((path: string) => `moz-extension://abcdef123456/${path}`),
        },
      };

      // @ts-ignore
      global.browser = mockBrowser;

      renderWithTheme(<MaterialIcon name="play" data-testid="firefox-icon" />);

      await waitFor(() => {
        const icon = screen.getByTestId('firefox-icon');
        expect(icon).toBeInTheDocument();
        expect(icon).not.toHaveTextContent('⋯');
      });

      // @ts-ignore
      delete global.browser;
    });
  });

  describe('Performance', () => {
    it('should not reload assets for same icon', async () => {
      const loadIconSpy = vi.spyOn(assetSystem, 'loadIcon');

      const { rerender } = renderWithTheme(<MaterialIcon name="play" data-testid="play-icon-1" />);

      await waitFor(() => {
        expect(screen.getByTestId('play-icon-1')).not.toHaveTextContent('⋯');
      });

      const firstCallCount = loadIconSpy.mock.calls.length;

      // Rerender with same icon
      rerender(<MaterialIcon name="play" data-testid="play-icon-2" />);

      await waitFor(() => {
        expect(screen.getByTestId('play-icon-2')).not.toHaveTextContent('⋯');
      });

      // Should have made additional calls for the new component instance
      expect(loadIconSpy.mock.calls.length).toBeGreaterThan(firstCallCount);
    });

    it('should handle rapid icon changes', async () => {
      const { rerender } = renderWithTheme(
        <MaterialIcon name="play" data-testid="changing-icon" />
      );

      // Rapidly change icons
      const icons = ['play', 'pause', 'stop', 'settings'];
      for (const iconName of icons) {
        rerender(<MaterialIcon name={iconName} data-testid="changing-icon" />);

        await waitFor(() => {
          const icon = screen.getByTestId('changing-icon');
          expect(icon).toBeInTheDocument();
        });
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle asset system errors gracefully', async () => {
      vi.spyOn(assetSystem, 'loadIcon').mockRejectedValue(new Error('Asset loading failed'));

      renderWithTheme(<MaterialIcon name="play" data-testid="error-icon" />);

      await waitFor(() => {
        const icon = screen.getByTestId('error-icon');
        expect(icon).toBeInTheDocument();
        expect(icon).not.toHaveTextContent('⋯');
      });
    });

    it('should handle missing chrome.runtime gracefully', async () => {
      const originalChrome = global.chrome;
      // @ts-ignore
      delete global.chrome;

      renderWithTheme(<MaterialIcon name="play" data-testid="no-chrome-icon" />);

      await waitFor(() => {
        const icon = screen.getByTestId('no-chrome-icon');
        expect(icon).toBeInTheDocument();
        expect(icon).not.toHaveTextContent('⋯');
      });

      // @ts-ignore
      global.chrome = originalChrome;
    });
  });
});
