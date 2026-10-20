/**
 * Tests for metering configuration normalisation and validation
 */

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_METERING_CONFIG,
  normalizeMeteringConfig,
  validateMeteringConfig,
} from './metering-config';

describe('normalizeMeteringConfig', () => {
  it('returns defaults for null/undefined input', () => {
    expect(normalizeMeteringConfig(undefined)).toEqual(DEFAULT_METERING_CONFIG);
    expect(normalizeMeteringConfig(null)).toEqual(DEFAULT_METERING_CONFIG);
  });

  it('fills missing dimensions with defaults', () => {
    const result = normalizeMeteringConfig({ enabled: false });
    expect(result.enabled).toBe(false);
    expect(result.dimensions.chatMessages).toEqual(DEFAULT_METERING_CONFIG.dimensions.chatMessages);
    expect(result.dimensions.connections).toEqual(DEFAULT_METERING_CONFIG.dimensions.connections);
  });

  it('preserves explicitly provided dimension overrides', () => {
    const result = normalizeMeteringConfig({
      dimensions: {
        chatMessages: { enabled: true, limit: 5, windowMs: 10_000, action: 'reject' },
      },
    });
    expect(result.dimensions.chatMessages).toEqual({
      enabled: true,
      limit: 5,
      windowMs: 10_000,
      action: 'reject',
    });
  });

  it('merges partial dimension configs with defaults', () => {
    const result = normalizeMeteringConfig({
      dimensions: {
        reactions: { limit: 99 },
      },
    });
    expect(result.dimensions.reactions.limit).toBe(99);
    expect(result.dimensions.reactions.windowMs).toBe(60_000);
    expect(result.dimensions.reactions.action).toBe('warn');
  });
});

describe('validateMeteringConfig', () => {
  it('accepts the default config', () => {
    const result = validateMeteringConfig(DEFAULT_METERING_CONFIG);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects negative limits', () => {
    const bad = {
      ...DEFAULT_METERING_CONFIG,
      dimensions: {
        ...DEFAULT_METERING_CONFIG.dimensions,
        chatMessages: { ...DEFAULT_METERING_CONFIG.dimensions.chatMessages, limit: -1 },
      },
    };
    const result = validateMeteringConfig(bad);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.field.includes('chatMessages.limit'))).toBe(true);
  });

  it('rejects non-finite limits', () => {
    const bad = {
      ...DEFAULT_METERING_CONFIG,
      dimensions: {
        ...DEFAULT_METERING_CONFIG.dimensions,
        reactions: { ...DEFAULT_METERING_CONFIG.dimensions.reactions, limit: Infinity },
      },
    };
    const result = validateMeteringConfig(bad);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.field.includes('reactions.limit'))).toBe(true);
  });

  it('rejects negative windowMs', () => {
    const bad = {
      ...DEFAULT_METERING_CONFIG,
      dimensions: {
        ...DEFAULT_METERING_CONFIG.dimensions,
        reactions: { ...DEFAULT_METERING_CONFIG.dimensions.reactions, windowMs: -5 },
      },
    };
    const result = validateMeteringConfig(bad);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.field.includes('reactions.windowMs'))).toBe(true);
  });

  it('rejects unknown action values', () => {
    const bad = {
      ...DEFAULT_METERING_CONFIG,
      dimensions: {
        ...DEFAULT_METERING_CONFIG.dimensions,
        reactions: { ...DEFAULT_METERING_CONFIG.dimensions.reactions, action: 'ban' },
      },
    };
    const result = validateMeteringConfig(bad);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.field.includes('reactions.action'))).toBe(true);
  });

  it('rejects non-boolean enabled', () => {
    const bad = {
      ...DEFAULT_METERING_CONFIG,
      dimensions: {
        ...DEFAULT_METERING_CONFIG.dimensions,
        reactions: { ...DEFAULT_METERING_CONFIG.dimensions.reactions, enabled: 'yes' },
      },
    };
    const result = validateMeteringConfig(bad);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.field.includes('reactions.enabled'))).toBe(true);
  });

  it('accepts boundary values (limit 0, windowMs 0)', () => {
    const boundary = {
      enabled: true,
      syncIntervalMs: 0,
      reportUsage: false,
      dimensions: {
        chatMessages: { enabled: true, limit: 0, windowMs: 0, action: 'reject' },
        reactions: { enabled: false, limit: 0, windowMs: 0, action: 'warn' },
        annotationsCreated: { enabled: true, limit: 1, windowMs: 1000, action: 'warn' },
        roomsCreated: { enabled: true, limit: 5, windowMs: 3600000, action: 'reject' },
        connections: { enabled: true, limit: 1, windowMs: 0, action: 'reject' },
      },
    };
    const result = validateMeteringConfig(boundary);
    expect(result.isValid).toBe(true);
  });

  it('rejects missing/non-object config', () => {
    expect(validateMeteringConfig(null as never).isValid).toBe(false);
  });
});
