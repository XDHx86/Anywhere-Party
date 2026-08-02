/**
 * Video detector types and interfaces
 */

export interface VideoElement extends HTMLVideoElement {
  // Extended properties for tracking
  _watchPartyId?: string;
  _lastPlayTime?: number;
  _aspectRatio?: number;
}

export interface VideoDetectionResult {
  success: boolean;
  video?: VideoElement;
  method: 'automatic' | 'right-click' | 'manual';
  error?: string;
  fallbackAvailable: boolean;
  confidence?: number;
  source?: 'playing' | 'recent' | 'aspect-ratio' | 'manual';
  platform?: string;
}

export interface PlatformPlayer {
  name: string;
  domains: string[];
  selectors: string[];
  getVideo(): VideoElement | null;
  canControl(): boolean;
  play?(): Promise<void>;
  pause?(): Promise<void>;
  seek?(time: number): Promise<void>;
  getCurrentTime?(): number;
  getDuration?(): number;
}

export interface VideoDetectorConfig {
  pollInterval?: number;
  retryAttempts: number;
  retryDelay: number;
  maxRetryDelay: number;
  aspectRatioThreshold: number;
  recentPlayThreshold: number;
}

export interface DetectionHeuristics {
  prioritizePlayingVideos: boolean;
  considerRecentlyPlayed: boolean;
  fallbackToLargestAspectRatio: boolean;
  recentPlayTimeThreshold: number; // ms
}
