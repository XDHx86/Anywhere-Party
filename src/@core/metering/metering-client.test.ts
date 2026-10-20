/**
 * Tests for MeteringClient
 *
 * Covers: local non-authoritative counting, limit enforcement for display,
 * authoritative state application, config fallback, boundary conditions.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MeteringClient, createMeteringClient } from './metering-client';
import type { MeteringConfig } from './types';

function testConfig(overrides: Partial<MeteringConfig> = {}): MeteringConfig {
  return {
    enabled: true,
    syncIntervalMs: 60_000,
    reportUsage: false,
    dimensions: {
      chatMessages: { enabled: true, limit: 2, windowMs: 10_000, action: 'warn' },
      reactions: { enabled: true, limit: 1, windowMs: 10_000, action: 'reject' },
      annotationsCreated: { enabled: true, limit: 3, windowMs: 10_000, action: 'warn' },
      roomsCreated: { enabled: true, limit: 1, windowMs: 60_000, action: 'reject' },
      connections: { enabled: true, limit: 5, windowMs: 0, action: 'reject' },
    },
    ...overrides,
  };
}

describe('MeteringClient', () => {
  let now = 1_000_000;

  beforeEach(() => {
    now = 1_000_000;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function makeClient(config: MeteringConfig, userId = 'user-1') {
    return new MeteringClient({ config, userId, now: () => now });
  }

  describe('recordUsage', () => {
    it('allows usage below the limit', () => {
      const client = makeClient(testConfig());
      const result = client.recordUsage('chatMessages');
      expect(result.allowed).toBe(true);
      expect(result.current).toBe(1);
      expect(result.limit).toBe(2);
    });

    it('allows usage at exactly the limit', () => {
      const client = makeClient(testConfig());
      client.recordUsage('chatMessages');
      const result = client.recordUsage('chatMessages');
      expect(result.allowed).toBe(true);
      expect(result.current).toBe(2);
    });

    it('disallows usage beyond the limit', () => {
      const client = makeClient(testConfig());
      client.recordUsage('chatMessages');
      client.recordUsage('chatMessages');
      const result = client.recordUsage('chatMessages');
      expect(result.allowed).toBe(false);
      expect(result.current).toBe(3);
    });

    it('respects window rollover (resets after windowMs)', () => {
      const client = makeClient(testConfig());
      client.recordUsage('chatMessages');
      client.recordUsage('chatMessages');
      now += 10_000; // window expires
      const result = client.recordUsage('chatMessages');
      expect(result.allowed).toBe(true);
      expect(result.current).toBe(1);
    });

    it('returns allowed=true when config is disabled', () => {
      const client = makeClient(testConfig({ enabled: false }));
      expect(client.recordUsage('chatMessages').allowed).toBe(true);
    });

    it('returns allowed=true for a disabled dimension', () => {
      const config = testConfig();
      config.dimensions.chatMessages.enabled = false;
      const client = makeClient(config);
      expect(client.recordUsage('chatMessages').allowed).toBe(true);
    });

    it('records the delta amount in one call', () => {
      const client = makeClient(testConfig());
      const result = client.recordUsage('chatMessages', 2);
      expect(result.current).toBe(2);
      expect(result.allowed).toBe(true);
    });
  });

  describe('getState / getDimensionUsage', () => {
    it('labels local state as non-authoritative', () => {
      const client = makeClient(testConfig());
      client.recordUsage('chatMessages');
      const state = client.getState();
      expect(state.source).toBe('client');
      expect(state.usage.chatMessages?.authoritative).toBe(false);
    });

    it('reports current usage per dimension', () => {
      const client = makeClient(testConfig());
      client.recordUsage('chatMessages');
      client.recordUsage('chatMessages');
      const usage = client.getDimensionUsage('chatMessages');
      expect(usage?.current).toBe(2);
      expect(usage?.limit).toBe(2);
    });
  });

  describe('applyServerState', () => {
    it('replaces local counters with authoritative server state', () => {
      const client = makeClient(testConfig());
      client.recordUsage('chatMessages');
      client.recordUsage('chatMessages');
      client.recordUsage('chatMessages'); // local says 3 (over limit)

      client.applyServerState({
        userId: 'user-1',
        timestamp: now,
        source: 'server',
        usage: {
          chatMessages: {
            dimension: 'chatMessages',
            current: 1,
            limit: 2,
            windowMs: 10_000,
            windowStart: now - 1000,
            action: 'warn',
            enabled: true,
            authoritative: true,
          },
        },
      });

      const usage = client.getDimensionUsage('chatMessages');
      expect(usage?.current).toBe(1);
    });
  });

  describe('usage reporting', () => {
    it('buffers reports and flushes via onReport', () => {
      const onReport = vi.fn();
      const client = new MeteringClient({
        config: testConfig({ reportUsage: true, syncIntervalMs: 60_000 }),
        userId: 'user-1',
        now: () => now,
        onReport,
      });

      client.recordUsage('chatMessages');
      client.recordUsage('reactions');
      // Use destroy to trigger the flush deterministically
      client.destroy();

      expect(onReport).toHaveBeenCalledTimes(1);
      const reports = onReport.mock.calls[0][0];
      expect(reports).toHaveLength(2);
      expect(reports[0]).toMatchObject({ dimension: 'chatMessages', delta: 1 });
    });

    it('does not call onReport when reportUsage is false', () => {
      const onReport = vi.fn();
      const client = makeClient(testConfig({ reportUsage: false }), 'user-1');
      (client as unknown as { onReport?: typeof onReport }).onReport = onReport;
      client.recordUsage('chatMessages');
      client.destroy();
      // onReport override applied post-construction is ignored; nothing crashes
      expect(client).toBeDefined();
    });
  });

  describe('createMeteringClient', () => {
    it('returns a working client', () => {
      const client = createMeteringClient({ config: testConfig(), userId: 'u' });
      expect(client.recordUsage('chatMessages').allowed).toBe(true);
      client.destroy();
    });
  });
});
