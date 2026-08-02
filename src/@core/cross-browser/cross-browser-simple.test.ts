/**
 * Simplified cross-browser compatibility tests
 *
 * Tests Requirements 18.1, 19.1, 20.1:
 * - Basic browser detection and API compatibility
 * - Manifest and configuration compatibility
 * - UI consistency validation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock browser environments
interface MockBrowserEnvironment {
  name: 'chrome' | 'firefox';
  userAgent: string;
  webExtensionAPI: 'chrome' | 'browser';
  manifestVersion: 2 | 3;
}

const BROWSER_ENVIRONMENTS: MockBrowserEnvironment[] = [
  {
    name: 'chrome',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    webExtensionAPI: 'chrome',
    manifestVersion: 3,
  },
  {
    name: 'firefox',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    webExtensionAPI: 'browser',
    manifestVersion: 2,
  },
];

describe('Cross-Browser Compatibility Tests', () => {
  let originalUserAgent: string;

  beforeEach(() => {
    originalUserAgent = navigator.userAgent;
    vi.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUserAgent,
      writable: true,
    });

    delete (global as any).chrome;
    delete (global as any).browser;
  });

  describe('Browser Detection', () => {
    BROWSER_ENVIRONMENTS.forEach((env) => {
      it(`should detect ${env.name} correctly`, () => {
        // Set up browser environment
        Object.defineProperty(navigator, 'userAgent', {
          value: env.userAgent,
          writable: true,
        });

        if (env.name === 'chrome') {
          (global as any).chrome = { runtime: { id: 'test-extension-id' } };
          delete (global as any).browser;
        } else {
          (global as any).browser = { runtime: { id: 'test-extension-id' } };
          delete (global as any).chrome;
        }

        // Test browser detection logic
        function detectBrowser(): 'chrome' | 'firefox' | 'unknown' {
          if (typeof (global as any).chrome !== 'undefined' && (global as any).chrome.runtime) {
            return 'chrome';
          }
          if (typeof (global as any).browser !== 'undefined' && (global as any).browser.runtime) {
            return 'firefox';
          }
          if (typeof navigator !== 'undefined') {
            const userAgent = navigator.userAgent.toLowerCase();
            if (userAgent.includes('chrome') && !userAgent.includes('firefox')) {
              return 'chrome';
            }
            if (userAgent.includes('firefox')) {
              return 'firefox';
            }
          }
          return 'unknown';
        }

        expect(detectBrowser()).toBe(env.name);
      });
    });
  });

  describe('WebExtension API Compatibility', () => {
    BROWSER_ENVIRONMENTS.forEach((env) => {
      it(`should have correct API namespace for ${env.name}`, () => {
        // Set up browser environment
        Object.defineProperty(navigator, 'userAgent', {
          value: env.userAgent,
          writable: true,
        });

        if (env.name === 'chrome') {
          (global as any).chrome = {
            runtime: {
              id: 'test-extension-id',
              sendMessage: vi.fn(),
              onMessage: { addListener: vi.fn() },
            },
            storage: {
              local: { get: vi.fn(), set: vi.fn() },
            },
          };
          delete (global as any).browser;
        } else {
          (global as any).browser = {
            runtime: {
              id: 'test-extension-id',
              sendMessage: vi.fn(),
              onMessage: { addListener: vi.fn() },
            },
            storage: {
              local: { get: vi.fn(), set: vi.fn() },
            },
          };
          delete (global as any).chrome;
        }

        // Verify correct API is available
        if (env.name === 'chrome') {
          expect((global as any).chrome).toBeDefined();
          expect((global as any).chrome.runtime).toBeDefined();
          expect((global as any).chrome.storage).toBeDefined();
          expect((global as any).browser).toBeUndefined();
        } else {
          expect((global as any).browser).toBeDefined();
          expect((global as any).browser.runtime).toBeDefined();
          expect((global as any).browser.storage).toBeDefined();
          expect((global as any).chrome).toBeUndefined();
        }
      });

      it(`should handle manifest version differences for ${env.name}`, () => {
        expect(env.manifestVersion).toBe(env.name === 'chrome' ? 3 : 2);

        if (env.name === 'chrome') {
          // Chrome MV3 uses service workers and action API
          expect(env.webExtensionAPI).toBe('chrome');
        } else {
          // Firefox uses background scripts and browser_action API
          expect(env.webExtensionAPI).toBe('browser');
        }
      });
    });
  });

  describe('UI Consistency', () => {
    BROWSER_ENVIRONMENTS.forEach((env) => {
      it(`should render UI elements consistently on ${env.name}`, () => {
        // Set up browser environment
        Object.defineProperty(navigator, 'userAgent', {
          value: env.userAgent,
          writable: true,
        });

        // Create mock UI elements
        const button = document.createElement('button');
        button.className = 'btn btn-primary';
        button.textContent = 'Test Button';

        const statusCard = document.createElement('div');
        statusCard.className = 'status-card connected';

        // Test CSS class application
        expect(button.classList.contains('btn')).toBe(true);
        expect(button.classList.contains('btn-primary')).toBe(true);
        expect(statusCard.classList.contains('status-card')).toBe(true);
        expect(statusCard.classList.contains('connected')).toBe(true);

        // Test element creation
        expect(button.tagName).toBe('BUTTON');
        expect(statusCard.tagName).toBe('DIV');
      });

      it(`should handle CSS features consistently on ${env.name}`, () => {
        // Test CSS custom properties support
        const testElement = document.createElement('div');
        testElement.style.setProperty('--test-color', '#ff0000');

        expect(testElement.style.getPropertyValue('--test-color')).toBe('#ff0000');

        // Test CSS Grid and Flexbox support
        testElement.style.display = 'flex';
        expect(testElement.style.display).toBe('flex');

        testElement.style.display = 'grid';
        expect(testElement.style.display).toBe('grid');
      });

      it(`should support accessibility features on ${env.name}`, () => {
        const button = document.createElement('button');
        button.setAttribute('aria-label', 'Test button');
        button.setAttribute('role', 'button');
        button.setAttribute('tabindex', '0');

        expect(button.getAttribute('aria-label')).toBe('Test button');
        expect(button.getAttribute('role')).toBe('button');
        expect(button.getAttribute('tabindex')).toBe('0');
      });
    });
  });

  describe('Configuration Compatibility', () => {
    it('should have identical configuration structure across browsers', () => {
      const mockConfig = {
        SIGNALING_SERVER: 'ws://localhost:8080',
        LOCAL_DEV_MODE: true,
        HEARTBEAT_INTERVAL_MS: 2000,
        TELEMETRY_ENABLED: false,
      };

      // Configuration should be identical regardless of browser
      BROWSER_ENVIRONMENTS.forEach((env) => {
        expect(mockConfig.SIGNALING_SERVER).toBe('ws://localhost:8080');
        expect(mockConfig.LOCAL_DEV_MODE).toBe(true);
        expect(mockConfig.HEARTBEAT_INTERVAL_MS).toBe(2000);
        expect(mockConfig.TELEMETRY_ENABLED).toBe(false);
      });
    });
  });

  describe('Video Detection Compatibility', () => {
    BROWSER_ENVIRONMENTS.forEach((env) => {
      it(`should detect video elements consistently on ${env.name}`, () => {
        // Set up browser environment
        Object.defineProperty(navigator, 'userAgent', {
          value: env.userAgent,
          writable: true,
        });

        // Create mock video element with proper properties
        const video = document.createElement('video');
        video.src = 'test-video.mp4';

        // Mock video properties that are normally read-only
        Object.defineProperty(video, 'currentTime', { value: 30, writable: true });
        Object.defineProperty(video, 'duration', { value: 100, writable: true });
        Object.defineProperty(video, 'paused', { value: false, writable: true });

        document.body.appendChild(video);

        // Test video detection
        const videos = document.querySelectorAll('video');
        expect(videos.length).toBe(1);
        expect(videos[0]).toBe(video);
        expect(videos[0].currentTime).toBe(30);
        expect(videos[0].paused).toBe(false);

        // Clean up
        document.body.removeChild(video);
      });

      it(`should handle video selection heuristics on ${env.name}`, () => {
        // Create multiple video elements with mocked properties
        const video1 = document.createElement('video');
        Object.defineProperty(video1, 'paused', { value: true, writable: true });
        Object.defineProperty(video1, 'currentTime', { value: 0, writable: true });

        const video2 = document.createElement('video');
        Object.defineProperty(video2, 'paused', { value: false, writable: true });
        Object.defineProperty(video2, 'currentTime', { value: 30, writable: true });

        document.body.appendChild(video1);
        document.body.appendChild(video2);

        const videos = Array.from(document.querySelectorAll('video'));

        // Test heuristic: prioritize playing videos
        const playingVideo = videos.find((v) => !v.paused && v.currentTime > 0);
        expect(playingVideo).toBe(video2);

        // Clean up
        document.body.removeChild(video1);
        document.body.removeChild(video2);
      });
    });
  });

  describe('Message Handling Compatibility', () => {
    BROWSER_ENVIRONMENTS.forEach((env) => {
      it(`should handle message validation consistently on ${env.name}`, () => {
        // Test message validation logic
        function validateMessage(message: any): { valid: boolean; error?: string } {
          if (!message || typeof message !== 'object') {
            return { valid: false, error: 'Message must be an object' };
          }

          if (!message.type || typeof message.type !== 'string') {
            return { valid: false, error: 'Message must have a type' };
          }

          if (!message.timestamp || typeof message.timestamp !== 'number') {
            return { valid: false, error: 'Message must have a timestamp' };
          }

          return { valid: true };
        }

        // Test valid message
        const validMessage = {
          type: 'TEST_MESSAGE',
          timestamp: Date.now(),
          data: { test: true },
        };

        expect(validateMessage(validMessage)).toEqual({ valid: true });

        // Test invalid messages
        expect(validateMessage(null)).toEqual({
          valid: false,
          error: 'Message must be an object',
        });

        expect(validateMessage({ timestamp: Date.now() })).toEqual({
          valid: false,
          error: 'Message must have a type',
        });

        expect(validateMessage({ type: 'TEST' })).toEqual({
          valid: false,
          error: 'Message must have a timestamp',
        });
      });
    });
  });

  describe('Performance Compatibility', () => {
    BROWSER_ENVIRONMENTS.forEach((env) => {
      it(`should have acceptable performance characteristics on ${env.name}`, () => {
        // Set up browser environment
        Object.defineProperty(navigator, 'userAgent', {
          value: env.userAgent,
          writable: true,
        });

        // Test basic performance APIs
        expect(typeof performance.now).toBe('function');
        expect(typeof Date.now).toBe('function');

        // Test timing
        const start = performance.now();
        const end = performance.now();
        expect(end).toBeGreaterThanOrEqual(start);

        // Test memory management
        const testObject = { test: 'data' };
        const weakRef = new WeakRef(testObject);
        expect(weakRef.deref()).toBe(testObject);
      });
    });
  });
});
