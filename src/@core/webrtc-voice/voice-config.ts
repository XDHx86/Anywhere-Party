/**
 * WebRTC Voice Configuration
 *
 * Provides configuration management for WebRTC voice communication
 * including STUN/TURN servers, audio settings, and hotkey configuration.
 *
 * Requirements: 4.1, 4.3, 4.5
 */

export interface VoiceConfigSchema {
  // STUN/TURN Server Configuration
  stunServers: string[];
  turnServers: Array<{
    urls: string;
    username?: string;
    credential?: string;
  }>;

  // Audio Configuration
  audioConstraints: {
    echoCancellation: boolean;
    noiseSuppression: boolean;
    autoGainControl: boolean;
    sampleRate?: number;
    channelCount?: number;
  };

  // Push-to-Talk Configuration
  pushToTalkKey: string;
  pushToTalkEnabled: boolean;

  // Volume and Quality Settings
  defaultVolume: number;
  microphoneGain: number;
  voiceActivityThreshold: number;

  // Connection Settings
  connectionTimeout: number;
  reconnectAttempts: number;
  reconnectDelay: number;

  // Degradation Handling
  enableFallbackMode: boolean;
  fallbackMessage: string;
}

export const DEFAULT_VOICE_CONFIG: VoiceConfigSchema = {
  stunServers: [
    'stun:stun.l.google.com:19302',
    'stun:stun1.l.google.com:19302',
    'stun:stun2.l.google.com:19302',
  ],

  turnServers: [
    // TURN servers should be configured by deployment
    // Example format:
    // {
    //   urls: 'turn:your-turn-server.com:3478',
    //   username: 'username',
    //   credential: 'password'
    // }
  ],

  audioConstraints: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 48000,
    channelCount: 1,
  },

  pushToTalkKey: 'Space',
  pushToTalkEnabled: false,

  defaultVolume: 0.8,
  microphoneGain: 1.0,
  voiceActivityThreshold: 50,

  connectionTimeout: 10000,
  reconnectAttempts: 3,
  reconnectDelay: 2000,

  enableFallbackMode: true,
  fallbackMessage:
    'Voice chat is currently unavailable. You can still participate in text chat and synchronized viewing.',
};

export class VoiceConfigManager {
  private config: VoiceConfigSchema;
  private storageKey = 'webrtc-voice-config';

  constructor(initialConfig?: Partial<VoiceConfigSchema>) {
    this.config = { ...DEFAULT_VOICE_CONFIG, ...initialConfig };
  }

  /**
   * Load configuration from browser storage
   */
  async loadConfig(): Promise<VoiceConfigSchema> {
    try {
      const stored = await browser.storage.local.get(this.storageKey);
      if (stored[this.storageKey]) {
        this.config = { ...DEFAULT_VOICE_CONFIG, ...stored[this.storageKey] };
      }
    } catch (error) {
      console.warn('Failed to load voice config from storage:', error);
    }
    return this.config;
  }

  /**
   * Save configuration to browser storage
   */
  async saveConfig(config?: Partial<VoiceConfigSchema>): Promise<void> {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    try {
      await browser.storage.local.set({
        [this.storageKey]: this.config,
      });
    } catch (error) {
      console.error('Failed to save voice config to storage:', error);
      throw error;
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): VoiceConfigSchema {
    return { ...this.config };
  }

  /**
   * Update specific configuration values
   */
  updateConfig(updates: Partial<VoiceConfigSchema>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Reset to default configuration
   */
  resetToDefaults(): void {
    this.config = { ...DEFAULT_VOICE_CONFIG };
  }

  /**
   * Validate configuration
   */
  validateConfig(config: Partial<VoiceConfigSchema>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate STUN servers
    if (config.stunServers) {
      config.stunServers.forEach((server, index) => {
        if (!server.startsWith('stun:')) {
          errors.push(`STUN server ${index + 1} must start with 'stun:'`);
        }
      });
    }

    // Validate TURN servers
    if (config.turnServers) {
      config.turnServers.forEach((server, index) => {
        if (
          !server.urls ||
          (!server.urls.startsWith('turn:') && !server.urls.startsWith('turns:'))
        ) {
          errors.push(
            `TURN server ${index + 1} must have valid URLs starting with 'turn:' or 'turns:'`
          );
        }
      });
    }

    // Validate volume settings
    if (config.defaultVolume !== undefined) {
      if (config.defaultVolume < 0 || config.defaultVolume > 1) {
        errors.push('Default volume must be between 0 and 1');
      }
    }

    if (config.microphoneGain !== undefined) {
      if (config.microphoneGain < 0 || config.microphoneGain > 2) {
        errors.push('Microphone gain must be between 0 and 2');
      }
    }

    // Validate threshold settings
    if (config.voiceActivityThreshold !== undefined) {
      if (config.voiceActivityThreshold < 0 || config.voiceActivityThreshold > 255) {
        errors.push('Voice activity threshold must be between 0 and 255');
      }
    }

    // Validate timeout settings
    if (config.connectionTimeout !== undefined) {
      if (config.connectionTimeout < 1000 || config.connectionTimeout > 60000) {
        errors.push('Connection timeout must be between 1000ms and 60000ms');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get WebRTC configuration for RTCPeerConnection
   */
  getRTCConfiguration(): RTCConfiguration {
    return {
      iceServers: [
        ...this.config.stunServers.map((url) => ({ urls: url })),
        ...this.config.turnServers,
      ],
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
    };
  }

  /**
   * Get media constraints for getUserMedia
   */
  getMediaConstraints(): MediaStreamConstraints {
    return {
      audio: this.config.audioConstraints,
      video: false,
    };
  }

  /**
   * Get push-to-talk configuration
   */
  getPushToTalkConfig(): { enabled: boolean; key: string } {
    return {
      enabled: this.config.pushToTalkEnabled,
      key: this.config.pushToTalkKey,
    };
  }

  /**
   * Check if TURN servers are configured
   */
  hasTurnServers(): boolean {
    return this.config.turnServers.length > 0;
  }

  /**
   * Get degradation message for connection failures
   */
  getDegradationMessage(): string {
    if (!this.hasTurnServers()) {
      return 'Your network configuration prevents direct voice connections. A TURN server is required for voice chat in this environment. Please contact your administrator or try from a different network.';
    }
    return this.config.fallbackMessage;
  }

  /**
   * Export configuration for backup/sharing
   */
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Import configuration from JSON
   */
  importConfig(configJson: string): { success: boolean; errors?: string[] } {
    try {
      const imported = JSON.parse(configJson);
      const validation = this.validateConfig(imported);

      if (validation.valid) {
        this.config = { ...DEFAULT_VOICE_CONFIG, ...imported };
        return { success: true };
      } else {
        return { success: false, errors: validation.errors };
      }
    } catch (error) {
      return {
        success: false,
        errors: ['Invalid JSON format'],
      };
    }
  }
}

export default VoiceConfigManager;
