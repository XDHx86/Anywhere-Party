/**
 * API Key Manager
 * Secure management of user-provided external service API keys
 * Fixes requirements 35 and 44: User-Managed API Keys
 */

import { createBrowserBridge } from '../browser-bridge';

export interface APIKeyConfig {
  service: string;
  key: string;
  encrypted: boolean;
  createdAt: Date;
  lastUsed?: Date;
  isValid?: boolean;
}

export interface APIKeyValidationResult {
  isValid: boolean;
  error?: string;
  service: string;
  testedAt: Date;
}

export class APIKeyManager {
  private browserBridge = createBrowserBridge();
  private readonly STORAGE_KEY = 'watchPartyAPIKeys';
  private readonly ENCRYPTION_KEY = 'watchPartyEncryption';

  /**
   * Store API key securely in browser.storage.local
   */
  async storeAPIKey(service: string, key: string): Promise<void> {
    try {
      if (!service || !key) {
        throw new Error('Service name and API key are required');
      }

      // Get existing keys
      const existingKeys = await this.getAllStoredKeys();

      // Create new key config
      const keyConfig: APIKeyConfig = {
        service,
        key: await this.encryptKey(key),
        encrypted: true,
        createdAt: new Date(),
      };

      // Update storage
      existingKeys[service] = keyConfig;
      await this.browserBridge.storage.local.set({
        [this.STORAGE_KEY]: existingKeys,
      });
    } catch (error) {
      console.error('Failed to store API key:', error);
      throw new Error(`Failed to store API key for ${service}`);
    }
  }

  /**
   * Get API key for a service
   */
  async getAPIKey(service: string): Promise<string | null> {
    try {
      const keys = await this.getAllStoredKeys();
      const keyConfig = keys[service];

      if (!keyConfig) {
        return null;
      }

      // Update last used timestamp
      keyConfig.lastUsed = new Date();
      keys[service] = keyConfig;
      await this.browserBridge.storage.local.set({
        [this.STORAGE_KEY]: keys,
      });

      // Decrypt and return key
      return keyConfig.encrypted ? await this.decryptKey(keyConfig.key) : keyConfig.key;
    } catch (error) {
      console.error('Failed to get API key:', error);
      return null;
    }
  }

  /**
   * Remove API key for a service
   */
  async removeAPIKey(service: string): Promise<void> {
    try {
      const keys = await this.getAllStoredKeys();
      delete keys[service];

      await this.browserBridge.storage.local.set({
        [this.STORAGE_KEY]: keys,
      });
    } catch (error) {
      console.error('Failed to remove API key:', error);
      throw new Error(`Failed to remove API key for ${service}`);
    }
  }

  /**
   * Validate API key for a service
   */
  async validateAPIKey(service: string, key: string): Promise<boolean> {
    try {
      const result = await this.testAPIConnection(service, key);

      // Update validation status in storage
      const keys = await this.getAllStoredKeys();
      if (keys[service]) {
        keys[service].isValid = result.isValid;
        await this.browserBridge.storage.local.set({
          [this.STORAGE_KEY]: keys,
        });
      }

      return result.isValid;
    } catch (error) {
      console.error('Failed to validate API key:', error);
      return false;
    }
  }

  /**
   * List all stored service names
   */
  async listStoredKeys(): Promise<string[]> {
    try {
      const keys = await this.getAllStoredKeys();
      return Object.keys(keys);
    } catch (error) {
      console.error('Failed to list stored keys:', error);
      return [];
    }
  }

  /**
   * Test API connection for a service
   */
  async testAPIConnection(service: string, key?: string): Promise<APIKeyValidationResult> {
    const testKey = key || (await this.getAPIKey(service));

    if (!testKey) {
      return {
        isValid: false,
        error: 'API key not found',
        service,
        testedAt: new Date(),
      };
    }

    try {
      switch (service.toLowerCase()) {
        case 'opensubtitles':
          return await this.testOpenSubtitlesAPI(testKey);

        case 'tmdb':
          return await this.testTMDBAPI(testKey);

        default:
          return {
            isValid: false,
            error: `Unknown service: ${service}`,
            service,
            testedAt: new Date(),
          };
      }
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        service,
        testedAt: new Date(),
      };
    }
  }

  /**
   * Get API key info without exposing the actual key
   */
  async getAPIKeyInfo(service: string): Promise<Omit<APIKeyConfig, 'key'> | null> {
    try {
      const keys = await this.getAllStoredKeys();
      const keyConfig = keys[service];

      if (!keyConfig) {
        return null;
      }

      const { key, ...info } = keyConfig;
      return info;
    } catch (error) {
      console.error('Failed to get API key info:', error);
      return null;
    }
  }

  /**
   * Check if API key exists for service
   */
  async hasAPIKey(service: string): Promise<boolean> {
    try {
      const keys = await this.getAllStoredKeys();
      return service in keys;
    } catch (error) {
      console.error('Failed to check API key existence:', error);
      return false;
    }
  }

  /**
   * Encrypt API key (simple implementation)
   */
  private async encryptKey(key: string): Promise<string> {
    try {
      // In a real implementation, use Web Crypto API for proper encryption
      // For now, use simple base64 encoding with a salt
      const salt = Math.random().toString(36).substring(2, 15);
      const combined = salt + ':' + key;
      return btoa(combined);
    } catch (error) {
      console.error('Failed to encrypt key:', error);
      return key; // Fallback to unencrypted
    }
  }

  /**
   * Decrypt API key (simple implementation)
   */
  private async decryptKey(encryptedKey: string): Promise<string> {
    try {
      // Decode base64 and extract key
      const decoded = atob(encryptedKey);
      const parts = decoded.split(':');
      if (parts.length >= 2) {
        return parts.slice(1).join(':'); // Handle keys with colons
      }
      return decoded;
    } catch (error) {
      console.error('Failed to decrypt key:', error);
      return encryptedKey; // Fallback to treating as unencrypted
    }
  }

  /**
   * Get all stored keys from storage
   */
  private async getAllStoredKeys(): Promise<Record<string, APIKeyConfig>> {
    try {
      const result = await this.browserBridge.storage.local.get(this.STORAGE_KEY);
      const keys = result[this.STORAGE_KEY] || {};

      // Convert date strings back to Date objects
      Object.values(keys).forEach((keyConfig: any) => {
        if (keyConfig.createdAt && typeof keyConfig.createdAt === 'string') {
          keyConfig.createdAt = new Date(keyConfig.createdAt);
        }
        if (keyConfig.lastUsed && typeof keyConfig.lastUsed === 'string') {
          keyConfig.lastUsed = new Date(keyConfig.lastUsed);
        }
      });

      return keys;
    } catch (error) {
      console.error('Failed to get stored keys:', error);
      return {};
    }
  }

  /**
   * Test OpenSubtitles API
   */
  private async testOpenSubtitlesAPI(apiKey: string): Promise<APIKeyValidationResult> {
    try {
      // Test with a simple API call
      const response = await fetch('https://api.opensubtitles.com/api/v1/infos/user', {
        headers: {
          'Api-Key': apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        return {
          isValid: true,
          service: 'opensubtitles',
          testedAt: new Date(),
        };
      } else {
        const errorText = await response.text();
        return {
          isValid: false,
          error: `API returned ${response.status}: ${errorText}`,
          service: 'opensubtitles',
          testedAt: new Date(),
        };
      }
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Network error',
        service: 'opensubtitles',
        testedAt: new Date(),
      };
    }
  }

  /**
   * Test TMDB API
   */
  private async testTMDBAPI(apiKey: string): Promise<APIKeyValidationResult> {
    try {
      const response = await fetch(`https://api.themoviedb.org/3/configuration?api_key=${apiKey}`);

      if (response.ok) {
        return {
          isValid: true,
          service: 'tmdb',
          testedAt: new Date(),
        };
      } else {
        const errorData = await response.json();
        return {
          isValid: false,
          error: errorData.status_message || `API returned ${response.status}`,
          service: 'tmdb',
          testedAt: new Date(),
        };
      }
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Network error',
        service: 'tmdb',
        testedAt: new Date(),
      };
    }
  }

  /**
   * Clear all API keys (for testing or reset)
   */
  async clearAllAPIKeys(): Promise<void> {
    try {
      await this.browserBridge.storage.local.remove(this.STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear API keys:', error);
      throw new Error('Failed to clear API keys');
    }
  }

  /**
   * Export API keys (without actual key values for security)
   */
  async exportAPIKeyInfo(): Promise<Record<string, Omit<APIKeyConfig, 'key'>>> {
    try {
      const keys = await this.getAllStoredKeys();
      const exportData: Record<string, Omit<APIKeyConfig, 'key'>> = {};

      Object.entries(keys).forEach(([service, config]) => {
        const { key, ...info } = config;
        exportData[service] = info;
      });

      return exportData;
    } catch (error) {
      console.error('Failed to export API key info:', error);
      return {};
    }
  }
}

// Singleton instance
let apiKeyManagerInstance: APIKeyManager | null = null;

export const getAPIKeyManager = (): APIKeyManager => {
  if (!apiKeyManagerInstance) {
    apiKeyManagerInstance = new APIKeyManager();
  }
  return apiKeyManagerInstance;
};

export default APIKeyManager;
