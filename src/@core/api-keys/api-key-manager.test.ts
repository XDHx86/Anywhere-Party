/**
 * API Key Manager Tests
 * Comprehensive tests for API key persistence, retrieval, and security
 * Requirements: 35.5, 44.5
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock browser APIs before importing. vi.hoisted exposes the mock object to the
// (hoisted) vi.mock factory below, which runs before module-body statements.
const { mockBrowserAPI } = vi.hoisted(() => ({
  mockBrowserAPI: {
    storage: {
      local: {
        get: vi.fn().mockResolvedValue({}),
        set: vi.fn().mockResolvedValue(undefined),
        remove: vi.fn().mockResolvedValue(undefined),
        clear: vi.fn().mockResolvedValue(undefined),
      },
    },
    runtime: {
      sendMessage: vi.fn().mockResolvedValue({ success: true }),
      onMessage: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
      id: 'mock-extension-id',
    },
    tabs: {
      query: vi.fn().mockResolvedValue([]),
      sendMessage: vi.fn().mockResolvedValue({ success: true }),
    },
  },
}));

// Mock the browser bridge creation
vi.mock('../browser-bridge', () => ({
  createBrowserBridge: () => mockBrowserAPI,
}));

import { APIKeyManager, APIKeyConfig, APIKeyValidationResult } from './api-key-manager';

// Mock fetch for API testing
global.fetch = vi.fn();

describe('APIKeyManager', () => {
  let apiKeyManager: APIKeyManager;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create new instance for each test
    apiKeyManager = new APIKeyManager();
  });

  describe('API Key Storage', () => {
    it('should store API key with encryption', async () => {
      const service = 'opensubtitles';
      const key = 'test-api-key-123';

      mockBrowserAPI.storage.local.get.mockResolvedValue({});
      mockBrowserAPI.storage.local.set.mockResolvedValue(undefined);

      await apiKeyManager.storeAPIKey(service, key);

      expect(mockBrowserAPI.storage.local.set).toHaveBeenCalledWith({
        watchPartyAPIKeys: {
          [service]: expect.objectContaining({
            service,
            encrypted: true,
            createdAt: expect.any(Date),
            key: expect.any(String), // Should be encrypted
          }),
        },
      });

      // Verify the key is encrypted (not stored in plain text)
      const setCall = mockBrowserAPI.storage.local.set.mock.calls[0][0];
      const storedKey = setCall.watchPartyAPIKeys[service].key;
      expect(storedKey).not.toBe(key);
      expect(storedKey).toMatch(/^[A-Za-z0-9+/]+=*$/); // Base64 pattern
    });

    it('should retrieve and decrypt API key', async () => {
      const service = 'opensubtitles';
      const originalKey = 'test-api-key-123';

      // Store the key first
      mockBrowserAPI.storage.local.get.mockResolvedValue({});
      mockBrowserAPI.storage.local.set.mockResolvedValue(undefined);
      await apiKeyManager.storeAPIKey(service, originalKey);

      // Get the encrypted key from the mock call
      const setCall = mockBrowserAPI.storage.local.set.mock.calls[0][0];
      const storedData = setCall.watchPartyAPIKeys;

      // Mock retrieval
      mockBrowserAPI.storage.local.get.mockResolvedValue({
        watchPartyAPIKeys: storedData,
      });

      const retrievedKey = await apiKeyManager.getAPIKey(service);

      expect(retrievedKey).toBe(originalKey);
      expect(mockBrowserAPI.storage.local.set).toHaveBeenCalledTimes(2); // Once for store, once for lastUsed update
    });

    it('should return null for non-existent API key', async () => {
      mockBrowserAPI.storage.local.get.mockResolvedValue({});

      const key = await apiKeyManager.getAPIKey('nonexistent');

      expect(key).toBeNull();
    });

    it('should handle storage errors gracefully', async () => {
      const service = 'opensubtitles';
      const key = 'test-api-key-123';

      // storeAPIKey swallows read errors (getAllStoredKeys returns {}) but
      // re-throws when the write fails, so reject on `set`.
      mockBrowserAPI.storage.local.get.mockResolvedValue({});
      mockBrowserAPI.storage.local.set.mockRejectedValue(new Error('Storage error'));

      await expect(apiKeyManager.storeAPIKey(service, key)).rejects.toThrow(
        'Failed to store API key for opensubtitles'
      );
    });

    it('should validate required parameters', async () => {
      // storeAPIKey re-throws the validation failure as a wrapped
      // "Failed to store API key for <service>" error, so only assert that
      // empty parameters cause a rejection.
      await expect(apiKeyManager.storeAPIKey('', 'key')).rejects.toThrow();
      await expect(apiKeyManager.storeAPIKey('service', '')).rejects.toThrow();
    });
  });

  describe('API Key Removal', () => {
    it('should remove API key from storage', async () => {
      const service = 'opensubtitles';
      const existingKeys = {
        [service]: {
          service,
          key: 'encrypted-key',
          encrypted: true,
          createdAt: new Date(),
        },
        tmdb: {
          service: 'tmdb',
          key: 'another-key',
          encrypted: true,
          createdAt: new Date(),
        },
      };

      mockBrowserAPI.storage.local.get.mockResolvedValue({
        watchPartyAPIKeys: existingKeys,
      });
      mockBrowserAPI.storage.local.set.mockResolvedValue(undefined);

      await apiKeyManager.removeAPIKey(service);

      expect(mockBrowserAPI.storage.local.set).toHaveBeenCalledWith({
        watchPartyAPIKeys: {
          tmdb: existingKeys.tmdb,
        },
      });
    });

    it('should handle removal of non-existent key', async () => {
      mockBrowserAPI.storage.local.get.mockResolvedValue({});
      mockBrowserAPI.storage.local.set.mockResolvedValue(undefined);

      await expect(apiKeyManager.removeAPIKey('nonexistent')).resolves.not.toThrow();
    });
  });

  describe('API Key Validation', () => {
    beforeEach(() => {
      (fetch as vi.Mock).mockClear();
    });

    it('should validate OpenSubtitles API key', async () => {
      const service = 'opensubtitles';
      const key = 'valid-opensubtitles-key';

      // Mock successful API response
      (fetch as vi.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ user: { id: 123 } }),
      });

      const isValid = await apiKeyManager.validateAPIKey(service, key);

      expect(isValid).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        'https://api.opensubtitles.com/api/v1/infos/user',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Api-Key': key,
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should validate TMDB API key', async () => {
      const service = 'tmdb';
      const key = 'valid-tmdb-key';

      // Mock successful API response
      (fetch as vi.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ images: { base_url: 'https://image.tmdb.org/' } }),
      });

      const isValid = await apiKeyManager.validateAPIKey(service, key);

      expect(isValid).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        `https://api.themoviedb.org/3/configuration?api_key=${key}`
      );
    });

    it('should handle invalid API key', async () => {
      const service = 'opensubtitles';
      const key = 'invalid-key';

      // Mock API error response
      (fetch as vi.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      const isValid = await apiKeyManager.validateAPIKey(service, key);

      expect(isValid).toBe(false);
    });

    it('should handle network errors during validation', async () => {
      const service = 'opensubtitles';
      const key = 'test-key';

      // Mock network error
      (fetch as vi.Mock).mockRejectedValue(new Error('Network error'));

      const isValid = await apiKeyManager.validateAPIKey(service, key);

      expect(isValid).toBe(false);
    });

    it('should handle unknown service', async () => {
      const service = 'unknown-service';
      const key = 'test-key';

      const isValid = await apiKeyManager.validateAPIKey(service, key);

      expect(isValid).toBe(false);
    });
  });

  describe('API Connection Testing', () => {
    beforeEach(() => {
      (fetch as vi.Mock).mockClear();
    });

    it('should test OpenSubtitles API connection', async () => {
      const service = 'opensubtitles';
      const key = 'test-key';

      // Mock successful API response
      (fetch as vi.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ user: { id: 123 } }),
      });

      const result = await apiKeyManager.testAPIConnection(service, key);

      expect(result).toEqual({
        isValid: true,
        service: 'opensubtitles',
        testedAt: expect.any(Date),
      });
    });

    it('should test TMDB API connection', async () => {
      const service = 'tmdb';
      const key = 'test-key';

      // Mock successful API response
      (fetch as vi.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ images: { base_url: 'https://image.tmdb.org/' } }),
      });

      const result = await apiKeyManager.testAPIConnection(service, key);

      expect(result).toEqual({
        isValid: true,
        service: 'tmdb',
        testedAt: expect.any(Date),
      });
    });

    it('should handle API connection failure', async () => {
      const service = 'opensubtitles';
      const key = 'invalid-key';

      // Mock API error response
      (fetch as vi.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      const result = await apiKeyManager.testAPIConnection(service, key);

      expect(result).toEqual({
        isValid: false,
        error: 'API returned 401: Unauthorized',
        service: 'opensubtitles',
        testedAt: expect.any(Date),
      });
    });

    it('should test connection with stored key', async () => {
      const service = 'opensubtitles';
      const key = 'stored-key';

      // Store the key first
      mockBrowserAPI.storage.local.get.mockResolvedValue({});
      mockBrowserAPI.storage.local.set.mockResolvedValue(undefined);
      await apiKeyManager.storeAPIKey(service, key);

      // Mock retrieval for testing
      const setCall = mockBrowserAPI.storage.local.set.mock.calls[0][0];
      mockBrowserAPI.storage.local.get.mockResolvedValue({
        watchPartyAPIKeys: setCall.watchPartyAPIKeys,
      });

      // Mock successful API response
      (fetch as vi.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ user: { id: 123 } }),
      });

      const result = await apiKeyManager.testAPIConnection(service);

      expect(result.isValid).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        'https://api.opensubtitles.com/api/v1/infos/user',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Api-Key': key,
          }),
        })
      );
    });
  });

  describe('API Key Information', () => {
    it('should list stored API key services', async () => {
      const keys = {
        opensubtitles: {
          service: 'opensubtitles',
          key: 'encrypted-key-1',
          encrypted: true,
          createdAt: new Date(),
        },
        tmdb: {
          service: 'tmdb',
          key: 'encrypted-key-2',
          encrypted: true,
          createdAt: new Date(),
        },
      };

      mockBrowserAPI.storage.local.get.mockResolvedValue({
        watchPartyAPIKeys: keys,
      });

      const services = await apiKeyManager.listStoredKeys();

      expect(services).toEqual(['opensubtitles', 'tmdb']);
    });

    it('should get API key info without exposing the key', async () => {
      const service = 'opensubtitles';
      const keyConfig = {
        service,
        key: 'encrypted-key',
        encrypted: true,
        createdAt: new Date('2023-01-01'),
        lastUsed: new Date('2023-01-02'),
        isValid: true,
      };

      mockBrowserAPI.storage.local.get.mockResolvedValue({
        watchPartyAPIKeys: { [service]: keyConfig },
      });

      const info = await apiKeyManager.getAPIKeyInfo(service);

      expect(info).toEqual({
        service,
        encrypted: true,
        createdAt: keyConfig.createdAt,
        lastUsed: keyConfig.lastUsed,
        isValid: true,
      });
      expect(info).not.toHaveProperty('key');
    });

    it('should check if API key exists', async () => {
      const keys = {
        opensubtitles: {
          service: 'opensubtitles',
          key: 'encrypted-key',
          encrypted: true,
          createdAt: new Date(),
        },
      };

      mockBrowserAPI.storage.local.get.mockResolvedValue({
        watchPartyAPIKeys: keys,
      });

      const hasOpenSubtitles = await apiKeyManager.hasAPIKey('opensubtitles');
      const hasTmdb = await apiKeyManager.hasAPIKey('tmdb');

      expect(hasOpenSubtitles).toBe(true);
      expect(hasTmdb).toBe(false);
    });
  });

  describe('Encryption and Security', () => {
    it('should encrypt keys differently each time', async () => {
      const service = 'opensubtitles';
      const key = 'test-key';

      // Store the same key twice
      mockBrowserAPI.storage.local.get.mockResolvedValue({});
      mockBrowserAPI.storage.local.set.mockResolvedValue(undefined);

      await apiKeyManager.storeAPIKey(service, key);
      const firstEncrypted =
        mockBrowserAPI.storage.local.set.mock.calls[0][0].watchPartyAPIKeys[service].key;

      // Clear mocks and store again
      mockBrowserAPI.storage.local.set.mockClear();
      await apiKeyManager.storeAPIKey(service, key);
      const secondEncrypted =
        mockBrowserAPI.storage.local.set.mock.calls[0][0].watchPartyAPIKeys[service].key;

      // Should be different due to salt
      expect(firstEncrypted).not.toBe(secondEncrypted);
    });

    it('should handle encryption errors gracefully', async () => {
      const service = 'opensubtitles';
      const key = 'test-key';

      // Mock btoa to throw error
      const originalBtoa = global.btoa;
      global.btoa = vi.fn().mockImplementation(() => {
        throw new Error('Encryption error');
      });

      mockBrowserAPI.storage.local.get.mockResolvedValue({});
      mockBrowserAPI.storage.local.set.mockResolvedValue(undefined);

      await apiKeyManager.storeAPIKey(service, key);

      // Should still store the key (fallback to unencrypted)
      expect(mockBrowserAPI.storage.local.set).toHaveBeenCalled();

      // Restore btoa
      global.btoa = originalBtoa;
    });

    it('should handle decryption errors gracefully', async () => {
      const service = 'opensubtitles';
      const corruptedKey = 'corrupted-base64-data';

      mockBrowserAPI.storage.local.get.mockResolvedValue({
        watchPartyAPIKeys: {
          [service]: {
            service,
            key: corruptedKey,
            encrypted: true,
            createdAt: new Date(),
          },
        },
      });

      // Mock atob to throw error
      const originalAtob = global.atob;
      global.atob = vi.fn().mockImplementation(() => {
        throw new Error('Decryption error');
      });

      const retrievedKey = await apiKeyManager.getAPIKey(service);

      // Should return the corrupted key as fallback
      expect(retrievedKey).toBe(corruptedKey);

      // Restore atob
      global.atob = originalAtob;
    });
  });

  describe('Utility Functions', () => {
    it('should clear all API keys', async () => {
      mockBrowserAPI.storage.local.remove.mockResolvedValue(undefined);

      await apiKeyManager.clearAllAPIKeys();

      expect(mockBrowserAPI.storage.local.remove).toHaveBeenCalledWith('watchPartyAPIKeys');
    });

    it('should export API key info without keys', async () => {
      const keys = {
        opensubtitles: {
          service: 'opensubtitles',
          key: 'encrypted-key-1',
          encrypted: true,
          createdAt: new Date('2023-01-01'),
          isValid: true,
        },
        tmdb: {
          service: 'tmdb',
          key: 'encrypted-key-2',
          encrypted: true,
          createdAt: new Date('2023-01-02'),
          isValid: false,
        },
      };

      mockBrowserAPI.storage.local.get.mockResolvedValue({
        watchPartyAPIKeys: keys,
      });

      const exported = await apiKeyManager.exportAPIKeyInfo();

      expect(exported).toEqual({
        opensubtitles: {
          service: 'opensubtitles',
          encrypted: true,
          createdAt: keys.opensubtitles.createdAt,
          isValid: true,
        },
        tmdb: {
          service: 'tmdb',
          encrypted: true,
          createdAt: keys.tmdb.createdAt,
          isValid: false,
        },
      });

      // Ensure no keys are exposed
      Object.values(exported).forEach((info) => {
        expect(info).not.toHaveProperty('key');
      });
    });

    it('should handle date serialization/deserialization', async () => {
      const service = 'opensubtitles';
      const key = 'test-key';
      const createdAt = new Date('2023-01-01T12:00:00Z');

      // Store key
      mockBrowserAPI.storage.local.get.mockResolvedValue({});
      mockBrowserAPI.storage.local.set.mockResolvedValue(undefined);
      await apiKeyManager.storeAPIKey(service, key);

      // Mock retrieval with string dates (as would happen in real storage)
      mockBrowserAPI.storage.local.get.mockResolvedValue({
        watchPartyAPIKeys: {
          [service]: {
            service,
            key: 'encrypted-key',
            encrypted: true,
            createdAt: createdAt.toISOString(),
            lastUsed: new Date('2023-01-02T12:00:00Z').toISOString(),
          },
        },
      });

      const info = await apiKeyManager.getAPIKeyInfo(service);

      expect(info?.createdAt).toBeInstanceOf(Date);
      expect(info?.lastUsed).toBeInstanceOf(Date);
      expect(info?.createdAt.getTime()).toBe(createdAt.getTime());
    });
  });

  describe('Error Handling', () => {
    it('should handle storage quota exceeded', async () => {
      const service = 'opensubtitles';
      const key = 'test-key';

      mockBrowserAPI.storage.local.get.mockResolvedValue({});
      mockBrowserAPI.storage.local.set.mockRejectedValue(new Error('QUOTA_EXCEEDED_ERR'));

      await expect(apiKeyManager.storeAPIKey(service, key)).rejects.toThrow(
        'Failed to store API key for opensubtitles'
      );
    });

    it('should handle corrupted storage data', async () => {
      const service = 'opensubtitles';

      // Mock corrupted data
      mockBrowserAPI.storage.local.get.mockResolvedValue({
        watchPartyAPIKeys: 'corrupted-data',
      });

      const keys = await apiKeyManager.listStoredKeys();

      expect(keys).toEqual([]);
    });

    it('should handle missing browser APIs gracefully', async () => {
      const service = 'opensubtitles';
      const key = 'test-key';

      // Mock browser bridge as undefined
      (apiKeyManager as any).browserBridge = undefined;

      await expect(apiKeyManager.storeAPIKey(service, key)).rejects.toThrow();
    });
  });
});
