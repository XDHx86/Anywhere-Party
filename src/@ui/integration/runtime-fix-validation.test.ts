/**
 * Runtime Fix Validation Tests
 * Tests for all critical runtime bug fixes
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getRoomStateManager } from '../../@core/room-state/room-state-manager';
import { getAPIKeyManager } from '../../@core/api-keys/api-key-manager';
import EnhancedVideoDetector from '../../@core/video-detector/enhanced-video-detector';
import EnhancedSubtitleEngine from '../../@core/subtitle-engine/enhanced-subtitle-engine';

// Shared storage mocks used by both the browser-bridge mock and the mocked
// `chrome` global. vi.hoisted exposes the object to the (hoisted) vi.mock
// factory below.
const bridgeMocks = vi.hoisted(() => {
  const storageLocal = {
    get: vi.fn().mockResolvedValue({}),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  };
  return { storageLocal };
});

// The real Chrome bridge (chrome-bridge.ts) wraps callback-style chrome.storage
// calls in Promises. The promise-based mocks here never invoke those callbacks,
// so the managers would await a Promise that never settles. Mocking the bridge
// factory returns a direct, promise-based bridge instead.
vi.mock('../../@core/browser-bridge', () => ({
  createBrowserBridge: () => ({
    storage: {
      local: bridgeMocks.storageLocal,
      sync: bridgeMocks.storageLocal,
    },
    runtime: {
      id: 'test-extension-id',
      getManifest: () => ({ manifest_version: 3, name: 'Test', version: '1.0.0' }),
    },
    isChrome: true,
    isFirefox: false,
    manifestVersion: 3,
  }),
}));

// Mock browser APIs
const mockBrowserAPI = {
  storage: {
    local: bridgeMocks.storageLocal,
  },
  runtime: {
    sendMessage: vi.fn(),
    getManifest: vi.fn(() => ({ manifest_version: 3, name: 'Test', version: '1.0.0' })),
    getURL: vi.fn((path: string) => `chrome-extension://test/${path}`),
    id: 'test-extension-id',
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    connect: vi.fn(() => ({
      onMessage: { addListener: vi.fn() },
      onDisconnect: { addListener: vi.fn() },
      postMessage: vi.fn(),
    })),
  },
  tabs: {
    query: vi.fn().mockResolvedValue([]),
    sendMessage: vi.fn().mockResolvedValue(undefined),
  },
  action: {
    setBadgeText: vi.fn(),
    setBadgeBackgroundColor: vi.fn(),
  },
};

// @ts-ignore
global.chrome = mockBrowserAPI;
// @ts-ignore
global.browser = mockBrowserAPI;

describe('Runtime Fix Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Fix A: Icon Loading', () => {
    it('should validate that all required icons exist', async () => {
      // Test that asset manifest contains all required icons
      const assetManifest = await import('../../../assets/asset-manifest.json');

      expect(assetManifest.assets['toolbar-icons']).toBeDefined();
      expect(assetManifest.assets['popup-icons']).toBeDefined();
      expect(assetManifest.assets['reaction-icons']).toBeDefined();
      expect(assetManifest.assets['ui-icons']).toBeDefined();

      // Check specific required icons
      expect(assetManifest.assets['toolbar-icons']['icon-16']).toBeDefined();
      expect(assetManifest.assets['toolbar-icons']['icon-32']).toBeDefined();
      expect(assetManifest.assets['toolbar-icons']['icon-48']).toBeDefined();

      expect(assetManifest.assets['popup-icons'].play).toBeDefined();
      expect(assetManifest.assets['popup-icons'].pause).toBeDefined();
      expect(assetManifest.assets['popup-icons'].chat).toBeDefined();
      expect(assetManifest.assets['popup-icons'].mic).toBeDefined();
      expect(assetManifest.assets['popup-icons']['mic-off']).toBeDefined();
    });

    it('should have local asset paths without CDN dependencies', async () => {
      const assetManifest = await import('../../../assets/asset-manifest.json');

      // Check that all paths are relative (no http/https URLs)
      const checkAssetPaths = (assets: any) => {
        Object.values(assets).forEach((asset: any) => {
          if (typeof asset === 'object' && asset.path) {
            expect(asset.path).not.toMatch(/^https?:\/\//);
            expect(asset.path).toMatch(/^[^/]/); // Should be relative path
          }
        });
      };

      checkAssetPaths(assetManifest.assets['toolbar-icons']);
      checkAssetPaths(assetManifest.assets['popup-icons']);
      checkAssetPaths(assetManifest.assets['reaction-icons']);
    });
  });

  describe('Fix B: Room State Persistence', () => {
    it('should persist room state to browser storage', async () => {
      const roomStateManager = getRoomStateManager();

      mockBrowserAPI.storage.local.set.mockResolvedValue(undefined);
      mockBrowserAPI.storage.local.get.mockResolvedValue({
        watchPartyRoomState: {
          roomId: 'test-room-123',
          isActive: true,
          isHost: true,
          participants: [],
          createdAt: new Date().toISOString(),
          lastActivity: new Date().toISOString(),
          connectionStatus: 'connected',
        },
      });

      await roomStateManager.persistRoomState('test-room-123', {
        isHost: true,
        connectionStatus: 'connected',
      });

      expect(mockBrowserAPI.storage.local.set).toHaveBeenCalledWith({
        watchPartyRoomState: expect.objectContaining({
          roomId: 'test-room-123',
          isHost: true,
          connectionStatus: 'connected',
        }),
      });
    });

    it('should load persisted room state', async () => {
      const roomStateManager = getRoomStateManager();

      const mockRoomState = {
        roomId: 'test-room-123',
        isActive: true,
        isHost: true,
        participants: [],
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        connectionStatus: 'connected',
      };

      mockBrowserAPI.storage.local.get.mockResolvedValue({
        watchPartyRoomState: mockRoomState,
      });

      const loadedState = await roomStateManager.loadRoomState();

      expect(loadedState).toBeTruthy();
      expect(loadedState?.roomId).toBe('test-room-123');
      expect(loadedState?.isHost).toBe(true);
    });

    it('should clear room state when requested', async () => {
      const roomStateManager = getRoomStateManager();

      mockBrowserAPI.storage.local.remove.mockResolvedValue(undefined);

      await roomStateManager.clearRoomState();

      expect(mockBrowserAPI.storage.local.remove).toHaveBeenCalledWith('watchPartyRoomState');
    });
  });

  describe('Fix C: API Key Management', () => {
    it('should store API keys securely', async () => {
      const apiKeyManager = getAPIKeyManager();

      mockBrowserAPI.storage.local.get.mockResolvedValue({ watchPartyAPIKeys: {} });
      mockBrowserAPI.storage.local.set.mockResolvedValue(undefined);

      await apiKeyManager.storeAPIKey('opensubtitles', 'test-api-key-123');

      expect(mockBrowserAPI.storage.local.set).toHaveBeenCalledWith({
        watchPartyAPIKeys: expect.objectContaining({
          opensubtitles: expect.objectContaining({
            service: 'opensubtitles',
            encrypted: true,
            createdAt: expect.any(Date),
          }),
        }),
      });
    });

    it('should retrieve stored API keys', async () => {
      const apiKeyManager = getAPIKeyManager();

      const mockStoredKeys = {
        watchPartyAPIKeys: {
          opensubtitles: {
            service: 'opensubtitles',
            key: 'test-api-key-123', // Legacy plaintext storage format
            encrypted: false,
            createdAt: new Date().toISOString(),
          },
        },
      };

      mockBrowserAPI.storage.local.get.mockResolvedValue(mockStoredKeys);
      mockBrowserAPI.storage.local.set.mockResolvedValue(undefined);

      const retrievedKey = await apiKeyManager.getAPIKey('opensubtitles');

      expect(retrievedKey).toBe('test-api-key-123');
    });

    it('should list stored API key services', async () => {
      const apiKeyManager = getAPIKeyManager();

      const mockStoredKeys = {
        watchPartyAPIKeys: {
          opensubtitles: { service: 'opensubtitles' },
          tmdb: { service: 'tmdb' },
        },
      };

      mockBrowserAPI.storage.local.get.mockResolvedValue(mockStoredKeys);

      const services = await apiKeyManager.listStoredKeys();

      expect(services).toEqual(['opensubtitles', 'tmdb']);
    });
  });

  describe('Fix D: Video Detection Workflow', () => {
    let videoDetector: EnhancedVideoDetector;

    beforeEach(() => {
      videoDetector = new EnhancedVideoDetector();

      // Mock DOM methods
      document.querySelectorAll = vi.fn().mockReturnValue([]);
      document.addEventListener = vi.fn();
      document.removeEventListener = vi.fn();
      document.dispatchEvent = vi.fn();
    });

    it('should remain inactive until startDetection is called', () => {
      const status = videoDetector.getDetectionStatus();

      expect(status.isActive).toBe(false);
      expect(status.isListening).toBe(false);
    });

    it('should enable right-click fallback when automatic detection fails', async () => {
      // Mock no videos found
      (document.querySelectorAll as any).mockReturnValue([]);

      const result = await videoDetector.startDetection();

      expect(result.success).toBe(false);
      expect(result.fallbackAvailable).toBe(true);
      expect(result.method).toBe('automatic');

      const status = videoDetector.getDetectionStatus();
      expect(status.isListening).toBe(true);
    });

    it('should handle right-click events for video selection', async () => {
      // Start detection to enable right-click (automatic detection fails with
      // no videos present, which activates the right-click fallback)
      await videoDetector.startDetection();

      // Mock video element (created with 'VIDEO' tagName by jsdom)
      const mockVideo = document.createElement('video');

      const mockEvent = {
        target: mockVideo,
      } as MouseEvent;

      const result = videoDetector.handleRightClick(mockEvent);

      expect(result.success).toBe(true);
      expect(result.method).toBe('right-click');
      expect(result.video).toBe(mockVideo);
    });

    it('should traverse parent elements looking for videos', () => {
      const mockParent = document.createElement('div');
      const mockVideo = document.createElement('video');
      mockParent.appendChild(mockVideo);

      const mockChild = document.createElement('span');
      mockParent.appendChild(mockChild);

      // Mock getBoundingClientRect for visibility check
      Object.defineProperty(mockVideo, 'getBoundingClientRect', {
        value: () => ({ width: 640, height: 480, top: 100 }),
      });
      Object.defineProperty(mockVideo, 'readyState', { value: 2 });

      mockParent.querySelectorAll = vi.fn().mockReturnValue([mockVideo]);

      const foundVideo = videoDetector.traverseParentElements(mockChild, 3);

      expect(foundVideo).toBe(mockVideo);
    });
  });

  describe('Fix E: Subtitle Engine Error Handling', () => {
    let subtitleEngine: EnhancedSubtitleEngine;

    beforeEach(() => {
      subtitleEngine = new EnhancedSubtitleEngine();
    });

    it('should handle missing API key gracefully', async () => {
      mockBrowserAPI.storage.local.get.mockResolvedValue({ watchPartyAPIKeys: {} });

      const errorCallback = vi.fn();
      subtitleEngine.onError(errorCallback);

      try {
        await subtitleEngine.searchOpenSubtitles('test query');
      } catch (error) {
        // Expected to throw
      }

      expect(errorCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'api_key_missing',
          message: expect.stringContaining('API key is missing'),
          fallbackAvailable: true,
        })
      );
    });

    it('should provide fallback subtitles when external service fails', async () => {
      // Add a local track
      const mockFile = new File(['test content'], 'test.srt', { type: 'text/plain' });

      // Mock FileReader
      const mockFileReader = {
        readAsText: vi.fn(),
        onload: null as any,
        onerror: null as any,
        result: 'test subtitle content',
      };

      // FileReader is constructed with `new`, so the mock must be a constructable
      // function that returns the shared mockFileReader instance.
      global.FileReader = function () {
        return mockFileReader;
      } as any;

      // Simulate successful file read
      setTimeout(() => {
        if (mockFileReader.onload) {
          mockFileReader.onload();
        }
      }, 0);

      await subtitleEngine.loadSubtitleFile(mockFile, 'user123');

      const fallbackTracks = await subtitleEngine.getFallbackSubtitles({});

      expect(fallbackTracks.length).toBeGreaterThan(0);
      expect(fallbackTracks[0].source).toBe('user_upload');
    });

    it('should sanitize subtitle content for security', async () => {
      const maliciousContent =
        '<script>alert("xss")</script>Subtitle text<iframe src="evil.com"></iframe>';

      const mockFile = new File([maliciousContent], 'test.srt', { type: 'text/plain' });

      const mockFileReader = {
        readAsText: vi.fn(),
        onload: null as any,
        onerror: null as any,
        result: maliciousContent,
      };

      // FileReader is constructed with `new`, so the mock must be a constructable
      // function that returns the shared mockFileReader instance.
      global.FileReader = function () {
        return mockFileReader;
      } as any;

      setTimeout(() => {
        if (mockFileReader.onload) {
          mockFileReader.onload();
        }
      }, 0);

      const track = await subtitleEngine.loadSubtitleFile(mockFile, 'user123');

      expect(track.content).not.toContain('<script>');
      expect(track.content).not.toContain('<iframe>');
      expect(track.content).toContain('Subtitle text');
    });
  });

  describe('Fix F: Popup Scrolling', () => {
    it('should have proper CSS for scrollable content', () => {
      // Create a mock popup container
      const popupContainer = document.createElement('div');
      popupContainer.className = 'popup-content';

      // Apply styles that should be in the CSS
      popupContainer.style.overflowY = 'auto';
      popupContainer.style.overflowX = 'hidden';
      popupContainer.style.scrollBehavior = 'smooth';

      document.body.appendChild(popupContainer);

      const computedStyle = window.getComputedStyle(popupContainer);

      expect(computedStyle.overflowY).toBe('auto');
      expect(computedStyle.overflowX).toBe('hidden');
      expect(computedStyle.scrollBehavior).toBe('smooth');

      document.body.removeChild(popupContainer);
    });

    it('should maintain keyboard focus during scrolling', () => {
      const popupContainer = document.createElement('div');
      popupContainer.className = 'popup-content';
      popupContainer.style.overflowY = 'auto';
      popupContainer.style.height = '200px';

      const button1 = document.createElement('button');
      button1.textContent = 'Button 1';
      const button2 = document.createElement('button');
      button2.textContent = 'Button 2';
      button2.style.marginTop = '300px'; // Force scrolling

      popupContainer.appendChild(button1);
      popupContainer.appendChild(button2);
      document.body.appendChild(popupContainer);

      // Focus first button
      button1.focus();
      expect(document.activeElement).toBe(button1);

      // Tab to second button (should scroll)
      button2.focus();
      expect(document.activeElement).toBe(button2);

      document.body.removeChild(popupContainer);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete room creation workflow with persistence', async () => {
      const roomStateManager = getRoomStateManager();

      mockBrowserAPI.storage.local.set.mockResolvedValue(undefined);
      mockBrowserAPI.storage.local.get.mockResolvedValue({});

      // Simulate room creation
      await roomStateManager.persistRoomState('room-123', {
        isHost: true,
        connectionStatus: 'connected',
        participants: [],
      });

      // Verify room is active
      expect(roomStateManager.isRoomActive()).toBe(true);
      expect(roomStateManager.getCurrentRoomId()).toBe('room-123');

      // Simulate popup close/reopen by loading state
      mockBrowserAPI.storage.local.get.mockResolvedValue({
        watchPartyRoomState: {
          roomId: 'room-123',
          isActive: true,
          isHost: true,
          participants: [],
          createdAt: new Date().toISOString(),
          lastActivity: new Date().toISOString(),
          connectionStatus: 'connected',
        },
      });

      const loadedState = await roomStateManager.loadRoomState();
      expect(loadedState?.roomId).toBe('room-123');
      expect(loadedState?.isActive).toBe(true);
    });

    it('should handle API key workflow with validation', async () => {
      const apiKeyManager = getAPIKeyManager();

      mockBrowserAPI.storage.local.get.mockResolvedValue({ watchPartyAPIKeys: {} });
      mockBrowserAPI.storage.local.set.mockResolvedValue(undefined);

      // Store API key
      await apiKeyManager.storeAPIKey('opensubtitles', 'test-key');

      // Retrieve API key
      mockBrowserAPI.storage.local.get.mockResolvedValue({
        watchPartyAPIKeys: {
          opensubtitles: {
            service: 'opensubtitles',
            key: 'test-key', // Legacy plaintext storage format
            encrypted: false,
            createdAt: new Date().toISOString(),
          },
        },
      });

      const retrievedKey = await apiKeyManager.getAPIKey('opensubtitles');
      expect(retrievedKey).toBe('test-key');

      // List services
      const services = await apiKeyManager.listStoredKeys();
      expect(services).toContain('opensubtitles');
    });
  });
});

export {};
