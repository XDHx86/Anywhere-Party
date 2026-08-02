/**
 * WebRTC Voice Integration Layer
 *
 * Integrates WebRTC voice communication with the room system,
 * signaling server, and UI components.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { WebRTCVoiceManager, WebRTCVoiceConfig } from './webrtc-voice-manager';

export interface VoiceIntegrationConfig extends WebRTCVoiceConfig {
  roomId?: string;
  userId?: string;
  signalingEndpoint?: string;
}

export interface VoiceMessage {
  type:
    | 'offer'
    | 'answer'
    | 'ice-candidate'
    | 'voice-state'
    | 'participant-joined'
    | 'participant-left';
  fromUserId: string;
  toUserId?: string;
  data: any;
  timestamp: number;
}

export class VoiceIntegration {
  private voiceManager: WebRTCVoiceManager;
  private config: VoiceIntegrationConfig;
  private signalingSocket?: WebSocket;
  private isInitialized = false;
  private eventListeners = new Map<string, Function[]>();

  constructor(config: VoiceIntegrationConfig) {
    this.config = config;
    this.voiceManager = new WebRTCVoiceManager(config);
    this.setupVoiceManagerListeners();
  }

  /**
   * Initialize voice integration with room
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize WebRTC voice manager
      const connectionStatus = await this.voiceManager.initialize();

      if (!connectionStatus.connected) {
        this.emit('initializationFailed', connectionStatus);
        return;
      }

      // Connect to signaling server if endpoint provided
      if (this.config.signalingEndpoint && this.config.roomId) {
        await this.connectToSignalingServer();
      }

      this.isInitialized = true;
      this.emit('initialized', connectionStatus);
    } catch (error) {
      console.error('Voice integration initialization failed:', error);
      this.emit('initializationFailed', {
        connected: false,
        connectionType: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Connect to signaling server for WebRTC coordination
   */
  private async connectToSignalingServer(): Promise<void> {
    if (!this.config.signalingEndpoint || !this.config.roomId) {
      throw new Error('Signaling endpoint and room ID required');
    }

    const wsUrl = `${this.config.signalingEndpoint}?roomId=${this.config.roomId}&userId=${this.config.userId}`;
    this.signalingSocket = new WebSocket(wsUrl);

    return new Promise((resolve, reject) => {
      if (!this.signalingSocket) return reject(new Error('Failed to create WebSocket'));

      this.signalingSocket.onopen = () => {
        console.log('Connected to voice signaling server');
        this.sendVoiceMessage({
          type: 'participant-joined',
          fromUserId: this.config.userId!,
          data: { voiceEnabled: true },
          timestamp: Date.now(),
        });
        resolve();
      };

      this.signalingSocket.onmessage = (event) => {
        try {
          const message: VoiceMessage = JSON.parse(event.data);
          this.handleSignalingMessage(message);
        } catch (error) {
          console.error('Failed to parse signaling message:', error);
        }
      };

      this.signalingSocket.onerror = (error) => {
        console.error('Signaling WebSocket error:', error);
        reject(error);
      };

      this.signalingSocket.onclose = () => {
        console.log('Disconnected from voice signaling server');
        this.emit('signalingDisconnected');
      };

      // Timeout after 10 seconds
      setTimeout(() => {
        if (this.signalingSocket?.readyState !== WebSocket.OPEN) {
          reject(new Error('Signaling connection timeout'));
        }
      }, 10000);
    });
  }

  /**
   * Handle incoming signaling messages
   */
  private async handleSignalingMessage(message: VoiceMessage): Promise<void> {
    switch (message.type) {
      case 'participant-joined':
        if (message.fromUserId !== this.config.userId) {
          await this.voiceManager.connectToParticipant(message.fromUserId, true);
          this.emit('participantJoined', message.fromUserId);
        }
        break;

      case 'participant-left':
        this.voiceManager.disconnectParticipant(message.fromUserId);
        this.emit('participantLeft', message.fromUserId);
        break;

      case 'offer':
        if (message.toUserId === this.config.userId) {
          await this.voiceManager.handleOffer(message.fromUserId, message.data);
        }
        break;

      case 'answer':
        if (message.toUserId === this.config.userId) {
          await this.voiceManager.handleAnswer(message.fromUserId, message.data);
        }
        break;

      case 'ice-candidate':
        if (message.toUserId === this.config.userId) {
          await this.voiceManager.handleIceCandidate(message.fromUserId, message.data);
        }
        break;

      case 'voice-state':
        this.emit('participantVoiceStateChanged', {
          userId: message.fromUserId,
          ...message.data,
        });
        break;

      default:
        console.warn('Unknown signaling message type:', message.type);
    }
  }

  /**
   * Set up voice manager event listeners
   */
  private setupVoiceManagerListeners(): void {
    this.voiceManager.on('offer', (data: { userId: string; offer: RTCSessionDescriptionInit }) => {
      this.sendVoiceMessage({
        type: 'offer',
        fromUserId: this.config.userId!,
        toUserId: data.userId,
        data: data.offer,
        timestamp: Date.now(),
      });
    });

    this.voiceManager.on(
      'answer',
      (data: { userId: string; answer: RTCSessionDescriptionInit }) => {
        this.sendVoiceMessage({
          type: 'answer',
          fromUserId: this.config.userId!,
          toUserId: data.userId,
          data: data.answer,
          timestamp: Date.now(),
        });
      }
    );

    this.voiceManager.on('iceCandidate', (data: { userId: string; candidate: RTCIceCandidate }) => {
      this.sendVoiceMessage({
        type: 'ice-candidate',
        fromUserId: this.config.userId!,
        toUserId: data.userId,
        data: data.candidate,
        timestamp: Date.now(),
      });
    });

    this.voiceManager.on('muteStateChanged', (data: { muted: boolean; userId: string }) => {
      if (data.userId === 'local') {
        this.sendVoiceMessage({
          type: 'voice-state',
          fromUserId: this.config.userId!,
          data: { muted: data.muted },
          timestamp: Date.now(),
        });
      }
      this.emit('muteStateChanged', data);
    });

    this.voiceManager.on('voiceActivity', (data: { userId: string; speaking: boolean }) => {
      this.emit('voiceActivity', data);
    });

    this.voiceManager.on('participantConnected', (userId: string) => {
      this.emit('participantConnected', userId);
    });

    this.voiceManager.on('participantDisconnected', (userId: string) => {
      this.emit('participantDisconnected', userId);
    });
  }

  /**
   * Send voice message through signaling server
   */
  private sendVoiceMessage(message: VoiceMessage): void {
    if (this.signalingSocket?.readyState === WebSocket.OPEN) {
      this.signalingSocket.send(JSON.stringify(message));
    } else {
      console.warn('Cannot send voice message: signaling socket not connected');
    }
  }

  /**
   * Join voice chat in room
   */
  async joinVoiceChat(roomId: string, userId: string): Promise<void> {
    this.config.roomId = roomId;
    this.config.userId = userId;

    if (!this.isInitialized) {
      await this.initialize();
    }

    if (this.config.signalingEndpoint) {
      await this.connectToSignalingServer();
    }
  }

  /**
   * Leave voice chat
   */
  leaveVoiceChat(): void {
    // Notify other participants
    if (this.signalingSocket?.readyState === WebSocket.OPEN) {
      this.sendVoiceMessage({
        type: 'participant-left',
        fromUserId: this.config.userId!,
        data: {},
        timestamp: Date.now(),
      });
    }

    // Disconnect from all participants
    const participants = this.voiceManager.getParticipants();
    participants.forEach((participant) => {
      this.voiceManager.disconnectParticipant(participant.userId);
    });

    // Close signaling connection
    if (this.signalingSocket) {
      this.signalingSocket.close();
      this.signalingSocket = undefined;
    }

    this.emit('leftVoiceChat');
  }

  /**
   * Get voice manager instance for direct control
   */
  getVoiceManager(): WebRTCVoiceManager {
    return this.voiceManager;
  }

  /**
   * Check if voice chat is available
   */
  isVoiceChatAvailable(): boolean {
    return this.isInitialized && this.voiceManager.getConnectionStatus().connected;
  }

  /**
   * Get current voice chat status
   */
  getVoiceChatStatus() {
    return {
      initialized: this.isInitialized,
      connectionStatus: this.voiceManager.getConnectionStatus(),
      participants: this.voiceManager.getParticipants(),
      signalingConnected: this.signalingSocket?.readyState === WebSocket.OPEN,
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<VoiceIntegrationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.leaveVoiceChat();
    this.voiceManager.destroy();
    this.eventListeners.clear();
    this.isInitialized = false;
  }

  /**
   * Event system
   */
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => callback(data));
    }
  }
}

export default VoiceIntegration;
