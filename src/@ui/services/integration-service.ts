/**
 * Integration Service
 * Connects all Material Design 3 components with existing functionality
 * Requirements: 25.5, 26.5, 27.5, 28.4
 */

import { browserAPI } from '../utils/browser-api';
import { themePersistence } from '../theme/theme-persistence';

export interface IntegrationConfig {
  backgroundScriptConnected: boolean;
  videoDetectionActive: boolean;
  chatSystemConnected: boolean;
  overlaySystemActive: boolean;
  realTimeMessagingConnected: boolean;
}

export interface ComponentIntegration {
  popup: {
    connected: boolean;
    lastSync: Date | null;
  };
  options: {
    connected: boolean;
    lastSync: Date | null;
  };
  chat: {
    connected: boolean;
    messageCount: number;
    lastActivity: Date | null;
  };
  overlays: {
    connected: boolean;
    activeOverlays: string[];
    videoElementDetected: boolean;
  };
}

export class IntegrationService {
  private static instance: IntegrationService;
  private config: IntegrationConfig;
  private components: ComponentIntegration;
  private messageHandlers: Map<string, (message: unknown) => void>;

  private constructor() {
    this.config = {
      backgroundScriptConnected: false,
      videoDetectionActive: false,
      chatSystemConnected: false,
      overlaySystemActive: false,
      realTimeMessagingConnected: false,
    };

    this.components = {
      popup: {
        connected: false,
        lastSync: null,
      },
      options: {
        connected: false,
        lastSync: null,
      },
      chat: {
        connected: false,
        messageCount: 0,
        lastActivity: null,
      },
      overlays: {
        connected: false,
        activeOverlays: [],
        videoElementDetected: false,
      },
    };

    this.messageHandlers = new Map();
    this.initializeIntegration();
  }

  public static getInstance(): IntegrationService {
    if (!IntegrationService.instance) {
      IntegrationService.instance = new IntegrationService();
    }
    return IntegrationService.instance;
  }

  // Initialize integration with background script
  private async initializeIntegration(): Promise<void> {
    try {
      // Test connection to background script
      const response = (await browserAPI.runtime.sendMessage({
        type: 'INTEGRATION_HANDSHAKE',
        timestamp: Date.now(),
      })) as { success?: boolean } | undefined;

      if (response?.success) {
        this.config.backgroundScriptConnected = true;
        this.setupMessageListeners();
        await this.syncWithBackgroundScript();
      }
    } catch (error) {
      console.error('Failed to initialize integration:', error);
    }
  }

  // Setup message listeners for cross-component communication
  private setupMessageListeners(): void {
    const handleMessage = (message: unknown) => {
      const msg = message as {
        type?: string;
        active?: boolean;
        videoFound?: boolean;
        overlays?: string[];
        connected?: boolean;
      };
      const handler = msg.type ? this.messageHandlers.get(msg.type) : undefined;
      if (handler) {
        handler(message);
      }

      // Handle system-wide messages
      switch (msg.type) {
        case 'VIDEO_DETECTION_STATUS':
          this.config.videoDetectionActive = msg.active ?? false;
          this.components.overlays.videoElementDetected = msg.videoFound ?? false;
          break;

        case 'CHAT_MESSAGE':
          this.components.chat.messageCount++;
          this.components.chat.lastActivity = new Date();
          break;

        case 'OVERLAY_STATUS':
          this.components.overlays.activeOverlays = msg.overlays ?? [];
          this.config.overlaySystemActive = (msg.overlays?.length ?? 0) > 0;
          break;

        case 'REAL_TIME_CONNECTION':
          this.config.realTimeMessagingConnected = msg.connected ?? false;
          this.config.chatSystemConnected = msg.connected ?? false;
          break;
      }
    };

    browserAPI.runtime.onMessage.addListener(handleMessage);
  }

  // Connect popup with background script functionality
  public async connectPopup(): Promise<boolean> {
    try {
      const response = (await browserAPI.runtime.sendMessage({
        type: 'POPUP_CONNECT',
        timestamp: Date.now(),
      })) as { success?: boolean } | undefined;

      if (response?.success) {
        this.components.popup.connected = true;
        this.components.popup.lastSync = new Date();
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to connect popup:', error);
      return false;
    }
  }

  // Connect options page with configuration management
  public async connectOptionsPage(): Promise<boolean> {
    try {
      // Sync theme settings
      await this.syncThemeSettings();

      const response = (await browserAPI.runtime.sendMessage({
        type: 'OPTIONS_CONNECT',
        timestamp: Date.now(),
      })) as { success?: boolean } | undefined;

      if (response?.success) {
        this.components.options.connected = true;
        this.components.options.lastSync = new Date();
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to connect options page:', error);
      return false;
    }
  }

  // Connect chat interface with real-time messaging
  public async connectChatInterface(): Promise<boolean> {
    try {
      const response = (await browserAPI.runtime.sendMessage({
        type: 'CHAT_CONNECT',
        timestamp: Date.now(),
      })) as { success?: boolean } | undefined;

      if (response?.success) {
        this.components.chat.connected = true;
        this.config.chatSystemConnected = true;
        this.config.realTimeMessagingConnected = true;
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to connect chat interface:', error);
      return false;
    }
  }

  // Connect overlay components with video detection and annotation systems
  public async connectOverlayComponents(): Promise<boolean> {
    try {
      const response = (await browserAPI.runtime.sendMessage({
        type: 'OVERLAY_CONNECT',
        timestamp: Date.now(),
      })) as { success?: boolean } | undefined;

      if (response?.success) {
        this.components.overlays.connected = true;
        this.config.overlaySystemActive = true;

        // Check if video detection is active
        const videoStatus = (await browserAPI.runtime.sendMessage({
          type: 'GET_VIDEO_DETECTION_STATUS',
        })) as { active?: boolean; videoFound?: boolean } | undefined;

        if (videoStatus?.active) {
          this.config.videoDetectionActive = true;
          this.components.overlays.videoElementDetected = videoStatus.videoFound ?? false;
        }

        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to connect overlay components:', error);
      return false;
    }
  }

  // Sync theme settings across all components
  private async syncThemeSettings(): Promise<void> {
    try {
      const themeSettings = await themePersistence.loadThemeSettings();

      // Notify background script of current theme
      await browserAPI.runtime.sendMessage({
        type: 'THEME_SYNC',
        settings: themeSettings,
      });

      // Apply theme to any active overlays
      await browserAPI.runtime.sendMessage({
        type: 'OVERLAY_THEME_UPDATE',
        settings: themeSettings,
      });
    } catch (error) {
      console.error('Failed to sync theme settings:', error);
    }
  }

  // Sync with background script state
  private async syncWithBackgroundScript(): Promise<void> {
    try {
      const response = (await browserAPI.runtime.sendMessage({
        type: 'GET_SYSTEM_STATUS',
      })) as
        | { success?: boolean; config?: IntegrationConfig; components?: ComponentIntegration }
        | undefined;

      if (response?.success) {
        this.config = { ...this.config, ...(response.config ?? {}) };
        this.components = { ...this.components, ...(response.components ?? {}) };
      }
    } catch (error) {
      console.error('Failed to sync with background script:', error);
    }
  }

  // Register message handler for specific message type
  public registerMessageHandler(type: string, handler: (message: unknown) => void): void {
    this.messageHandlers.set(type, handler);
  }

  // Unregister message handler
  public unregisterMessageHandler(type: string): void {
    this.messageHandlers.delete(type);
  }

  // Send message to background script
  public async sendMessage(type: string, data?: unknown): Promise<unknown> {
    try {
      return await browserAPI.runtime.sendMessage({
        type,
        ...((data ?? {}) as Record<string, unknown>),
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error(`Failed to send message ${type}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  // Get current integration status
  public getIntegrationStatus(): {
    config: IntegrationConfig;
    components: ComponentIntegration;
  } {
    return {
      config: { ...this.config },
      components: { ...this.components },
    };
  }

  // Check if all systems are connected
  public isFullyIntegrated(): boolean {
    return (
      this.config.backgroundScriptConnected &&
      this.components.popup.connected &&
      this.components.options.connected &&
      this.components.chat.connected &&
      this.components.overlays.connected
    );
  }

  // Disconnect all components
  public async disconnect(): Promise<void> {
    try {
      await browserAPI.runtime.sendMessage({
        type: 'INTEGRATION_DISCONNECT',
        timestamp: Date.now(),
      });

      // Reset state
      this.config = {
        backgroundScriptConnected: false,
        videoDetectionActive: false,
        chatSystemConnected: false,
        overlaySystemActive: false,
        realTimeMessagingConnected: false,
      };

      this.components = {
        popup: { connected: false, lastSync: null },
        options: { connected: false, lastSync: null },
        chat: { connected: false, messageCount: 0, lastActivity: null },
        overlays: { connected: false, activeOverlays: [], videoElementDetected: false },
      };

      this.messageHandlers.clear();
    } catch (error) {
      console.error('Failed to disconnect integration:', error);
    }
  }
}

export const integrationService = IntegrationService.getInstance();
