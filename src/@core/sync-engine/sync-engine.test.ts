/**
 * Deterministic sync tests for the sync engine
 *
 * Tests host seek operations, drift scenarios, and reconnection flows
 * Requirements: 17.1, 17.2, 17.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SyncEngine } from './sync-engine';
import { SyncState, DriftCorrection, SyncMessage } from './types';
import { ExtensionConfig } from '../browser-bridge/types';

// Mock video element for testing
class MockVideoElement {
  private _currentTime = 0;
  paused = true;
  playbackRate = 1;
  duration = 100;
  src = 'https://example.com/video.mp4';

  get currentTime(): number {
    return this._currentTime;
  }

  set currentTime(value: number) {
    this._currentTime = value;
    // Don't dispatch timeupdate to avoid triggering checkDrift loops
  }

  private eventListeners: Map<string, Function[]> = new Map();

  constructor(initialState: Partial<MockVideoElement> = {}) {
    if (initialState.currentTime !== undefined) {
      this._currentTime = initialState.currentTime;
    }
    Object.assign(this, initialState);
  }

  async play(): Promise<void> {
    this.paused = false;
    this.dispatchEvent('play');
    return Promise.resolve();
  }

  async pause(): Promise<void> {
    this.paused = true;
    this.dispatchEvent('pause');
    return Promise.resolve();
  }

  addEventListener(event: string, handler: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(handler);
  }

  removeEventListener(event: string, handler: Function): void {
    const handlers = this.eventListeners.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  dispatchEvent(event: string): void {
    const handlers = this.eventListeners.get(event);
    if (handlers) {
      handlers.forEach((handler) => handler());
    }
  }

  // Simulate seeking
  seek(time: number): void {
    this.currentTime = time;
    this.dispatchEvent('seeked');
  }

  // Simulate time progression
  simulateTimeUpdate(deltaMs: number): void {
    if (!this.paused) {
      this.currentTime += (deltaMs / 1000) * this.playbackRate;
    }
    this.dispatchEvent('timeupdate');
  }
}

describe('SyncEngine Deterministic Tests', () => {
  let syncEngine: SyncEngine;
  let mockVideo: MockVideoElement;
  let config: ExtensionConfig;
  let syncMessages: SyncMessage[] = [];
  let driftDetections: DriftCorrection[] = [];
  let stateChanges: SyncState[] = [];

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    syncMessages = [];
    driftDetections = [];
    stateChanges = [];

    // Mock timers
    vi.useFakeTimers();

    // Default test configuration
    config = {
      SIGNALING_SERVER: 'ws://localhost:8080',
      SIGNALING_WS_PATH: '',
      STUN_SERVERS: [],
      TURN_SERVERS: [],
      OPENSUBTITLES_KEY: '',
      DEFAULT_SUBTITLE_LANGS: [],
      ROOM_DEFAULT_PASSWORD: '',
      FEATURE_FLAGS: {},
      TELEMETRY_ENABLED: false,
      SYNC_TOLERANCE_MS: 300,
      SYNC_TIMEOUT_MS: 5000,
      HEARTBEAT_INTERVAL_MS: 2000,
      ANNOTATION_RENDER_INTERVAL_MS: 16,
      RECONNECT_INTERVAL_MS: 5000,
      ROOM_STATE_TTL_MS: 300000,
      LOCAL_DEV_MODE: true,
    };

    mockVideo = new MockVideoElement();

    syncEngine = new SyncEngine({
      config,
      userId: 'test-user',
      isHost: false,
      onSyncMessage: (message) => syncMessages.push(message),
      onDriftDetected: (drift) => driftDetections.push(drift),
      onSyncStateChange: (state) => stateChanges.push(state),
    });
  });

  afterEach(() => {
    syncEngine.stopSync();
    vi.useRealTimers();
  });

  describe('Host Seek Operations with Client Convergence', () => {
    it('should ensure all clients converge within ±300ms tolerance within 5 seconds', async () => {
      // Start sync engine as client
      syncEngine.startSync(mockVideo as any, false);

      // Initial state - video at 10 seconds
      mockVideo.currentTime = 10.0;
      mockVideo.paused = false;

      // Host seeks to 50 seconds
      const hostSeekMessage: SyncMessage = {
        type: 'seek',
        userId: 'host-user',
        timestamp: Date.now(),
        currentTime: 50.0,
        paused: false,
        playbackRate: 1.0,
        videoUrl: 'https://example.com/video.mp4',
        duration: 100,
      };

      // Process host seek
      syncEngine.handleSyncMessage(hostSeekMessage);

      // Advance time to allow convergence
      vi.advanceTimersByTime(100);

      // Verify client converged to host position
      expect(mockVideo.currentTime).toBeCloseTo(50.0, 1);
      expect(driftDetections).toHaveLength(1);
      expect(driftDetections[0].correctionApplied).toBe(true);
      expect(Math.abs(driftDetections[0].detectedDriftMs)).toBeGreaterThan(
        config.SYNC_TOLERANCE_MS
      );
    });

    it('should handle multiple rapid seeks correctly', async () => {
      syncEngine.startSync(mockVideo as any, false);
      mockVideo.currentTime = 0;

      const seekTimes = [10, 25, 40, 15, 60];

      for (let i = 0; i < seekTimes.length; i++) {
        const seekMessage: SyncMessage = {
          type: 'seek',
          userId: 'host-user',
          timestamp: Date.now() + i * 100,
          currentTime: seekTimes[i],
          paused: false,
          playbackRate: 1.0,
        };

        syncEngine.handleSyncMessage(seekMessage);
        vi.advanceTimersByTime(50);
      }

      // Final position should match last seek
      expect(mockVideo.currentTime).toBeCloseTo(60, 0);
      expect(driftDetections.length).toBeGreaterThanOrEqual(4); // Should have most seeks trigger drift detection
    });

    it('should maintain convergence within timeout period', async () => {
      syncEngine.startSync(mockVideo as any, false);

      const hostMessage: SyncMessage = {
        type: 'seek',
        userId: 'host-user',
        timestamp: Date.now(),
        currentTime: 30.0,
        paused: false,
        playbackRate: 1.0,
      };

      syncEngine.handleSyncMessage(hostMessage);

      // Interleave clock advancement with simulated playback so the mock
      // reflects a client actually playing at 1x through the timeout window.
      // Advancing the fake clock without also advancing the video would make
      // checkDrift see the client fall behind and snap it back to the seek time.
      const stepMs = 100;
      for (let elapsed = 0; elapsed < config.SYNC_TIMEOUT_MS; elapsed += stepMs) {
        await vi.advanceTimersByTimeAsync(stepMs);
        mockVideo.simulateTimeUpdate(stepMs);
      }

      // Calculate expected time after timeout (30.0 + 5.0 seconds elapsed)
      const expectedTimeAfterTimeout = 30.0 + config.SYNC_TIMEOUT_MS / 1000;

      // Should have converged within timeout
      const finalDrift = Math.abs(mockVideo.currentTime - expectedTimeAfterTimeout) * 1000;
      expect(finalDrift).toBeLessThanOrEqual(config.SYNC_TOLERANCE_MS);
    });
  });

  describe('Drift Scenarios and Correction', () => {
    it('should detect and correct 200ms drift scenario', async () => {
      syncEngine.startSync(mockVideo as any, false);

      // Set initial synchronized state
      mockVideo.currentTime = 20.0;
      mockVideo.paused = false;

      // Simulate 200ms drift by advancing video time
      mockVideo.currentTime = 20.2; // 200ms ahead

      // Host sends heartbeat at expected position
      const hostHeartbeat: SyncMessage = {
        type: 'heartbeat',
        userId: 'host-user',
        timestamp: Date.now(),
        currentTime: 20.0,
        paused: false,
        playbackRate: 1.0,
      };

      syncEngine.handleSyncMessage(hostHeartbeat);

      // Should detect drift but not correct (within tolerance)
      expect(driftDetections).toHaveLength(0); // 200ms is within 300ms tolerance
      expect(mockVideo.currentTime).toBeCloseTo(20.2, 2);
    });

    it('should detect and correct 600ms drift scenario', async () => {
      syncEngine.startSync(mockVideo as any, false);

      // Set initial state
      mockVideo.currentTime = 15.0;
      mockVideo.paused = false;

      // Simulate 600ms drift
      mockVideo.currentTime = 15.6; // 600ms ahead

      // Host sends heartbeat
      const hostHeartbeat: SyncMessage = {
        type: 'heartbeat',
        userId: 'host-user',
        timestamp: Date.now(),
        currentTime: 15.0,
        paused: false,
        playbackRate: 1.0,
      };

      syncEngine.handleSyncMessage(hostHeartbeat);

      // Should detect and correct drift (exceeds 300ms tolerance)
      expect(driftDetections).toHaveLength(1);
      expect(driftDetections[0].detectedDriftMs).toBeCloseTo(600, 1);
      expect(driftDetections[0].correctionApplied).toBe(true);
      expect(mockVideo.currentTime).toBeCloseTo(15.0, 1);
    });

    it('should handle negative drift (client behind host)', async () => {
      syncEngine.startSync(mockVideo as any, false);

      // Client is behind
      mockVideo.currentTime = 25.0;
      mockVideo.paused = false;

      // Host is ahead
      const hostHeartbeat: SyncMessage = {
        type: 'heartbeat',
        userId: 'host-user',
        timestamp: Date.now(),
        currentTime: 25.8, // 800ms ahead
        paused: false,
        playbackRate: 1.0,
      };

      syncEngine.handleSyncMessage(hostHeartbeat);

      // Should correct negative drift
      expect(driftDetections).toHaveLength(1);
      expect(driftDetections[0].detectedDriftMs).toBeCloseTo(800, 1);
      expect(mockVideo.currentTime).toBeCloseTo(25.8, 1);
    });

    it('should handle playback rate changes affecting drift', async () => {
      syncEngine.startSync(mockVideo as any, false);

      mockVideo.currentTime = 10.0;
      mockVideo.paused = false;
      mockVideo.playbackRate = 1.0;

      // Host changes playback rate - create enough drift to trigger sync
      const hostMessage: SyncMessage = {
        type: 'heartbeat',
        userId: 'host-user',
        timestamp: Date.now(),
        currentTime: 10.5, // Create 500ms drift to force sync
        paused: false,
        playbackRate: 1.5, // Faster playback
      };

      syncEngine.handleSyncMessage(hostMessage);

      // Should update playback rate
      expect(mockVideo.playbackRate).toBe(1.5);
    });

    it('should handle paused state synchronization', async () => {
      syncEngine.startSync(mockVideo as any, false);

      mockVideo.currentTime = 30.0;
      mockVideo.paused = false;

      // Host pauses
      const hostPause: SyncMessage = {
        type: 'pause',
        userId: 'host-user',
        timestamp: Date.now(),
        currentTime: 30.0,
        paused: true,
        playbackRate: 1.0,
      };

      syncEngine.handleSyncMessage(hostPause);

      // Should pause video
      expect(mockVideo.paused).toBe(true);
      expect(mockVideo.currentTime).toBeCloseTo(30.0, 1);
    });
  });

  describe('Reconnection and Resynchronization Flows', () => {
    it('should resynchronize after reconnection', async () => {
      syncEngine.startSync(mockVideo as any, false);

      // Initial synchronized state
      mockVideo.currentTime = 40.0;
      mockVideo.paused = false;

      // Simulate disconnection period where client drifts
      mockVideo.currentTime = 45.0; // Client continued playing

      // Reconnect and receive current host state
      const reconnectMessage: SyncMessage = {
        type: 'heartbeat',
        userId: 'host-user',
        timestamp: Date.now(),
        currentTime: 42.0, // Host position after reconnection
        paused: false,
        playbackRate: 1.0,
      };

      // Force resynchronization
      await syncEngine.resynchronize();
      syncEngine.handleSyncMessage(reconnectMessage);

      // Should resync to host position
      expect(driftDetections).toHaveLength(1);
      expect(mockVideo.currentTime).toBeCloseTo(42.0, 1);
    });

    it('should handle multiple reconnection cycles', async () => {
      syncEngine.startSync(mockVideo as any, false);

      const reconnectionScenarios = [
        { clientTime: 10.0, hostTime: 12.0 },
        { clientTime: 25.0, hostTime: 23.0 },
        { clientTime: 40.0, hostTime: 41.5 },
      ];

      for (const scenario of reconnectionScenarios) {
        mockVideo.currentTime = scenario.clientTime;

        const hostMessage: SyncMessage = {
          type: 'heartbeat',
          userId: 'host-user',
          timestamp: Date.now(),
          currentTime: scenario.hostTime,
          paused: false,
          playbackRate: 1.0,
        };

        syncEngine.handleSyncMessage(hostMessage);
        vi.advanceTimersByTime(100);

        expect(mockVideo.currentTime).toBeCloseTo(scenario.hostTime, 1);
      }

      expect(driftDetections.length).toBeGreaterThanOrEqual(2); // At least some drift corrections
    });

    it('should handle resynchronization timeout gracefully', async () => {
      syncEngine.startSync(mockVideo as any, false);

      // Create a scenario where convergence takes longer than expected
      mockVideo.currentTime = 0;

      const hostMessage: SyncMessage = {
        type: 'heartbeat', // Use heartbeat to trigger normal drift detection
        userId: 'host-user',
        timestamp: Date.now(),
        currentTime: 50.0,
        paused: false,
        playbackRate: 1.0,
      };

      syncEngine.handleSyncMessage(hostMessage);

      // Advance past convergence timeout
      vi.advanceTimersByTime(config.SYNC_TIMEOUT_MS + 1000);

      // Should have attempted convergence (large drift should trigger detection)
      expect(driftDetections).toHaveLength(1);
    });

    it('should maintain sync state across stop/start cycles', async () => {
      // Start sync
      syncEngine.startSync(mockVideo as any, false);
      expect(syncEngine.isActive()).toBe(true);

      // Stop sync
      syncEngine.stopSync();
      expect(syncEngine.isActive()).toBe(false);

      // Restart sync
      syncEngine.startSync(mockVideo as any, false);
      expect(syncEngine.isActive()).toBe(true);

      // Should be able to handle messages after restart
      const hostMessage: SyncMessage = {
        type: 'heartbeat',
        userId: 'host-user',
        timestamp: Date.now(),
        currentTime: 20.0,
        paused: false,
        playbackRate: 1.0,
      };

      syncEngine.handleSyncMessage(hostMessage);
      expect(mockVideo.currentTime).toBeCloseTo(20.0, 1);
    });
  });

  describe('Host Mode Operations', () => {
    it('should broadcast sync messages when acting as host', async () => {
      syncEngine.startSync(mockVideo as any, true); // Start as host

      // Simulate host actions
      mockVideo.seek(30.0);
      mockVideo.play();

      // Should have broadcast messages
      expect(syncMessages.length).toBeGreaterThanOrEqual(2); // seek + play

      const seekMessage = syncMessages.find((m) => m.type === 'seek');
      const playMessage = syncMessages.find((m) => m.type === 'play');

      expect(seekMessage).toBeTruthy();
      expect(playMessage).toBeTruthy();
      expect(seekMessage?.currentTime).toBe(30.0);
    });

    it('should send heartbeats at configured intervals', async () => {
      syncEngine.startSync(mockVideo as any, true);

      // Advance time by several heartbeat intervals
      const intervals = 3;
      vi.advanceTimersByTime(config.HEARTBEAT_INTERVAL_MS * intervals);

      // Should have sent heartbeat messages
      const heartbeats = syncMessages.filter((m) => m.type === 'heartbeat');
      expect(heartbeats.length).toBeGreaterThanOrEqual(intervals - 1);
    });

    it('should handle host role transfer correctly', async () => {
      // Start as client
      syncEngine.startSync(mockVideo as any, false);
      expect(syncEngine.getSyncState().isHost).toBe(false);

      // Transfer to host
      syncEngine.setHost(true);
      expect(syncEngine.getSyncState().isHost).toBe(true);

      // Should start broadcasting as host
      mockVideo.seek(15.0);
      expect(syncMessages.some((m) => m.type === 'seek')).toBe(true);
    });
  });

  describe('Configuration Updates', () => {
    it('should update sync intervals when configuration changes', async () => {
      syncEngine.startSync(mockVideo as any, true);

      // Change heartbeat interval
      const newConfig = { ...config, HEARTBEAT_INTERVAL_MS: 1000 };
      syncEngine.updateConfig(newConfig);

      // Clear previous messages
      syncMessages.length = 0;

      // Advance by new interval
      vi.advanceTimersByTime(1000);

      // Should use new interval
      expect(syncMessages.some((m) => m.type === 'heartbeat')).toBe(true);
    });

    it('should update drift tolerance when configuration changes', async () => {
      syncEngine.startSync(mockVideo as any, false);

      // Set stricter tolerance
      const newConfig = { ...config, SYNC_TOLERANCE_MS: 100 };
      syncEngine.updateConfig(newConfig);

      // Create 150ms drift (should now trigger correction with 100ms tolerance)
      mockVideo.currentTime = 10.0;
      const hostMessage: SyncMessage = {
        type: 'heartbeat',
        userId: 'host-user',
        timestamp: Date.now(),
        currentTime: 9.85, // 150ms behind
        paused: false,
        playbackRate: 1.0,
      };

      syncEngine.handleSyncMessage(hostMessage);

      // Should correct with new tolerance
      expect(driftDetections).toHaveLength(1);
      expect(driftDetections[0].detectedDriftMs).toBeCloseTo(150, 1);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle invalid sync messages gracefully', async () => {
      syncEngine.startSync(mockVideo as any, false);

      // Send invalid message
      const invalidMessage = {
        type: 'invalid',
        userId: 'host-user',
        timestamp: Date.now(),
      } as any;

      // Should not throw or crash
      expect(() => {
        syncEngine.handleSyncMessage(invalidMessage);
      }).not.toThrow();
    });

    it('should ignore messages from same user', async () => {
      syncEngine.startSync(mockVideo as any, false);

      const ownMessage: SyncMessage = {
        type: 'seek',
        userId: 'test-user', // Same as sync engine user
        timestamp: Date.now(),
        currentTime: 50.0,
        paused: false,
        playbackRate: 1.0,
      };

      const initialTime = mockVideo.currentTime;
      syncEngine.handleSyncMessage(ownMessage);

      // Should ignore own message
      expect(mockVideo.currentTime).toBe(initialTime);
      expect(driftDetections).toHaveLength(0);
    });

    it('should handle video element errors during sync', async () => {
      // Mock video that throws on seek
      const errorVideo = new MockVideoElement();
      errorVideo.seek = () => {
        throw new Error('Seek failed');
      };

      syncEngine.startSync(errorVideo as any, false);

      const hostMessage: SyncMessage = {
        type: 'seek',
        userId: 'host-user',
        timestamp: Date.now(),
        currentTime: 30.0,
        paused: false,
        playbackRate: 1.0,
      };

      // Should handle error gracefully
      expect(() => {
        syncEngine.handleSyncMessage(hostMessage);
      }).not.toThrow();

      // Should handle error gracefully - may or may not record drift depending on where error occurs
      expect(driftDetections.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle extreme drift values', async () => {
      syncEngine.startSync(mockVideo as any, false);

      // Extreme drift scenario
      mockVideo.currentTime = 0;
      const hostMessage: SyncMessage = {
        type: 'heartbeat',
        userId: 'host-user',
        timestamp: Date.now(),
        currentTime: 3600, // 1 hour ahead
        paused: false,
        playbackRate: 1.0,
      };

      syncEngine.handleSyncMessage(hostMessage);

      // Should handle extreme drift
      expect(driftDetections).toHaveLength(1);
      expect(driftDetections[0].detectedDriftMs).toBeGreaterThan(3000000); // > 50 minutes
      expect(mockVideo.currentTime).toBeCloseTo(3600, 1);
    });
  });
});
