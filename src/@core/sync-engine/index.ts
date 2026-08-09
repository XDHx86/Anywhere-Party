/**
 * Sync Engine module for Watch Party Extension
 *
 * Handles playback synchronization across participants
 * Separate from annotation rendering for performance
 */

export { SyncEngine } from './sync-engine';
export type { SyncState, DriftCorrection, SyncEngineOptions, SyncMessage } from './types';
export * from './types';
