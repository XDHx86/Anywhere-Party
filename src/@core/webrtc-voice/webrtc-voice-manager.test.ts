/**
 * WebRTC Voice Manager Tests
 *
 * Tests for WebRTC voice communication functionality including
 * peer connections, mute controls, push-to-talk, and volume management.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebRTCVoiceManager, WebRTCVoiceConfig } from './webrtc-voice-manager';

// Mock WebRTC APIs
const mockGetUserMedia = vi.fn();
const mockRTCPeerConnection = vi.fn();
const mockAudioContext = vi.fn();

// Track reference is shared across getTracks()/getAudioTracks() calls: the
// manager mutates `track.enabled` and tests must assert on the same object.
const mockAudioTrack = {
  enabled: true,
  stop: vi.fn(),
  kind: 'audio',
};

// Minimal DOM audio element created by the manager
function createMockAudioElement(): any {
  return {
    id: '',
    autoplay: false,
    style: { display: '' },
    volume: 1,
    srcObject: null,
    remove: vi.fn(),
  };
}

// Document mock with a working addEventListener/dispatchEvent pair so the
// push-to-talk key handlers registered by the manager actually fire.
const mockDocumentListeners: Record<string, Array<(event: any) => void>> = {};
const mockGetElementById = vi.fn();

// Mock browser APIs
Object.defineProperty(global, 'navigator', {
  value: {
    mediaDevices: {
      getUserMedia: mockGetUserMedia,
    },
  },
  writable: true,
});

Object.defineProperty(global, 'RTCPeerConnection', {
  value: mockRTCPeerConnection,
  writable: true,
});

Object.defineProperty(global, 'AudioContext', {
  value: mockAudioContext,
  writable: true,
});

Object.defineProperty(global, 'document', {
  value: {
    addEventListener: vi.fn((event: string, handler: (event: any) => void) => {
      if (!mockDocumentListeners[event]) {
        mockDocumentListeners[event] = [];
      }
      mockDocumentListeners[event].push(handler);
    }),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn((event: any) => {
      const listeners = mockDocumentListeners[event.type] || [];
      listeners.forEach((handler) => handler(event));
      return true;
    }),
    createElement: vi.fn(() => createMockAudioElement()),
    getElementById: mockGetElementById,
    body: {
      appendChild: vi.fn(),
    },
  },
  writable: true,
});

describe('WebRTCVoiceManager', () => {
  let voiceManager: WebRTCVoiceManager;
  let mockConfig: WebRTCVoiceConfig;
  let mockStream: MediaStream;
  let mockPeerConnection: any;

  beforeEach(() => {
    // Reset mocks. Note vi.clearAllMocks() only clears calls/results, so mock
    // implementations set inside tests (e.g. getElementById.mockReturnValue)
    // must be explicitly reset here to avoid leaking into later tests.
    vi.clearAllMocks();
    mockGetElementById.mockReset();
    for (const key of Object.keys(mockDocumentListeners)) {
      delete mockDocumentListeners[key];
    }

    // Mock configuration
    mockConfig = {
      stunServers: ['stun:stun.l.google.com:19302'],
      turnServers: [
        {
          urls: 'turn:test-turn.com:3478',
          username: 'testuser',
          credential: 'testpass',
        },
      ],
      pushToTalkKey: 'Space',
      defaultVolume: 0.8,
      audioConstraints: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    };

    // Mock MediaStream. Both accessors must return the SAME track objects
    // (fresh arrays each call would get new objects and the manager's
    // `enabled` mutations would never be observable to the tests).
    mockStream = {
      getTracks: vi.fn(() => [mockAudioTrack]),
      getAudioTracks: vi.fn(() => [mockAudioTrack]),
    } as any;

    // Mock RTCPeerConnection
    mockPeerConnection = {
      addTrack: vi.fn(),
      createOffer: vi.fn(() => Promise.resolve({ type: 'offer', sdp: 'mock-sdp' })),
      createAnswer: vi.fn(() => Promise.resolve({ type: 'answer', sdp: 'mock-sdp' })),
      setLocalDescription: vi.fn(() => Promise.resolve()),
      setRemoteDescription: vi.fn(() => Promise.resolve()),
      addIceCandidate: vi.fn(() => Promise.resolve()),
      close: vi.fn(),
      createDataChannel: vi.fn(),
      connectionState: 'connected',
      iceGatheringState: 'complete',
      onicecandidate: null,
      ontrack: null,
      onconnectionstatechange: null,
      onicegatheringstatechange: null,
    };

    // Mock successful ICE gathering for most tests.
    // Must be a regular function (not an arrow) so `new RTCPeerConnection()`
    // inside the manager can construct it (vi.fn arrow implementations throw
    // "is not a constructor").
    mockRTCPeerConnection.mockImplementation(function () {
      const pc = { ...mockPeerConnection };

      // Simulate successful ICE gathering after a short delay
      setTimeout(() => {
        if (pc.onicecandidate) {
          pc.onicecandidate({
            candidate: { candidate: 'candidate:1 1 UDP 2130706431 192.168.1.1 54400 typ srflx' },
          } as any);
        }
        pc.iceGatheringState = 'complete';
        if (pc.onicegatheringstatechange) {
          pc.onicegatheringstatechange();
        }
      }, 10);

      return pc;
    });

    mockGetUserMedia.mockResolvedValue(mockStream);

    // Mock AudioContext
    const mockAnalyser = {
      fftSize: 256,
      frequencyBinCount: 128,
      getByteFrequencyData: vi.fn(),
    };

    const mockAudioContextInstance = {
      createAnalyser: vi.fn(() => mockAnalyser),
      createMediaStreamSource: vi.fn(() => ({
        connect: vi.fn(),
      })),
    };

    // Regular function: `new AudioContext()` in the manager must construct it
    mockAudioContext.mockImplementation(function () {
      return mockAudioContextInstance;
    });

    voiceManager = new WebRTCVoiceManager(mockConfig);
  });

  afterEach(() => {
    voiceManager.destroy();
  });

  describe('Initialization', () => {
    it('should initialize successfully with valid configuration', async () => {
      // Requirement 4.1: Establish peer-to-peer audio connections
      const status = await voiceManager.initialize();

      expect(status.connected).toBe(true);
      expect(mockGetUserMedia).toHaveBeenCalledWith({
        audio: mockConfig.audioConstraints,
        video: false,
      });
    });

    it('should handle microphone permission denial', async () => {
      // Requirement 4.5: Display clear degradation message
      const permissionError = new Error('Permission denied');
      mockGetUserMedia.mockRejectedValue(permissionError);

      const status = await voiceManager.initialize();

      expect(status.connected).toBe(false);
      expect(status.degradationMessage).toContain('Microphone access denied');
    });

    it('should detect restrictive NAT and suggest TURN server', async () => {
      // Requirement 4.5: Display clear degradation message when STUN-only fails
      const natError = new Error('Connection test timeout - restrictive NAT detected');
      mockGetUserMedia.mockRejectedValue(natError);

      const status = await voiceManager.initialize();

      expect(status.connected).toBe(false);
      expect(status.degradationMessage).toContain('TURN server is required');
    });
  });

  describe('Participant Management', () => {
    beforeEach(async () => {
      await voiceManager.initialize();
    });

    it('should connect to a new participant as initiator', async () => {
      // Requirement 4.1: Establish peer-to-peer audio connections
      const userId = 'test-user-1';

      await voiceManager.connectToParticipant(userId, true);

      expect(mockRTCPeerConnection).toHaveBeenCalled();
      expect(mockPeerConnection.addTrack).toHaveBeenCalled();
      expect(mockPeerConnection.createOffer).toHaveBeenCalled();
    });

    it('should handle incoming WebRTC offer', async () => {
      const userId = 'test-user-1';
      const offer = { type: 'offer' as RTCSdpType, sdp: 'mock-offer-sdp' };

      await voiceManager.connectToParticipant(userId, false);
      await voiceManager.handleOffer(userId, offer);

      expect(mockPeerConnection.setRemoteDescription).toHaveBeenCalledWith(offer);
      expect(mockPeerConnection.createAnswer).toHaveBeenCalled();
    });

    it('should handle incoming WebRTC answer', async () => {
      const userId = 'test-user-1';
      const answer = { type: 'answer' as RTCSdpType, sdp: 'mock-answer-sdp' };

      await voiceManager.connectToParticipant(userId, true);
      await voiceManager.handleAnswer(userId, answer);

      expect(mockPeerConnection.setRemoteDescription).toHaveBeenCalledWith(answer);
    });

    it('should handle ICE candidates', async () => {
      const userId = 'test-user-1';
      const candidate = { candidate: 'mock-candidate', sdpMid: '0', sdpMLineIndex: 0 };

      await voiceManager.connectToParticipant(userId, false);
      await voiceManager.handleIceCandidate(userId, candidate);

      expect(mockPeerConnection.addIceCandidate).toHaveBeenCalledWith(candidate);
    });

    it('should disconnect participant and clean up resources', async () => {
      const userId = 'test-user-1';

      await voiceManager.connectToParticipant(userId, false);
      voiceManager.disconnectParticipant(userId);

      expect(mockPeerConnection.close).toHaveBeenCalled();
    });
  });

  describe('Mute Functionality', () => {
    beforeEach(async () => {
      await voiceManager.initialize();
    });

    it('should mute audio transmission immediately', () => {
      // Requirement 4.2: Implement mute functionality that disables audio transmission immediately
      const audioTrack = mockStream.getAudioTracks()[0];

      voiceManager.setMuted(true);

      expect(audioTrack.enabled).toBe(false);
      expect(voiceManager.isMutedState()).toBe(true);
    });

    it('should unmute audio transmission', () => {
      // Requirement 4.2: Implement mute functionality
      const audioTrack = mockStream.getAudioTracks()[0];

      voiceManager.setMuted(true);
      voiceManager.setMuted(false);

      expect(audioTrack.enabled).toBe(true);
      expect(voiceManager.isMutedState()).toBe(false);
    });

    it('should emit mute state change events', () => {
      const mockCallback = vi.fn();
      voiceManager.on('muteStateChanged', mockCallback);

      voiceManager.setMuted(true);

      expect(mockCallback).toHaveBeenCalledWith({ muted: true, userId: 'local' });
    });
  });

  describe('Push-to-Talk Functionality', () => {
    beforeEach(async () => {
      await voiceManager.initialize();
    });

    it('should enable push-to-talk mode', () => {
      // Requirement 4.3: Support push-to-talk functionality
      const mockCallback = vi.fn();
      voiceManager.on('pushToTalkStateChanged', mockCallback);

      voiceManager.enablePushToTalk(true);

      expect(mockCallback).toHaveBeenCalledWith(true);
    });

    it('should disable audio when push-to-talk is enabled but not pressed', () => {
      // Requirement 4.3: Support push-to-talk functionality
      const audioTrack = mockStream.getAudioTracks()[0];

      voiceManager.enablePushToTalk(true);

      expect(audioTrack.enabled).toBe(false);
    });

    it('should handle push-to-talk key events', () => {
      // Requirement 4.3: Support push-to-talk functionality with configurable hotkeys
      const mockCallback = vi.fn();
      voiceManager.on('pushToTalkPressed', mockCallback);

      voiceManager.enablePushToTalk(true);

      // Simulate keydown event
      const keydownEvent = new KeyboardEvent('keydown', { code: 'Space' });
      document.dispatchEvent(keydownEvent);

      expect(mockCallback).toHaveBeenCalledWith(true);
    });
  });

  describe('Volume Controls', () => {
    beforeEach(async () => {
      await voiceManager.initialize();
      // setParticipantVolume only applies to an existing participant
      await voiceManager.connectToParticipant('test-user-1', false);
    });

    it('should set participant volume', () => {
      // Requirement 4.4: Provide per-user volume controls for each participant
      const userId = 'test-user-1';
      const volume = 0.5;

      // Mock audio element (must be removable so afterEach destroy() works)
      const mockAudioElement = { volume: 1, remove: vi.fn() };
      mockGetElementById.mockReturnValue(mockAudioElement);

      voiceManager.setParticipantVolume(userId, volume);

      expect(voiceManager.getParticipantVolume(userId)).toBe(volume);
    });

    it('should clamp volume values to valid range', () => {
      // Requirement 4.4: Provide per-user volume controls
      const userId = 'test-user-1';

      voiceManager.setParticipantVolume(userId, -0.5);
      expect(voiceManager.getParticipantVolume(userId)).toBe(0);

      voiceManager.setParticipantVolume(userId, 1.5);
      expect(voiceManager.getParticipantVolume(userId)).toBe(1);
    });

    it('should emit volume change events', () => {
      const userId = 'test-user-1';
      const volume = 0.7;
      const mockCallback = vi.fn();

      voiceManager.on('volumeChanged', mockCallback);
      voiceManager.setParticipantVolume(userId, volume);

      expect(mockCallback).toHaveBeenCalledWith({ userId, volume });
    });
  });

  describe('Voice Activity Detection', () => {
    beforeEach(async () => {
      await voiceManager.initialize();
    });

    it('should detect voice activity and emit events', async () => {
      const userId = 'test-user-1';
      const mockCallback = vi.fn();

      voiceManager.on('voiceActivity', mockCallback);

      await voiceManager.connectToParticipant(userId, false);

      // Trigger the ontrack handler the manager registered on the actual peer
      // connection (mockPeerConnection is a template; the manager wires its own
      // handlers onto the instance it created).
      const remoteStream = { ...mockStream };
      const peerConnection = voiceManager.getParticipants()[0].peerConnection;
      if (peerConnection.ontrack) {
        peerConnection.ontrack({ streams: [remoteStream] });
      }

      // Voice activity detection is set up synchronously on track arrival
      expect(mockAudioContext).toHaveBeenCalled();
    });
  });

  describe('Connection Status', () => {
    it('should return current connection status', async () => {
      const status = voiceManager.getConnectionStatus();

      expect(status).toHaveProperty('connected');
      expect(status).toHaveProperty('connectionType');
    });

    it('should update connection status after initialization', async () => {
      await voiceManager.initialize();

      const status = voiceManager.getConnectionStatus();
      expect(status.connected).toBe(true);
    });
  });

  describe('Cleanup and Destruction', () => {
    it('should clean up all resources on destroy', async () => {
      await voiceManager.initialize();
      await voiceManager.connectToParticipant('test-user-1', false);

      voiceManager.destroy();

      expect(mockStream.getTracks()[0].stop).toHaveBeenCalled();
      expect(mockPeerConnection.close).toHaveBeenCalled();
    });

    it('should remove audio elements on participant disconnect', async () => {
      const userId = 'test-user-1';
      const mockAudioElement = { remove: vi.fn() };

      mockGetElementById.mockReturnValue(mockAudioElement);

      await voiceManager.initialize();
      await voiceManager.connectToParticipant(userId, false);
      voiceManager.disconnectParticipant(userId);

      expect(mockAudioElement.remove).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle getUserMedia failures gracefully', async () => {
      const error = new Error('Device not found');
      mockGetUserMedia.mockRejectedValue(error);

      const status = await voiceManager.initialize();

      expect(status.connected).toBe(false);
      expect(status.error).toBe(error.message);
    });

    it('should handle peer connection failures', async () => {
      await voiceManager.initialize();

      const userId = 'test-user-1';
      await voiceManager.connectToParticipant(userId, false);

      // Simulate connection failure
      mockPeerConnection.connectionState = 'failed';
      if (mockPeerConnection.onconnectionstatechange) {
        mockPeerConnection.onconnectionstatechange();
      }

      const participants = voiceManager.getParticipants();
      const participant = participants.find((p) => p.userId === userId);
      expect(participant?.connected).toBe(false);
    });
  });

  describe('Event System', () => {
    it('should register and trigger event listeners', () => {
      const mockCallback = vi.fn();
      const testData = { test: 'data' };

      voiceManager.on('test-event', mockCallback);

      // Trigger event through internal emit method
      (voiceManager as any).emit('test-event', testData);

      expect(mockCallback).toHaveBeenCalledWith(testData);
    });

    it('should remove event listeners', () => {
      const mockCallback = vi.fn();

      voiceManager.on('test-event', mockCallback);
      voiceManager.off('test-event', mockCallback);

      (voiceManager as any).emit('test-event', {});

      expect(mockCallback).not.toHaveBeenCalled();
    });
  });
});
