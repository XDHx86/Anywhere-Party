/**
 * Tests for Feature Flags Client
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  FeatureFlagsClient,
  createFeatureFlagsClient,
  DEFAULT_FEATURE_FLAGS,
} from './feature-flags-client';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock AbortSignal.timeout for older environments
if (!AbortSignal.timeout) {
  AbortSignal.timeout = vi.fn().mockReturnValue(new AbortController().signal);
}

describe('FeatureFlagsClient', () => {
  let client: FeatureFlagsClient;
  const mockServerUrl = 'http://localhost:8081';
  const mockUserId = 'test-user-123';

  beforeEach(() => {
    vi.clearAllMocks();
    client = createFeatureFlagsClient(mockServerUrl, mockUserId, {
      enableLogging: false,
      cacheTimeout: 1000, // 1 second for testing
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('getFlags', () => {
    it('should fetch flags from server on first call', async () => {
      const mockFlags = {
        'webrtc-voice-chat': true,
        'advanced-annotations': false,
        'beta-features': true,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ flags: mockFlags }),
      });

      const result = await client.getFlags();

      expect(mockFetch).toHaveBeenCalledWith(
        `${mockServerUrl}/flags?userId=${mockUserId}`,
        expect.objectContaining({
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })
      );

      expect(result).toEqual({
        flags: mockFlags,
        userId: mockUserId,
        timestamp: expect.any(Number),
        source: 'server',
      });
    });

    it('should use cached flags when cache is valid', async () => {
      const mockFlags = { 'webrtc-voice-chat': true };

      // First call - fetch from server
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ flags: mockFlags }),
      });

      await client.getFlags();
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      const result = await client.getFlags();
      expect(mockFetch).toHaveBeenCalledTimes(1); // No additional fetch
      expect(result.source).toBe('cache');
    });

    it('should fetch from server when cache expires', async () => {
      const mockFlags = { 'webrtc-voice-chat': true };

      // First call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ flags: mockFlags }),
      });

      await client.getFlags();

      // Wait for cache to expire
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Second call - should fetch again
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ flags: mockFlags }),
      });

      const result = await client.getFlags();
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.source).toBe('server');
    });

    it('should use fallback flags when server is unavailable and no cache', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await client.getFlags();

      expect(result).toEqual({
        flags: DEFAULT_FEATURE_FLAGS,
        userId: mockUserId,
        timestamp: expect.any(Number),
        source: 'fallback',
      });
    });

    it('should use expired cache when server is unavailable', async () => {
      const mockFlags = { 'webrtc-voice-chat': true };

      // First call - successful
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ flags: mockFlags }),
      });

      await client.getFlags();

      // Wait for cache to expire
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Second call - server unavailable
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await client.getFlags();
      expect(result.flags).toEqual(mockFlags);
      expect(result.source).toBe('cache');
    });
  });

  describe('isEnabled', () => {
    it('should return true for enabled flags', async () => {
      const mockFlags = { 'webrtc-voice-chat': true };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ flags: mockFlags }),
      });

      const result = await client.isEnabled('webrtc-voice-chat');
      expect(result).toBe(true);
    });

    it('should return false for disabled flags', async () => {
      const mockFlags = { 'webrtc-voice-chat': false };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ flags: mockFlags }),
      });

      const result = await client.isEnabled('webrtc-voice-chat');
      expect(result).toBe(false);
    });

    it('should return false for unknown flags', async () => {
      const mockFlags = { 'webrtc-voice-chat': true };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ flags: mockFlags }),
      });

      const result = await client.isEnabled('unknown-flag');
      expect(result).toBe(false);
    });
  });

  describe('getSpecificFlags', () => {
    it('should return only requested flags', async () => {
      const mockFlags = {
        'webrtc-voice-chat': true,
        'advanced-annotations': false,
        'beta-features': true,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ flags: mockFlags }),
      });

      const result = await client.getSpecificFlags(['webrtc-voice-chat', 'beta-features']);

      expect(result).toEqual({
        'webrtc-voice-chat': true,
        'beta-features': true,
      });
    });

    it('should return false for unknown flags in specific request', async () => {
      const mockFlags = { 'webrtc-voice-chat': true };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ flags: mockFlags }),
      });

      const result = await client.getSpecificFlags(['webrtc-voice-chat', 'unknown-flag']);

      expect(result).toEqual({
        'webrtc-voice-chat': true,
        'unknown-flag': false,
      });
    });
  });

  describe('cache management', () => {
    it('should invalidate cache for current user', async () => {
      const mockFlags = { 'webrtc-voice-chat': true };

      // First call - fetch from server
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ flags: mockFlags }),
      });

      await client.getFlags();
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Invalidate cache
      client.invalidateCache();

      // Second call - should fetch again
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ flags: mockFlags }),
      });

      await client.getFlags();
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should invalidate all cache', async () => {
      const mockFlags = { 'webrtc-voice-chat': true };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ flags: mockFlags }),
      });

      await client.getFlags();

      client.invalidateAllCache();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ flags: mockFlags }),
      });

      await client.getFlags();
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('configuration updates', () => {
    it('should update configuration', () => {
      const newConfig = {
        cacheTimeout: 10000,
        enableLogging: true,
      };

      client.updateConfig(newConfig);

      const status = client.getStatus();
      expect(status.config.cacheTimeout).toBe(10000);
      expect(status.config.enableLogging).toBe(true);
    });

    it('should invalidate cache when userId changes', async () => {
      const mockFlags = { 'webrtc-voice-chat': true };

      // First call with original userId
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ flags: mockFlags }),
      });

      await client.getFlags();
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Update userId
      client.updateConfig({ userId: 'new-user-456' });

      // Next call should fetch again due to cache invalidation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ flags: mockFlags }),
      });

      await client.getFlags();
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('status and monitoring', () => {
    it('should provide status information', async () => {
      const status = client.getStatus();

      expect(status).toEqual({
        serverAvailable: true,
        lastServerCheck: 0,
        cacheSize: 0,
        config: expect.objectContaining({
          serverUrl: mockServerUrl,
          userId: mockUserId,
        }),
      });
    });

    it('should update server availability status', async () => {
      // Successful call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ flags: {} }),
      });

      await client.getFlags();
      expect(client.getStatus().serverAvailable).toBe(true);

      // Invalidate cache to force server call
      client.invalidateCache();

      // Failed call
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      await client.getFlags();
      expect(client.getStatus().serverAvailable).toBe(false);
    });
  });

  describe('preloadFlags', () => {
    it('should preload flags successfully', async () => {
      const mockFlags = { 'webrtc-voice-chat': true };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ flags: mockFlags }),
      });

      await client.preloadFlags();

      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Subsequent call should use cache
      const result = await client.getFlags();
      expect(result.source).toBe('cache');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should handle preload failures gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      // Should not throw
      await expect(client.preloadFlags()).resolves.toBeUndefined();
    });
  });

  describe('periodic refresh', () => {
    it('should set up periodic refresh', async () => {
      vi.useFakeTimers();

      const mockFlags = { 'webrtc-voice-chat': true };
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ flags: mockFlags }),
      });

      const stopRefresh = client.setupPeriodicRefresh(1000); // 1 second

      // Initial state
      expect(mockFetch).not.toHaveBeenCalled();

      // Advance time
      vi.advanceTimersByTime(1000);

      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Advance again
      vi.advanceTimersByTime(1000);

      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Stop refresh
      stopRefresh();

      // Advance time - should not fetch anymore
      vi.advanceTimersByTime(1000);

      expect(mockFetch).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });
  });

  describe('error handling', () => {
    it('should handle server errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const result = await client.getFlags();

      expect(result.source).toBe('fallback');
      expect(result.flags).toEqual(DEFAULT_FEATURE_FLAGS);
    });

    it('should handle invalid JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      const result = await client.getFlags();

      expect(result.source).toBe('fallback');
      expect(result.flags).toEqual(DEFAULT_FEATURE_FLAGS);
    });
  });
});

describe('createFeatureFlagsClient', () => {
  it('should create client with default configuration', () => {
    const client = createFeatureFlagsClient('http://localhost:8081', 'user123');
    const status = client.getStatus();

    expect(status.config).toEqual({
      serverUrl: 'http://localhost:8081',
      userId: 'user123',
      cacheTimeout: 5 * 60 * 1000,
      fallbackFlags: DEFAULT_FEATURE_FLAGS,
      enableLogging: false,
    });
  });

  it('should create client with custom configuration', () => {
    const overrides = {
      cacheTimeout: 10000,
      enableLogging: true,
      fallbackFlags: { 'custom-flag': true },
    };

    const client = createFeatureFlagsClient('http://localhost:8081', 'user123', overrides);
    const status = client.getStatus();

    expect(status.config.cacheTimeout).toBe(10000);
    expect(status.config.enableLogging).toBe(true);
    expect(status.config.fallbackFlags).toEqual({ 'custom-flag': true });
  });
});
