/**
 * Types for the sync engine
 */

import { PlaybackState } from '../signaling/message-types';
import { ExtensionConfig } from '../browser-bridge/types';

export interface SyncEngineOptions {
  config: ExtensionConfig;
  userId: string;
  isHost: boolean;
  onSyncStateChange?: (state: SyncState) => void;
  onDriftDetected?: (drift: DriftCorrection) => void;
  onSyncMessage?: (message: SyncMessage) => void;
}

export interface SyncState {
  isActive: boolean;
  isHost: boolean;
  currentVideo: HTMLVideoElement | null;
  lastSyncTime: number;
  driftMs: number;
  convergenceTarget: PlaybackState | null;
  convergenceStartTime: number;
}

export interface DriftCorrection {
  detectedDriftMs: number;
  targetTime: number;
  correctionApplied: boolean;
  timestamp: number;
}

export interface SyncMessage {
  type: 'play' | 'pause' | 'seek' | 'heartbeat' | 'drift_correction';
  userId: string;
  timestamp: number;
  currentTime: number;
  paused: boolean;
  playbackRate: number;
  videoUrl?: string;
  duration?: number;
  driftMs?: number;
}

export interface VideoEventHandlers {
  onPlay: () => void;
  onPause: () => void;
  onSeeked: () => void;
  onTimeUpdate: () => void;
  onLoadedMetadata: () => void;
}
