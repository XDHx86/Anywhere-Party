/**
 * Voice Integration Tests
 *
 * Tests for WebRTC voice integration with room system and signaling server.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VoiceIntegration, VoiceIntegrationConfig } from './voice-integration';
import { WebRTCVoiceManager } from './webrtc-voice-manager';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;

  constructor(public url: string) {
    // Simulate connection opening
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 10);
  }

  send(data: string): void {
    // Mock send implementation
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }
}

// Mock WebRTCVoiceManager. Implementation must be a regular function (not an
// arrow) so `new WebRTCVoiceManager(...)` inside voice-integration constructs it.
vi.mock('./webrtc-voice-manager', () => ({
  WebRTCVoiceManager: vi.fn().mockImplementation(function () {
    return {
      initialize: vi.fn().mockResolvedValue({ connected: true, connectionType: 'stun' }),
      connectToParticipant: vi.fn().mockResolvedValue(undefined),
      handleOffer: vi.fn().mockResolvedValue(undefined),
      handleAnswer: vi.fn().mockResolvedValue(undefined),
      handleIceCandidate: vi.fn().mockResolvedValue(undefined),
      disconnectParticipant: vi.fn(),
      setMuted: vi.fn(),
      isMutedState: vi.fn().mockReturnValue(false),
      enablePushToTalk: vi.fn(),
      setParticipantVolume: vi.fn(),
      getParticipantVolume: vi.fn().mockReturnValue(0.8),
      getParticipants: vi.fn().mockReturnValue([]),
      getConnectionStatus: vi.fn().mockReturnValue({ connected: true, connectionType: 'stun' }),
      destroy: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    };
  }),
}));

// Set up global WebSocket mock
Object.defineProperty(global, 'WebSocket', {
  value: MockWebSocket,
  writable: true,
});

describe('VoiceIntegration', () => {
  let voiceIntegration: VoiceIntegration;
  let mockConfig: VoiceIntegrationConfig;
  let mockVoiceManager: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockConfig = {
      stunServers: ['stun:stun.l.google.com:19302'],
      turnServers: [],
      pushToTalkKey: 'Space',
      defaultVolume: 0.8,
      audioConstraints: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      roomId: 'test-room-123',
      userId: 'test-user-456',
      signalingEndpoint: 'ws://localhost:8080/voice-signaling',
    };

    voiceIntegration = new VoiceIntegration(mockConfig);
    mockVoiceManager = (voiceIntegration as any).voiceManager;
  });

  afterEach(() => {
    voiceIntegration.destroy();
  });

  describe('Initialization', () => {
    it('should initialize voice integration successfully', async () => {
      // Requirement 4.1: Establish peer-to-peer audio connections
      const mockCallback = vi.fn();
      voiceIntegration.on('initialized', mockCallback);

      await voiceIntegration.initialize();

      expect(mockVoiceManager.initialize).toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalledWith({ connected: true, connectionType: 'stun' });
    });

    it('should handle initialization failure', async () => {
      mockVoiceManager.initialize.mockResolvedValue({
        connected: false,
        connectionType: 'failed',
        error: 'Microphone access denied',
      });

      const mockCallback = vi.fn();
      voiceIntegration.on('initializationFailed', mockCallback);

      await voiceIntegration.initialize();

      expect(mockCallback).toHaveBeenCalledWith({
        connected: false,
        connectionType: 'failed',
        error: 'Microphone access denied',
      });
    });

    it('should connect to signaling server when endpoint provided', async () => {
      await voiceIntegration.initialize();

      // WebSocket connection should be established
      const signalingSocket = (voiceIntegration as any).signalingSocket;
      expect(signalingSocket).toBeInstanceOf(MockWebSocket);
      expect(signalingSocket.url).toContain(mockConfig.signalingEndpoint);
      expect(signalingSocket.url).toContain(mockConfig.roomId);
      expect(signalingSocket.url).toContain(mockConfig.userId);
    });
  });

  describe('Signaling Server Communication', () => {
    beforeEach(async () => {
      await voiceIntegration.initialize();
    });

    it('should handle participant joined message', async () => {
      const mockCallback = vi.fn();
      voiceIntegration.on('participantJoined', mockCallback);

      const message = {
        type: 'participant-joined' as const,
        fromUserId: 'other-user-789',
        data: { voiceEnabled: true },
        timestamp: Date.now(),
      };

      const signalingSocket = (voiceIntegration as any).signalingSocket;
      if (signalingSocket.onmessage) {
        signalingSocket.onmessage(
          new MessageEvent('message', {
            data: JSON.stringify(message),
          })
        );
      }

      // handleSignalingMessage is async and awaits connectToParticipant before
      // emitting; flush the microtask queue so the emit lands before asserting.
      await Promise.resolve();
      await Promise.resolve();

      expect(mockVoiceManager.connectToParticipant).toHaveBeenCalledWith('other-user-789', true);
      expect(mockCallback).toHaveBeenCalledWith('other-user-789');
    });

    it('should handle participant left message', async () => {
      const mockCallback = vi.fn();
      voiceIntegration.on('participantLeft', mockCallback);

      const message = {
        type: 'participant-left' as const,
        fromUserId: 'other-user-789',
        data: {},
        timestamp: Date.now(),
      };

      const signalingSocket = (voiceIntegration as any).signalingSocket;
      if (signalingSocket.onmessage) {
        signalingSocket.onmessage(
          new MessageEvent('message', {
            data: JSON.stringify(message),
          })
        );
      }

      expect(mockVoiceManager.disconnectParticipant).toHaveBeenCalledWith('other-user-789');
      expect(mockCallback).toHaveBeenCalledWith('other-user-789');
    });

    it('should handle WebRTC offer message', async () => {
      const offer = { type: 'offer', sdp: 'mock-offer-sdp' };
      const message = {
        type: 'offer' as const,
        fromUserId: 'other-user-789',
        toUserId: mockConfig.userId,
        data: offer,
        timestamp: Date.now(),
      };

      const signalingSocket = (voiceIntegration as any).signalingSocket;
      if (signalingSocket.onmessage) {
        signalingSocket.onmessage(
          new MessageEvent('message', {
            data: JSON.stringify(message),
          })
        );
      }

      expect(mockVoiceManager.handleOffer).toHaveBeenCalledWith('other-user-789', offer);
    });

    it('should handle WebRTC answer message', async () => {
      const answer = { type: 'answer', sdp: 'mock-answer-sdp' };
      const message = {
        type: 'answer' as const,
        fromUserId: 'other-user-789',
        toUserId: mockConfig.userId,
        data: answer,
        timestamp: Date.now(),
      };

      const signalingSocket = (voiceIntegration as any).signalingSocket;
      if (signalingSocket.onmessage) {
        signalingSocket.onmessage(
          new MessageEvent('message', {
            data: JSON.stringify(message),
          })
        );
      }

      expect(mockVoiceManager.handleAnswer).toHaveBeenCalledWith('other-user-789', answer);
    });

    it('should handle ICE candidate message', async () => {
      const candidate = { candidate: 'mock-candidate', sdpMid: '0', sdpMLineIndex: 0 };
      const message = {
        type: 'ice-candidate' as const,
        fromUserId: 'other-user-789',
        toUserId: mockConfig.userId,
        data: candidate,
        timestamp: Date.now(),
      };

      const signalingSocket = (voiceIntegration as any).signalingSocket;
      if (signalingSocket.onmessage) {
        signalingSocket.onmessage(
          new MessageEvent('message', {
            data: JSON.stringify(message),
          })
        );
      }

      expect(mockVoiceManager.handleIceCandidate).toHaveBeenCalledWith('other-user-789', candidate);
    });
  });

  describe('Voice Manager Event Forwarding', () => {
    beforeEach(async () => {
      await voiceIntegration.initialize();
    });

    it('should forward offer events to signaling server', () => {
      const offerData = { userId: 'other-user-789', offer: { type: 'offer', sdp: 'mock-sdp' } };

      // Get the callback registered with voice manager
      const onCall = mockVoiceManager.on.mock.calls.find((call) => call[0] === 'offer');
      expect(onCall).toBeDefined();

      const signalingSocket = (voiceIntegration as any).signalingSocket;
      const sendSpy = vi.spyOn(signalingSocket, 'send');

      // Trigger the callback
      onCall[1](offerData);

      expect(sendSpy).toHaveBeenCalledTimes(1);
      const sent = JSON.parse(sendSpy.mock.calls[0][0] as string);
      expect(sent).toEqual({
        type: 'offer',
        fromUserId: mockConfig.userId,
        toUserId: 'other-user-789',
        data: offerData.offer,
        timestamp: expect.any(Number),
      });
    });

    it('should forward mute state changes to signaling server', () => {
      const muteData = { muted: true, userId: 'local' };

      const onCall = mockVoiceManager.on.mock.calls.find((call) => call[0] === 'muteStateChanged');
      expect(onCall).toBeDefined();

      const signalingSocket = (voiceIntegration as any).signalingSocket;
      const sendSpy = vi.spyOn(signalingSocket, 'send');

      onCall[1](muteData);

      expect(sendSpy).toHaveBeenCalledTimes(1);
      const sent = JSON.parse(sendSpy.mock.calls[0][0] as string);
      expect(sent).toEqual({
        type: 'voice-state',
        fromUserId: mockConfig.userId,
        data: { muted: true },
        timestamp: expect.any(Number),
      });
    });

    it('should forward voice activity events', () => {
      const mockCallback = vi.fn();
      voiceIntegration.on('voiceActivity', mockCallback);

      const voiceActivityData = { userId: 'other-user-789', speaking: true };

      const onCall = mockVoiceManager.on.mock.calls.find((call) => call[0] === 'voiceActivity');
      expect(onCall).toBeDefined();

      onCall[1](voiceActivityData);

      expect(mockCallback).toHaveBeenCalledWith(voiceActivityData);
    });
  });

  describe('Room Integration', () => {
    it('should join voice chat in room', async () => {
      const roomId = 'new-room-456';
      const userId = 'new-user-789';

      await voiceIntegration.joinVoiceChat(roomId, userId);

      expect((voiceIntegration as any).config.roomId).toBe(roomId);
      expect((voiceIntegration as any).config.userId).toBe(userId);
    });

    it('should leave voice chat and clean up', () => {
      const mockParticipants = [
        { userId: 'user1', muted: false, volume: 0.8, speaking: false, connected: true },
        { userId: 'user2', muted: true, volume: 0.5, speaking: false, connected: true },
      ];

      mockVoiceManager.getParticipants.mockReturnValue(mockParticipants);

      const mockCallback = vi.fn();
      voiceIntegration.on('leftVoiceChat', mockCallback);

      voiceIntegration.leaveVoiceChat();

      expect(mockVoiceManager.disconnectParticipant).toHaveBeenCalledWith('user1');
      expect(mockVoiceManager.disconnectParticipant).toHaveBeenCalledWith('user2');
      expect(mockCallback).toHaveBeenCalled();
    });
  });

  describe('Status and Configuration', () => {
    beforeEach(async () => {
      await voiceIntegration.initialize();
    });

    it('should return voice chat availability status', () => {
      const isAvailable = voiceIntegration.isVoiceChatAvailable();
      expect(isAvailable).toBe(true);
    });

    it('should return comprehensive voice chat status', () => {
      const status = voiceIntegration.getVoiceChatStatus();

      expect(status).toHaveProperty('initialized', true);
      expect(status).toHaveProperty('connectionStatus');
      expect(status).toHaveProperty('participants');
      expect(status).toHaveProperty('signalingConnected');
    });

    it('should update configuration', () => {
      const newConfig = { defaultVolume: 0.5 };

      voiceIntegration.updateConfig(newConfig);

      expect((voiceIntegration as any).config.defaultVolume).toBe(0.5);
    });

    it('should provide access to voice manager', () => {
      const manager = voiceIntegration.getVoiceManager();
      expect(manager).toBe(mockVoiceManager);
    });
  });

  describe('Error Handling', () => {
    it('should handle signaling connection timeout', async () => {
      // A WebSocket that never opens (the mock WebSocket above auto-connects
      // after 10ms, which would bypass the timeout entirely).
      class TimeoutWebSocket {
        static readonly CONNECTING = 0;
        static readonly OPEN = 1;
        static readonly CLOSING = 2;
        static readonly CLOSED = 3;

        readyState = TimeoutWebSocket.CONNECTING;
        onopen: ((event: Event) => void) | null = null;
        onmessage: ((event: MessageEvent) => void) | null = null;
        onerror: ((event: Event) => void) | null = null;
        onclose: ((event: CloseEvent) => void) | null = null;

        constructor(public url: string) {}

        send(): void {}
        close(): void {
          this.readyState = TimeoutWebSocket.CLOSED;
        }
      }

      Object.defineProperty(global, 'WebSocket', {
        value: TimeoutWebSocket,
        writable: true,
      });

      vi.useFakeTimers();

      try {
        const config = { ...mockConfig, signalingEndpoint: 'ws://timeout-server:8080' };
        const integration = new VoiceIntegration(config);
        const mockCallback = vi.fn();
        integration.on('initializationFailed', mockCallback);

        const initPromise = integration.initialize();

        // Let initialize() reach connectToSignalingServer so its 10s timeout
        // is scheduled, then fast-forward past it. initialize() surfaces the
        // failure via the initializationFailed event (it does not rethrow).
        await Promise.resolve();
        await Promise.resolve();
        await vi.advanceTimersByTimeAsync(10000);
        await initPromise;

        expect(mockCallback).toHaveBeenCalledTimes(1);
        expect(mockCallback.mock.calls[0][0]).toMatchObject({
          connected: false,
          connectionType: 'failed',
        });
        expect(String(mockCallback.mock.calls[0][0].error)).toContain(
          'Signaling connection timeout'
        );
      } finally {
        vi.useRealTimers();
        Object.defineProperty(global, 'WebSocket', {
          value: MockWebSocket,
          writable: true,
        });
      }
    });

    it('should handle malformed signaling messages', async () => {
      await voiceIntegration.initialize();

      const signalingSocket = (voiceIntegration as any).signalingSocket;
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      if (signalingSocket.onmessage) {
        signalingSocket.onmessage(
          new MessageEvent('message', {
            data: 'invalid-json',
          })
        );
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to parse signaling message:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should handle signaling disconnection', async () => {
      await voiceIntegration.initialize();

      const mockCallback = vi.fn();
      voiceIntegration.on('signalingDisconnected', mockCallback);

      const signalingSocket = (voiceIntegration as any).signalingSocket;
      if (signalingSocket.onclose) {
        signalingSocket.onclose(new CloseEvent('close'));
      }

      expect(mockCallback).toHaveBeenCalled();
    });
  });

  describe('Cleanup and Destruction', () => {
    it('should clean up all resources on destroy', async () => {
      await voiceIntegration.initialize();

      voiceIntegration.destroy();

      expect(mockVoiceManager.destroy).toHaveBeenCalled();
      expect((voiceIntegration as any).isInitialized).toBe(false);
    });

    it('should handle destroy when not initialized', () => {
      // Should not throw error
      expect(() => voiceIntegration.destroy()).not.toThrow();
    });
  });

  describe('Event System', () => {
    it('should register and remove event listeners', () => {
      const mockCallback = vi.fn();

      voiceIntegration.on('test-event', mockCallback);
      voiceIntegration.off('test-event', mockCallback);

      // Trigger event
      (voiceIntegration as any).emit('test-event', { test: 'data' });

      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should handle multiple listeners for same event', () => {
      const mockCallback1 = vi.fn();
      const mockCallback2 = vi.fn();
      const testData = { test: 'data' };

      voiceIntegration.on('test-event', mockCallback1);
      voiceIntegration.on('test-event', mockCallback2);

      (voiceIntegration as any).emit('test-event', testData);

      expect(mockCallback1).toHaveBeenCalledWith(testData);
      expect(mockCallback2).toHaveBeenCalledWith(testData);
    });
  });
});
