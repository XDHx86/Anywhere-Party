/**
 * Metering Configuration
 *
 * Provides the canonical default metering config, normalisation helpers, and
 * a validator suitable for use by both the extension ConfigValidator and the
 * server-side relay.
 */

import type { MeteringConfig, MeteringDimension, MeteringDimensionConfig } from './types';

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_DIMENSIONS: Record<
  MeteringDimension,
  MeteringConfig['dimensions'][MeteringDimension]
> = {
  chatMessages: { enabled: true, limit: 30, windowMs: 60_000, action: 'warn' },
  reactions: { enabled: true, limit: 20, windowMs: 60_000, action: 'warn' },
  annotationsCreated: { enabled: true, limit: 15, windowMs: 60_000, action: 'warn' },
  roomsCreated: { enabled: true, limit: 5, windowMs: 3_600_000, action: 'reject' },
  connections: { enabled: true, limit: 5, windowMs: 0, action: 'reject' },
};

export const DEFAULT_METERING_CONFIG: MeteringConfig = {
  enabled: true,
  dimensions: { ...DEFAULT_DIMENSIONS },
  syncIntervalMs: 60_000,
  reportUsage: true,
};

// ---------------------------------------------------------------------------
// Normalisation
// ---------------------------------------------------------------------------

/**
 * Fills missing keys in a partial metering config using defaults.
 * Returns a structurally complete `MeteringConfig`.
 */
export function normalizeMeteringConfig(
  raw: Partial<MeteringConfig> | undefined | null
): MeteringConfig {
  if (!raw || typeof raw !== 'object') {
    return structuredClone(DEFAULT_METERING_CONFIG);
  }

  const out = structuredClone(DEFAULT_METERING_CONFIG);

  if (typeof raw.enabled === 'boolean') out.enabled = raw.enabled;
  if (typeof raw.syncIntervalMs === 'number') out.syncIntervalMs = raw.syncIntervalMs;
  if (typeof raw.reportUsage === 'boolean') out.reportUsage = raw.reportUsage;

  if (raw.dimensions && typeof raw.dimensions === 'object') {
    for (const dim of Object.keys(DEFAULT_DIMENSIONS) as MeteringDimension[]) {
      const src = (raw.dimensions as Record<string, Partial<MeteringDimensionConfig>>)[dim];
      if (src && typeof src === 'object') {
        out.dimensions[dim] = {
          ...DEFAULT_DIMENSIONS[dim],
          ...src,
        };
      }
    }
  }

  return out;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface MeteringValidationError {
  field: string;
  message: string;
  value?: unknown;
}

export interface MeteringValidationResult {
  isValid: boolean;
  errors: MeteringValidationError[];
}

/**
 * Validates a metering configuration object.
 *
 * Accepts partial configs: missing/undefined fields are not validated (they
 * will be filled with defaults by `normalizeMeteringConfig`). Present fields
 * with invalid values produce errors -- this is important so that invalid raw
 * values surfaced through `ConfigValidator` are reported rather than silently
 * replaced by defaults.
 *
 * Returns `{ isValid: true }` when the config passes all checks.
 */
export function validateMeteringConfig(
  config: Partial<MeteringConfig> | MeteringConfig
): MeteringValidationResult {
  const errors: MeteringValidationError[] = [];

  if (typeof config !== 'object' || config === null) {
    return {
      isValid: false,
      errors: [{ field: 'config', message: 'Metering config must be a non-null object' }],
    };
  }

  if (config.enabled !== undefined && typeof config.enabled !== 'boolean') {
    errors.push({ field: 'enabled', message: 'Must be boolean', value: config.enabled });
  }

  if (
    config.syncIntervalMs !== undefined &&
    (typeof config.syncIntervalMs !== 'number' || config.syncIntervalMs < 0)
  ) {
    errors.push({
      field: 'syncIntervalMs',
      message: 'Must be a non-negative number',
      value: config.syncIntervalMs,
    });
  }

  if (config.reportUsage !== undefined && typeof config.reportUsage !== 'boolean') {
    errors.push({ field: 'reportUsage', message: 'Must be boolean', value: config.reportUsage });
  }

  // Validate each present dimension
  const dimensions = (config.dimensions || {}) as Record<string, Partial<MeteringDimensionConfig>>;
  for (const [dim, dimCfg] of Object.entries(dimensions)) {
    if (!dimCfg || typeof dimCfg !== 'object') {
      errors.push({
        field: `dimensions.${dim}`,
        message: 'Dimension must be an object',
        value: dimCfg,
      });
      continue;
    }

    if (dimCfg.enabled !== undefined && typeof dimCfg.enabled !== 'boolean') {
      errors.push({
        field: `dimensions.${dim}.enabled`,
        message: 'Must be boolean',
        value: dimCfg.enabled,
      });
    }

    if (
      dimCfg.limit !== undefined &&
      (typeof dimCfg.limit !== 'number' || dimCfg.limit < 0 || !Number.isFinite(dimCfg.limit))
    ) {
      errors.push({
        field: `dimensions.${dim}.limit`,
        message: 'Must be a non-negative finite number',
        value: dimCfg.limit,
      });
    }

    if (dimCfg.limit !== undefined && dimCfg.limit > 1_000_000) {
      errors.push({
        field: `dimensions.${dim}.limit`,
        message: 'Limit should not exceed 1,000,000',
        value: dimCfg.limit,
      });
    }

    if (
      dimCfg.windowMs !== undefined &&
      (typeof dimCfg.windowMs !== 'number' ||
        dimCfg.windowMs < 0 ||
        !Number.isFinite(dimCfg.windowMs))
    ) {
      errors.push({
        field: `dimensions.${dim}.windowMs`,
        message: 'Must be a non-negative finite number',
        value: dimCfg.windowMs,
      });
    }

    if (dimCfg.windowMs !== undefined && dimCfg.windowMs > 86_400_000) {
      errors.push({
        field: `dimensions.${dim}.windowMs`,
        message: 'Window should not exceed 24 hours (86,400,000 ms)',
        value: dimCfg.windowMs,
      });
    }

    if (dimCfg.action !== undefined && dimCfg.action !== 'reject' && dimCfg.action !== 'warn') {
      errors.push({
        field: `dimensions.${dim}.action`,
        message: "Must be 'reject' or 'warn'",
        value: dimCfg.action,
      });
    }

    // Soft warning: warn + high limit is likely misconfigured
    if (dimCfg.action === 'warn' && dimCfg.limit !== undefined && dimCfg.limit > 10_000) {
      errors.push({
        field: `dimensions.${dim}.limit`,
        message: 'Very high limit with warn action may be ineffective',
        value: dimCfg.limit,
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
