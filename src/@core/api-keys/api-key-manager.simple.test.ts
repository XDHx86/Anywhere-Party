/**
 * Simplified API Key Manager Tests
 * Core functionality tests for API key persistence and validation
 * Requirements: 35.5, 44.5
 */

// Mock browser APIs before importing
const mockStorage = {
  get: jest.fn().mockResolvedValue({}),
  set: jest.fn().mockResolvedValue(undefined),
  remove: jest.fn().mockResolvedValue(undefined),
  clear: jest.fn().mockResolvedValue(undefined),
};

// Mock the browser bridge creation
jest.mock('../browser-bridge', () => ({
  createBrowserBridge: () => ({
    storage: { local: mockStorage },
    runtime: { id: 'test-extension' },
    tabs: { query: jest.fn(), sendMessage: jest.fn() },
    manifestVersion: 3,
  }),
}));

// Mock fetch for API testing
global.fetch = jest.fn();

import { APIKeyManager } from './api-key-manager';

describe('APIKeyManager - Core Functionality', () => {
  let apiKeyManager: APIKeyManager;

  beforeEach(() => {
    jest.clearAllMocks();
    apiKeyManager = new APIKeyManager();
  });

  describe('API Key Storage and Retrieval', () => {
    it('should store and retrieve API key', async () => {
      const service = 'opensubtitles';
      const key = 'test-api-key-123';

      // Mock empty storage initially
      mockStorage.get.mockResolvedValue({});

      // Store the key
      await apiKeyManager.storeAPIKey(service, key);

      // Verify storage was called
      expect(mockStorage.set).toHaveBeenCalled();

      // Get the stored data
      const setCall = mockStorage.set.mock.calls[0][0];
      const storedData = setCall.watchPartyAPIKeys;

      // Mock retrieval
      mockStorage.get.mockResolvedValue({ watchPartyAPIKeys: storedData });

      // Retrieve the key
      const retrievedKey = await apiKeyManager.getAPIKey(service);

      expect(retrievedKey).toBe(key);
    });

    it('should encrypt stored keys', async () => {
      const service = 'opensubtitles';
      const key = 'test-api-key-123';

      mockStorage.get.mockResolvedValue({});

      await apiKeyManager.storeAPIKey(service, key);

      const setCall = mockStorage.set.mock.calls[0][0];
      const storedKey = setCall.watchPartyAPIKeys[service].key;

      // Key should be encrypted (different from original)
      expect(storedKey).not.toBe(key);
      expect(storedKey).toMatch(/^[A-Za-z0-9+/]+=*$/); // Base64 pattern
    });

    it('should return null for non-existent key', async () => {
      mockStorage.get.mockResolvedValue({});

      const key = await apiKeyManager.getAPIKey('nonexistent');

      expect(key).toBeNull();
    });

    it('should validate required parameters', async () => {
      await expect(apiKeyManager.storeAPIKey('', 'key')).rejects.toThrow();
      await expect(apiKeyManager.storeAPIKey('service', '')).rejects.toThrow();
    });
  });

  describe('API Key Validation', () => {
    beforeEach(() => {
      (fetch as jest.Mock).mockClear();
    });

    it('should validate OpenSubtitles API key', async () => {
      const service = 'opensubtitles';
      const key = 'valid-key';

      (fetch as jest.Mock).mockResolvedValue({
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
          }),
        })
      );
    });

    it('should handle invalid API key', async () => {
      const service = 'opensubtitles';
      const key = 'invalid-key';

      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      const isValid = await apiKeyManager.validateAPIKey(service, key);

      expect(isValid).toBe(false);
    });

    it('should handle network errors', async () => {
      const service = 'opensubtitles';
      const key = 'test-key';

      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const isValid = await apiKeyManager.validateAPIKey(service, key);

      expect(isValid).toBe(false);
    });
  });

  describe('API Key Management', () => {
    it('should list stored keys', async () => {
      const keys = {
        opensubtitles: {
          service: 'opensubtitles',
          key: 'key1',
          encrypted: true,
          createdAt: new Date(),
        },
        tmdb: { service: 'tmdb', key: 'key2', encrypted: true, createdAt: new Date() },
      };

      mockStorage.get.mockResolvedValue({ watchPartyAPIKeys: keys });

      const services = await apiKeyManager.listStoredKeys();

      expect(services).toEqual(['opensubtitles', 'tmdb']);
    });

    it('should check if API key exists', async () => {
      const keys = {
        opensubtitles: {
          service: 'opensubtitles',
          key: 'key1',
          encrypted: true,
          createdAt: new Date(),
        },
      };

      mockStorage.get.mockResolvedValue({ watchPartyAPIKeys: keys });

      const hasKey = await apiKeyManager.hasAPIKey('opensubtitles');
      const noKey = await apiKeyManager.hasAPIKey('tmdb');

      expect(hasKey).toBe(true);
      expect(noKey).toBe(false);
    });

    it('should remove API key', async () => {
      const keys = {
        opensubtitles: {
          service: 'opensubtitles',
          key: 'key1',
          encrypted: true,
          createdAt: new Date(),
        },
        tmdb: { service: 'tmdb', key: 'key2', encrypted: true, createdAt: new Date() },
      };

      mockStorage.get.mockResolvedValue({ watchPartyAPIKeys: keys });

      await apiKeyManager.removeAPIKey('opensubtitles');

      expect(mockStorage.set).toHaveBeenCalledWith({
        watchPartyAPIKeys: {
          tmdb: keys.tmdb,
        },
      });
    });

    it('should clear all API keys', async () => {
      await apiKeyManager.clearAllAPIKeys();

      expect(mockStorage.remove).toHaveBeenCalledWith('watchPartyAPIKeys');
    });
  });

  describe('Error Handling', () => {
    it('should handle storage errors', async () => {
      mockStorage.get.mockRejectedValue(new Error('Storage error'));

      await expect(apiKeyManager.storeAPIKey('service', 'key')).rejects.toThrow();
    });

    it('should handle encryption errors gracefully', async () => {
      // Mock btoa to throw error
      const originalBtoa = global.btoa;
      global.btoa = jest.fn().mockImplementation(() => {
        throw new Error('Encryption error');
      });

      mockStorage.get.mockResolvedValue({});

      // Should still work (fallback to unencrypted)
      await expect(apiKeyManager.storeAPIKey('service', 'key')).resolves.not.toThrow();

      // Restore btoa
      global.btoa = originalBtoa;
    });
  });
});
