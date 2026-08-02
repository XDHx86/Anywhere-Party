/**
 * Video detector module exports
 */

export { VideoDetector } from './video-detector';
export { RetryManager } from './retry-logic';
export {
  getPlatformPlayer,
  PLATFORM_PLAYERS,
  YouTubePlayer,
  NetflixPlayer,
  TwitchPlayer,
  GenericPlayer,
} from './platform-players';

export type {
  VideoElement,
  VideoDetectionResult,
  VideoDetectorConfig,
  DetectionHeuristics,
  PlatformPlayer,
} from './types';
