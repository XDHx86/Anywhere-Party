/**
 * Enhanced Subtitle Engine Error Handling Tests
 * Tests graceful error handling for API failures and missing keys
 * Requirements: 34.1, 34.2, 34.3, 34.4, 34.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EnhancedSubtitleEngine } from './enhanced-subtitle-engine';
import { getAPIKeyManager } from '../api-keys/api-key-manager';

// Mock the API key manager
vi.mock('../api-keys/api-key-manager', () => ({
  getAPIKeyManager: vi.fn(() => ({
    getAPIKey: vi.fn(),
    validateAPIKey: vi.fn(),
    storeAPIKey: vi.fn(),
    removeAPIKey: vi.fn(),
    listStoredKeys: vi.fn(),
    testAPIConnection: vi.fn(),
  })),
}));

// Mock chrome runtime for settings page
const mockChrome = {
  runtime: {
    openOptionsPage: vi.fn(),
    getURL: vi.fn((path: string) => `chrome-extension://test/${path}`),
  },
};

(global as any).chrome = mockChrome;

describe('EnhancedSubtitleEngine Error Handling', () => {
  let engine: EnhancedSubtitleEngine;
  let mockAPIKeyManager: any;
  let errorCallback: vi.Mock;

  beforeEach(() => {
    engine = new EnhancedSubtitleEngine();
    mockAPIKeyManager = getAPIKeyManager();
    errorCallback = vi.fn();

    // Subscribe to error notifications
    engine.onError(errorCallback);

    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('API Key Missing Scenarios', () => {
    it('should handle missing OpenSubtitles API key gracefully', async () => {
      // Mock API key manager to return null (no key stored)
      mockAPIKeyManager.getAPIKey.mockResolvedValue(null);

      const results = await engine.searchOpenSubtitles('test query');

      expect(results).toEqual([]);
      expect(errorCallback).toHaveBeenCalledWith({
        type: 'api_key_missing',
        message:
          'opensubtitles API key is missing. Configure it in settings to enable subtitle search.',
        action: {
          text: 'Open Settings',
          callback: expect.any(Function),
        },
        fallbackAvailable: true,
        retryable: false,
      });
    });

    it('should handle invalid API key gracefully', async () => {
      // Mock API key manager to return invalid key
      mockAPIKeyManager.getAPIKey.mockResolvedValue('invalid-key');
      mockAPIKeyManager.validateAPIKey.mockResolvedValue(false);

      const results = await engine.searchOpenSubtitles('test query');

      expect(results).toEqual([]);
      expect(errorCallback).toHaveBeenCalledWith({
        type: 'api_key_missing',
        message: 'OpenSubtitles API key is invalid. Please check your settings.',
        action: {
          text: 'Update API Key',
          callback: expect.any(Function),
        },
        fallbackAvailable: false,
        retryable: false,
      });
    });

    it('should show API key missing dialog', () => {
      engine.showAPIKeyMissingDialog();

      expect(errorCallback).toHaveBeenCalledWith({
        type: 'api_key_missing',
        message:
          'opensubtitles API key is missing. Configure it in settings to enable subtitle search.',
        action: {
          text: 'Open Settings',
          callback: expect.any(Function),
        },
        fallbackAvailable: true,
        retryable: false,
      });
    });
  });

  describe('Network Error Scenarios', () => {
    beforeEach(() => {
      // Mock valid API key for all network error tests
      mockAPIKeyManager.getAPIKey.mockResolvedValue('valid-key');
      mockAPIKeyManager.validateAPIKey.mockResolvedValue(true);

      // Clear previous error callback calls
      errorCallback.mockClear();
    });

    it('should handle network errors gracefully', async () => {
      // Mock fetch to throw network error
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const results = await engine.searchOpenSubtitles('test query');

      expect(results).toEqual([]);
      expect(errorCallback).toHaveBeenCalledWith({
        type: 'network_error',
        message: 'Failed to search subtitles. Check your internet connection.',
        action: undefined,
        fallbackAvailable: true,
        retryable: true,
      });
    });

    it('should handle 401 unauthorized responses', async () => {
      // Mock fetch to return 401
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      });

      const results = await engine.searchOpenSubtitles('test query');

      expect(results).toEqual([]);
      expect(errorCallback).toHaveBeenCalledWith({
        type: 'api_key_missing',
        message:
          'opensubtitles API key is missing. Configure it in settings to enable subtitle search.',
        action: {
          text: 'Open Settings',
          callback: expect.any(Function),
        },
        fallbackAvailable: true,
        retryable: false,
      });
    });

    it('should handle 429 rate limit responses', async () => {
      // Mock fetch to return 429
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
      });

      const results = await engine.searchOpenSubtitles('test query');

      expect(results).toEqual([]);
      expect(errorCallback).toHaveBeenCalledWith({
        type: 'service_unavailable',
        message: 'OpenSubtitles API rate limit exceeded. Please try again later.',
        action: undefined,
        fallbackAvailable: true,
        retryable: true,
      });
    });

    it('should handle other API errors', async () => {
      // Mock fetch to return 500
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      const results = await engine.searchOpenSubtitles('test query');

      expect(results).toEqual([]);
      expect(errorCallback).toHaveBeenCalledWith({
        type: 'service_unavailable',
        message: 'OpenSubtitles API error: 500',
        action: undefined,
        fallbackAvailable: true,
        retryable: true,
      });
    });
  });

  describe('File Loading Error Scenarios', () => {
    it('should handle invalid file formats', async () => {
      const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' });

      await expect(engine.loadSubtitleFile(invalidFile, 'user1')).rejects.toThrow(
        'Invalid subtitle file format. Only SRT and VTT files are supported.'
      );

      expect(errorCallback).toHaveBeenCalledWith({
        type: 'invalid_response',
        message: 'Invalid subtitle file format. Only SRT and VTT files are supported.',
        action: undefined,
        fallbackAvailable: false,
        retryable: false,
      });
    });

    it('should handle files that are too large', async () => {
      // Create a large file (6MB)
      const largeContent = 'x'.repeat(6 * 1024 * 1024);
      const largeFile = new File([largeContent], 'test.srt', { type: 'text/plain' });

      await expect(engine.loadSubtitleFile(largeFile, 'user1')).rejects.toThrow(
        'Subtitle file is too large. Maximum size is 5MB.'
      );

      expect(errorCallback).toHaveBeenCalledWith({
        type: 'invalid_response',
        message: 'Subtitle file is too large. Maximum size is 5MB.',
        action: undefined,
        fallbackAvailable: false,
        retryable: false,
      });
    });
  });

  describe('Fallback Functionality', () => {
    it('should provide fallback subtitles when external services fail', async () => {
      // Add some local tracks
      const localFile = new File(['1\n00:00:01,000 --> 00:00:03,000\nTest subtitle'], 'test.srt');
      await engine.loadSubtitleFile(localFile, 'user1');

      const fallbackTracks = await engine.getFallbackSubtitles({});

      expect(fallbackTracks).toHaveLength(1);
      expect(fallbackTracks[0].source).toBe('user_upload');
      expect(fallbackTracks[0].content).toContain('Test subtitle');
    });

    it('should continue operating with local files when API fails', async () => {
      // Add local track
      const localFile = new File(['1\n00:00:01,000 --> 00:00:03,000\nLocal subtitle'], 'local.srt');
      await engine.loadSubtitleFile(localFile, 'user1');

      // Mock API failure
      mockAPIKeyManager.getAPIKey.mockResolvedValue(null);

      // Search should fail gracefully but local tracks should still be available
      const searchResults = await engine.searchOpenSubtitles('test');
      expect(searchResults).toEqual([]);

      const allTracks = engine.getAllTracks();
      expect(allTracks).toHaveLength(1);
      expect(allTracks[0].content).toContain('Local subtitle');
    });
  });

  describe('Error Handling Utilities', () => {
    it('should handle different error types correctly', () => {
      const apiKeyError = engine.handleAPIError(new Error('API key missing'));
      expect(apiKeyError.type).toBe('api_key_missing');

      const networkError = engine.handleAPIError(new Error('network timeout'));
      expect(networkError.type).toBe('network_error');

      const rateLimitError = engine.handleAPIError(new Error('rate limit exceeded'));
      expect(rateLimitError.type).toBe('service_unavailable');

      const genericError = engine.handleAPIError(new Error('unknown error'));
      expect(genericError.type).toBe('invalid_response');
    });

    it('should open settings page when action is triggered', () => {
      engine.showAPIKeyMissingDialog();

      const errorCall = errorCallback.mock.calls[0][0];
      expect(errorCall.action).toBeDefined();

      // Trigger the action
      errorCall.action.callback();

      expect(mockChrome.runtime.openOptionsPage).toHaveBeenCalled();
    });
  });

  describe('Download Error Scenarios', () => {
    beforeEach(() => {
      mockAPIKeyManager.getAPIKey.mockResolvedValue('valid-key');
      mockAPIKeyManager.validateAPIKey.mockResolvedValue(true);
      errorCallback.mockClear();
    });

    it('should handle download failures gracefully', async () => {
      const mockResult = {
        id: 'test-id',
        language: 'English',
        fileName: 'test.srt',
        downloadUrl: 'https://example.com/subtitle.srt',
        rating: 5,
        downloads: 100,
      };

      // Mock fetch to fail
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      const track = await engine.downloadFromOpenSubtitles(mockResult, 'user1');

      // Should return fallback track
      expect(track.fileName).toBe('Subtitle unavailable');
      expect(track.enabled).toBe(false);
      expect(track.content).toBe('');

      expect(errorCallback).toHaveBeenCalledWith({
        type: 'service_unavailable',
        message: 'Failed to download subtitle file from OpenSubtitles.',
        action: undefined,
        fallbackAvailable: true,
        retryable: true,
      });
    });

    it('should handle missing API key during download', async () => {
      mockAPIKeyManager.getAPIKey.mockResolvedValue(null);

      const mockResult = {
        id: 'test-id',
        language: 'English',
        fileName: 'test.srt',
        downloadUrl: 'https://example.com/subtitle.srt',
        rating: 5,
        downloads: 100,
      };

      const track = await engine.downloadFromOpenSubtitles(mockResult, 'user1');

      // Should return fallback track
      expect(track.fileName).toBe('Subtitle unavailable');
      expect(errorCallback).toHaveBeenCalledWith({
        type: 'api_key_missing',
        message:
          'opensubtitles API key is missing. Configure it in settings to enable subtitle search.',
        action: {
          text: 'Open Settings',
          callback: expect.any(Function),
        },
        fallbackAvailable: true,
        retryable: false,
      });
    });
  });
});
