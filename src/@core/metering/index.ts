/**
 * Metering Module -- public API
 */

export type {
  MeteringConfig,
  MeteringDimension,
  MeteringDimensionConfig,
  MeteringAction,
  MeterUsage,
  MeteringState,
  MeteringResult,
} from './types';

// Re-export wire protocol message types from the canonical signaling module
export type {
  UsageReportMessage,
  MeteringStateMessage,
  MeterLimitExceededMessage,
} from '../signaling/message-types';

export { ALL_METERING_DIMENSIONS } from './types';

export {
  DEFAULT_METERING_CONFIG,
  normalizeMeteringConfig,
  validateMeteringConfig,
} from './metering-config';

export type { MeteringValidationError, MeteringValidationResult } from './metering-config';

export { MeteringClient, createMeteringClient } from './metering-client';
export type { MeteringClientOptions } from './metering-client';
