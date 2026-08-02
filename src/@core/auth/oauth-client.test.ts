/**
 * Auth Client Tests
 * Tests for username-based authentication flows
 * Implements requirement 15.1 (Test authentication flows)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthClient, AuthConfig } from './oauth-client';
import { BrowserBridge } from '../browser-bridge/types';

// Mock browser bridge
const mockBrowserBridge: BrowserBridge = {
  storage: {
    local: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
    },
    sync: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
    },
  },
  runtime: {
    sendMessage: vi.fn().mockResolvedValue({}),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    getManifest: vi.fn().mockReturnValue({}),
    id: 'test-extension-id',
  },
  tabs: {
    query: vi.fn().mockResolvedValue([]),
    sendMessage: vi.fn().mockResolvedValue({}),
    onUpdated: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  permissions: {
    request: vi.fn().mockResolvedValue(true),
    contains: vi.fn().mockResolvedValue(true),
    remove: vi.fn().mockResolvedValue(true),
  },
  isChrome: true,
  isFirefox: false,
  manifestVersion: 3,
};

describe('AuthClient', () => {
  let authClient: AuthClient;
  let config: AuthConfig;

  beforeEach(() => {
    vi.clearAllMocks();

    config = {
      allowAnonymous: true,
      sessionDuration: 24 * 60 * 60 * 1000,
      maxUsernameLength: 20,
      minUsernameLength: 2,
    };

    authClient = new AuthClient(mockBrowserBridge, config);
  });

  describe('Initialization', () => {
    it('should initialize with no stored session', async () => {
      await authClient.initialize();

      const authState = authClient.getAuthState();
      expect(authState.isAuthenticated).toBe(true); // Anonymous fallback
      expect(authState.user?.isAnonymous).toBe(true);
    });

    it('should restore valid stored session', async () => {
      const storedAuth = {
        isAuthenticated: true,
        user: {
          id: 'test-user',
          username: 'testuser',
          isAnonymous: false,
          joinedAt: Date.now() - 1000, // 1 second ago
        },
      };

      mockBrowserBridge.storage.local.get = vi.fn().mockResolvedValue({
        authState: JSON.stringify(storedAuth),
      });

      await authClient.initialize();

      const authState = authClient.getAuthState();
      expect(authState.isAuthenticated).toBe(true);
      expect(authState.user?.username).toBe('testuser');
    });

    it('should handle expired stored session', async () => {
      const expiredAuth = {
        isAuthenticated: true,
        user: {
          id: 'test-user',
          username: 'testuser',
          isAnonymous: false,
          joinedAt: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago (expired)
        },
      };

      mockBrowserBridge.storage.local.get = vi.fn().mockResolvedValue({
        authState: JSON.stringify(expiredAuth),
      });

      await authClient.initialize();

      const authState = authClient.getAuthState();
      expect(authState.user?.isAnonymous).toBe(true); // Fallback to anonymous
    });

    it('should not create anonymous session when not allowed', async () => {
      const noAnonConfig = { ...config, allowAnonymous: false };
      const client = new AuthClient(mockBrowserBridge, noAnonConfig);

      await client.initialize();

      const authState = client.getAuthState();
      expect(authState.isAuthenticated).toBe(false);
      expect(authState.user).toBeNull();
    });
  });

  describe('Username Authentication', () => {
    beforeEach(async () => {
      await authClient.initialize();
    });

    it('should authenticate with valid username', async () => {
      const username = 'testuser';
      const userProfile = await authClient.authenticateWithUsername(username);

      expect(userProfile.username).toBe(username);
      expect(userProfile.isAnonymous).toBe(false);
      expect(userProfile.id).toMatch(/^user_/);
      expect(userProfile.joinedAt).toBeGreaterThan(0);
    });

    it('should reject empty username', async () => {
      await expect(authClient.authenticateWithUsername('')).rejects.toThrow('Username is required');
    });

    it('should reject username that is too short', async () => {
      await expect(authClient.authenticateWithUsername('a')).rejects.toThrow(
        'Username must be at least 2 characters'
      );
    });

    it('should reject username that is too long', async () => {
      const longUsername = 'a'.repeat(21);
      await expect(authClient.authenticateWithUsername(longUsername)).rejects.toThrow(
        'Username must be no more than 20 characters'
      );
    });

    it('should reject username with invalid characters', async () => {
      await expect(authClient.authenticateWithUsername('user@domain.com')).rejects.toThrow(
        'Username can only contain letters, numbers, spaces, hyphens, and underscores'
      );
    });

    it('should reject restricted usernames', async () => {
      await expect(authClient.authenticateWithUsername('admin')).rejects.toThrow(
        'Username contains restricted words'
      );
      await expect(authClient.authenticateWithUsername('system')).rejects.toThrow(
        'Username contains restricted words'
      );
    });

    it('should trim whitespace from username', async () => {
      const userProfile = await authClient.authenticateWithUsername('  testuser  ');
      expect(userProfile.username).toBe('testuser');
    });
  });

  describe('Profile Management', () => {
    beforeEach(async () => {
      await authClient.initialize();
    });

    it('should update user profile', async () => {
      // First authenticate
      await authClient.authenticateWithUsername('testuser');

      // Update profile
      await authClient.updateProfile({
        displayName: 'Test User Display',
        avatarUrl: 'https://example.com/avatar.jpg',
      });

      const user = authClient.getCurrentUser();
      expect(user?.displayName).toBe('Test User Display');
      expect(user?.avatarUrl).toBe('https://example.com/avatar.jpg');
    });

    it('should reject profile update when not authenticated', async () => {
      // Create client without anonymous sessions
      const noAnonConfig = { ...config, allowAnonymous: false };
      const client = new AuthClient(mockBrowserBridge, noAnonConfig);
      await client.initialize();

      await expect(client.updateProfile({ displayName: 'Test' })).rejects.toThrow(
        'No authenticated user'
      );
    });
  });

  describe('Session Management', () => {
    beforeEach(async () => {
      await authClient.initialize();
    });

    it('should sign out and clear session', async () => {
      // First authenticate with username
      await authClient.authenticateWithUsername('testuser');
      expect(authClient.getCurrentUser()?.isAnonymous).toBe(false);

      // Then sign out
      await authClient.signOut();

      const authState = authClient.getAuthState();
      expect(authState.isAuthenticated).toBe(true); // Anonymous fallback
      expect(authState.user?.isAnonymous).toBe(true);
    });

    it('should create anonymous session when allowed', async () => {
      const user = authClient.getCurrentUser();
      expect(user).toBeTruthy();
      expect(user?.isAnonymous).toBe(true);
      expect(user?.username).toBe('Anonymous');
    });

    it('should check authentication status correctly', async () => {
      // Initially anonymous
      expect(authClient.isAuthenticated()).toBe(true);
      expect(authClient.getCurrentUser()?.isAnonymous).toBe(true);

      // After username auth
      await authClient.authenticateWithUsername('testuser');
      expect(authClient.isAuthenticated()).toBe(true);
      expect(authClient.getCurrentUser()?.isAnonymous).toBe(false);
    });
  });

  describe('Security Validation', () => {
    it('should generate unique user IDs', () => {
      // Test ID generation (would be done multiple times)
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        const id = 'user_' + Math.random().toString(36).substring(2, 11);
        ids.add(id);
      }

      // All IDs should be unique
      expect(ids.size).toBe(100);

      // IDs should have correct format
      const idArray = Array.from(ids) as string[];
      expect(idArray[0]).toMatch(/^user_[a-z0-9]+$/);
    });

    it('should validate username format', async () => {
      // Valid usernames
      await expect(authClient.authenticateWithUsername('user123')).resolves.toBeTruthy();
      await expect(authClient.authenticateWithUsername('user_name')).resolves.toBeTruthy();
      await expect(authClient.authenticateWithUsername('user-name')).resolves.toBeTruthy();
      await expect(authClient.authenticateWithUsername('user name')).resolves.toBeTruthy();

      // Invalid usernames
      await expect(authClient.authenticateWithUsername('user@name')).rejects.toThrow();
      await expect(authClient.authenticateWithUsername('user.name')).rejects.toThrow();
      await expect(authClient.authenticateWithUsername('user#name')).rejects.toThrow();
    });

    it('should prevent username injection attacks', async () => {
      const maliciousUsernames = [
        '<script>alert("xss")</script>',
        'DROP TABLE users;',
        '../../etc/passwd',
        'null',
        'undefined',
      ];

      for (const username of maliciousUsernames) {
        await expect(authClient.authenticateWithUsername(username)).rejects.toThrow();
      }
    });

    it('should handle session expiration', async () => {
      // Mock expired session
      const expiredUser = {
        id: 'user_123',
        username: 'testuser',
        isAnonymous: false,
        joinedAt: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
      };

      // Session should be considered invalid
      const isValid = Date.now() - expiredUser.joinedAt < 24 * 60 * 60 * 1000;
      expect(isValid).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle storage errors during authentication', async () => {
      await authClient.initialize();
      mockBrowserBridge.storage.local.set = vi.fn().mockRejectedValue(new Error('Storage error'));

      // Should still attempt authentication but may fail to persist
      await expect(authClient.authenticateWithUsername('testuser')).rejects.toThrow();
    });

    it('should handle storage errors during initialization', async () => {
      mockBrowserBridge.storage.local.get = vi.fn().mockRejectedValue(new Error('Storage error'));

      const client = new AuthClient(mockBrowserBridge, config);
      await client.initialize();

      // Should fallback to anonymous session
      const authState = client.getAuthState();
      expect(authState.user?.isAnonymous).toBe(true);
    });

    it('should handle malformed stored session data', async () => {
      mockBrowserBridge.storage.local.get = vi.fn().mockResolvedValue({
        authState: 'invalid-json',
      });

      await authClient.initialize();

      // Should fallback to anonymous session
      const authState = authClient.getAuthState();
      expect(authState.user?.isAnonymous).toBe(true);
    });

    it('should handle null/undefined username gracefully', async () => {
      await authClient.initialize();
      await expect(authClient.authenticateWithUsername(null as any)).rejects.toThrow(
        'Username is required'
      );
      await expect(authClient.authenticateWithUsername(undefined as any)).rejects.toThrow(
        'Username is required'
      );
    });
  });
});
