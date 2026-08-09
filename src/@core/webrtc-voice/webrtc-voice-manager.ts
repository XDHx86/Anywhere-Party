/**
 * WebRTC Voice Communication Manager
 *
 * Implements peer-to-peer audio connections between room participants
 * with TURN server configuration, mute functionality, push-to-talk,
 * per-user volume controls, and graceful degradation handling.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

export interface WebRTCVoiceConfig {
  stunServers: string[];
  turnServers: Array<{
    urls: string;
    username?: string;
    credential?: string;
  }>;
  pushToTalkKey?: string;
  defaultVolume: number;
  audioConstraints: MediaStreamConstraints['audio'];
}

export interface ParticipantAudioState {
  userId: string;
  muted: boolean;
  volume: number;
  speaking: boolean;
  connected: boolean;
  audioStream?: MediaStream;
  peerConnection?: RTCPeerConnection;
}

export interface VoiceConnectionStatus {
  connected: boolean;
  connectionType: 'stun' | 'turn' | 'failed';
  error?: string;
  degradationMessage?: string;
}

export class WebRTCVoiceManager {
  private config: WebRTCVoiceConfig;
  private localStream?: MediaStream;
  private participants = new Map<string, ParticipantAudioState>();
  private isMuted = false;
  private isPushToTalkActive = false;
  private pushToTalkPressed = false;
  private connectionStatus: VoiceConnectionStatus = {
    connected: false,
    connectionType: 'failed',
  };
  // Event emitter uses `unknown[]` for callback args so consumers can register typed handlers
  // (standard pattern for event emitter APIs where payloads are dispatch-time only).
  private eventListeners = new Map<string, Array<(...args: unknown[]) => void>>();

  constructor(config: WebRTCVoiceConfig) {
    this.config = config;
    this.setupPushToTalkListeners();
  }

  /**
   * Initialize WebRTC voice communication
   * Requirement 4.1: Establish peer-to-peer audio connections with TURN server configuration
   */
  async initialize(): Promise<VoiceConnectionStatus> {
    try {
      // Request microphone access
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: this.config.audioConstraints,
        video: false,
      });

      // Test connection capabilities
      await this.testConnectionCapabilities();

      this.connectionStatus = {
        connected: true,
        connectionType: this.connectionStatus.connectionType || 'stun',
      };

      this.emit('initialized', this.connectionStatus);
      return this.connectionStatus;
    } catch (error) {
      console.error('Failed to initialize WebRTC voice:', error);

      const degradationMessage = this.getDegradationMessage(error as Error);
      this.connectionStatus = {
        connected: false,
        connectionType: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        degradationMessage,
      };

      this.emit('connectionFailed', this.connectionStatus);
      return this.connectionStatus;
    }
  }

  /**
   * Test connection capabilities and determine if TURN server is needed
   * Requirement 4.5: Display clear degradation message when STUN-only fails
   */
  private async testConnectionCapabilities(): Promise<void> {
    const testConnection = new RTCPeerConnection({
      iceServers: [
        ...this.config.stunServers.map((url) => ({ urls: url })),
        ...this.config.turnServers,
      ],
    });

    return new Promise((resolve, reject) => {
      let hasStunCandidate = false;
      let hasTurnCandidate = false;
      let timeout: NodeJS.Timeout; // eslint-disable-line prefer-const

      testConnection.onicecandidate = (event) => {
        if (event.candidate) {
          const candidate = event.candidate.candidate;

          if (candidate.includes('typ srflx')) {
            hasStunCandidate = true;
            this.connectionStatus.connectionType = 'stun';
          }

          if (candidate.includes('typ relay')) {
            hasTurnCandidate = true;
            this.connectionStatus.connectionType = 'turn';
          }
        }
      };

      testConnection.onicegatheringstatechange = () => {
        if (testConnection.iceGatheringState === 'complete') {
          clearTimeout(timeout);

          if (hasTurnCandidate || hasStunCandidate) {
            resolve();
          } else {
            reject(new Error('No viable connection candidates found'));
          }

          testConnection.close();
        }
      };

      // Create a dummy data channel to trigger ICE gathering
      testConnection.createDataChannel('test');
      testConnection.createOffer().then((offer) => {
        return testConnection.setLocalDescription(offer);
      });

      // Timeout after 10 seconds
      timeout = setTimeout(() => {
        testConnection.close();
        if (!hasStunCandidate && !hasTurnCandidate) {
          reject(new Error('Connection test timeout - restrictive NAT detected'));
        } else {
          resolve();
        }
      }, 10000);
    });
  }

  /**
   * Connect to a room participant
   * Requirement 4.1: Establish peer-to-peer audio connections
   */
  async connectToParticipant(userId: string, isInitiator: boolean = false): Promise<void> {
    if (this.participants.has(userId)) {
      console.warn(`Already connected to participant ${userId}`);
      return;
    }

    const peerConnection = new RTCPeerConnection({
      iceServers: [
        ...this.config.stunServers.map((url) => ({ urls: url })),
        ...this.config.turnServers,
      ],
    });

    const participantState: ParticipantAudioState = {
      userId,
      muted: false,
      volume: this.config.defaultVolume,
      speaking: false,
      connected: false,
      peerConnection,
    };

    this.participants.set(userId, participantState);

    // Add local stream to peer connection
    const localStream = this.localStream;
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
      });
    }

    // Handle incoming audio stream
    peerConnection.ontrack = (event) => {
      const remoteStream = event.streams[0];
      if (!remoteStream) return;
      participantState.audioStream = remoteStream;
      this.setupAudioElement(userId, remoteStream);
      participantState.connected = true;
      this.emit('participantConnected', userId);
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection.connectionState;
      participantState.connected = state === 'connected';

      if (state === 'failed' || state === 'disconnected') {
        this.emit('participantDisconnected', userId);
      }
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.emit('iceCandidate', { userId, candidate: event.candidate });
      }
    };

    if (isInitiator) {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      this.emit('offer', { userId, offer });
    }
  }

  /**
   * Handle incoming WebRTC offer
   */
  async handleOffer(userId: string, offer: RTCSessionDescriptionInit): Promise<void> {
    const participant = this.participants.get(userId);
    if (!participant?.peerConnection) return;

    await participant.peerConnection.setRemoteDescription(offer);
    const answer = await participant.peerConnection.createAnswer();
    await participant.peerConnection.setLocalDescription(answer);

    this.emit('answer', { userId, answer });
  }

  /**
   * Handle incoming WebRTC answer
   */
  async handleAnswer(userId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    const participant = this.participants.get(userId);
    if (!participant?.peerConnection) return;

    await participant.peerConnection.setRemoteDescription(answer);
  }

  /**
   * Handle incoming ICE candidate
   */
  async handleIceCandidate(userId: string, candidate: RTCIceCandidateInit): Promise<void> {
    const participant = this.participants.get(userId);
    if (!participant?.peerConnection) return;

    await participant.peerConnection.addIceCandidate(candidate);
  }

  /**
   * Toggle mute state
   * Requirement 4.2: Implement mute functionality that disables audio transmission immediately
   */
  setMuted(muted: boolean): void {
    this.isMuted = muted;

    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted && (this.isPushToTalkActive ? this.pushToTalkPressed : true);
      });
    }

    this.emit('muteStateChanged', { muted, userId: 'local' });
  }

  /**
   * Get current mute state
   */
  isMutedState(): boolean {
    return this.isMuted;
  }

  /**
   * Enable push-to-talk functionality
   * Requirement 4.3: Support push-to-talk functionality with configurable hotkeys
   */
  enablePushToTalk(enabled: boolean): void {
    this.isPushToTalkActive = enabled;

    if (!enabled) {
      // If disabling push-to-talk, restore normal audio state
      this.updateAudioTransmission();
    } else {
      // If enabling push-to-talk, mute by default
      this.pushToTalkPressed = false;
      this.updateAudioTransmission();
    }

    this.emit('pushToTalkStateChanged', enabled);
  }

  /**
   * Set up push-to-talk keyboard listeners
   */
  private setupPushToTalkListeners(): void {
    if (!this.config.pushToTalkKey) return;

    document.addEventListener('keydown', (event) => {
      if (event.code === this.config.pushToTalkKey && this.isPushToTalkActive) {
        if (!this.pushToTalkPressed) {
          this.pushToTalkPressed = true;
          this.updateAudioTransmission();
          this.emit('pushToTalkPressed', true);
        }
      }
    });

    document.addEventListener('keyup', (event) => {
      if (event.code === this.config.pushToTalkKey && this.isPushToTalkActive) {
        this.pushToTalkPressed = false;
        this.updateAudioTransmission();
        this.emit('pushToTalkPressed', false);
      }
    });
  }

  /**
   * Update audio transmission based on mute and push-to-talk state
   */
  private updateAudioTransmission(): void {
    if (!this.localStream) return;

    const shouldTransmit =
      !this.isMuted && (this.isPushToTalkActive ? this.pushToTalkPressed : true);

    this.localStream.getAudioTracks().forEach((track) => {
      track.enabled = shouldTransmit;
    });
  }

  /**
   * Set volume for a specific participant
   * Requirement 4.4: Provide per-user volume controls for each participant
   */
  setParticipantVolume(userId: string, volume: number): void {
    const participant = this.participants.get(userId);
    if (!participant) return;

    participant.volume = Math.max(0, Math.min(1, volume));

    const audioElement = document.getElementById(`audio-${userId}`) as HTMLAudioElement;
    if (audioElement) {
      audioElement.volume = participant.volume;
    }

    this.emit('volumeChanged', { userId, volume: participant.volume });
  }

  /**
   * Get volume for a specific participant
   */
  getParticipantVolume(userId: string): number {
    const participant = this.participants.get(userId);
    return participant?.volume ?? this.config.defaultVolume;
  }

  /**
   * Set up audio element for participant
   */
  private setupAudioElement(userId: string, stream: MediaStream): void {
    let audioElement = document.getElementById(`audio-${userId}`) as HTMLAudioElement;

    if (!audioElement) {
      audioElement = document.createElement('audio');
      audioElement.id = `audio-${userId}`;
      audioElement.autoplay = true;
      audioElement.style.display = 'none';
      document.body.appendChild(audioElement);
    }

    audioElement.srcObject = stream;
    audioElement.volume = this.getParticipantVolume(userId);

    // Set up voice activity detection
    this.setupVoiceActivityDetection(userId, stream);
  }

  /**
   * Set up voice activity detection for speaking indicators
   */
  private setupVoiceActivityDetection(userId: string, stream: MediaStream): void {
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const microphone = audioContext.createMediaStreamSource(stream);

    analyser.fftSize = 256;
    microphone.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const speakingThreshold = 50;
    let lastSpeakingState = false;

    const checkVoiceActivity = () => {
      analyser.getByteFrequencyData(dataArray);

      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
      const isSpeaking = average > speakingThreshold;

      if (isSpeaking !== lastSpeakingState) {
        const participant = this.participants.get(userId);
        if (participant) {
          participant.speaking = isSpeaking;
          this.emit('voiceActivity', { userId, speaking: isSpeaking });
        }
        lastSpeakingState = isSpeaking;
      }

      requestAnimationFrame(checkVoiceActivity);
    };

    checkVoiceActivity();
  }

  /**
   * Disconnect from a participant
   */
  disconnectParticipant(userId: string): void {
    const participant = this.participants.get(userId);
    if (!participant) return;

    if (participant.peerConnection) {
      participant.peerConnection.close();
    }

    const audioElement = document.getElementById(`audio-${userId}`);
    if (audioElement) {
      audioElement.remove();
    }

    this.participants.delete(userId);
    this.emit('participantDisconnected', userId);
  }

  /**
   * Get all connected participants
   */
  getParticipants(): ParticipantAudioState[] {
    return Array.from(this.participants.values());
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): VoiceConnectionStatus {
    return this.connectionStatus;
  }

  /**
   * Generate degradation message based on error type
   * Requirement 4.5: Display clear degradation message when STUN-only fails
   */
  private getDegradationMessage(error: Error): string {
    const message = error.message.toLowerCase();

    if (message.includes('permission') || message.includes('denied')) {
      return 'Microphone access denied. Please allow microphone permissions to use voice chat.';
    }

    if (message.includes('restrictive nat') || message.includes('timeout')) {
      return 'Your network configuration prevents direct voice connections. A TURN server is required for voice chat in this environment.';
    }

    if (message.includes('no viable connection')) {
      return 'Unable to establish voice connection. Please check your network settings or try again later.';
    }

    return 'Voice chat is currently unavailable. You can still participate in text chat and synchronized viewing.';
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
    }

    // Disconnect all participants
    for (const userId of this.participants.keys()) {
      this.disconnectParticipant(userId);
    }

    // Clear event listeners
    this.eventListeners.clear();
  }

  /**
   * Event system for WebRTC voice events
   *
   * `on`/`off` are generic over the callback args so consumers can subscribe
   * with fully typed handlers. Payloads are dispatch-time only, so the type
   * is inferred from the registered callback rather than declared up front.
   */
  on<TArgs extends unknown[]>(event: string, callback: (...args: TArgs) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)?.push(callback as (...args: unknown[]) => void);
  }

  off<TArgs extends unknown[]>(event: string, callback: (...args: TArgs) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback as (...args: unknown[]) => void);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: unknown): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => callback(data));
    }
  }
}

export default WebRTCVoiceManager;
