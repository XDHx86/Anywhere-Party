/**
 * Tests for ConfigValidator metering integration
 */

import { describe, it, expect } from 'vitest';
import { ConfigValidator } from './config-validator';
import { DEFAULT_METERING_CONFIG } from '../metering/metering-config';

describe('ConfigValidator METERING integration', () => {
  it('accepts a valid METERING section', () => {
    const result = ConfigValidator.validate({ METERING: DEFAULT_METERING_CONFIG });
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects a malformed METERING section', () => {
    const result = ConfigValidator.validate({
      METERING: {
        enabled: true,
        syncIntervalMs: 'not-a-number',
        reportUsage: true,
        dimensions: {
          chatMessages: { enabled: true, limit: -5, windowMs: 60_000, action: 'reject' },
          reactions: { enabled: true, limit: 10, windowMs: 60_000, action: 'warn' },
          annotationsCreated: { enabled: true, limit: 10, windowMs: 60_000, action: 'warn' },
          roomsCreated: { enabled: true, limit: 5, windowMs: 3_600_000, action: 'reject' },
          connections: { enabled: true, limit: 5, windowMs: 0, action: 'reject' },
        },
      },
    });
    expect(result.isValid).toBe(false);
    const fields = result.errors.map((e) => e.field);
    expect(fields.some((f) => f.includes('METERING.syncIntervalMs'))).toBe(true);
    expect(fields.some((f) => f.includes('METERING.dimensions.chatMessages.limit'))).toBe(true);
  });

  it('accepts a partial METERING section (dimensions normalized with defaults)', () => {
    const result = ConfigValidator.validate({
      METERING: {
        enabled: true,
        syncIntervalMs: 60_000,
        reportUsage: true,
        dimensions: {
          chatMessages: { enabled: true, limit: 50, windowMs: 60_000, action: 'warn' },
        },
      },
    });
    expect(result.isValid).toBe(true);
  });

  it('accepts a config without METERING (partial config validation)', () => {
    const result = ConfigValidator.validate({ SIGNALING_SERVER: 'ws://localhost:8080' });
    expect(result.isValid).toBe(true);
  });
});
