/**
 * Sync Engine - Core synchronization logic
 *
 * Maintains playback synchronization across participants
 * Handles drift detection, correction, and host controls
 */

import {
  SyncEngineOptions,
  SyncState,
  DriftCorrection,
  SyncMessage,
  VideoEventHandlers,
} from './types';
import { PlaybackState } from '../signaling/message-types';
import { ExtensionConfig } from '../browser-bridge/types';
import { PerformanceManager } from '../performance/performance-manager';

export class SyncEngine {
  private config: ExtensionConfig;
  private userId: string;
  private state: SyncState;
  private syncTimer: number | null = null;
  private video: HTMLVideoElement | null = null;
  private videoEventHandlers: VideoEventHandlers | null = null;
  private lastHostUpdate: PlaybackState | null = null;
  private convergenceTimer: number | null = null;
  private performanceManager?: PerformanceManager;

  // Event handlers
  private onSyncStateChange?: (state: SyncState) => void;
  private onDriftDetected?: (drift: DriftCorrection) => void;
  private onSyncMessage?: (message: SyncMessage) => void;

  constructor(options: SyncEngineOptions) {
    this.config = options.config;
    this.userId = options.userId;
    this.onSyncStateChange = options.onSyncStateChange;
    this.onDriftDetected = options.onDriftDetected;
    this.onSyncMessage = options.onSyncMessage;

    this.state = {
      isActive: false,
      isHost: options.isHost,
      currentVideo: null,
      lastSyncTime: 0,
      driftMs: 0,
      convergenceTarget: null,
      convergenceStartTime: 0,
    };
  }

  /**
   * Set performance manager for monitoring and optimization
   */
  setPerformanceManager(performanceManager: PerformanceManager): void {
    this.performanceManager = performanceManager;
  }

  /**
   * Start synchronization with a video element
   */
  startSync(video: HTMLVideoElement, isHost: boolean): void {
    if (this.state.isActive) {
      this.stopSync();
    }

    this.video = video;
    this.state.isHost = isHost;
    this.state.currentVideo = video;
    this.state.isActive = true;
    this.state.lastSyncTime = Date.now();

    this.attachVideoListeners();
    this.startSyncLoop();

    console.log(`Sync engine started - ${isHost ? 'HOST' : 'CLIENT'} mode`);
    this.emitStateChange();
  }

  /**
   * Stop synchronization
   */
  stopSync(): void {
    this.clearSyncTimer();
    this.clearConvergenceTimer();
    this.detachVideoListeners();

    this.state.isActive = false;
    this.state.currentVideo = null;
    this.video = null;
    this.lastHostUpdate = null;

    console.log('Sync engine stopped');
    this.emitStateChange();
  }

  /**
   * Handle incoming sync message from signaling server
   */
  handleSyncMessage(message: SyncMessage): void {
    if (!this.state.isActive || !this.video) {
      return;
    }

    // Don't process our own messages
    if (message.userId === this.userId) {
      return;
    }

    switch (message.type) {
      case 'play':
        this.handleHostPlay(message);
        break;
      case 'pause':
        this.handleHostPause(message);
        break;
      case 'seek':
        this.handleHostSeek(message);
        break;
      case 'heartbeat':
        this.handleHeartbeat(message);
        break;
      default:
        console.warn('Unknown sync message type:', message.type);
    }
  }

  /**
   * Force resynchronization to current host state
   */
  async resynchronize(): Promise<void> {
    if (!this.state.isActive || !this.video || this.state.isHost) {
      return;
    }

    if (!this.lastHostUpdate) {
      console.warn('No host state available for resynchronization');
      return;
    }

    console.log('Forcing resynchronization to host state');
    await this.syncToState(this.lastHostUpdate, true);
  }

  /**
   * Update sync engine configuration
   */
  updateConfig(newConfig: ExtensionConfig): void {
    const intervalChanged = this.config.HEARTBEAT_INTERVAL_MS !== newConfig.HEARTBEAT_INTERVAL_MS;

    this.config = newConfig;

    if (intervalChanged && this.state.isActive) {
      this.restartSyncLoop();
    }
  }

  /**
   * Set host status
   */
  setHost(isHost: boolean): void {
    if (this.state.isHost === isHost) return;

    this.state.isHost = isHost;
    console.log(`Sync engine role changed to: ${isHost ? 'HOST' : 'CLIENT'}`);

    if (isHost && this.state.isActive && this.video) {
      // As new host, broadcast current state immediately
      this.broadcastCurrentState('heartbeat');
    }

    this.emitStateChange();
  }

  /**
   * Get current sync state
   */
  getSyncState(): SyncState {
    return { ...this.state };
  }

  /**
   * Check if sync is active
   */
  isActive(): boolean {
    return this.state.isActive;
  }

  private attachVideoListeners(): void {
    if (!this.video) return;

    this.videoEventHandlers = {
      onPlay: () => {
        if (this.state.isHost) {
          this.broadcastCurrentState('play');
        }
      },
      onPause: () => {
        if (this.state.isHost) {
          this.broadcastCurrentState('pause');
        }
      },
      onSeeked: () => {
        if (this.state.isHost) {
          this.broadcastCurrentState('seek');
        }
      },
      onTimeUpdate: () => {
        // Only used for drift detection in client mode
        if (!this.state.isHost && this.lastHostUpdate) {
          this.checkDrift();
        }
      },
      onLoadedMetadata: () => {
        if (this.state.isHost) {
          this.broadcastCurrentState('heartbeat');
        }
      },
    };

    this.video.addEventListener('play', this.videoEventHandlers.onPlay);
    this.video.addEventListener('pause', this.videoEventHandlers.onPause);
    this.video.addEventListener('seeked', this.videoEventHandlers.onSeeked);
    this.video.addEventListener('timeupdate', this.videoEventHandlers.onTimeUpdate);
    this.video.addEventListener('loadedmetadata', this.videoEventHandlers.onLoadedMetadata);
  }

  private detachVideoListeners(): void {
    if (!this.video || !this.videoEventHandlers) return;

    this.video.removeEventListener('play', this.videoEventHandlers.onPlay);
    this.video.removeEventListener('pause', this.videoEventHandlers.onPause);
    this.video.removeEventListener('seeked', this.videoEventHandlers.onSeeked);
    this.video.removeEventListener('timeupdate', this.videoEventHandlers.onTimeUpdate);
    this.video.removeEventListener('loadedmetadata', this.videoEventHandlers.onLoadedMetadata);

    this.videoEventHandlers = null;
  }

  private startSyncLoop(): void {
    this.clearSyncTimer();

    this.syncTimer = window.setInterval(() => {
      if (this.state.isHost && this.video) {
        this.broadcastCurrentState('heartbeat');
      }
    }, this.config.HEARTBEAT_INTERVAL_MS);
  }

  private restartSyncLoop(): void {
    if (this.state.isActive) {
      this.startSyncLoop();
    }
  }

  private handleHostPlay(message: SyncMessage): void {
    if (!this.video || this.state.isHost) return;

    const targetState: PlaybackState = {
      currentTime: message.currentTime,
      paused: false,
      playbackRate: message.playbackRate,
      timestamp: message.timestamp,
      videoUrl: message.videoUrl,
      duration: message.duration,
    };

    this.lastHostUpdate = targetState;
    this.syncToState(targetState, true); // Force sync for play commands
  }

  private handleHostPause(message: SyncMessage): void {
    if (!this.video || this.state.isHost) return;

    const targetState: PlaybackState = {
      currentTime: message.currentTime,
      paused: true,
      playbackRate: message.playbackRate,
      timestamp: message.timestamp,
      videoUrl: message.videoUrl,
      duration: message.duration,
    };

    this.lastHostUpdate = targetState;
    this.syncToState(targetState, true); // Force sync for pause commands
  }

  private handleHostSeek(message: SyncMessage): void {
    if (!this.video || this.state.isHost) return;

    const targetState: PlaybackState = {
      currentTime: message.currentTime,
      paused: message.paused,
      playbackRate: message.playbackRate,
      timestamp: message.timestamp,
      videoUrl: message.videoUrl,
      duration: message.duration,
    };

    this.lastHostUpdate = targetState;
    this.syncToState(targetState, true); // Force sync for seeks
  }

  private handleHeartbeat(message: SyncMessage): void {
    if (!this.video || this.state.isHost) return;

    const targetState: PlaybackState = {
      currentTime: message.currentTime,
      paused: message.paused,
      playbackRate: message.playbackRate,
      timestamp: message.timestamp,
      videoUrl: message.videoUrl,
      duration: message.duration,
    };

    this.lastHostUpdate = targetState;
    this.state.lastSyncTime = Date.now();

    // Only sync if drift is significant
    const drift = this.calculateDrift(targetState);
    if (Math.abs(drift) > this.config.SYNC_TOLERANCE_MS) {
      this.syncToState(targetState);
    }
  }

  private async syncToState(targetState: PlaybackState, forceSync = false): Promise<void> {
    if (!this.video) return;

    const syncStartTime = performance.now();
    this.lastHostUpdate = targetState;

    // Calculate expected current time based on elapsed time since message
    const now = Date.now();
    const elapsedMs = now - targetState.timestamp;
    const expectedTime = targetState.paused
      ? targetState.currentTime
      : targetState.currentTime + (elapsedMs / 1000) * targetState.playbackRate;

    const currentTime = this.video.currentTime;
    const timeDiff = Math.abs(expectedTime - currentTime);
    const driftMs = timeDiff * 1000;

    // Store drift for monitoring
    this.state.driftMs = driftMs;

    // Record drift measurement for performance monitoring
    if (this.performanceManager) {
      this.performanceManager.recordDriftMeasurement(driftMs);
    }

    // Always sync playback rate and play/pause state, but only seek if drift exceeds tolerance or forced
    const shouldSeek = forceSync || driftMs > this.config.SYNC_TOLERANCE_MS;

    console.log(
      `Syncing to host state - drift: ${driftMs.toFixed(1)}ms, target: ${expectedTime.toFixed(2)}s`
    );

    try {
      // Start convergence tracking
      this.state.convergenceTarget = targetState;
      this.state.convergenceStartTime = now;
      this.startConvergenceMonitoring();

      // Always sync playback rate
      if (this.video.playbackRate !== targetState.playbackRate) {
        this.video.playbackRate = targetState.playbackRate;
      }

      // Always sync play/pause state
      if (targetState.paused && !this.video.paused) {
        await this.video.pause();
      } else if (!targetState.paused && this.video.paused) {
        await this.video.play();
      }

      // Apply time sync corrections only if needed
      if (shouldSeek && timeDiff > 0.1) {
        // Only seek if difference is significant
        this.video.currentTime = expectedTime;
      }

      // Record successful sync
      if (this.performanceManager) {
        this.performanceManager.recordSyncAttempt(true);
        const syncLatency = performance.now() - syncStartTime;
        this.performanceManager.recordSyncLatency(syncLatency);
      }

      // Emit drift detection event only if we actually corrected drift
      if (shouldSeek) {
        const correction: DriftCorrection = {
          detectedDriftMs: driftMs,
          targetTime: expectedTime,
          correctionApplied: true,
          timestamp: now,
        };

        // Record drift correction for performance monitoring
        if (this.performanceManager) {
          this.performanceManager.recordDriftCorrection(correction);
        }

        if (this.onDriftDetected) {
          this.onDriftDetected(correction);
        }
      }
    } catch (error) {
      console.error('Failed to sync video state:', error);

      // Record failed sync
      if (this.performanceManager) {
        this.performanceManager.recordSyncAttempt(false);
      }

      if (shouldSeek) {
        const correction: DriftCorrection = {
          detectedDriftMs: driftMs,
          targetTime: expectedTime,
          correctionApplied: false,
          timestamp: now,
        };

        // Record drift correction attempt for performance monitoring
        if (this.performanceManager) {
          this.performanceManager.recordDriftCorrection(correction);
        }

        if (this.onDriftDetected) {
          this.onDriftDetected(correction);
        }
      }
    }
  }

  private calculateDrift(hostState: PlaybackState): number {
    if (!this.video) return 0;

    const now = Date.now();
    const elapsedMs = now - hostState.timestamp;
    const expectedTime = hostState.paused
      ? hostState.currentTime
      : hostState.currentTime + (elapsedMs / 1000) * hostState.playbackRate;

    const actualTime = this.video.currentTime;
    return (expectedTime - actualTime) * 1000; // Return drift in milliseconds
  }

  private checkDrift(): void {
    if (!this.lastHostUpdate || !this.video) return;

    const drift = this.calculateDrift(this.lastHostUpdate);
    this.state.driftMs = Math.abs(drift);

    // Auto-correct if drift exceeds tolerance
    if (Math.abs(drift) > this.config.SYNC_TOLERANCE_MS) {
      this.syncToState(this.lastHostUpdate);
    }
  }

  private startConvergenceMonitoring(): void {
    this.clearConvergenceTimer();

    this.convergenceTimer = window.setTimeout(() => {
      if (this.state.convergenceTarget) {
        const elapsed = Date.now() - this.state.convergenceStartTime;
        const drift = this.calculateDrift(this.state.convergenceTarget);

        if (Math.abs(drift) <= this.config.SYNC_TOLERANCE_MS) {
          console.log(`Convergence achieved in ${elapsed}ms`);
        } else {
          console.warn(`Convergence timeout after ${elapsed}ms, drift: ${drift.toFixed(1)}ms`);

          // Record convergence failure for performance monitoring
          if (this.performanceManager) {
            this.performanceManager.recordConvergenceFailure();
          }
        }

        this.state.convergenceTarget = null;
      }
    }, this.config.SYNC_TIMEOUT_MS);
  }

  private broadcastCurrentState(type: 'play' | 'pause' | 'seek' | 'heartbeat'): void {
    if (!this.video || !this.state.isHost) return;

    const message: SyncMessage = {
      type,
      userId: this.userId,
      timestamp: Date.now(),
      currentTime: this.video.currentTime,
      paused: this.video.paused,
      playbackRate: this.video.playbackRate,
      videoUrl: this.video.src || this.video.currentSrc,
      duration: this.video.duration,
    };

    if (this.onSyncMessage) {
      this.onSyncMessage(message);
    }
  }

  private emitStateChange(): void {
    if (this.onSyncStateChange) {
      this.onSyncStateChange({ ...this.state });
    }
  }

  private clearSyncTimer(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  private clearConvergenceTimer(): void {
    if (this.convergenceTimer) {
      clearTimeout(this.convergenceTimer);
      this.convergenceTimer = null;
    }
  }
}
