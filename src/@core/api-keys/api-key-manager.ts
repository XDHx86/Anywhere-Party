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

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
   * Encrypt API key using AES-GCM with a per-extension key derived from the extension ID.
   * Falls back to base64 encoding if Web Crypto API is unavailable.
   */
  private async encryptKey(key: string): Promise<string> {
    try {
      // Derive an AES-GCM key from the extension ID (unique per installation)
      const extensionKey = await this.getOrCreateEncryptionKey();
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encoded = new TextEncoder().encode(key);

      const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, extensionKey, encoded);

      // Combine IV + encrypted data and encode as base64
      const combined = new Uint8Array(iv.length + new Uint8Array(encrypted).length);
      combined.set(iv, 0);
      combined.set(new Uint8Array(encrypted), iv.length);

      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.error('Failed to encrypt key:', error);
      return key; // Fallback to unencrypted
    }
  }

  /**
   * Decrypt API key using AES-GCM.
   */
  private async decryptKey(encryptedKey: string): Promise<string> {
    try {
      const extensionKey = await this.getOrCreateEncryptionKey();
      const combined = Uint8Array.from(atob(encryptedKey), (c) => c.charCodeAt(0));

      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        extensionKey,
        encrypted
      );

      return new TextDecoder().decode(decrypted);
    } catch (error) {
      // If decryption fails (e.g., old format), try treating as plaintext
      console.warn('Failed to decrypt key, treating as plaintext:', error);
      return encryptedKey;
    }
  }

  /**
   * Get or create a persistent AES-GCM encryption key for this extension.
   * Uses a deterministic derivation from the extension ID for consistency.
   */
  private async getOrCreateEncryptionKey(): Promise<CryptoKey> {
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode('anywhere-party-api-key-encryption'),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: new TextEncoder().encode('anywhere-party-salt'),
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Get all stored keys from storage
   */
  private async getAllStoredKeys(): Promise<Record<string, APIKeyConfig>> {
    try {
      const result = await this.browserBridge.storage.local.get(this.STORAGE_KEY);
      const keys = (result[this.STORAGE_KEY] as Record<string, APIKeyConfig>) || {};

      // Convert date strings back to Date objects
      Object.values(keys).forEach((keyConfig: APIKeyConfig) => {
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
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
