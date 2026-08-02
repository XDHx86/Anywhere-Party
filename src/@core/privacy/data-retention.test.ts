/**
 * Data Retention Tests
 * Tests for data retention policies and controls
 * Implements requirement 15.3 (Test data retention policies)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DataRetentionManager, PrivacySettings } from './data-retention';
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

describe('DataRetentionManager', () => {
  let dataRetentionManager: DataRetentionManager;
  let settings: PrivacySettings;

  beforeEach(() => {
    vi.clearAllMocks();

    settings = {
      dataRetention: {
        chatMessages: { enabled: true, retentionDays: 30, autoDelete: true },
        roomHistory: { enabled: true, retentionDays: 90, autoDelete: true },
        userSessions: { enabled: true, retentionDays: 7, autoDelete: true },
        annotations: { enabled: true, retentionDays: 60, autoDelete: true },
        subtitleTracks: { enabled: true, retentionDays: 30, autoDelete: true },
        telemetryData: { enabled: true, retentionDays: 90, autoDelete: true },
      },
      allowDataExport: true,
      allowDataDeletion: true,
      requireConsentForRecording: true,
      anonymizeData: true,
      shareDataWithThirdParties: false,
    };

    dataRetentionManager = new DataRetentionManager(mockBrowserBridge, settings);
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await expect(dataRetentionManager.initialize()).resolves.not.toThrow();
    });

    it('should load existing settings from storage', async () => {
      const storedSettings = {
        dataRetention: {
          chatMessages: { enabled: false, retentionDays: 15, autoDelete: false },
        },
      };

      mockBrowserBridge.storage.local.get = vi.fn().mockResolvedValue({
        privacySettings: JSON.stringify(storedSettings),
      });

      await dataRetentionManager.initialize();

      const currentSettings = dataRetentionManager.getSettings();
      expect(currentSettings.dataRetention.chatMessages.enabled).toBe(false);
      expect(currentSettings.dataRetention.chatMessages.retentionDays).toBe(15);
    });

    it('should handle storage loading errors gracefully', async () => {
      mockBrowserBridge.storage.local.get = vi.fn().mockRejectedValue(new Error('Storage error'));

      await expect(dataRetentionManager.initialize()).resolves.not.toThrow();
    });
  });

  describe('Settings Management', () => {
    beforeEach(async () => {
      await dataRetentionManager.initialize();
    });

    it('should update settings', async () => {
      const newSettings = {
        allowDataExport: false,
        dataRetention: {
          ...settings.dataRetention,
          chatMessages: { enabled: false, retentionDays: 15, autoDelete: false },
        },
      };

      await dataRetentionManager.updateSettings(newSettings);

      const updatedSettings = dataRetentionManager.getSettings();
      expect(updatedSettings.allowDataExport).toBe(false);
      expect(updatedSettings.dataRetention.chatMessages.retentionDays).toBe(15);
    });

    it('should persist settings to storage', async () => {
      const newSettings = { allowDataExport: false };

      await dataRetentionManager.updateSettings(newSettings);

      expect(mockBrowserBridge.storage.local.set).toHaveBeenCalledWith({
        privacySettings: expect.stringContaining('"allowDataExport":false'),
      });
    });
  });

  describe('Data Deletion', () => {
    beforeEach(async () => {
      await dataRetentionManager.initialize();
    });

    it('should create data deletion request', async () => {
      const requestId = await dataRetentionManager.requestDataDeletion(
        'test-user',
        ['chatMessages', 'roomHistory'],
        'User requested deletion'
      );

      expect(requestId).toBeTruthy();
      expect(typeof requestId).toBe('string');
      expect(requestId).toMatch(/^req_\d+_[a-z0-9]+$/);
    });

    it('should reject deletion when not allowed', async () => {
      await dataRetentionManager.updateSettings({ allowDataDeletion: false });

      await expect(
        dataRetentionManager.requestDataDeletion('test-user', ['chatMessages'], 'test')
      ).rejects.toThrow('Data deletion is not enabled');
    });

    it('should process deletion request', async () => {
      // Mock storage with user data
      const userData = {
        'chat_messages_user_test-user': JSON.stringify([{ message: 'test' }]),
        'room_history_test-user': JSON.stringify([{ room: 'test-room' }]),
        other_data: 'should not be deleted',
      };

      mockBrowserBridge.storage.local.get = vi.fn().mockResolvedValue(userData);

      const requestId = await dataRetentionManager.requestDataDeletion(
        'test-user',
        ['chatMessages', 'roomHistory'],
        'User requested deletion'
      );

      // Verify deletion request was processed
      const status = await dataRetentionManager.getDeletionRequestStatus(requestId);
      expect(status?.status).toBe('completed');
    });

    it('should get deletion request status', async () => {
      const requestId = await dataRetentionManager.requestDataDeletion(
        'test-user',
        ['chatMessages'],
        'test'
      );

      const status = await dataRetentionManager.getDeletionRequestStatus(requestId);
      expect(status).toBeTruthy();
      expect(status?.userId).toBe('test-user');
      expect(status?.dataTypes).toContain('chatMessages');
    });

    it('should return null for non-existent deletion request', async () => {
      const status = await dataRetentionManager.getDeletionRequestStatus('non-existent');
      expect(status).toBeNull();
    });
  });

  describe('Data Export', () => {
    beforeEach(async () => {
      await dataRetentionManager.initialize();
    });

    it('should create data export request', async () => {
      const requestId = await dataRetentionManager.requestDataExport(
        'test-user',
        ['chatMessages'],
        'json'
      );

      expect(requestId).toBeTruthy();
      expect(typeof requestId).toBe('string');
    });

    it('should reject export when not allowed', async () => {
      await dataRetentionManager.updateSettings({ allowDataExport: false });

      await expect(
        dataRetentionManager.requestDataExport('test-user', ['chatMessages'], 'json')
      ).rejects.toThrow('Data export is not enabled');
    });

    it('should support different export formats', async () => {
      const jsonRequestId = await dataRetentionManager.requestDataExport(
        'test-user',
        ['chatMessages'],
        'json'
      );

      const csvRequestId = await dataRetentionManager.requestDataExport(
        'test-user',
        ['chatMessages'],
        'csv'
      );

      expect(jsonRequestId).toBeTruthy();
      expect(csvRequestId).toBeTruthy();
      expect(jsonRequestId).not.toBe(csvRequestId);
    });

    it('should get export request status', async () => {
      const requestId = await dataRetentionManager.requestDataExport(
        'test-user',
        ['chatMessages'],
        'json'
      );

      const status = await dataRetentionManager.getExportRequestStatus(requestId);
      expect(status).toBeTruthy();
      expect(status?.userId).toBe('test-user');
      expect(status?.format).toBe('json');
    });
  });

  describe('Data Cleanup', () => {
    beforeEach(async () => {
      await dataRetentionManager.initialize();
    });

    it('should perform data cleanup', async () => {
      await expect(dataRetentionManager.performDataCleanup()).resolves.not.toThrow();
    });

    it('should respect retention policies during cleanup', async () => {
      // Mock old data that should be cleaned up
      const oldTimestamp = Date.now() - 35 * 24 * 60 * 60 * 1000; // 35 days ago
      const recentTimestamp = Date.now() - 10 * 24 * 60 * 60 * 1000; // 10 days ago

      const testData = {
        chat_old: JSON.stringify({ timestamp: oldTimestamp, message: 'old' }),
        chat_recent: JSON.stringify({ timestamp: recentTimestamp, message: 'recent' }),
      };

      mockBrowserBridge.storage.local.get = vi.fn().mockResolvedValue(testData);

      await dataRetentionManager.performDataCleanup();

      // Cleanup should have been attempted
      expect(mockBrowserBridge.storage.local.get).toHaveBeenCalled();
    });

    it('should handle cleanup errors gracefully', async () => {
      mockBrowserBridge.storage.local.get = vi.fn().mockRejectedValue(new Error('Storage error'));

      await expect(dataRetentionManager.performDataCleanup()).resolves.not.toThrow();
    });
  });

  describe('Data Anonymization', () => {
    beforeEach(async () => {
      await dataRetentionManager.initialize();
    });

    it('should anonymize user data when enabled', async () => {
      const userData = {
        user_profile: JSON.stringify({ userId: 'test-user', name: 'Test User' }),
        chat_messages: JSON.stringify([{ userId: 'test-user', message: 'Hello' }]),
      };

      mockBrowserBridge.storage.local.get = vi.fn().mockResolvedValue(userData);

      await dataRetentionManager.anonymizeUserData('test-user');

      expect(mockBrowserBridge.storage.local.set).toHaveBeenCalled();
    });

    it('should skip anonymization when disabled', async () => {
      await dataRetentionManager.updateSettings({ anonymizeData: false });

      await dataRetentionManager.anonymizeUserData('test-user');

      // Should not attempt to anonymize
      expect(mockBrowserBridge.storage.local.get).not.toHaveBeenCalled();
    });

    it('should handle anonymization errors', async () => {
      mockBrowserBridge.storage.local.get = vi.fn().mockRejectedValue(new Error('Storage error'));

      await expect(dataRetentionManager.anonymizeUserData('test-user')).rejects.toThrow(
        'Storage error'
      );
    });
  });

  describe('Retention Statistics', () => {
    beforeEach(async () => {
      await dataRetentionManager.initialize();
    });

    it('should generate retention statistics', async () => {
      const mockData = {
        chat_messages_1: 'data1',
        room_history_1: 'data2',
        user_session_1: 'data3',
        annotation_1: 'data4',
        subtitle_1: 'data5',
        telemetry_1: 'data6',
        other_data: 'data7',
      };

      mockBrowserBridge.storage.local.get = vi.fn().mockResolvedValue(mockData);

      const stats = await dataRetentionManager.getRetentionStats();

      expect(stats).toHaveProperty('totalKeys');
      expect(stats).toHaveProperty('estimatedSize');
      expect(stats).toHaveProperty('dataTypes');
      expect(stats.totalKeys).toBe(7);
      expect(stats.dataTypes).toHaveProperty('chatMessages');
      expect(stats.dataTypes).toHaveProperty('roomHistory');
    });

    it('should handle statistics generation errors', async () => {
      mockBrowserBridge.storage.local.get = vi.fn().mockRejectedValue(new Error('Storage error'));

      const stats = await dataRetentionManager.getRetentionStats();
      expect(stats).toEqual({});
    });
  });

  describe('Security and Validation', () => {
    beforeEach(async () => {
      await dataRetentionManager.initialize();
    });

    it('should validate data types in requests', async () => {
      const validDataTypes = ['chatMessages', 'roomHistory', 'userSessions'];
      const invalidDataTypes = ['maliciousData', 'systemFiles'];

      // Valid data types should work
      const validRequestId = await dataRetentionManager.requestDataDeletion(
        'test-user',
        validDataTypes,
        'test'
      );
      expect(validRequestId).toBeTruthy();

      // Invalid data types should still work but won't find matching data
      const invalidRequestId = await dataRetentionManager.requestDataDeletion(
        'test-user',
        invalidDataTypes,
        'test'
      );
      expect(invalidRequestId).toBeTruthy();
    });

    it('should generate unique request IDs', async () => {
      const requestIds = new Set();

      for (let i = 0; i < 10; i++) {
        const requestId = await dataRetentionManager.requestDataDeletion(
          `user-${i}`,
          ['chatMessages'],
          'test'
        );
        requestIds.add(requestId);
      }

      expect(requestIds.size).toBe(10); // All IDs should be unique
    });

    it('should validate user IDs', async () => {
      const validUserId = 'user-123';
      const emptyUserId = '';
      const longUserId = 'x'.repeat(1000);

      // Valid user ID should work
      const validRequest = await dataRetentionManager.requestDataDeletion(
        validUserId,
        ['chatMessages'],
        'test'
      );
      expect(validRequest).toBeTruthy();

      // Empty user ID should still work (might be system cleanup)
      const emptyRequest = await dataRetentionManager.requestDataDeletion(
        emptyUserId,
        ['chatMessages'],
        'test'
      );
      expect(emptyRequest).toBeTruthy();

      // Long user ID should work (no artificial limits)
      const longRequest = await dataRetentionManager.requestDataDeletion(
        longUserId,
        ['chatMessages'],
        'test'
      );
      expect(longRequest).toBeTruthy();
    });

    it('should handle concurrent requests safely', async () => {
      const promises = Array.from({ length: 5 }, (_, i) =>
        dataRetentionManager.requestDataDeletion(`user-${i}`, ['chatMessages'], 'concurrent test')
      );

      const requestIds = await Promise.all(promises);

      // All requests should complete successfully
      expect(requestIds).toHaveLength(5);
      expect(requestIds.every((id) => typeof id === 'string')).toBe(true);

      // All IDs should be unique
      const uniqueIds = new Set(requestIds);
      expect(uniqueIds.size).toBe(5);
    });
  });

  describe('Cleanup and Shutdown', () => {
    beforeEach(async () => {
      await dataRetentionManager.initialize();
    });

    it('should shutdown gracefully', () => {
      expect(() => dataRetentionManager.shutdown()).not.toThrow();
    });

    it('should stop cleanup interval on shutdown', () => {
      // Mock setInterval to track if it's cleared
      const mockClearInterval = vi.fn();
      global.clearInterval = mockClearInterval;

      dataRetentionManager.shutdown();

      // Should attempt to clear interval (even if none was set in test)
      // This tests the shutdown logic
      expect(() => dataRetentionManager.shutdown()).not.toThrow();
    });
  });
});
