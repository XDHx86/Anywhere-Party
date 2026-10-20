/**
 * Metering Types
 *
 * Centralized type definitions for usage metering / rate limiting.
 * Metering dimensions represent countable user actions enforced server-side.
 *
 * Trust boundary: server is the authoritative source for enforcement and
 * accounting.  Client-held values are labelled `authoritative: false` and
 * exist solely for UX display -- never for enforcement decisions.
 */

// ---------------------------------------------------------------------------
// Dimensions
// ---------------------------------------------------------------------------

/** The metered actions that can be tracked per user. */
export type MeteringDimension =
  'chatMessages' | 'reactions' | 'annotationsCreated' | 'roomsCreated' | 'connections';

/** Enforcement action when a limit is breached. */
export type MeteringAction = 'reject' | 'warn';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Limits for a single metering dimension. */
export interface MeteringDimensionConfig {
  enabled: boolean;
  /** Maximum number of events allowed within `windowMs`. */
  limit: number;
  /** Sliding window length in milliseconds.  0 means a concurrent gauge. */
  windowMs: number;
  /** What to do when the limit is exceeded. */
  action: MeteringAction;
}

/** Top-level metering configuration shape. */
export interface MeteringConfig {
  /** Master switch -- when false all dimensions are effectively disabled. */
  enabled: boolean;
  /** Per-dimension limits. */
  dimensions: Record<MeteringDimension, MeteringDimensionConfig>;
  /** How often (ms) the client should request authoritative state from the server. */
  syncIntervalMs: number;
  /** Whether the client should send advisory usage reports to the server. */
  reportUsage: boolean;
}

// ---------------------------------------------------------------------------
// Usage state
// ---------------------------------------------------------------------------

/** A snapshot of current usage for one dimension. */
export interface MeterUsage {
  dimension: MeteringDimension;
  /** Current count within the active window. */
  current: number;
  limit: number;
  windowMs: number;
  /** Epoch-ms when the current window started. */
  windowStart: number;
  action: MeteringAction;
  enabled: boolean;
  /** `true` when the server is the source of this state (authoritative). */
  authoritative: boolean;
}

/** Full metering state for a user. */
export interface MeteringState {
  userId: string;
  usage: Partial<Record<MeteringDimension, MeterUsage>>;
  timestamp: number;
  source: 'server' | 'client' | 'default';
}

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

/** Result of a client-side recordUsage call. */
export interface MeteringResult {
  dimension: MeteringDimension;
  allowed: boolean;
  current: number;
  limit: number;
  resetAt: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** List of all metering dimensions for iteration. */
export const ALL_METERING_DIMENSIONS: MeteringDimension[] = [
  'chatMessages',
  'reactions',
  'annotationsCreated',
  'roomsCreated',
  'connections',
];
