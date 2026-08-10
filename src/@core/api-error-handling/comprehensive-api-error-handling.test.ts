/**
 * Comprehensive API Error Handling Integration Test
 * Tests that all external API errors are handled gracefully without crashing
 * Requirements: 43.1, 43.2, 43.3, 43.4, 43.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EnhancedSubtitleEngine } from '../subtitle-engine/enhanced-subtitle-engine';

// Mock the API key manager as a single shared instance. The engine captures
// getAPIKeyManager() in a class field, so every caller must receive the same
// object for the test's per-test mock setup to take effect.
const { mockAPIKeyManager } = vi.hoisted(() => ({
  mockAPIKeyManager: {
    getAPIKey: vi.fn(),
    validateAPIKey: vi.fn(),
    storeAPIKey: vi.fn(),
    removeAPIKey: vi.fn(),
    listStoredKeys: vi.fn(),
    testAPIConnection: vi.fn(),
  },
}));

vi.mock('../api-keys/api-key-manager', () => ({
  getAPIKeyManager: () => mockAPIKeyManager,
}));

// Mock chrome runtime for settings page
const mockChrome = {
  runtime: {
    openOptionsPage: vi.fn(),
    getURL: vi.fn((path: string) => `chrome-extension://test/${path}`),
  },
};

(global as any).chrome = mockChrome;

describe('Comprehensive API Error Handling', () => {
  let subtitleEngine: EnhancedSubtitleEngine;
  let errorCallback: vi.Mock;

  beforeEach(() => {
    subtitleEngine = new EnhancedSubtitleEngine();
    errorCallback = vi.fn();

    // Subscribe to error notifications
    subtitleEngine.onError(errorCallback);

    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('API Key Missing Scenarios', () => {
    it('should handle missing API key without crashing the extension', async () => {
      // Mock API key manager to return null (no key stored)
      mockAPIKeyManager.getAPIKey.mockResolvedValue(null);

      // This should not throw an uncaught exception
      const results = await subtitleEngine.searchOpenSubtitles('test query');

      expect(results).toEqual([]);
      expect(errorCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'api_key_missing',
          message: expect.stringContaining('API key is missing'),
          action: expect.objectContaining({
            text: 'Open Settings',
            callback: expect.any(Function),
          }),
          fallbackAvailable: true,
          retryable: false,
        })
      );

      // Verify no uncaught exceptions were thrown
      expect(() => {
        // Trigger the settings action
        const errorCall = errorCallback.mock.calls[0][0];
        errorCall.action.callback();
      }).not.toThrow();

      expect(mockChrome.runtime.openOptionsPage).toHaveBeenCalled();
    });

    it('should display clear error message with settings link', async () => {
      mockAPIKeyManager.getAPIKey.mockResolvedValue(null);

      await subtitleEngine.searchOpenSubtitles('test query');

      const errorCall = errorCallback.mock.calls[0][0];
      expect(errorCall.message).toContain('API key is missing');
      expect(errorCall.message).toContain('Configure it in settings');
      expect(errorCall.action.text).toBe('Open Settings');
    });
  });

  describe('Network Error Scenarios', () => {
    beforeEach(() => {
      // Mock valid API key for network error tests
      mockAPIKeyManager.getAPIKey.mockResolvedValue('valid-key');
      mockAPIKeyManager.validateAPIKey.mockResolvedValue(true);
    });

    it('should handle network errors without throwing uncaught exceptions', async () => {
      // Mock fetch to throw network error
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      // This should not crash the extension
      const results = await subtitleEngine.searchOpenSubtitles('test query');

      expect(results).toEqual([]);
      expect(errorCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'network_error',
          fallbackAvailable: true,
          retryable: true,
        })
      );
    });

    it('should handle API service unavailable errors gracefully', async () => {
      // Mock fetch to return 503 Service Unavailable
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
      });

      const results = await subtitleEngine.searchOpenSubtitles('test query');

      expect(results).toEqual([]);
      expect(errorCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'service_unavailable',
          fallbackAvailable: true,
          retryable: true,
        })
      );
    });
  });

  describe('Fallback Functionality', () => {
    it('should continue operating with local subtitle files when external APIs fail', async () => {
      // Add a local subtitle file
      const localFile = new File(['1\n00:00:01,000 --> 00:00:03,000\nLocal subtitle'], 'local.srt');
      await subtitleEngine.loadSubtitleFile(localFile, 'user1');

      // Mock API failure
      mockAPIKeyManager.getAPIKey.mockResolvedValue(null);

      // Search should fail gracefully but local tracks should still be available
      const searchResults = await subtitleEngine.searchOpenSubtitles('test');
      expect(searchResults).toEqual([]);

      // Local functionality should still work
      const allTracks = subtitleEngine.getAllTracks();
      expect(allTracks).toHaveLength(1);
      expect(allTracks[0].content).toContain('Local subtitle');
      expect(allTracks[0].source).toBe('user_upload');

      // Fallback subtitles should be available
      const fallbackTracks = await subtitleEngine.getFallbackSubtitles({});
      expect(fallbackTracks).toHaveLength(1);
      expect(fallbackTracks[0].content).toContain('Local subtitle');
    });

    it('should provide actionable call-to-action for API key configuration', async () => {
      mockAPIKeyManager.getAPIKey.mockResolvedValue(null);

      subtitleEngine.showAPIKeyMissingDialog();

      expect(errorCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'api_key_missing',
          action: expect.objectContaining({
            text: 'Open Settings',
            callback: expect.any(Function),
          }),
        })
      );

      // Verify the action works
      const errorCall = errorCallback.mock.calls[0][0];
      expect(() => errorCall.action.callback()).not.toThrow();
      expect(mockChrome.runtime.openOptionsPage).toHaveBeenCalled();
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should handle multiple consecutive API failures without degrading', async () => {
      mockAPIKeyManager.getAPIKey.mockResolvedValue('valid-key');
      mockAPIKeyManager.validateAPIKey.mockResolvedValue(true);

      // Mock multiple different types of failures
      global.fetch = vi
        .fn()
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce({ ok: false, status: 429 }) // Rate limit
        .mockResolvedValueOnce({ ok: false, status: 503 }); // Service unavailable

      // All calls should handle errors gracefully
      const results1 = await subtitleEngine.searchOpenSubtitles('query1');
      const results2 = await subtitleEngine.searchOpenSubtitles('query2');
      const results3 = await subtitleEngine.searchOpenSubtitles('query3');

      expect(results1).toEqual([]);
      expect(results2).toEqual([]);
      expect(results3).toEqual([]);

      // Should have received 3 error notifications
      expect(errorCallback).toHaveBeenCalledTimes(3);

      // All errors should be properly categorized
      const errorTypes = errorCallback.mock.calls.map((call) => call[0].type);
      expect(errorTypes).toContain('network_error');
      expect(errorTypes).toContain('service_unavailable');
    });

    it('should maintain functionality after error recovery', async () => {
      // Start with missing API key
      mockAPIKeyManager.getAPIKey.mockResolvedValue(null);

      // First call should fail gracefully
      const results1 = await subtitleEngine.searchOpenSubtitles('query1');
      expect(results1).toEqual([]);

      // Simulate API key being added
      mockAPIKeyManager.getAPIKey.mockResolvedValue('valid-key');
      mockAPIKeyManager.validateAPIKey.mockResolvedValue(true);
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      // Second call should work normally
      const results2 = await subtitleEngine.searchOpenSubtitles('query2');
      expect(results2).toEqual([]);
      expect(fetch).toHaveBeenCalled();
    });
  });

  describe('Error Message Quality', () => {
    it('should provide clear and actionable error messages', async () => {
      const testCases = [
        {
          scenario: 'missing API key',
          setup: () => mockAPIKeyManager.getAPIKey.mockResolvedValue(null),
          expectedMessage: /API key is missing.*Configure it in settings/,
          expectedAction: 'Open Settings',
        },
        {
          scenario: 'invalid API key',
          setup: () => {
            mockAPIKeyManager.getAPIKey.mockResolvedValue('invalid-key');
            mockAPIKeyManager.validateAPIKey.mockResolvedValue(false);
          },
          expectedMessage: /API key is invalid.*check your settings/,
          expectedAction: 'Update API Key',
        },
      ];

      for (const testCase of testCases) {
        errorCallback.mockClear();
        testCase.setup();

        await subtitleEngine.searchOpenSubtitles('test');

        expect(errorCallback).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringMatching(testCase.expectedMessage),
            action: expect.objectContaining({
              text: expect.stringContaining(testCase.expectedAction),
            }),
          })
        );
      }
    });
  });
});
