/**
 * Privacy Manager - Central coordinator for privacy and security features
 * Integrates username authentication, E2E encryption, data retention, and recording consent
 * Implements requirements 15.1, 15.2, 15.3
 */

import { BrowserBridge } from '../browser-bridge/types';
import { AuthClient, AuthConfig, UserProfile } from '../auth/oauth-client';
import { E2EEncryption, E2EConfig, EncryptedMessage } from '../encryption/e2e-encryption';
import { DataRetentionManager, PrivacySettings, RetentionPolicy } from './data-retention';
import {
  RecordingConsentManager,
  RecordingPolicy,
  RecordingConsent,
  RecordingType,
} from './recording-consent';

export interface PrivacyConfig {
  auth: AuthConfig;
  encryption: E2EConfig;
  dataRetention: PrivacySettings;
  recording: RecordingPolicy;
}

export interface PrivacyStatus {
  authentication: {
    isAuthenticated: boolean;
    user: UserProfile | null;
    allowAnonymous: boolean;
  };
  encryption: {
    enabled: boolean;
    keyExchangeComplete: boolean;
    participantCount: number;
  };
  dataRetention: {
    enabled: boolean;
    policies: RetentionPolicy;
    lastCleanup: number | null;
  };
  recording: {
    enabled: boolean;
    requiresConsent: boolean;
    activeRecordings: number;
  };
}

export class PrivacyManager {
  private browserBridge: BrowserBridge;
  private config: PrivacyConfig;
  private authClient: AuthClient;
  private e2eEncryption: E2EEncryption;
  private dataRetentionManager: DataRetentionManager;
  private recordingConsentManager: RecordingConsentManager;
  private initialized: boolean = false;

  constructor(browserBridge: BrowserBridge, config: PrivacyConfig) {
    this.browserBridge = browserBridge;
    this.config = config;

    // Initialize components
    this.authClient = new AuthClient(browserBridge, config.auth);
    this.e2eEncryption = new E2EEncryption(config.encryption);
    this.dataRetentionManager = new DataRetentionManager(browserBridge, config.dataRetention);
    this.recordingConsentManager = new RecordingConsentManager(browserBridge, config.recording);
  }

  /**
   * Initialize privacy manager and all components
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    console.log('Initializing privacy manager...');

    try {
      // Initialize all components
      await Promise.all([
        this.authClient.initialize(),
        this.e2eEncryption.initialize(),
        this.dataRetentionManager.initialize(),
        this.recordingConsentManager.initialize(),
      ]);

      this.initialized = true;
      console.log('Privacy manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize privacy manager:', error);
      throw error;
    }
  }

  /**
   * Get current privacy status
   */
  getPrivacyStatus(): PrivacyStatus {
    const authState = this.authClient.getAuthState();

    return {
      authentication: {
        isAuthenticated: authState.isAuthenticated,
        user: authState.user,
        allowAnonymous: this.config.auth.allowAnonymous,
      },
      encryption: {
        enabled: this.config.encryption.enabled,
        keyExchangeComplete: this.e2eEncryption.isEnabled(),
        participantCount: this.e2eEncryption.getAvailableParticipants().length,
      },
      dataRetention: {
        enabled:
          this.config.dataRetention.allowDataDeletion || this.config.dataRetention.allowDataExport,
        policies: this.config.dataRetention.dataRetention,
        lastCleanup: null, // Would be tracked in a real implementation
      },
      recording: {
        enabled: this.config.recording.enabled,
        requiresConsent: this.config.recording.requireExplicitConsent,
        activeRecordings: 0, // Would be tracked from active sessions
      },
    };
  }

  /**
   * Update privacy configuration
   */
  async updatePrivacyConfig(updates: Partial<PrivacyConfig>): Promise<void> {
    this.config = { ...this.config, ...updates };

    // Update component configurations
    if (updates.dataRetention) {
      await this.dataRetentionManager.updateSettings(updates.dataRetention);
    }

    if (updates.recording) {
      await this.recordingConsentManager.updateRecordingPolicy(updates.recording);
    }

    console.log('Privacy configuration updated');
  }

  // Authentication methods
  async authenticateUser(username: string): Promise<UserProfile> {
    return await this.authClient.authenticateWithUsername(username);
  }

  async signOutUser(): Promise<void> {
    await this.authClient.signOut();
  }

  getCurrentUser(): UserProfile | null {
    return this.authClient.getCurrentUser();
  }

  isUserAuthenticated(): boolean {
    return this.authClient.isAuthenticated();
  }

  async updateUserProfile(
    updates: Partial<Pick<UserProfile, 'displayName' | 'avatarUrl'>>
  ): Promise<void> {
    return await this.authClient.updateProfile(updates);
  }

  // Encryption methods
  async getPublicKey(): Promise<string | null> {
    return await this.e2eEncryption.getPublicKey();
  }

  async addParticipantKey(userId: string, publicKey: string): Promise<void> {
    await this.e2eEncryption.addParticipantKey(userId, publicKey);
  }

  async encryptMessage(message: string, recipientUserId: string): Promise<EncryptedMessage | null> {
    return await this.e2eEncryption.encryptMessage(message, recipientUserId);
  }

  async decryptMessage(encryptedMessage: EncryptedMessage): Promise<string | null> {
    return await this.e2eEncryption.decryptMessage(encryptedMessage);
  }

  async encryptMessageForGroup(
    message: string,
    recipientUserIds: string[]
  ): Promise<Map<string, EncryptedMessage>> {
    return await this.e2eEncryption.encryptMessageForGroup(message, recipientUserIds);
  }

  isEncryptionEnabled(): boolean {
    return this.e2eEncryption.isEnabled();
  }

  // Data retention methods
  async requestDataDeletion(userId: string, dataTypes: string[], reason: string): Promise<string> {
    return await this.dataRetentionManager.requestDataDeletion(userId, dataTypes, reason);
  }

  async requestDataExport(
    userId: string,
    dataTypes: string[],
    format: 'json' | 'csv' = 'json'
  ): Promise<string> {
    return await this.dataRetentionManager.requestDataExport(userId, dataTypes, format);
  }

  async performDataCleanup(): Promise<void> {
    await this.dataRetentionManager.performDataCleanup();
  }

  async anonymizeUserData(userId: string): Promise<void> {
    await this.dataRetentionManager.anonymizeUserData(userId);
  }

  async getRetentionStats(): Promise<Record<string, unknown>> {
    return await this.dataRetentionManager.getRetentionStats();
  }

  // Recording consent methods
  async requestRecordingConsent(
    roomId: string,
    requesterId: string,
    recordingTypes: RecordingType[],
    participants: string[],
    purpose: string,
    retentionDays?: number
  ): Promise<string> {
    return await this.recordingConsentManager.requestRecordingConsent(
      roomId,
      requesterId,
      recordingTypes,
      participants,
      purpose,
      retentionDays
    );
  }

  async respondToConsentRequest(
    requestId: string,
    userId: string,
    consent: boolean
  ): Promise<void> {
    await this.recordingConsentManager.respondToConsentRequest(requestId, userId, consent);
  }

  async revokeRecordingConsent(userId: string, roomId: string): Promise<void> {
    await this.recordingConsentManager.revokeConsent(userId, roomId);
  }

  async startRecordingSession(
    roomId: string,
    initiatorId: string,
    recordingTypes: RecordingType[],
    participants: string[]
  ): Promise<string> {
    return await this.recordingConsentManager.startRecordingSession(
      roomId,
      initiatorId,
      recordingTypes,
      participants
    );
  }

  async stopRecordingSession(sessionId: string): Promise<void> {
    await this.recordingConsentManager.stopRecordingSession(sessionId);
  }

  getRecordingConsentStatus(userId: string, roomId: string): RecordingConsent | null {
    return this.recordingConsentManager.getConsentStatus(userId, roomId);
  }

  // Room lifecycle methods
  async onRoomJoined(roomId: string, userId: string, _participants: string[]): Promise<void> {
    console.log(`Privacy manager: User ${userId} joined room ${roomId}`);

    // Exchange encryption keys if enabled
    if (this.config.encryption.enabled) {
      const publicKey = await this.getPublicKey();
      if (publicKey) {
        // In a real implementation, this would be sent through the signaling server
        console.log('Public key ready for exchange:', publicKey.substring(0, 50) + '...');
      }
    }

    // Check recording consent requirements
    if (this.config.recording.enabled && this.config.recording.requireExplicitConsent) {
      // Check if there are any active recordings that need consent
      const activeRecordings = this.recordingConsentManager.getActiveRecordingSessions(roomId);
      if (activeRecordings.length > 0) {
        console.log(`Active recordings detected in room ${roomId}, consent may be required`);
      }
    }
  }

  async onRoomLeft(roomId: string, userId: string): Promise<void> {
    console.log(`Privacy manager: User ${userId} left room ${roomId}`);

    // Clear participant encryption keys
    this.e2eEncryption.removeParticipantKey(userId);

    // Handle any active recordings
    const consentStatus = this.getRecordingConsentStatus(userId, roomId);
    if (consentStatus && consentStatus.consentGiven) {
      console.log(`User ${userId} had recording consent for room ${roomId}`);
    }
  }

  async onParticipantJoined(roomId: string, userId: string, publicKey?: string): Promise<void> {
    console.log(`Privacy manager: Participant ${userId} joined room ${roomId}`);

    // Add participant's public key if provided
    if (publicKey && this.config.encryption.enabled) {
      await this.addParticipantKey(userId, publicKey);
    }
  }

  async onParticipantLeft(roomId: string, userId: string): Promise<void> {
    console.log(`Privacy manager: Participant ${userId} left room ${roomId}`);

    // Remove participant's encryption key
    this.e2eEncryption.removeParticipantKey(userId);
  }

  // Utility methods
  async performPrivacyCleanup(): Promise<void> {
    console.log('Performing privacy cleanup...');

    await Promise.all([
      this.dataRetentionManager.performDataCleanup(),
      this.recordingConsentManager.performCleanup(),
    ]);

    console.log('Privacy cleanup completed');
  }

  async exportPrivacyReport(userId: string): Promise<Record<string, unknown>> {
    const status = this.getPrivacyStatus();
    const retentionStats = await this.getRetentionStats();
    const currentUser = this.getCurrentUser();

    return {
      timestamp: Date.now(),
      userId,
      privacyStatus: status,
      retentionStatistics: retentionStats,
      userProfile: currentUser,
      configuration: {
        authEnabled: true,
        encryptionEnabled: this.config.encryption.enabled,
        dataRetentionEnabled: this.config.dataRetention.allowDataDeletion,
        recordingConsentRequired: this.config.recording.requireExplicitConsent,
      },
    };
  }

  /**
   * Validate privacy configuration
   */
  validateConfiguration(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate auth configuration
    if (this.config.auth.minUsernameLength < 1) {
      errors.push('Minimum username length must be at least 1');
    }
    if (this.config.auth.maxUsernameLength < this.config.auth.minUsernameLength) {
      errors.push('Maximum username length must be greater than minimum');
    }

    // Validate encryption configuration
    if (this.config.encryption.enabled) {
      if (this.config.encryption.keySize < 2048) {
        errors.push('Encryption key size should be at least 2048 bits');
      }
    }

    // Validate data retention configuration
    if (this.config.dataRetention.dataRetention.chatMessages.retentionDays < 1) {
      errors.push('Chat message retention period must be at least 1 day');
    }

    // Validate recording configuration
    if (this.config.recording.enabled) {
      if (this.config.recording.maxRetentionDays < this.config.recording.defaultRetentionDays) {
        errors.push('Maximum retention period cannot be less than default retention period');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Shutdown privacy manager
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down privacy manager...');

    // Clear encryption keys
    this.e2eEncryption.clearParticipantKeys();

    // Shutdown components
    this.dataRetentionManager.shutdown();
    this.recordingConsentManager.shutdown();

    this.initialized = false;
    console.log('Privacy manager shutdown complete');
  }
}

/**
 * Factory function to create privacy manager with default configuration
 */
export function createPrivacyManager(
  browserBridge: BrowserBridge,
  config?: Partial<PrivacyConfig>
): PrivacyManager {
  const defaultConfig: PrivacyConfig = {
    auth: {
      enabled: false,
      providers: {},
      allowAnonymous: true,
      sessionDuration: 24 * 60 * 60 * 1000, // 24 hours
      maxUsernameLength: 20,
      minUsernameLength: 2,
    },
    encryption: {
      enabled: false,
      algorithm: 'RSA-OAEP',
      keySize: 2048,
    },
    dataRetention: {
      dataRetention: {
        chatMessages: { enabled: true, retentionDays: 30, autoDelete: true },
        roomHistory: { enabled: true, retentionDays: 90, autoDelete: true },
        userSessions: { enabled: true, retentionDays: 7, autoDelete: true },
        annotations: { enabled: true, retentionDays: 60, autoDelete: true },
        subtitleTracks: { enabled: true, retentionDays: 30, autoDelete: true },
        telemetryData: { enabled: true, retentionDays: 90, autoDelete: true },
      },
      allowDataExport: true,
      allowDataDeletion: true,
      requireConsentForRecording: true,
      anonymizeData: true,
      shareDataWithThirdParties: false,
    },
    recording: {
      enabled: false,
      requireExplicitConsent: true,
      allowConsentRevocation: true,
      defaultRetentionDays: 30,
      maxRetentionDays: 365,
      recordingTypes: {
        audio: false,
        video: false,
        screen: false,
        chat: true,
        annotations: true,
      },
      notificationSettings: {
        showRecordingIndicator: true,
        notifyOnStart: true,
        notifyOnStop: true,
        reminderInterval: 15,
      },
      dataHandling: {
        encryptRecordings: true,
        anonymizeParticipants: false,
        allowDownload: false,
        allowSharing: false,
        autoDeleteAfterRetention: true,
      },
    },
  };

  const mergedConfig = { ...defaultConfig, ...config };
  return new PrivacyManager(browserBridge, mergedConfig);
}
