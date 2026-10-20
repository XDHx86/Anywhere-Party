/**
 * Metering Client
 *
 * Client-side metering service for the extension (content-script / background).
 * Maintains **non-authoritative** local sliding-window counters for UX display
 * (e.g. "You are approaching your chat-message limit").
 *
 * Trust boundary: the values held here are NEVER authoritative for enforcement
 * or accounting.  The server maintains its own counters and makes all allow /
 * reject decisions.  The client may present local limits as a pre-warning to
 * the user, but must never block or alter behaviour solely on local state.
 */

import type {
  MeteringConfig,
  MeteringDimension,
  MeteringState,
  MeteringResult,
  MeterUsage,
} from './types';
import { ALL_METERING_DIMENSIONS } from './types';
import {
  DEFAULT_METERING_CONFIG,
  normalizeMeteringConfig,
  validateMeteringConfig,
} from './metering-config';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface WindowBucket {
  /** Timestamps (epoch-ms) of events within the current window. */
  timestamps: number[];
  /** Start of the current window. */
  windowStart: number;
}

function createWindowBucket(now: number, windowMs: number): WindowBucket {
  return { timestamps: [], windowStart: windowMs > 0 ? now : 0 };
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export interface MeteringClientOptions {
  config?: Partial<MeteringConfig>;
  userId: string;
  /** Called when a usage report should be sent to the server (if enabled). */
  onReport?: (
    reports: { dimension: MeteringDimension; delta: number; timestamp: number }[]
  ) => void;
  /** Clock override for testing. */
  now?: () => number;
}

export class MeteringClient {
  private readonly config: MeteringConfig;
  private readonly userId: string;
  private readonly onReport?: MeteringClientOptions['onReport'];
  private readonly clock: () => number;

  private readonly windows = new Map<MeteringDimension, WindowBucket>();

  /** Buffered usage reports awaiting next flush. */
  private pendingReports: { dimension: MeteringDimension; delta: number; timestamp: number }[] = [];

  private reportTimer: ReturnType<typeof setInterval> | null = null;

  constructor(options: MeteringClientOptions) {
    const normalised = normalizeMeteringConfig(options.config);
    const validation = validateMeteringConfig(normalised);

    if (!validation.isValid) {
      console.warn(
        '[MeteringClient] Invalid config provided, falling back to defaults:',
        validation.errors
      );
    }

    // Always use normalised (potentially defaulted) config so we guarantee
    // structural integrity regardless of validation outcome.
    this.config = validation.isValid ? normalised : DEFAULT_METERING_CONFIG;
    this.userId = options.userId;
    this.onReport = options.onReport;
    this.clock = options.now ?? (() => Date.now());

    // Initialise window buckets for every enabled dimension
    for (const dim of ALL_METERING_DIMENSIONS) {
      if (this.isDimEnabled(dim)) {
        this.windows.set(
          dim,
          createWindowBucket(this.clock(), this.config.dimensions[dim].windowMs)
        );
      }
    }

    // Start periodic report flush
    if (this.config.enabled && this.config.reportUsage) {
      this.reportTimer = setInterval(
        () => this.flushReports(),
        Math.min(this.config.syncIntervalMs, 15_000)
      );
    }
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Record local usage (advisory / non-authoritative).
   * Returns whether the local counter considers the call within limits.
   */
  recordUsage(dimension: MeteringDimension, amount = 1): MeteringResult {
    const dimCfg = this.config.dimensions[dimension];

    if (!this.config.enabled || !dimCfg || !dimCfg.enabled) {
      return this.allowedResult(dimension);
    }

    const now = this.clock();
    let bucket = this.windows.get(dimension);

    // Lazily create bucket if dimension was disabled then enabled
    if (!bucket) {
      bucket = createWindowBucket(now, dimCfg.windowMs);
      this.windows.set(dimension, bucket);
    }

    // Advance window if needed
    if (dimCfg.windowMs > 0 && now >= bucket.windowStart + dimCfg.windowMs) {
      bucket.timestamps = [];
      bucket.windowStart = now;
    }

    // Push events
    for (let i = 0; i < amount; i++) {
      bucket.timestamps.push(now);
    }

    const current = bucket.timestamps.length;
    const allowed = current <= dimCfg.limit;

    // Buffer report for periodic flush to server
    if (this.config.reportUsage && this.onReport) {
      this.pendingReports.push({ dimension, delta: amount, timestamp: now });
    }

    return {
      dimension,
      allowed,
      current,
      limit: dimCfg.limit,
      resetAt: dimCfg.windowMs > 0 ? bucket.windowStart + dimCfg.windowMs : Infinity,
    };
  }

  /**
   * Apply authoritative state received from the server.
   * Overwrites local counters with the server's values.
   */
  applyServerState(state: MeteringState): void {
    for (const [dim, usage] of Object.entries(state.usage) as [MeteringDimension, MeterUsage][]) {
      if (!usage || !this.config.dimensions[dim]) continue;

      // We update local tracking to mirror the server for display accuracy.
      // This never grants the client enforcement authority.
      const bucket = this.windows.get(dim) ?? createWindowBucket(state.timestamp, usage.windowMs);
      // Replace timestamps with dummy entries to match server count
      bucket.timestamps = Array.from({ length: usage.current }, () => usage.current); // marker value
      bucket.windowStart = usage.windowStart;
      this.windows.set(dim, bucket);
    }
  }

  /**
   * Get the full metering state (non-authoritative).
   */
  getState(): MeteringState {
    const usage: Partial<Record<MeteringDimension, MeterUsage>> = {};
    const now = this.clock();

    for (const dim of ALL_METERING_DIMENSIONS) {
      const dimCfg = this.config.dimensions[dim];
      if (!this.config.enabled || !dimCfg || !dimCfg.enabled) continue;

      const bucket = this.windows.get(dim);
      if (!bucket) continue;

      // Prune expired
      if (dimCfg.windowMs > 0 && now >= bucket.windowStart + dimCfg.windowMs) {
        bucket.timestamps = [];
        bucket.windowStart = now;
      }

      usage[dim] = {
        dimension: dim,
        current: bucket.timestamps.length,
        limit: dimCfg.limit,
        windowMs: dimCfg.windowMs,
        windowStart: bucket.windowStart,
        action: dimCfg.action,
        enabled: true,
        authoritative: false,
      };
    }

    return {
      userId: this.userId,
      usage,
      timestamp: now,
      source: 'client',
    };
  }

  /**
   * Get usage snapshot for a single dimension.
   */
  getDimensionUsage(dimension: MeteringDimension): MeterUsage | undefined {
    const state = this.getState();
    return state.usage[dimension];
  }

  /**
   * Check whether a dimension is enabled in the current config.
   */
  isDimEnabled(dimension: MeteringDimension): boolean {
    return this.config.enabled && this.config.dimensions[dimension]?.enabled === true;
  }

  /**
   * Returns the current config snapshot.
   */
  getConfig(): MeteringConfig {
    return this.config;
  }

  /**
   * Cancel the periodic report timer.
   */
  destroy(): void {
    if (this.reportTimer !== null) {
      clearInterval(this.reportTimer);
      this.reportTimer = null;
    }
    // Flush remaining reports
    this.flushReports();
  }

  // -----------------------------------------------------------------------
  // Internals
  // -----------------------------------------------------------------------

  private allowedResult(dimension: MeteringDimension): MeteringResult {
    return { dimension, allowed: true, current: 0, limit: Infinity, resetAt: Infinity };
  }

  private flushReports(): void {
    if (this.pendingReports.length === 0 || !this.onReport) return;
    const batch = this.pendingReports.splice(0);
    this.onReport(batch);
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createMeteringClient(options: MeteringClientOptions): MeteringClient {
  return new MeteringClient(options);
}
