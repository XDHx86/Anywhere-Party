/**
 * Configuration Validation Tests
 * Tests for schema validation and configuration import functionality
 * Requirements: 36.2, 36.4, 36.5
 */

import { vi } from 'vitest';
import {
  validateConfig,
  sanitizeConfig,
  getDefaultConfig,
  createConfigDiff,
  mergeConfigs,
  CONFIG_SCHEMA,
  ValidationResult,
} from './validation';

describe('Configuration Validation', () => {
  describe('validateConfig', () => {
    it('should validate a correct configuration', () => {
      const config = {
        SIGNALING_SERVER: 'wss://api.example.com',
        SYNC_TOLERANCE_MS: 300,
        VOICE_CHAT: true,
        STUN_SERVERS: ['stun:stun.l.google.com:19302'],
        FONT_SIZE: 'medium',
      };

      const result = validateConfig(config);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect type mismatches', () => {
      const config = {
        SIGNALING_SERVER: 123, // Should be string
        SYNC_TOLERANCE_MS: 'invalid', // Should be number
        VOICE_CHAT: 'yes', // Should be boolean
      };

      const result = validateConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.errors[0]).toMatchObject({
        field: 'SIGNALING_SERVER',
        code: 'TYPE_MISMATCH',
        severity: 'error',
      });
    });

    it('should validate number ranges', () => {
      const config = {
        SYNC_TOLERANCE_MS: 25, // Below minimum (50)
        HEARTBEAT_INTERVAL_MS: 15000, // Above maximum (10000)
      };

      const result = validateConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);

      // Check that we have the expected errors
      const syncToleranceError = result.errors.find((e) => e.field === 'SYNC_TOLERANCE_MS');
      const heartbeatError = result.errors.find((e) => e.field === 'HEARTBEAT_INTERVAL_MS');

      expect(syncToleranceError).toMatchObject({
        field: 'SYNC_TOLERANCE_MS',
        code: 'MIN_VALUE',
        severity: 'error',
      });
      expect(heartbeatError).toMatchObject({
        field: 'HEARTBEAT_INTERVAL_MS',
        code: 'MAX_VALUE',
        severity: 'error',
      });
    });

    it('should validate string patterns', () => {
      const config = {
        SIGNALING_SERVER: 'invalid-url', // Should match WebSocket URL pattern
        CUSTOM_BG_COLOR: 'red', // Should match hex color pattern
      };

      const result = validateConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toMatchObject({
        field: 'SIGNALING_SERVER',
        code: 'PATTERN_MISMATCH',
        severity: 'error',
      });
      expect(result.errors[1]).toMatchObject({
        field: 'CUSTOM_BG_COLOR',
        code: 'PATTERN_MISMATCH',
        severity: 'error',
      });
    });

    it('should validate enum values', () => {
      const config = {
        FONT_SIZE: 'huge', // Should be one of: small, medium, large, extra-large
        FOCUS_INDICATOR_STYLE: 'rainbow', // Should be one of: default, high-contrast, custom
      };

      const result = validateConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);

      // Check that we have the expected errors
      const fontSizeError = result.errors.find((e) => e.field === 'FONT_SIZE');
      const focusIndicatorError = result.errors.find((e) => e.field === 'FOCUS_INDICATOR_STYLE');

      expect(fontSizeError).toMatchObject({
        field: 'FONT_SIZE',
        code: 'INVALID_ENUM',
        severity: 'error',
      });
      expect(focusIndicatorError).toMatchObject({
        field: 'FOCUS_INDICATOR_STYLE',
        code: 'INVALID_ENUM',
        severity: 'error',
      });
    });

    it('should validate required fields', () => {
      const config = {
        // Missing SIGNALING_SERVER which is required
        SYNC_TOLERANCE_MS: 300,
      };

      const result = validateConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({
        field: 'SIGNALING_SERVER',
        code: 'REQUIRED_FIELD',
        severity: 'error',
      });
    });

    it('should warn about unknown fields', () => {
      const config = {
        SIGNALING_SERVER: 'wss://api.example.com',
        UNKNOWN_FIELD: 'value',
        ANOTHER_UNKNOWN: 123,
      };

      const result = validateConfig(config);

      expect(result.isValid).toBe(true); // Warnings don't make config invalid
      expect(result.warnings).toHaveLength(2);
      expect(result.warnings[0]).toMatchObject({
        field: 'UNKNOWN_FIELD',
        code: 'UNKNOWN_FIELD',
        severity: 'warning',
      });
    });

    it('should validate array types', () => {
      const config = {
        STUN_SERVERS: 'not-an-array', // Should be array
        DEFAULT_SUBTITLE_LANGS: ['en', 'fr'], // Valid array
      };

      const result = validateConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(1);

      // Check that we have the expected error
      const stunServersError = result.errors.find((e) => e.field === 'STUN_SERVERS');
      expect(stunServersError).toMatchObject({
        field: 'STUN_SERVERS',
        code: 'TYPE_MISMATCH',
        severity: 'error',
      });
    });

    it('should handle empty configuration', () => {
      const config = {};

      const result = validateConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1); // SIGNALING_SERVER is required
      expect(result.errors[0].field).toBe('SIGNALING_SERVER');
    });

    it('should handle null and undefined values', () => {
      const config = {
        SIGNALING_SERVER: 'wss://api.example.com',
        SYNC_TOLERANCE_MS: null,
        VOICE_CHAT: undefined,
      };

      const result = validateConfig(config);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('sanitizeConfig', () => {
    it('should sanitize string values', () => {
      const config = {
        SIGNALING_SERVER: '  wss://api.example.com  ',
        SIGNALING_WS_PATH: '  /ws  ',
        ROOM_DEFAULT_PASSWORD: '  password123  ',
      };

      const sanitized = sanitizeConfig(config);

      expect(sanitized).toEqual({
        SIGNALING_SERVER: 'wss://api.example.com',
        SIGNALING_WS_PATH: '/ws',
        ROOM_DEFAULT_PASSWORD: 'password123',
      });
    });

    it('should sanitize array values', () => {
      const config = {
        STUN_SERVERS: [
          'stun:stun.l.google.com:19302',
          'invalid-url',
          'stun:stun2.l.google.com:19302',
        ],
        DEFAULT_SUBTITLE_LANGS: ['en', 'invalid-lang', 'fr', 'xyz'],
      };

      const sanitized = sanitizeConfig(config);

      expect(sanitized.STUN_SERVERS).toEqual([
        'stun:stun.l.google.com:19302',
        'stun:stun2.l.google.com:19302',
      ]);
      expect(sanitized.DEFAULT_SUBTITLE_LANGS).toEqual(['en', 'fr']);
    });

    it('should handle sanitization errors gracefully', () => {
      const config = {
        SIGNALING_SERVER: 'wss://api.example.com',
        INVALID_FIELD: 'value',
      };

      // Mock console.warn to avoid test output
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const sanitized = sanitizeConfig(config);

      expect(sanitized).toEqual(config);
      consoleSpy.mockRestore();
    });

    it('should preserve non-sanitizable values', () => {
      const config = {
        SYNC_TOLERANCE_MS: 300,
        VOICE_CHAT: true,
        UNKNOWN_FIELD: 'value',
      };

      const sanitized = sanitizeConfig(config);

      expect(sanitized).toEqual(config);
    });

    it('should handle null and undefined values', () => {
      const config = {
        SIGNALING_SERVER: null,
        SYNC_TOLERANCE_MS: undefined,
        VOICE_CHAT: true,
      };

      const sanitized = sanitizeConfig(config);

      expect(sanitized).toEqual(config);
    });
  });

  describe('getDefaultConfig', () => {
    it('should return all default values', () => {
      const defaults = getDefaultConfig();

      expect(defaults).toMatchObject({
        SIGNALING_WS_PATH: '/ws',
        LOCAL_DEV_MODE: false,
        ROOM_DEFAULT_PASSWORD: '',
        SYNC_TOLERANCE_MS: 300,
        SYNC_TIMEOUT_MS: 5000,
        HEARTBEAT_INTERVAL_MS: 2000,
        VOICE_CHAT: true,
        ANNOTATIONS: true,
        SUBTITLES: true,
        FONT_SIZE: 'medium',
        CUSTOM_BG_COLOR: '#ffffff',
      });
    });

    it('should not include fields without defaults', () => {
      const defaults = getDefaultConfig();

      expect(defaults).not.toHaveProperty('SIGNALING_SERVER'); // Required but no default
      expect(defaults).not.toHaveProperty('VIDEO_DETECT_POLL_MS'); // Optional, no default
    });

    it('should have correct default types', () => {
      const defaults = getDefaultConfig();

      expect(typeof defaults.LOCAL_DEV_MODE).toBe('boolean');
      expect(typeof defaults.SYNC_TOLERANCE_MS).toBe('number');
      expect(typeof defaults.ROOM_DEFAULT_PASSWORD).toBe('string');
      expect(Array.isArray(defaults.STUN_SERVERS)).toBe(true);
    });
  });

  describe('createConfigDiff', () => {
    it('should detect added fields', () => {
      const oldConfig = {
        SYNC_TOLERANCE_MS: 300,
      };
      const newConfig = {
        SYNC_TOLERANCE_MS: 300,
        VOICE_CHAT: true,
        ANNOTATIONS: false,
      };

      const diff = createConfigDiff(oldConfig, newConfig);

      expect(diff.added).toEqual({
        VOICE_CHAT: true,
        ANNOTATIONS: false,
      });
      expect(diff.summary.addedCount).toBe(2);
    });

    it('should detect modified fields', () => {
      const oldConfig = {
        SYNC_TOLERANCE_MS: 300,
        VOICE_CHAT: true,
        FONT_SIZE: 'medium',
      };
      const newConfig = {
        SYNC_TOLERANCE_MS: 500,
        VOICE_CHAT: false,
        FONT_SIZE: 'medium',
      };

      const diff = createConfigDiff(oldConfig, newConfig);

      expect(diff.modified).toEqual({
        SYNC_TOLERANCE_MS: { old: 300, new: 500 },
        VOICE_CHAT: { old: true, new: false },
      });
      expect(diff.summary.modifiedCount).toBe(2);
    });

    it('should detect removed fields', () => {
      const oldConfig = {
        SYNC_TOLERANCE_MS: 300,
        VOICE_CHAT: true,
        ANNOTATIONS: false,
      };
      const newConfig = {
        SYNC_TOLERANCE_MS: 300,
      };

      const diff = createConfigDiff(oldConfig, newConfig);

      expect(diff.removed).toEqual(['VOICE_CHAT', 'ANNOTATIONS']);
      expect(diff.summary.removedCount).toBe(2);
    });

    it('should handle complex object comparisons', () => {
      const oldConfig = {
        STUN_SERVERS: ['stun:server1.com'],
        TURN_SERVERS: [{ url: 'turn:server1.com', username: 'user1' }],
      };
      const newConfig = {
        STUN_SERVERS: ['stun:server1.com', 'stun:server2.com'],
        TURN_SERVERS: [{ url: 'turn:server1.com', username: 'user1' }],
      };

      const diff = createConfigDiff(oldConfig, newConfig);

      expect(diff.modified).toHaveProperty('STUN_SERVERS');
      expect(diff.modified.STUN_SERVERS.old).toEqual(['stun:server1.com']);
      expect(diff.modified.STUN_SERVERS.new).toEqual(['stun:server1.com', 'stun:server2.com']);
    });

    it('should calculate correct summary', () => {
      const oldConfig = {
        SYNC_TOLERANCE_MS: 300,
        VOICE_CHAT: true,
        ANNOTATIONS: false,
      };
      const newConfig = {
        SYNC_TOLERANCE_MS: 500, // Modified
        VOICE_CHAT: true, // Unchanged
        SUBTITLES: true, // Added
        // ANNOTATIONS removed
      };

      const diff = createConfigDiff(oldConfig, newConfig);

      expect(diff.summary).toEqual({
        totalChanges: 3,
        addedCount: 1,
        modifiedCount: 1,
        removedCount: 1,
      });
    });

    it('should handle empty configurations', () => {
      const diff1 = createConfigDiff({}, { VOICE_CHAT: true });
      expect(diff1.summary.addedCount).toBe(1);
      expect(diff1.summary.totalChanges).toBe(1);

      const diff2 = createConfigDiff({ VOICE_CHAT: true }, {});
      expect(diff2.summary.removedCount).toBe(1);
      expect(diff2.summary.totalChanges).toBe(1);

      const diff3 = createConfigDiff({}, {});
      expect(diff3.summary.totalChanges).toBe(0);
    });
  });

  describe('mergeConfigs', () => {
    it('should merge configurations correctly', () => {
      const baseConfig = {
        SYNC_TOLERANCE_MS: 300,
        VOICE_CHAT: true,
      };
      const newConfig = {
        SYNC_TOLERANCE_MS: 500,
        ANNOTATIONS: false,
        SIGNALING_SERVER: '  wss://api.example.com  ', // Will be sanitized
      };

      const result = mergeConfigs(baseConfig, newConfig);

      expect(result.merged).toEqual({
        SYNC_TOLERANCE_MS: 500,
        VOICE_CHAT: true,
        ANNOTATIONS: false,
        SIGNALING_SERVER: 'wss://api.example.com',
      });
    });

    it('should sanitize new configuration before merging', () => {
      const baseConfig = {
        SYNC_TOLERANCE_MS: 300,
      };
      const newConfig = {
        SIGNALING_SERVER: '  wss://api.example.com  ',
        STUN_SERVERS: ['stun:valid.com', 'invalid-url', 'stun:valid2.com'],
      };

      const result = mergeConfigs(baseConfig, newConfig);

      expect(result.merged.SIGNALING_SERVER).toBe('wss://api.example.com');
      expect(result.merged.STUN_SERVERS).toEqual(['stun:valid.com', 'stun:valid2.com']);
    });

    it('should validate merged configuration', () => {
      const baseConfig = {
        SYNC_TOLERANCE_MS: 300,
      };
      const newConfig = {
        SIGNALING_SERVER: 'wss://api.example.com',
        SYNC_TOLERANCE_MS: 25, // Invalid (below minimum)
      };

      const result = mergeConfigs(baseConfig, newConfig);

      expect(result.validation.isValid).toBe(false);
      expect(result.validation.errors).toHaveLength(1);
      expect(result.validation.errors[0].field).toBe('SYNC_TOLERANCE_MS');
    });

    it('should handle empty configurations', () => {
      const result1 = mergeConfigs({}, { VOICE_CHAT: true });
      expect(result1.merged).toEqual({ VOICE_CHAT: true });

      const result2 = mergeConfigs({ VOICE_CHAT: true }, {});
      expect(result2.merged).toEqual({ VOICE_CHAT: true });

      const result3 = mergeConfigs({}, {});
      expect(result3.merged).toEqual({});
    });

    it('should preserve base config when new config is invalid', () => {
      const baseConfig = {
        SIGNALING_SERVER: 'wss://api.example.com',
        SYNC_TOLERANCE_MS: 300,
      };
      const newConfig = {
        SYNC_TOLERANCE_MS: 'invalid', // Type error
      };

      const result = mergeConfigs(baseConfig, newConfig);

      // Merged config should still contain the invalid value for user to see
      expect(result.merged.SYNC_TOLERANCE_MS).toBe('invalid');
      expect(result.validation.isValid).toBe(false);
    });
  });

  describe('CONFIG_SCHEMA', () => {
    it('should have all required schema properties', () => {
      expect(CONFIG_SCHEMA).toHaveProperty('SIGNALING_SERVER');
      expect(CONFIG_SCHEMA).toHaveProperty('SYNC_TOLERANCE_MS');
      expect(CONFIG_SCHEMA).toHaveProperty('VOICE_CHAT');
      expect(CONFIG_SCHEMA).toHaveProperty('STUN_SERVERS');
      expect(CONFIG_SCHEMA).toHaveProperty('FONT_SIZE');
    });

    it('should have correct schema structure', () => {
      const serverSchema = CONFIG_SCHEMA.SIGNALING_SERVER;
      expect(serverSchema.type).toBe('string');
      expect(serverSchema.required).toBe(true);
      expect(serverSchema.pattern).toBeInstanceOf(RegExp);

      const toleranceSchema = CONFIG_SCHEMA.SYNC_TOLERANCE_MS;
      expect(toleranceSchema.type).toBe('number');
      expect(toleranceSchema.min).toBe(50);
      expect(toleranceSchema.max).toBe(2000);
    });

    it('should have sanitization functions where needed', () => {
      expect(CONFIG_SCHEMA.SIGNALING_SERVER.sanitize).toBeInstanceOf(Function);
      expect(CONFIG_SCHEMA.STUN_SERVERS.sanitize).toBeInstanceOf(Function);
      expect(CONFIG_SCHEMA.DEFAULT_SUBTITLE_LANGS.sanitize).toBeInstanceOf(Function);
    });

    it('should have enum values for appropriate fields', () => {
      expect(CONFIG_SCHEMA.FONT_SIZE.enum).toEqual(['small', 'medium', 'large', 'extra-large']);
      expect(CONFIG_SCHEMA.FOCUS_INDICATOR_STYLE.enum).toEqual([
        'default',
        'high-contrast',
        'custom',
      ]);
    });

    it('should have descriptions for all fields', () => {
      Object.values(CONFIG_SCHEMA).forEach((schema) => {
        expect(schema.description).toBeDefined();
        expect(typeof schema.description).toBe('string');
        expect(schema.description.length).toBeGreaterThan(0);
      });
    });
  });
});
