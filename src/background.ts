import { createBrowserBridge } from '@core/browser-bridge';
import { ConfigManagerImpl } from '@core/config';
import {
  SignalingClient,
  ConnectionState,
  ServerMessage,
  createCreateRoomMessage,
  createJoinRoomMessage,
  createSyncStateMessage,
  createChatMessage,
  HostTransferMessage,
  KickParticipantMessage,
} from '@core/signaling';
import { SyncEngine } from '@core/sync-engine';
import { SyncMessage } from '@core/sync-engine/types';
import { ChatManager } from '@core/chat';
import { ReactionType } from '@core/chat/types';
import { createPrivacyManager, PrivacyManager } from '@core/privacy/privacy-manager';
import { createLoggingManager, LoggingManager } from '@core/logging';
import { getRoomStateManager, RoomStateManager } from '@core/room-state/room-state-manager';
import { getPlaylistManager, PlaylistManager } from '@core/playlist';
import { getSchedulingManager, SchedulingManager } from '@core/scheduling';
import {
  createPlaylistAddMessage,
  createPlaylistRemoveMessage,
  createPlaylistReorderMessage,
  createPlaylistSkipVoteMessage,
} from '@core/signaling';
import { getAPIKeyManager, APIKeyManager } from '@core/api-keys/api-key-manager';
import { roomCreationResponseHandler } from '@core/room-creation/room-creation-response-handler';
import {
  createMonitoringService,
  MonitoringService,
  createRuntimeBugTracker,
  RuntimeBugTracker,
} from '@core/monitoring';
import { VoiceIntegration, VoiceIntegrationConfig, createVoiceSystem } from '@core/webrtc-voice';

/**
 * Background script / Service Worker
 * Central coordination hub for the watch party extension
 */

class BackgroundService {
  private browserBridge = createBrowserBridge();
  private configManager = new ConfigManagerImpl(this.browserBridge);
  private signalingClient: SignalingClient | null = null;
  private syncEngine: SyncEngine | null = null;
  private chatManager = new ChatManager();
  private privacyManager: PrivacyManager | null = null;
  private loggingManager: LoggingManager | null = null;
  private monitoringService: MonitoringService | null = null;
  private runtimeBugTracker: RuntimeBugTracker | null = null;
  private roomStateManager: RoomStateManager = getRoomStateManager();
  private playlistManager: PlaylistManager = getPlaylistManager();
  private schedulingManager: SchedulingManager = getSchedulingManager();
  private apiKeyManager: APIKeyManager = getAPIKeyManager();
  private voiceIntegration: VoiceIntegration | null = null;
  private currentUserId: string = '';
  private currentRoomId: string = '';
  private isHost: boolean = false;

  async initialize() {
    console.log('Watch Party Extension background service starting...');

    try {
      // Load configuration
      const config = await this.configManager.loadConfig();
      console.log('Configuration loaded:', {
        server: config.SIGNALING_SERVER,
        localDevMode: config.LOCAL_DEV_MODE,
        manifestVersion: this.browserBridge.manifestVersion,
        privacyEnabled:
          config.OAUTH_ENABLED || config.E2E_ENCRYPTION_ENABLED || config.DATA_RETENTION_ENABLED,
      });

      // Initialize logging manager first
      this.loggingManager = createLoggingManager(this.browserBridge, config);
      this.loggingManager.info(
        'background_service',
        'Watch Party Extension background service starting',
        {
          server: config.SIGNALING_SERVER,
          localDevMode: config.LOCAL_DEV_MODE,
          manifestVersion: this.browserBridge.manifestVersion,
          telemetryEnabled: config.TELEMETRY_ENABLED,
        }
      );

      // Initialize monitoring service
      this.monitoringService = createMonitoringService(
        this.browserBridge,
        this.loggingManager,
        config
      );
      this.runtimeBugTracker = createRuntimeBugTracker(this.monitoringService);

      // Generate user ID if not exists
      this.currentUserId = await this.getOrCreateUserId();
      this.loggingManager.setUserId(this.currentUserId);
      this.runtimeBugTracker.setUserId(this.currentUserId);

      // Initialize privacy manager
      this.privacyManager = createPrivacyManager(this.browserBridge, {
        auth: {
          enabled: config.OAUTH_ENABLED,
          providers: config.OAUTH_PROVIDERS,
          allowAnonymous: config.ALLOW_ANONYMOUS_USERS,
          sessionDuration: 24 * 60 * 60 * 1000,
          maxUsernameLength: 20,
          minUsernameLength: 2,
        },
        encryption: {
          enabled: config.E2E_ENCRYPTION_ENABLED,
          algorithm: 'RSA-OAEP',
          keySize: config.ENCRYPTION_KEY_SIZE,
        },
        dataRetention: {
          dataRetention: {
            chatMessages: {
              enabled: config.DATA_RETENTION_ENABLED,
              retentionDays: config.CHAT_RETENTION_DAYS,
              autoDelete: config.AUTO_DELETE_EXPIRED_DATA,
            },
            roomHistory: {
              enabled: config.DATA_RETENTION_ENABLED,
              retentionDays: config.ROOM_HISTORY_RETENTION_DAYS,
              autoDelete: config.AUTO_DELETE_EXPIRED_DATA,
            },
            userSessions: {
              enabled: config.DATA_RETENTION_ENABLED,
              retentionDays: 7,
              autoDelete: config.AUTO_DELETE_EXPIRED_DATA,
            },
            annotations: {
              enabled: config.DATA_RETENTION_ENABLED,
              retentionDays: 60,
              autoDelete: config.AUTO_DELETE_EXPIRED_DATA,
            },
            subtitleTracks: {
              enabled: config.DATA_RETENTION_ENABLED,
              retentionDays: 30,
              autoDelete: config.AUTO_DELETE_EXPIRED_DATA,
            },
            telemetryData: {
              enabled: config.DATA_RETENTION_ENABLED,
              retentionDays: 90,
              autoDelete: config.AUTO_DELETE_EXPIRED_DATA,
            },
          },
          allowDataExport: config.DATA_RETENTION_ENABLED,
          allowDataDeletion: config.DATA_RETENTION_ENABLED,
          requireConsentForRecording: config.RECORDING_CONSENT_REQUIRED,
          anonymizeData: config.ANONYMIZE_USER_DATA,
          shareDataWithThirdParties: false,
        },
        recording: {
          enabled: false, // Will be enabled based on feature flags
          requireExplicitConsent: config.RECORDING_CONSENT_REQUIRED,
          allowConsentRevocation: true,
          defaultRetentionDays: config.RECORDING_RETENTION_DAYS,
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
            encryptRecordings: config.E2E_ENCRYPTION_ENABLED,
            anonymizeParticipants: config.ANONYMIZE_USER_DATA,
            allowDownload: false,
            allowSharing: false,
            autoDeleteAfterRetention: config.AUTO_DELETE_EXPIRED_DATA,
          },
        },
      });

      await this.privacyManager.initialize();

      // Initialize WebRTC voice integration
      await this.initializeVoiceIntegration(config);

      // Set up message listeners
      this.setupMessageHandlers();

      this.loggingManager.info(
        'background_service',
        'Watch Party Extension background service initialized'
      );
      console.log('Watch Party Extension background service initialized');
    } catch (error) {
      this.loggingManager?.error(
        'background_service',
        'Failed to initialize background service',
        {},
        error instanceof Error ? error : new Error(String(error))
      );
      console.error('Failed to initialize background service:', error);
    }
  }

  /**
   * Initialize WebRTC voice integration
   * Requirement 4.1: Establish peer-to-peer audio connections with TURN server configuration
   */
  private async initializeVoiceIntegration(config: any): Promise<void> {
    try {
      // Create voice integration configuration
      const voiceConfig: VoiceIntegrationConfig = {
        stunServers: config.STUN_SERVERS || [
          'stun:stun.l.google.com:19302',
          'stun:stun1.l.google.com:19302',
        ],
        turnServers: config.TURN_SERVERS || [],
        pushToTalkKey: config.PUSH_TO_TALK_KEY || 'Space',
        defaultVolume: config.DEFAULT_VOICE_VOLUME || 0.8,
        audioConstraints: {
          echoCancellation: config.ECHO_CANCELLATION ?? true,
          noiseSuppression: config.NOISE_SUPPRESSION ?? true,
          autoGainControl: config.AUTO_GAIN_CONTROL ?? true,
          sampleRate: config.AUDIO_SAMPLE_RATE || 48000,
          channelCount: 1,
        },
        signalingEndpoint: config.VOICE_SIGNALING_ENDPOINT || `${config.SIGNALING_SERVER}/voice`,
        userId: this.currentUserId,
      };

      // Create voice integration instance
      this.voiceIntegration = createVoiceSystem(voiceConfig);

      // Set up voice integration event listeners
      this.setupVoiceEventListeners();

      this.loggingManager?.info('voice_integration', 'WebRTC voice integration initialized', {
        stunServers: voiceConfig.stunServers.length,
        turnServers: voiceConfig.turnServers.length,
        pushToTalkEnabled: !!voiceConfig.pushToTalkKey,
      });
    } catch (error) {
      this.loggingManager?.error(
        'voice_integration',
        'Failed to initialize WebRTC voice integration',
        {},
        error instanceof Error ? error : new Error(String(error))
      );
      console.error('Failed to initialize WebRTC voice integration:', error);
    }
  }

  /**
   * Set up voice integration event listeners
   */
  private setupVoiceEventListeners(): void {
    if (!this.voiceIntegration) return;

    // Handle voice initialization
    this.voiceIntegration.on('initialized', (status: any) => {
      this.loggingManager?.info('voice_integration', 'Voice chat initialized', { status });
      this.broadcastToTabs('VOICE_INITIALIZED', { status });
    });

    this.voiceIntegration.on('initializationFailed', (status: any) => {
      this.loggingManager?.warn('voice_integration', 'Voice chat initialization failed', {
        status,
      });
      this.broadcastToTabs('VOICE_INITIALIZATION_FAILED', { status });
    });

    // Handle participant events
    this.voiceIntegration.on('participantJoined', (userId: string) => {
      this.loggingManager?.info('voice_integration', 'Participant joined voice chat', { userId });
      this.broadcastToTabs('VOICE_PARTICIPANT_JOINED', { userId });
    });

    this.voiceIntegration.on('participantLeft', (userId: string) => {
      this.loggingManager?.info('voice_integration', 'Participant left voice chat', { userId });
      this.broadcastToTabs('VOICE_PARTICIPANT_LEFT', { userId });
    });

    // Handle voice activity
    this.voiceIntegration.on('voiceActivity', (data: any) => {
      this.broadcastToTabs('VOICE_ACTIVITY', data);
    });

    // Handle mute state changes
    this.voiceIntegration.on('muteStateChanged', (data: any) => {
      this.broadcastToTabs('VOICE_MUTE_STATE_CHANGED', data);
    });
  }

  /**
   * Broadcast message to all tabs
   */
  private async broadcastToTabs(type: string, data: any): Promise<void> {
    try {
      const tabs = await this.browserBridge.tabs.query({});
      for (const tab of tabs) {
        if (tab.id) {
          this.browserBridge.tabs.sendMessage(tab.id, { type, ...data }).catch(() => {
            // Ignore errors for tabs that don't have content scripts
          });
        }
      }
    } catch (error) {
      // Ignore broadcast errors
    }
  }

  private setupMessageHandlers() {
    this.browserBridge.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
      try {
        switch (message.type) {
          case 'GET_CONFIG':
            const config = await this.configManager.loadConfig();
            sendResponse({ success: true, config });
            break;

          case 'UPDATE_CONFIG':
            try {
              await this.configManager.updateConfig(message.updates);
              // Update signaling client config if connected
              if (this.signalingClient) {
                const newConfig = await this.configManager.loadConfig();
                this.signalingClient.updateConfig(newConfig);
              }
              sendResponse({ success: true });
            } catch (error) {
              sendResponse({
                success: false,
                error: error instanceof Error ? error.message : 'Configuration update failed',
              });
            }
            break;

          case 'EXPORT_CONFIG':
            try {
              const exported = this.configManager.exportConfig(message.format);
              sendResponse({ success: true, data: exported });
            } catch (error) {
              sendResponse({
                success: false,
                error: error instanceof Error ? error.message : 'Export failed',
              });
            }
            break;

          case 'IMPORT_CONFIG':
            try {
              const validation = await this.configManager.importConfig(
                message.content,
                message.format
              );
              sendResponse({ success: validation.isValid, validation });
            } catch (error) {
              sendResponse({
                success: false,
                error: error instanceof Error ? error.message : 'Import failed',
              });
            }
            break;

          case 'VALIDATE_CONFIG':
            try {
              const validation = this.configManager.validateConfig(message.config);
              sendResponse({ success: true, validation });
            } catch (error) {
              sendResponse({
                success: false,
                error: error instanceof Error ? error.message : 'Validation failed',
              });
            }
            break;

          case 'RESET_CONFIG':
            try {
              await this.configManager.resetToDefaults();
              sendResponse({ success: true });
            } catch (error) {
              sendResponse({
                success: false,
                error: error instanceof Error ? error.message : 'Reset failed',
              });
            }
            break;

          // Room management
          case 'START_ROOM':
            await this.handleStartRoom(message.roomOptions);
            sendResponse({ success: true });
            break;

          case 'CREATE_ROOM':
            await this.handleCreateRoom(message.roomOptions);
            sendResponse({ success: true });
            break;

          case 'JOIN_ROOM':
            await this.handleJoinRoom(message.roomId, message.password);
            sendResponse({ success: true });
            break;

          case 'LEAVE_ROOM':
            await this.handleLeaveRoom();
            sendResponse({ success: true });
            break;

          // Host controls
          case 'TRANSFER_HOST':
            await this.handleTransferHost(message.newHostId);
            sendResponse({ success: true });
            break;

          case 'KICK_PARTICIPANT':
            await this.handleKickParticipant(message.targetUserId);
            sendResponse({ success: true });
            break;

          case 'PROMOTE_PARTICIPANT':
            await this.handlePromoteParticipant(message.userId);
            sendResponse({ success: true });
            break;

          case 'TOGGLE_ROOM_LOCK':
            await this.handleToggleRoomLock();
            sendResponse({ success: true });
            break;

          // WebRTC Voice Communication
          case 'INITIALIZE_VOICE':
            await this.handleInitializeVoice();
            sendResponse({ success: true });
            break;

          case 'JOIN_VOICE_CHAT':
            await this.handleJoinVoiceChat(message.roomId, message.userId);
            sendResponse({ success: true });
            break;

          case 'LEAVE_VOICE_CHAT':
            await this.handleLeaveVoiceChat();
            sendResponse({ success: true });
            break;

          case 'TOGGLE_MUTE':
            await this.handleToggleMute(message.muted);
            sendResponse({ success: true });
            break;

          case 'TOGGLE_PUSH_TO_TALK':
            await this.handleTogglePushToTalk(message.enabled);
            sendResponse({ success: true });
            break;

          case 'SET_PARTICIPANT_VOLUME':
            await this.handleSetParticipantVolume(message.userId, message.volume);
            sendResponse({ success: true });
            break;

          case 'GET_VOICE_STATUS':
            const voiceStatus = this.getVoiceStatus();
            sendResponse({ success: true, status: voiceStatus });
            break;

          // Sync engine controls
          case 'START_SYNC':
            await this.handleStartSync(message.isHost, sender.tab?.id);
            sendResponse({ success: true });
            break;

          case 'STOP_SYNC':
            this.handleStopSync();
            sendResponse({ success: true });
            break;

          case 'SYNC_MESSAGE':
            this.handleSyncMessage(message.syncMessage);
            sendResponse({ success: true });
            break;

          // Chat functionality
          case 'SEND_CHAT_MESSAGE':
            await this.handleSendChatMessage(message.message);
            sendResponse({ success: true });
            break;

          case 'SEND_REACTION':
            await this.handleSendReaction(message.reactionType);
            sendResponse({ success: true });
            break;

          case 'GET_CHAT_MESSAGES':
            const messages = this.chatManager.getRecentMessages(message.count || 50);
            sendResponse({ success: true, messages });
            break;

          // ─── Playlist Messages ─────────────────────────
          case 'GET_PLAYLIST':
            sendResponse({ success: true, playlist: this.playlistManager.getState() });
            break;

          case 'ADD_TO_PLAYLIST': {
            if (!this.isHost) {
              sendResponse({ success: false, error: 'Only host can modify playlist' });
              break;
            }
            await this.playlistManager.addItems(message.items);
            // Broadcast updated state to server
            if (this.signalingClient?.isConnected()) {
              this.signalingClient.sendMessage(
                createPlaylistAddMessage(this.currentUserId!, message.items)
              );
            }
            sendResponse({ success: true, playlist: this.playlistManager.getState() });
            break;
          }

          case 'REMOVE_FROM_PLAYLIST': {
            if (!this.isHost) {
              sendResponse({ success: false, error: 'Only host can modify playlist' });
              break;
            }
            await this.playlistManager.removeItems(message.itemIds);
            if (this.signalingClient?.isConnected()) {
              this.signalingClient.sendMessage(
                createPlaylistRemoveMessage(this.currentUserId!, message.itemIds)
              );
            }
            sendResponse({ success: true, playlist: this.playlistManager.getState() });
            break;
          }

          case 'REORDER_PLAYLIST': {
            if (!this.isHost) {
              sendResponse({ success: false, error: 'Only host can modify playlist' });
              break;
            }
            await this.playlistManager.reorderItems(message.itemIds, message.newIndex);
            if (this.signalingClient?.isConnected()) {
              this.signalingClient.sendMessage(
                createPlaylistReorderMessage(this.currentUserId!, message.itemIds, message.newIndex)
              );
            }
            sendResponse({ success: true, playlist: this.playlistManager.getState() });
            break;
          }

          case 'VOTE_SKIP': {
            if (this.signalingClient?.isConnected()) {
              this.signalingClient.sendMessage(
                createPlaylistSkipVoteMessage(this.currentUserId!, message.itemId)
              );
            }
            sendResponse({ success: true });
            break;
          }

          case 'ADVANCE_PLAYLIST': {
            const nextItem = await this.playlistManager.advanceToNext();
            sendResponse({ success: true, playlist: this.playlistManager.getState(), nextItem });
            break;
          }

          // ─── Scheduling Messages ────────────────────────
          case 'GET_SCHEDULED_SESSIONS':
            sendResponse({
              success: true,
              sessions: this.schedulingManager.getUpcomingSessions(),
            });
            break;

          case 'SCHEDULE_SESSION_UI': {
            await this.schedulingManager.createSession(message.session);
            sendResponse({ success: true });
            break;
          }

          case 'CANCEL_SESSION_UI': {
            await this.schedulingManager.cancelSession(message.sessionId);
            sendResponse({ success: true });
            break;
          }

          // Connection status
          case 'GET_CONNECTION_STATUS':
            sendResponse({
              success: true,
              status: {
                connected: this.signalingClient?.isConnected() || false,
                connectionState:
                  this.signalingClient?.getConnectionState() || ConnectionState.DISCONNECTED,
                roomId: this.currentRoomId,
                isHost: this.isHost,
                syncActive: this.syncEngine?.isActive() || false,
                userId: this.currentUserId,
              },
            });
            break;

          case 'GET_USER_ID':
            sendResponse({ success: true, userId: this.currentUserId });
            break;

          case 'GET_ACTIVE_TAB':
            try {
              const tabs = await this.browserBridge.tabs.query({
                active: true,
                currentWindow: true,
              });
              if (tabs.length > 0) {
                sendResponse({ success: true, tab: tabs[0] });
              } else {
                sendResponse({ success: false, error: 'No active tab found' });
              }
            } catch (error) {
              sendResponse({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get active tab',
              });
            }
            break;

          // Logging and telemetry functionality
          case 'SET_TELEMETRY_OPT_OUT':
            try {
              if (!this.loggingManager) {
                throw new Error('Logging manager not initialized');
              }
              await this.loggingManager.setTelemetryOptOut(message.optOut);
              sendResponse({ success: true });
            } catch (error) {
              sendResponse({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to set telemetry opt-out',
              });
            }
            break;

          case 'GET_TELEMETRY_OPT_OUT_STATUS':
            try {
              if (!this.loggingManager) {
                throw new Error('Logging manager not initialized');
              }
              const optOut = await this.loggingManager.getTelemetryOptOutStatus();
              sendResponse({ success: true, optOut });
            } catch (error) {
              sendResponse({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get telemetry status',
              });
            }
            break;

          case 'EXPORT_LOGS':
            try {
              if (!this.loggingManager) {
                throw new Error('Logging manager not initialized');
              }
              const logs = await this.loggingManager.exportLogsAsJsonl();
              sendResponse({ success: true, logs });
            } catch (error) {
              sendResponse({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to export logs',
              });
            }
            break;

          case 'GET_LOGS':
            try {
              if (!this.loggingManager) {
                throw new Error('Logging manager not initialized');
              }
              const logs = await this.loggingManager.getLogs(message.limit);
              sendResponse({ success: true, logs });
            } catch (error) {
              sendResponse({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get logs',
              });
            }
            break;

          case 'CLEAR_LOGS':
            try {
              if (!this.loggingManager) {
                throw new Error('Logging manager not initialized');
              }
              await this.loggingManager.clearLogs();
              sendResponse({ success: true });
            } catch (error) {
              sendResponse({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to clear logs',
              });
            }
            break;

          case 'CLEAR_TELEMETRY_DATA':
            try {
              if (!this.loggingManager) {
                throw new Error('Logging manager not initialized');
              }
              await this.loggingManager.clearTelemetryData();
              sendResponse({ success: true });
            } catch (error) {
              sendResponse({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to clear telemetry data',
              });
            }
            break;

          // Privacy and security functionality
          case 'AUTHENTICATE_USER':
            try {
              if (!this.privacyManager) {
                throw new Error('Privacy manager not initialized');
              }
              const userProfile = await this.privacyManager.authenticateUser(message.provider);
              sendResponse({ success: true, userProfile });
            } catch (error) {
              sendResponse({
                success: false,
                error: error instanceof Error ? error.message : 'Authentication failed',
              });
            }
            break;

          case 'SIGN_OUT_USER':
            try {
              if (this.privacyManager) {
                await this.privacyManager.signOutUser();
              }
              sendResponse({ success: true });
            } catch (error) {
              sendResponse({
                success: false,
                error: error instanceof Error ? error.message : 'Sign out failed',
              });
            }
            break;

          case 'GET_PRIVACY_STATUS':
            try {
              const status = this.privacyManager?.getPrivacyStatus() || null;
              sendResponse({ success: true, status });
            } catch (error) {
              sendResponse({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get privacy status',
              });
            }
            break;

          case 'REQUEST_DATA_DELETION':
            try {
              if (!this.privacyManager) {
                throw new Error('Privacy manager not initialized');
              }
              const requestId = await this.privacyManager.requestDataDeletion(
                message.userId,
                message.dataTypes,
                message.reason
              );
              sendResponse({ success: true, requestId });
            } catch (error) {
              sendResponse({
                success: false,
                error: error instanceof Error ? error.message : 'Data deletion request failed',
              });
            }
            break;

          case 'REQUEST_DATA_EXPORT':
            try {
              if (!this.privacyManager) {
                throw new Error('Privacy manager not initialized');
              }
              const requestId = await this.privacyManager.requestDataExport(
                message.userId,
                message.dataTypes,
                message.format
              );
              sendResponse({ success: true, requestId });
            } catch (error) {
              sendResponse({
                success: false,
                error: error instanceof Error ? error.message : 'Data export request failed',
              });
            }
            break;

          case 'REQUEST_RECORDING_CONSENT':
            try {
              if (!this.privacyManager) {
                throw new Error('Privacy manager not initialized');
              }
              const requestId = await this.privacyManager.requestRecordingConsent(
                message.roomId,
                message.requesterId,
                message.recordingTypes,
                message.participants,
                message.purpose,
                message.retentionDays
              );
              sendResponse({ success: true, requestId });
            } catch (error) {
              sendResponse({
                success: false,
                error: error instanceof Error ? error.message : 'Recording consent request failed',
              });
            }
            break;

          case 'RESPOND_TO_CONSENT_REQUEST':
            try {
              if (!this.privacyManager) {
                throw new Error('Privacy manager not initialized');
              }
              await this.privacyManager.respondToConsentRequest(
                message.requestId,
                message.userId,
                message.consent
              );
              sendResponse({ success: true });
            } catch (error) {
              sendResponse({
                success: false,
                error: error instanceof Error ? error.message : 'Consent response failed',
              });
            }
            break;

          case 'REVOKE_RECORDING_CONSENT':
            try {
              if (!this.privacyManager) {
                throw new Error('Privacy manager not initialized');
              }
              await this.privacyManager.revokeRecordingConsent(message.userId, message.roomId);
              sendResponse({ success: true });
            } catch (error) {
              sendResponse({
                success: false,
                error: error instanceof Error ? error.message : 'Consent revocation failed',
              });
            }
            break;

          case 'ENCRYPT_MESSAGE':
            try {
              if (!this.privacyManager) {
                throw new Error('Privacy manager not initialized');
              }
              const encrypted = await this.privacyManager.encryptMessage(
                message.messageText,
                message.recipientUserId
              );
              sendResponse({ success: true, encrypted });
            } catch (error) {
              sendResponse({
                success: false,
                error: error instanceof Error ? error.message : 'Message encryption failed',
              });
            }
            break;

          case 'DECRYPT_MESSAGE':
            try {
              if (!this.privacyManager) {
                throw new Error('Privacy manager not initialized');
              }
              const decrypted = await this.privacyManager.decryptMessage(message.encryptedMessage);
              sendResponse({ success: true, decrypted });
            } catch (error) {
              sendResponse({
                success: false,
                error: error instanceof Error ? error.message : 'Message decryption failed',
              });
            }
            break;

          // Subtitle functionality
          case 'LOAD_SUBTITLE_FILE':
            await this.handleLoadSubtitleFile(message.file, message.userId, sender.tab?.id);
            sendResponse({ success: true });
            break;

          case 'SEARCH_OPENSUBTITLES':
            await this.handleSearchOpenSubtitles(
              message.query,
              message.language,
              sendResponse,
              sender.tab?.id
            );
            return true; // Keep channel open for async response

          case 'DOWNLOAD_OPENSUBTITLES':
            await this.handleDownloadOpenSubtitles(
              message.result,
              message.userId,
              sendResponse,
              sender.tab?.id
            );
            return true; // Keep channel open for async response

          case 'GET_SUBTITLE_TRACKS':
            await this.handleGetSubtitleTracks(message.userId, sendResponse, sender.tab?.id);
            return true; // Keep channel open for async response

          case 'TOGGLE_SUBTITLE_TRACK':
            await this.handleToggleSubtitleTrack(message.trackId, message.enabled, sender.tab?.id);
            sendResponse({ success: true });
            break;

          case 'UPDATE_SUBTITLE_OFFSET':
            await this.handleUpdateSubtitleOffset(
              message.trackId,
              message.offsetMs,
              sender.tab?.id
            );
            sendResponse({ success: true });
            break;

          case 'REMOVE_SUBTITLE_TRACK':
            await this.handleRemoveSubtitleTrack(message.trackId, sender.tab?.id);
            sendResponse({ success: true });
            break;

          // Annotation functionality
          case 'ANNOTATION_CREATED':
            await this.handleAnnotationCreated(message.annotation);
            sendResponse({ success: true });
            break;

          case 'ANNOTATION_UPDATED':
            await this.handleAnnotationUpdated(message.annotationId, message.updates);
            sendResponse({ success: true });
            break;

          case 'ANNOTATION_DELETED':
            await this.handleAnnotationDeleted(message.annotationId);
            sendResponse({ success: true });
            break;

          case 'LAYER_VISIBILITY_CHANGED':
            await this.handleLayerVisibilityChanged(message.layerId, message.visible);
            sendResponse({ success: true });
            break;

          case 'INTEGRATION_HANDSHAKE':
            // Handle integration handshake from UI components
            sendResponse({
              success: true,
              backgroundScriptConnected: true,
              extensionId: this.browserBridge.runtime.id,
            });
            break;

          case 'POPUP_CONNECT':
            // Handle popup connection request
            sendResponse({
              success: true,
              connectionStatus: this.signalingClient?.getConnectionState() || 'disconnected',
              roomId: this.currentRoomId,
              userId: await this.getOrCreateUserId(),
            });
            break;

          case 'OPTIONS_CONNECT':
            // Handle options page connection request
            sendResponse({
              success: true,
              connectionStatus: this.signalingClient?.getConnectionState() || 'disconnected',
              userId: await this.getOrCreateUserId(),
            });
            break;

          case 'THEME_SYNC':
            // Handle theme synchronization from UI components
            try {
              // Store theme settings if provided
              if (message.settings) {
                await this.browserBridge.storage.local.set({ themeSettings: message.settings });
              }
              sendResponse({ success: true });
            } catch (error) {
              sendResponse({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to sync theme',
              });
            }
            break;

          case 'OVERLAY_THEME_UPDATE':
            // Handle overlay theme update request
            sendResponse({ success: true });
            break;

          // API Key Management
          case 'STORE_API_KEY':
            try {
              await this.apiKeyManager.storeAPIKey(message.service, message.key);
              sendResponse({ success: true });
            } catch (error) {
              sendResponse({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to store API key',
              });
            }
            break;

          case 'GET_API_KEY':
            try {
              const key = await this.apiKeyManager.getAPIKey(message.service);
              sendResponse({ success: true, key });
            } catch (error) {
              sendResponse({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get API key',
              });
            }
            break;

          case 'REMOVE_API_KEY':
            try {
              await this.apiKeyManager.removeAPIKey(message.service);
              sendResponse({ success: true });
            } catch (error) {
              sendResponse({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to remove API key',
              });
            }
            break;

          case 'VALIDATE_API_KEY':
            try {
              const isValid = await this.apiKeyManager.validateAPIKey(message.service, message.key);
              sendResponse({ success: true, isValid });
            } catch (error) {
              sendResponse({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to validate API key',
              });
            }
            break;

          case 'LIST_API_KEYS':
            try {
              const services = await this.apiKeyManager.listStoredKeys();
              sendResponse({ success: true, services });
            } catch (error) {
              sendResponse({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to list API keys',
              });
            }
            break;

          case 'TEST_API_CONNECTION':
            try {
              const result = await this.apiKeyManager.testAPIConnection(
                message.service,
                message.key
              );
              sendResponse({ success: true, result });
            } catch (error) {
              sendResponse({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to test API connection',
              });
            }
            break;

          // Room State Management
          case 'GET_ROOM_STATE':
            try {
              const roomState = await this.roomStateManager.loadRoomState();
              sendResponse({ success: true, roomState });
            } catch (error) {
              sendResponse({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get room state',
              });
            }
            break;

          case 'UPDATE_ROOM_STATE':
            try {
              await this.roomStateManager.updateRoomInfo(message.roomInfo);
              sendResponse({ success: true });
            } catch (error) {
              sendResponse({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to update room state',
              });
            }
            break;

          case 'CLEAR_ROOM_STATE':
            try {
              await this.roomStateManager.clearRoomState();
              sendResponse({ success: true });
            } catch (error) {
              sendResponse({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to clear room state',
              });
            }
            break;

          // Monitoring and error reporting
          case 'GET_MONITORING_DATA':
            try {
              if (!this.monitoringService) {
                throw new Error('Monitoring service not initialized');
              }
              const healthMetrics = this.monitoringService.getHealthMetrics();
              const recentBugs = await this.monitoringService.getRuntimeBugHistory(20);
              const recentFeedback = await this.monitoringService.getUserFeedbackHistory(10);
              const alerts: any[] = []; // TODO: Implement alert retrieval

              sendResponse({
                success: true,
                data: {
                  healthMetrics,
                  recentBugs,
                  recentFeedback,
                  alerts,
                },
              });
            } catch (error) {
              sendResponse({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get monitoring data',
              });
            }
            break;

          case 'EXPORT_MONITORING_DATA':
            try {
              if (!this.monitoringService) {
                throw new Error('Monitoring service not initialized');
              }
              const data = await this.monitoringService.exportMonitoringData();
              sendResponse({ success: true, data });
            } catch (error) {
              sendResponse({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to export monitoring data',
              });
            }
            break;

          case 'SUBMIT_USER_FEEDBACK':
            try {
              if (!this.monitoringService) {
                throw new Error('Monitoring service not initialized');
              }
              const feedbackId = await this.monitoringService.submitUserFeedback({
                ...message.feedback,
                userId: this.currentUserId,
              });
              sendResponse({ success: true, feedbackId });
            } catch (error) {
              sendResponse({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to submit feedback',
              });
            }
            break;

          case 'TRACK_RUNTIME_BUG':
            try {
              if (!this.runtimeBugTracker) {
                throw new Error('Runtime bug tracker not initialized');
              }
              await this.runtimeBugTracker.trackRuntimeBug(message.bugEvent);
              sendResponse({ success: true });
            } catch (error) {
              sendResponse({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to track runtime bug',
              });
            }
            break;

          case 'TRACK_SUCCESS':
            try {
              if (!this.runtimeBugTracker) {
                throw new Error('Runtime bug tracker not initialized');
              }
              await this.runtimeBugTracker.trackSuccess(
                message.operationType,
                message.responseTime
              );
              sendResponse({ success: true });
            } catch (error) {
              sendResponse({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to track success',
              });
            }
            break;

          default:
            console.warn('Unknown message type:', message.type);
            sendResponse({ success: false, error: 'Unknown message type' });
        }
      } catch (error) {
        console.error('Error handling message:', error);
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      return true; // Keep message channel open for async response
    });
  }

  private async getOrCreateUserId(): Promise<string> {
    const result = await this.browserBridge.storage.local.get('userId');
    if (result.userId) {
      return result.userId;
    }

    // Generate new user ID
    const userId = 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    await this.browserBridge.storage.local.set({ userId });
    return userId;
  }

  private async initializeSignalingClient(): Promise<void> {
    if (this.signalingClient) {
      this.signalingClient.disconnect();
    }

    const config = await this.configManager.loadConfig();

    this.signalingClient = new SignalingClient({
      config,
      userId: this.currentUserId,
      onMessage: (message: ServerMessage) => this.handleServerMessage(message),
      onConnectionStateChange: (state: ConnectionState) => this.handleConnectionStateChange(state),
      onError: (error) => console.error('Signaling error:', error),
    });

    await this.signalingClient.connect();
  }

  private async handleStartRoom(roomOptions?: any): Promise<void> {
    try {
      console.log('Starting room with video detection...');

      // First, trigger video detection on the active tab
      const tabs = await this.browserBridge.tabs.query({ active: true, currentWindow: true });
      if (tabs.length === 0) {
        throw new Error('No active tab found');
      }

      const activeTab = tabs[0];
      if (!activeTab.id) {
        throw new Error('Active tab has no ID');
      }

      // Send message to content script to start video detection
      try {
        await this.browserBridge.tabs.sendMessage(activeTab.id, {
          type: 'START_SYNC_ENGINE',
          isHost: true,
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error('Failed to communicate with content script:', error);
        throw new Error('Failed to start video detection. Please refresh the page and try again.');
      }

      // Initialize signaling client if needed
      if (!this.signalingClient) {
        await this.initializeSignalingClient();
      }

      // Create the room
      if (this.signalingClient) {
        const message = createCreateRoomMessage(this.currentUserId, roomOptions);
        this.signalingClient.sendMessage(message);
        this.isHost = true;

        this.loggingManager?.trackUserAction('start_room', {
          hasPassword: !!roomOptions?.password,
          isPublic: !!roomOptions?.isPublic,
        });
      }
    } catch (error) {
      this.loggingManager?.logErrorEvent({
        component: 'background_service',
        operation: 'start_room',
        errorType: error instanceof Error ? error.name : 'UnknownError',
        errorMessage: error instanceof Error ? error.message : String(error),
        context: { roomOptions },
      });
      throw error;
    }
  }

  private async handleCreateRoom(roomOptions?: any): Promise<void> {
    try {
      if (!this.signalingClient) {
        await this.initializeSignalingClient();
      }

      if (this.signalingClient) {
        const message = createCreateRoomMessage(this.currentUserId, roomOptions);
        this.signalingClient.sendMessage(message);
        this.isHost = true;

        this.loggingManager?.trackUserAction('create_room', {
          hasPassword: !!roomOptions?.password,
          isPublic: !!roomOptions?.isPublic,
        });
      }
    } catch (error) {
      this.loggingManager?.logErrorEvent({
        component: 'background_service',
        operation: 'create_room',
        errorType: error instanceof Error ? error.name : 'UnknownError',
        errorMessage: error instanceof Error ? error.message : String(error),
        context: { roomOptions },
      });
      throw error;
    }
  }

  private async handleJoinRoom(roomId: string, password?: string): Promise<void> {
    try {
      if (!this.signalingClient) {
        await this.initializeSignalingClient();
      }

      if (this.signalingClient) {
        const message = createJoinRoomMessage(this.currentUserId, roomId, password);
        this.signalingClient.sendMessage(message);
        this.currentRoomId = roomId;
        this.isHost = false;

        // Update logging manager with room ID
        this.loggingManager?.setRoomId(roomId);
        this.loggingManager?.trackUserAction('join_room', {
          hasPassword: !!password,
        });

        // Update runtime bug tracker with room ID
        this.runtimeBugTracker?.setRoomId(roomId);

        // Notify privacy manager about room join
        if (this.privacyManager) {
          await this.privacyManager.onRoomJoined(roomId, this.currentUserId, []);
        }
      }
    } catch (error) {
      this.loggingManager?.logErrorEvent({
        component: 'background_service',
        operation: 'join_room',
        errorType: error instanceof Error ? error.name : 'UnknownError',
        errorMessage: error instanceof Error ? error.message : String(error),
        context: { roomId, hasPassword: !!password },
      });
      throw error;
    }
  }

  private async handleLeaveRoom(): Promise<void> {
    const roomId = this.currentRoomId;
    const userId = this.currentUserId;

    if (this.syncEngine) {
      this.syncEngine.stopSync();
    }

    if (this.signalingClient) {
      this.signalingClient.disconnect();
      this.signalingClient = null;
    }

    // Leave voice chat if active
    if (this.voiceIntegration) {
      try {
        this.voiceIntegration.leaveVoiceChat();
      } catch (error) {
        this.loggingManager?.error(
          'background_service',
          'Failed to leave voice chat during room cleanup',
          {},
          error instanceof Error ? error : new Error(String(error))
        );
      }
    }

    // Notify privacy manager about room leave
    if (this.privacyManager && roomId) {
      await this.privacyManager.onRoomLeft(roomId, userId);
    }

    this.currentRoomId = '';
    this.isHost = false;
  }

  private async handleTransferHost(newHostId: string): Promise<void> {
    if (!this.signalingClient || !this.isHost) {
      throw new Error('Not authorized to transfer host');
    }

    const message = {
      type: 'TRANSFER_HOST' as const,
      userId: this.currentUserId,
      newHostId,
      timestamp: Date.now(),
    };

    this.signalingClient.sendMessage(message);
  }

  private async handleKickParticipant(targetUserId: string): Promise<void> {
    if (!this.signalingClient || !this.isHost) {
      throw new Error('Not authorized to kick participants');
    }

    const message = {
      type: 'KICK_PARTICIPANT' as const,
      userId: this.currentUserId,
      targetUserId,
      timestamp: Date.now(),
    };

    this.signalingClient.sendMessage(message);
  }

  private async handlePromoteParticipant(targetUserId: string): Promise<void> {
    if (!this.signalingClient || !this.isHost) {
      throw new Error('Not authorized to promote participants');
    }

    // For now, we'll implement this as a custom message
    // In a full implementation, this would be a proper signaling message type
    const message = {
      type: 'PROMOTE_PARTICIPANT' as const,
      userId: this.currentUserId,
      targetUserId,
      timestamp: Date.now(),
    };

    // Send as a custom message for now
    this.signalingClient.sendMessage(message as any);
  }

  private async handleToggleRoomLock(): Promise<void> {
    if (!this.signalingClient || !this.isHost) {
      throw new Error('Not authorized to lock/unlock room');
    }

    // For now, we'll implement this as a custom message
    // In a full implementation, this would be a proper signaling message type
    const message = {
      type: 'TOGGLE_ROOM_LOCK' as const,
      userId: this.currentUserId,
      timestamp: Date.now(),
    };

    // Send as a custom message for now
    this.signalingClient.sendMessage(message as any);
  }

  /**
   * Initialize WebRTC voice communication
   * Requirement 4.1: Establish peer-to-peer audio connections
   */
  private async handleInitializeVoice(): Promise<void> {
    if (!this.voiceIntegration) {
      throw new Error('Voice integration not available');
    }

    try {
      await this.voiceIntegration.initialize();
      this.loggingManager?.info('voice_handler', 'Voice communication initialized');
    } catch (error) {
      this.loggingManager?.error(
        'voice_handler',
        'Failed to initialize voice communication',
        {},
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Join voice chat in current room
   * Requirement 4.1: Establish peer-to-peer audio connections
   */
  private async handleJoinVoiceChat(roomId?: string, userId?: string): Promise<void> {
    if (!this.voiceIntegration) {
      throw new Error('Voice integration not available');
    }

    const targetRoomId = roomId || this.currentRoomId;
    const targetUserId = userId || this.currentUserId;

    if (!targetRoomId || !targetUserId) {
      throw new Error('Room ID and User ID required for voice chat');
    }

    try {
      await this.voiceIntegration.joinVoiceChat(targetRoomId, targetUserId);
      this.loggingManager?.info('voice_handler', 'Joined voice chat', {
        roomId: targetRoomId,
        userId: targetUserId,
      });
    } catch (error) {
      this.loggingManager?.error(
        'voice_handler',
        'Failed to join voice chat',
        { roomId: targetRoomId, userId: targetUserId },
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Leave voice chat
   */
  private async handleLeaveVoiceChat(): Promise<void> {
    if (!this.voiceIntegration) {
      return; // No voice integration, nothing to leave
    }

    try {
      this.voiceIntegration.leaveVoiceChat();
      this.loggingManager?.info('voice_handler', 'Left voice chat');
    } catch (error) {
      this.loggingManager?.error(
        'voice_handler',
        'Failed to leave voice chat',
        {},
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Toggle mute state
   * Requirement 4.2: Implement mute functionality that disables audio transmission immediately
   */
  private async handleToggleMute(muted?: boolean): Promise<void> {
    if (!this.voiceIntegration) {
      throw new Error('Voice integration not available');
    }

    const voiceManager = this.voiceIntegration.getVoiceManager();
    const currentMuted = voiceManager.isMutedState();
    const newMuted = muted !== undefined ? muted : !currentMuted;

    try {
      voiceManager.setMuted(newMuted);
      this.loggingManager?.info('voice_handler', 'Mute state changed', { muted: newMuted });
    } catch (error) {
      this.loggingManager?.error(
        'voice_handler',
        'Failed to toggle mute',
        { muted: newMuted },
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Toggle push-to-talk mode
   * Requirement 4.3: Support push-to-talk functionality with configurable hotkeys
   */
  private async handleTogglePushToTalk(enabled: boolean): Promise<void> {
    if (!this.voiceIntegration) {
      throw new Error('Voice integration not available');
    }

    const voiceManager = this.voiceIntegration.getVoiceManager();

    try {
      voiceManager.enablePushToTalk(enabled);
      this.loggingManager?.info('voice_handler', 'Push-to-talk state changed', { enabled });
    } catch (error) {
      this.loggingManager?.error(
        'voice_handler',
        'Failed to toggle push-to-talk',
        { enabled },
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Set participant volume
   * Requirement 4.4: Provide per-user volume controls for each participant
   */
  private async handleSetParticipantVolume(userId: string, volume: number): Promise<void> {
    if (!this.voiceIntegration) {
      throw new Error('Voice integration not available');
    }

    const voiceManager = this.voiceIntegration.getVoiceManager();

    try {
      voiceManager.setParticipantVolume(userId, volume);
      this.loggingManager?.info('voice_handler', 'Participant volume changed', { userId, volume });
    } catch (error) {
      this.loggingManager?.error(
        'voice_handler',
        'Failed to set participant volume',
        { userId, volume },
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Get current voice chat status
   */
  private getVoiceStatus(): any {
    if (!this.voiceIntegration) {
      return {
        available: false,
        initialized: false,
        connected: false,
        participants: [],
        error: 'Voice integration not available',
      };
    }

    try {
      const status = this.voiceIntegration.getVoiceChatStatus();
      return {
        available: true,
        ...status,
      };
    } catch (error) {
      return {
        available: false,
        initialized: false,
        connected: false,
        participants: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async handleStartSync(isHost: boolean, tabId?: number): Promise<void> {
    if (!tabId) {
      throw new Error('Tab ID required for sync');
    }

    const config = await this.configManager.loadConfig();

    this.syncEngine = new SyncEngine({
      config,
      userId: this.currentUserId,
      isHost,
      onSyncMessage: (syncMessage: SyncMessage) => {
        // Log sync event
        this.loggingManager?.logSyncEvent({
          type: syncMessage.type as any,
          currentTime: syncMessage.currentTime,
          targetTime: undefined,
          drift_ms: undefined,
          playbackRate: syncMessage.playbackRate,
          isHost: this.isHost,
          participantCount: undefined,
        });

        // Convert sync message to signaling message and send
        if (this.signalingClient) {
          const signalingMessage = createSyncStateMessage(this.currentUserId, {
            currentTime: syncMessage.currentTime,
            paused: syncMessage.paused,
            playbackRate: syncMessage.playbackRate,
            timestamp: syncMessage.timestamp,
            videoUrl: syncMessage.videoUrl,
            duration: syncMessage.duration,
          });
          this.signalingClient.sendMessage(signalingMessage);
        }
      },
      onDriftDetected: (drift: any) => {
        console.log('Drift detected:', drift);

        // Log drift detection
        this.loggingManager?.logSyncEvent({
          type: 'drift_correction',
          currentTime: drift.currentTime || 0,
          targetTime: drift.targetTime || 0,
          drift_ms: drift.driftMs || 0,
          playbackRate: drift.playbackRate || 1,
          isHost: this.isHost,
          participantCount: undefined,
        });

        // Notify content script about drift
        this.browserBridge.tabs
          .sendMessage(tabId, {
            type: 'DRIFT_DETECTED',
            drift,
          })
          .catch((error) => console.error('Failed to send drift notification:', error));
      },
    });

    this.isHost = isHost;

    // Notify content script to start sync
    await this.browserBridge.tabs.sendMessage(tabId, {
      type: 'START_SYNC_ENGINE',
      isHost,
    });
  }

  private handleStopSync(): void {
    if (this.syncEngine) {
      this.syncEngine.stopSync();
      this.syncEngine = null;
    }
  }

  private handleSyncMessage(syncMessage: SyncMessage): void {
    if (this.syncEngine) {
      this.syncEngine.handleSyncMessage(syncMessage);
    }
  }

  private async handleSendChatMessage(messageText: string): Promise<void> {
    if (!this.signalingClient || !this.currentRoomId) {
      throw new Error('Not connected to a room');
    }

    // Validate message
    const validation = this.chatManager.validateMessage(messageText);
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid message');
    }

    // Add to local chat
    const chatMessage = this.chatManager.addMessage(this.currentUserId, messageText);

    // Send to server
    const signalingMessage = createChatMessage(this.currentUserId, messageText);
    this.signalingClient.sendMessage(signalingMessage);
  }

  private async handleSendReaction(reactionType: ReactionType): Promise<void> {
    if (!this.signalingClient || !this.currentRoomId) {
      throw new Error('Not connected to a room');
    }

    // Validate reaction type
    if (!this.chatManager.validateReactionType(reactionType)) {
      throw new Error('Invalid reaction type');
    }

    // Get current video timestamp from content script
    const tabs = await this.browserBridge.tabs.query({ active: true, currentWindow: true });
    if (tabs.length === 0) {
      throw new Error('No active tab found');
    }

    try {
      const response = await this.browserBridge.tabs.sendMessage(tabs[0].id!, {
        type: 'GET_VIDEO_TIMESTAMP',
      });

      const videoTimestamp = response?.timestamp || 0;

      // Add to local reactions
      this.chatManager.addReaction(this.currentUserId, reactionType, videoTimestamp);

      // Send to server
      const signalingMessage = {
        type: 'REACTION' as const,
        userId: this.currentUserId,
        reactionType,
        videoTimestamp,
        timestamp: Date.now(),
      };

      this.signalingClient.sendMessage(signalingMessage);

      // Also send to content script for immediate display
      this.browserBridge.tabs
        .sendMessage(tabs[0].id!, {
          type: 'SHOW_REACTION',
          reactionType,
          videoTimestamp,
          userId: this.currentUserId,
        })
        .catch((error) => {
          console.warn('Failed to show reaction on content script:', error);
        });
    } catch (error) {
      console.warn('Failed to get video timestamp, using 0:', error);

      // Fallback: send reaction with timestamp 0
      const signalingMessage = {
        type: 'REACTION' as const,
        userId: this.currentUserId,
        reactionType,
        videoTimestamp: 0,
        timestamp: Date.now(),
      };

      this.signalingClient.sendMessage(signalingMessage);
    }
  }

  private async handleServerMessage(message: ServerMessage): Promise<void> {
    console.log('Received server message:', message.type);

    switch (message.type) {
      case 'ROOM_CREATED':
        // Use enhanced response parsing
        const parsedResponse = roomCreationResponseHandler.parseRoomCreationResponse(message);

        if (!parsedResponse.success) {
          console.error('Invalid room creation response:', parsedResponse.error);
          this.loggingManager?.logErrorEvent({
            component: 'background_service',
            operation: 'room_created_response',
            errorType: parsedResponse.error?.code || 'InvalidResponse',
            errorMessage: parsedResponse.error?.message || 'Failed to parse room creation response',
            context: { message, parsedResponse },
          });

          // Track runtime bug
          this.runtimeBugTracker?.trackRoomCreationFailure(
            'background_service',
            new Error(parsedResponse.error?.message || 'Failed to parse room creation response'),
            undefined,
            message
          );

          // Notify UI of the error with user-friendly message
          const userResult = roomCreationResponseHandler.generateUserResult(parsedResponse);
          this.broadcastToUI({
            type: 'ROOM_CREATION_FAILED',
            error: userResult.error,
            userFriendlyMessage: userResult.userFriendlyMessage,
            retryable: userResult.retryable,
          });
          return;
        }

        // Successfully parsed response
        this.currentRoomId = parsedResponse.roomId!;
        this.isHost = parsedResponse.hostId === this.currentUserId;

        console.log(
          `✅ Room created successfully: ${parsedResponse.roomId}, isHost: ${this.isHost}`
        );

        // Generate user-friendly result
        const userResult = roomCreationResponseHandler.generateUserResult(parsedResponse);

        // Persist comprehensive room state
        this.roomStateManager
          .persistRoomState(parsedResponse.roomId!, {
            isHost: this.isHost,
            connectionStatus: 'connected',
            participants: parsedResponse.participants || [],
            currentPlaybackState: parsedResponse.currentState || {
              currentTime: 0,
              paused: true,
              playbackRate: 1,
              timestamp: parsedResponse.timestamp || Date.now(),
            },
            roomInfo: {
              roomId: parsedResponse.roomId!,
              inviteLink: userResult.inviteLink,
              createdAt: new Date(parsedResponse.timestamp || Date.now()),
              copyableInfo: roomCreationResponseHandler.generateCopyableRoomInfo(
                parsedResponse.roomId!,
                userResult.inviteLink
              ),
              shareableMessage: roomCreationResponseHandler.generateShareableMessage(
                parsedResponse.roomId!,
                userResult.inviteLink
              ),
            },
          })
          .catch((error) => {
            console.error('Failed to persist room state after creation:', error);
            this.loggingManager?.logErrorEvent({
              component: 'background_service',
              operation: 'persist_room_state',
              errorType: 'StorageError',
              errorMessage: error instanceof Error ? error.message : String(error),
              context: { roomId: parsedResponse.roomId },
            });

            // Track runtime bug
            this.runtimeBugTracker?.trackStatePersistenceError(
              'background_service',
              'persist_room_state',
              error instanceof Error ? error : new Error(String(error)),
              'room_state',
              true
            );
          });

        // Update logging manager with room ID
        this.loggingManager?.setRoomId(parsedResponse.roomId!);

        // Update runtime bug tracker with room ID
        this.runtimeBugTracker?.setRoomId(parsedResponse.roomId!);

        // Notify UI of successful room creation
        this.broadcastToUI({
          type: 'ROOM_CREATED_SUCCESS',
          roomId: parsedResponse.roomId,
          inviteLink: userResult.inviteLink,
          userFriendlyMessage: userResult.userFriendlyMessage,
          copyableInfo: roomCreationResponseHandler.generateCopyableRoomInfo(
            parsedResponse.roomId!,
            userResult.inviteLink
          ),
          shareableMessage: roomCreationResponseHandler.generateShareableMessage(
            parsedResponse.roomId!,
            userResult.inviteLink
          ),
        });
        break;

      case 'ROOM_JOINED':
        // Validate room join response
        if (!message.roomId || typeof message.roomId !== 'string' || message.roomId.trim() === '') {
          console.error('Invalid room join response - missing or empty roomId:', message);
          this.loggingManager?.logErrorEvent({
            component: 'background_service',
            operation: 'room_joined_response',
            errorType: 'InvalidResponse',
            errorMessage: 'Server returned empty or invalid roomId',
            context: { message },
          });
          return;
        }

        this.currentRoomId = message.roomId;
        this.isHost = message.hostId === this.currentUserId;

        console.log(`✅ Room joined successfully: ${message.roomId}, isHost: ${this.isHost}`);

        // Persist comprehensive room state
        this.roomStateManager
          .persistRoomState(message.roomId, {
            isHost: this.isHost,
            connectionStatus: 'connected',
            participants: (message.participants || []).map((p: any) => ({
              id: p.id,
              name: p.name || 'Unknown',
              role: p.role || 'participant',
              isConnected: true,
              joinedAt: new Date(p.joinedAt || Date.now()),
            })),
            currentPlaybackState: message.currentState || {
              currentTime: 0,
              paused: true,
              playbackRate: 1,
              timestamp: Date.now(),
            },
          })
          .catch((error) => {
            console.error('Failed to persist room state after join:', error);
            this.loggingManager?.logErrorEvent({
              component: 'background_service',
              operation: 'persist_room_state',
              errorType: 'StorageError',
              errorMessage: error instanceof Error ? error.message : String(error),
              context: { roomId: message.roomId },
            });
          });

        // Update logging manager with room ID
        this.loggingManager?.setRoomId(message.roomId);

        // Update runtime bug tracker with room ID
        this.runtimeBugTracker?.setRoomId(message.roomId);
        break;

      case 'SYNC_UPDATE':
        if (this.syncEngine) {
          const syncMessage = {
            type: 'heartbeat' as const,
            userId: message.fromUserId,
            timestamp: message.state.timestamp,
            currentTime: message.state.currentTime,
            paused: message.state.paused,
            playbackRate: message.state.playbackRate,
            videoUrl: message.state.videoUrl,
            duration: message.state.duration,
          };
          this.syncEngine.handleSyncMessage(syncMessage);
        }
        break;

      case 'HOST_TRANSFERRED':
        this.isHost = message.newHostId === this.currentUserId;
        if (this.syncEngine) {
          this.syncEngine.setHost(this.isHost);
        }
        break;

      case 'PARTICIPANT_LEFT':
        if (message.newHostId === this.currentUserId) {
          this.isHost = true;
          if (this.syncEngine) {
            this.syncEngine.setHost(true);
          }
        }
        break;

      case 'CHAT_MESSAGE':
        // Add to local chat history
        this.chatManager.addMessage(message.userId, message.message);
        break;

      case 'REACTION':
        // Add to local reactions and forward to content script
        this.chatManager.addReaction(
          message.userId,
          message.reactionType as ReactionType,
          message.videoTimestamp
        );

        // Forward to content script for display
        this.browserBridge.tabs.query({}).then((tabs) => {
          tabs.forEach((tab) => {
            if (tab.id) {
              this.browserBridge.tabs
                .sendMessage(tab.id, {
                  type: 'SHOW_REACTION',
                  reactionType: message.reactionType,
                  videoTimestamp: message.videoTimestamp,
                  userId: message.userId,
                })
                .catch((error) => {
                  // Ignore errors for tabs without content script
                });
            }
          });
        });
        break;

      case 'ANNOTATION_CREATED':
        // Forward annotation creation to content script
        this.browserBridge.tabs.query({}).then((tabs) => {
          tabs.forEach((tab) => {
            if (tab.id) {
              this.browserBridge.tabs
                .sendMessage(tab.id, {
                  type: 'ADD_ANNOTATION',
                  annotation: (message as any).annotation,
                })
                .catch((error) => {
                  // Ignore errors for tabs without content script
                });
            }
          });
        });
        break;

      case 'ANNOTATION_UPDATED':
        // Forward annotation update to content script
        this.browserBridge.tabs.query({}).then((tabs) => {
          tabs.forEach((tab) => {
            if (tab.id) {
              this.browserBridge.tabs
                .sendMessage(tab.id, {
                  type: 'UPDATE_ANNOTATION',
                  annotationId: (message as any).annotationId,
                  updates: (message as any).updates,
                })
                .catch((error) => {
                  // Ignore errors for tabs without content script
                });
            }
          });
        });
        break;

      case 'ANNOTATION_DELETED':
        // Forward annotation deletion to content script
        this.browserBridge.tabs.query({}).then((tabs) => {
          tabs.forEach((tab) => {
            if (tab.id) {
              this.browserBridge.tabs
                .sendMessage(tab.id, {
                  type: 'DELETE_ANNOTATION',
                  annotationId: (message as any).annotationId,
                })
                .catch((error) => {
                  // Ignore errors for tabs without content script
                });
            }
          });
        });
        break;

      case 'LAYER_VISIBILITY_CHANGED':
        // Forward layer visibility change to content script
        this.browserBridge.tabs.query({}).then((tabs) => {
          tabs.forEach((tab) => {
            if (tab.id) {
              this.browserBridge.tabs
                .sendMessage(tab.id, {
                  type: 'SET_ANNOTATION_LAYER_VISIBILITY',
                  layerId: (message as any).layerId,
                  visible: (message as any).visible,
                })
                .catch((error) => {
                  // Ignore errors for tabs without content script
                });
            }
          });
        });
        break;

      case 'PLAYLIST_STATE':
        // Update local playlist from server broadcast
        if (message.playlist) {
          // Reconcile playlist state from server
          this.broadcastToUI({ type: 'PLAYLIST_STATE', playlist: message.playlist });
        }
        break;

      case 'PLAYLIST_SKIP_RESULT':
        if (message.skipped) {
          // Auto-advance to next video
          await this.playlistManager.advanceToNext();
          const nextItem = this.playlistManager.getCurrentItem();
          if (nextItem && this.signalingClient?.isConnected()) {
            // Notify content scripts to change video
            this.browserBridge.tabs.query({}).then((tabs) => {
              tabs.forEach((tab) => {
                if (tab.id) {
                  this.browserBridge.tabs
                    .sendMessage(tab.id, {
                      type: 'PLAYLIST_ADVANCE',
                      url: nextItem.url,
                      item: nextItem,
                    })
                    .catch(() => {});
                }
              });
            });
          }
        }
        this.broadcastToUI({ type: 'PLAYLIST_SKIP_RESULT', ...message });
        break;

      case 'PLAYLIST_ADVANCE':
        // Server-initiated advance
        if (message.item) {
          this.browserBridge.tabs.query({}).then((tabs) => {
            tabs.forEach((tab) => {
              if (tab.id) {
                this.browserBridge.tabs
                  .sendMessage(tab.id, {
                    type: 'PLAYLIST_ADVANCE',
                    url: message.item.url,
                    item: message.item,
                  })
                  .catch(() => {});
              }
            });
          });
        }
        await this.playlistManager.setCurrentIndex(message.nextIndex);
        this.broadcastToUI({ type: 'PLAYLIST_ADVANCE', ...message });
        break;
    }

    // Broadcast to all tabs for UI updates
    this.browserBridge.tabs.query({}).then((tabs) => {
      tabs.forEach((tab) => {
        if (tab.id) {
          this.browserBridge.tabs
            .sendMessage(tab.id, {
              type: 'SERVER_MESSAGE',
              message,
            })
            .catch((error) => {
              // Ignore errors for tabs without content script
            });
        }
      });
    });
  }

  private handleConnectionStateChange(state: ConnectionState): void {
    console.log('Connection state changed:', state);

    // Log connection state change
    if (this.loggingManager) {
      this.loggingManager.logConnectionEvent({
        state: state as any, // Convert enum to string
        previousState: undefined, // Could track previous state if needed
        duration: undefined,
        error: undefined,
        retryAttempt: undefined,
      });
    }

    // Broadcast connection state to all tabs
    this.browserBridge.tabs.query({}).then((tabs) => {
      tabs.forEach((tab) => {
        if (tab.id) {
          this.browserBridge.tabs
            .sendMessage(tab.id, {
              type: 'CONNECTION_STATE_CHANGED',
              state,
            })
            .catch((error) => {
              // Ignore errors for tabs without content script
            });
        }
      });
    });
  }

  // Subtitle functionality handlers
  private async handleLoadSubtitleFile(file: any, userId: string, tabId?: number): Promise<void> {
    if (!tabId) {
      throw new Error('Tab ID required for subtitle operations');
    }

    try {
      await this.browserBridge.tabs.sendMessage(tabId, {
        type: 'LOAD_SUBTITLE_FILE',
        file,
        userId,
      });
    } catch (error) {
      console.error('Failed to load subtitle file:', error);
      throw error;
    }
  }

  private async handleSearchOpenSubtitles(
    query: string,
    language: string | undefined,
    sendResponse: (response: any) => void,
    tabId?: number
  ): Promise<void> {
    if (!tabId) {
      sendResponse({ success: false, error: 'Tab ID required for subtitle operations' });
      return;
    }

    try {
      const response = await this.browserBridge.tabs.sendMessage(tabId, {
        type: 'SEARCH_OPENSUBTITLES',
        query,
        language,
      });

      sendResponse(response);
    } catch (error) {
      console.error('Failed to search OpenSubtitles:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Search failed',
      });
    }
  }

  private async handleDownloadOpenSubtitles(
    result: any,
    userId: string,
    sendResponse: (response: any) => void,
    tabId?: number
  ): Promise<void> {
    if (!tabId) {
      sendResponse({ success: false, error: 'Tab ID required for subtitle operations' });
      return;
    }

    try {
      const response = await this.browserBridge.tabs.sendMessage(tabId, {
        type: 'DOWNLOAD_OPENSUBTITLES',
        result,
        userId,
      });

      sendResponse(response);
    } catch (error) {
      console.error('Failed to download from OpenSubtitles:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Download failed',
      });
    }
  }

  private async handleGetSubtitleTracks(
    userId: string,
    sendResponse: (response: any) => void,
    tabId?: number
  ): Promise<void> {
    if (!tabId) {
      sendResponse({ success: false, error: 'Tab ID required for subtitle operations' });
      return;
    }

    try {
      const response = await this.browserBridge.tabs.sendMessage(tabId, {
        type: 'GET_SUBTITLE_TRACKS',
        userId,
      });

      sendResponse(response);
    } catch (error) {
      console.error('Failed to get subtitle tracks:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get tracks',
      });
    }
  }

  private async handleToggleSubtitleTrack(
    trackId: string,
    enabled: boolean,
    tabId?: number
  ): Promise<void> {
    if (!tabId) {
      throw new Error('Tab ID required for subtitle operations');
    }

    try {
      await this.browserBridge.tabs.sendMessage(tabId, {
        type: 'TOGGLE_SUBTITLE_TRACK',
        trackId,
        enabled,
      });
    } catch (error) {
      console.error('Failed to toggle subtitle track:', error);
      throw error;
    }
  }

  private async handleUpdateSubtitleOffset(
    trackId: string,
    offsetMs: number,
    tabId?: number
  ): Promise<void> {
    if (!tabId) {
      throw new Error('Tab ID required for subtitle operations');
    }

    try {
      await this.browserBridge.tabs.sendMessage(tabId, {
        type: 'UPDATE_SUBTITLE_OFFSET',
        trackId,
        offsetMs,
      });
    } catch (error) {
      console.error('Failed to update subtitle offset:', error);
      throw error;
    }
  }

  private async handleRemoveSubtitleTrack(trackId: string, tabId?: number): Promise<void> {
    if (!tabId) {
      throw new Error('Tab ID required for subtitle operations');
    }

    try {
      await this.browserBridge.tabs.sendMessage(tabId, {
        type: 'REMOVE_SUBTITLE_TRACK',
        trackId,
      });
    } catch (error) {
      console.error('Failed to remove subtitle track:', error);
      throw error;
    }
  }

  // Annotation functionality handlers
  private async handleAnnotationCreated(annotation: any): Promise<void> {
    if (!this.signalingClient || !this.currentRoomId) {
      console.warn('Cannot send annotation - not connected to room');
      return;
    }

    try {
      // Send annotation to signaling server
      await this.signalingClient.sendMessage({
        type: 'ANNOTATION_CREATED',
        userId: this.currentUserId,
        annotation,
        timestamp: Date.now(),
      });

      console.log('Annotation created and sent to server:', annotation.id);
    } catch (error) {
      console.error('Failed to send annotation to server:', error);
    }
  }

  private async handleAnnotationUpdated(annotationId: string, updates: any): Promise<void> {
    if (!this.signalingClient || !this.currentRoomId) {
      console.warn('Cannot update annotation - not connected to room');
      return;
    }

    try {
      // Send annotation update to signaling server
      await this.signalingClient.sendMessage({
        type: 'ANNOTATION_UPDATED',
        userId: this.currentUserId,
        annotationId,
        updates,
        timestamp: Date.now(),
      });

      console.log('Annotation updated and sent to server:', annotationId);
    } catch (error) {
      console.error('Failed to send annotation update to server:', error);
    }
  }

  private async handleAnnotationDeleted(annotationId: string): Promise<void> {
    if (!this.signalingClient || !this.currentRoomId) {
      console.warn('Cannot delete annotation - not connected to room');
      return;
    }

    try {
      // Send annotation deletion to signaling server
      await this.signalingClient.sendMessage({
        type: 'ANNOTATION_DELETED',
        userId: this.currentUserId,
        annotationId,
        timestamp: Date.now(),
      });

      console.log('Annotation deleted and sent to server:', annotationId);
    } catch (error) {
      console.error('Failed to send annotation deletion to server:', error);
    }
  }

  private async handleLayerVisibilityChanged(layerId: string, visible: boolean): Promise<void> {
    if (!this.signalingClient || !this.currentRoomId) {
      console.warn('Cannot change layer visibility - not connected to room');
      return;
    }

    try {
      // Send layer visibility change to signaling server
      await this.signalingClient.sendMessage({
        type: 'LAYER_VISIBILITY_CHANGED',
        userId: this.currentUserId,
        layerId,
        visible,
        timestamp: Date.now(),
      });

      console.log('Layer visibility changed and sent to server:', layerId, visible);
    } catch (error) {
      console.error('Failed to send layer visibility change to server:', error);
    }
  }

  /**
   * Broadcast message to all UI components (popup, options, content scripts)
   */
  private async broadcastToUI(message: any): Promise<void> {
    try {
      // Get all tabs to send message to content scripts
      const tabs = await this.browserBridge.tabs.query({});

      // Send to all content scripts
      const contentScriptPromises = tabs.map(async (tab) => {
        if (tab.id) {
          try {
            await this.browserBridge.tabs.sendMessage(tab.id, {
              ...message,
              source: 'background',
            });
          } catch (error) {
            // Ignore errors for tabs without content scripts
            console.debug(`Failed to send message to tab ${tab.id}:`, error);
          }
        }
      });

      await Promise.allSettled(contentScriptPromises);

      // Store message for popup/options to retrieve
      await this.browserBridge.storage.local.set({
        lastUIMessage: {
          ...message,
          timestamp: Date.now(),
        },
      });

      console.debug('Broadcasted message to UI:', message.type);
    } catch (error) {
      console.error('Failed to broadcast message to UI:', error);
    }
  }
}

// Initialize the background service
const backgroundService = new BackgroundService();
backgroundService.initialize();
