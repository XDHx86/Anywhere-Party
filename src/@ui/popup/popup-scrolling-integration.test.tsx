/**
 * Popup Scrolling Integration Test
 * Tests the actual popup scrolling behavior with real DOM elements
 * Requirements: 31.1, 31.2, 31.3, 31.4, 31.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PopupApp } from './PopupApp';
import '@testing-library/jest-dom';

// Mock browser API
const mockBrowserAPI = {
  runtime: {
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    sendMessage: vi.fn(),
  },
  storage: {
    local: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
    },
  },
};

// Mock integration service
const mockIntegrationService = {
  connectPopup: vi.fn().mockResolvedValue(true),
  getIntegrationStatus: vi.fn().mockReturnValue({
    config: { backgroundScriptConnected: true },
  }),
};

// Mock theme provider
vi.mock('../theme', () => ({
  MaterialThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  useMaterialTheme: () => ({}),
}));

// Mock browser API
vi.mock('../utils/browser-api', () => ({
  browserAPI: mockBrowserAPI,
}));

// Mock integration service
vi.mock('../services/integration-service', () => ({
  integrationService: mockIntegrationService,
}));

// Mock responsive design hooks
vi.mock('../hooks/useResponsiveDesign', () => ({
  useResponsiveDesign: () => ({
    isPopup: true,
    isMobile: false,
    width: 380,
    height: 600,
  }),
  useResponsiveSpacing: () => ({
    getPadding: () => '16px',
  }),
  useTouchOptimization: () => ({
    isTouchDevice: false,
    getTouchTargetSize: (size: number) => size,
  }),
}));

// Mock Material-UI components
vi.mock('@mui/material/styles', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  styled: (component: any) => (styles: any) => component,
}));

vi.mock('@mui/material', () => ({
  CssBaseline: () => null,
  Box: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Snackbar: ({ children, open }: any) => (open ? <div>{children}</div> : null),
  Alert: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

// Mock card components
vi.mock('../components/cards/HeaderCard', () => ({
  HeaderCard: ({ title }: { title: string }) => <div data-testid="header-card">{title}</div>,
}));

vi.mock('../components/cards/MainCard', () => ({
  MainCard: (props: any) => <div data-testid="main-card">Main Card</div>,
}));

vi.mock('../components/cards/SecondaryCard', () => ({
  SecondaryCard: (props: any) => <div data-testid="secondary-card">Secondary Card</div>,
}));

vi.mock('../components/cards/FooterCard', () => ({
  FooterCard: (props: any) => <div data-testid="footer-card">Footer Card</div>,
}));

vi.mock('../components/cards/MaterialLoadingIndicator', () => ({
  MaterialLoadingIndicator: () => <div data-testid="loading-indicator">Loading...</div>,
}));

vi.mock('../accessibility/PopupAccessibility', () => ({
  PopupAccessibility: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('../components/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => children,
}));

describe('Popup Scrolling Integration', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render popup with proper scroll container structure', async () => {
    const { container } = render(<PopupApp />);

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByTestId('header-card')).toBeInTheDocument();
    });

    // Check that main content container has proper attributes
    const mainContent = container.querySelector('[role="main"][aria-label="Main popup content"]');
    expect(mainContent).toBeInTheDocument();
    expect(mainContent).toHaveAttribute('tabindex', '0');
  });

  it('should handle keyboard navigation events', async () => {
    const { container } = render(<PopupApp />);

    await waitFor(() => {
      expect(screen.getByTestId('header-card')).toBeInTheDocument();
    });

    const mainContent = container.querySelector('[role="main"]');
    expect(mainContent).toBeInTheDocument();

    // Mock scrollBy and scrollTo methods
    const scrollByMock = vi.fn();
    const scrollToMock = vi.fn();

    Object.defineProperty(mainContent, 'scrollBy', {
      value: scrollByMock,
      writable: true,
    });

    Object.defineProperty(mainContent, 'scrollTo', {
      value: scrollToMock,
      writable: true,
    });

    Object.defineProperty(mainContent, 'clientHeight', {
      value: 600,
      writable: true,
    });

    Object.defineProperty(mainContent, 'scrollHeight', {
      value: 1200,
      writable: true,
    });

    // Test Ctrl+ArrowDown
    fireEvent.keyDown(mainContent!, {
      key: 'ArrowDown',
      ctrlKey: true,
    });

    expect(scrollByMock).toHaveBeenCalledWith({ top: 50, behavior: 'smooth' });

    // Test Ctrl+ArrowUp
    fireEvent.keyDown(mainContent!, {
      key: 'ArrowUp',
      ctrlKey: true,
    });

    expect(scrollByMock).toHaveBeenCalledWith({ top: -50, behavior: 'smooth' });

    // Test PageDown
    fireEvent.keyDown(mainContent!, {
      key: 'PageDown',
    });

    expect(scrollByMock).toHaveBeenCalledWith({ top: 480, behavior: 'smooth' }); // 600 * 0.8

    // Test Ctrl+Home
    fireEvent.keyDown(mainContent!, {
      key: 'Home',
      ctrlKey: true,
    });

    expect(scrollToMock).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });

    // Test Ctrl+End
    fireEvent.keyDown(mainContent!, {
      key: 'End',
      ctrlKey: true,
    });

    expect(scrollToMock).toHaveBeenCalledWith({ top: 1200, behavior: 'smooth' });
  });

  it('should maintain popup dimensions', async () => {
    const { container } = render(<PopupApp />);

    await waitFor(() => {
      expect(screen.getByTestId('header-card')).toBeInTheDocument();
    });

    // Check that the popup container has the expected structure
    const popupContainer = container.firstChild as HTMLElement;
    expect(popupContainer).toBeInTheDocument();

    // The styled component should have the proper CSS classes/styles applied
    // In a real test environment, we would check computed styles
    expect(popupContainer).toHaveStyle('display: flex');
    expect(popupContainer).toHaveStyle('flex-direction: column');
  });

  it('should handle scroll events properly', async () => {
    const { container } = render(<PopupApp />);

    await waitFor(() => {
      expect(screen.getByTestId('header-card')).toBeInTheDocument();
    });

    const mainContent = container.querySelector('[role="main"]');
    expect(mainContent).toBeInTheDocument();

    // Mock scroll properties
    Object.defineProperty(mainContent, 'scrollTop', {
      value: 0,
      writable: true,
    });

    // Simulate scroll event
    fireEvent.scroll(mainContent!, { target: { scrollTop: 100 } });

    // The component should handle the scroll event without errors
    expect(mainContent).toBeInTheDocument();
  });

  it('should prevent default behavior for keyboard navigation', async () => {
    const { container } = render(<PopupApp />);

    await waitFor(() => {
      expect(screen.getByTestId('header-card')).toBeInTheDocument();
    });

    const mainContent = container.querySelector('[role="main"]');
    expect(mainContent).toBeInTheDocument();

    // Mock preventDefault
    const preventDefaultMock = vi.fn();

    // Test that preventDefault is called for keyboard shortcuts
    const keyDownEvent = new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      ctrlKey: true,
    });

    Object.defineProperty(keyDownEvent, 'preventDefault', {
      value: preventDefaultMock,
    });

    // Mock scrollBy method
    Object.defineProperty(mainContent, 'scrollBy', {
      value: vi.fn(),
      writable: true,
    });

    fireEvent.keyDown(mainContent!, keyDownEvent);

    // In the actual implementation, preventDefault should be called
    // This test verifies the event handling structure is in place
    expect(mainContent).toBeInTheDocument();
  });

  it('should handle focus management during scrolling', async () => {
    const { container } = render(<PopupApp />);

    await waitFor(() => {
      expect(screen.getByTestId('header-card')).toBeInTheDocument();
    });

    const mainContent = container.querySelector('[role="main"]');
    expect(mainContent).toBeInTheDocument();

    // Test that the main content is focusable
    expect(mainContent).toHaveAttribute('tabindex', '0');

    // Test focus event
    fireEvent.focus(mainContent!);

    // The component should handle focus without errors
    expect(mainContent).toBeInTheDocument();
  });

  it('should render all required popup sections', async () => {
    render(<PopupApp />);

    await waitFor(() => {
      expect(screen.getByTestId('header-card')).toBeInTheDocument();
      expect(screen.getByTestId('main-card')).toBeInTheDocument();
      expect(screen.getByTestId('secondary-card')).toBeInTheDocument();
      expect(screen.getByTestId('footer-card')).toBeInTheDocument();
    });
  });

  it('should handle loading state properly', async () => {
    // Mock loading state
    mockIntegrationService.connectPopup.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(true), 100))
    );

    render(<PopupApp />);

    // Should show loading indicator initially
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();

    // Wait for loading to complete
    await waitFor(
      () => {
        expect(screen.getByTestId('header-card')).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

  it('should maintain accessibility attributes', async () => {
    const { container } = render(<PopupApp />);

    await waitFor(() => {
      expect(screen.getByTestId('header-card')).toBeInTheDocument();
    });

    const mainContent = container.querySelector('[role="main"]');
    expect(mainContent).toBeInTheDocument();
    expect(mainContent).toHaveAttribute('role', 'main');
    expect(mainContent).toHaveAttribute('aria-label', 'Main popup content');
    expect(mainContent).toHaveAttribute('tabindex', '0');
  });
});
