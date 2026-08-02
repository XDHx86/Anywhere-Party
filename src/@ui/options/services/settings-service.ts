/**
 * Settings Persistence Service
 * Handles loading, saving, import/export of settings with proper feedback
 */

import { ValidationResult, validateAllSettings } from '../utils/validation';

export interface SettingsData {
  general: any;
  apiKeys: any;
  accessibility: any;
  appearance: any;
  about: any;
}

export interface SaveResult {
  success: boolean;
  error?: string;
  validation?: ValidationResult;
}

export interface ImportResult extends SaveResult {
  data?: SettingsData;
}

export interface ExportResult {
  success: boolean;
  data?: string;
  error?: string;
}

export type ConfigFormat = 'json' | 'env' | 'ini';

export class SettingsService {
  private static instance: SettingsService;

  public static getInstance(): SettingsService {
    if (!SettingsService.instance) {
      SettingsService.instance = new SettingsService();
    }
    return SettingsService.instance;
  }

  // Load current settings from extension storage
  async loadSettings(): Promise<SettingsData> {
    try {
      const response = await this.sendMessage({ type: 'GET_CONFIG' });

      if (response && response.success) {
        return this.transformConfigToSettings(response.config);
      } else {
        throw new Error(response?.error || 'Failed to load settings');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      return this.getDefaultSettings();
    }
  }

  // Wrapper for chrome.runtime.sendMessage with proper error handling
  private async sendMessage(message: any): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            console.error('Chrome runtime error:', chrome.runtime.lastError);
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          if (response === undefined) {
            console.error('Received undefined response from background script');
            reject(new Error('No response from background script'));
            return;
          }

          resolve(response);
        });
      } catch (error) {
        console.error('Error sending message:', error);
        reject(error);
      }
    });
  }

  // Save settings to extension storage
  async saveSettings(settings: SettingsData): Promise<SaveResult> {
    try {
      // Validate settings before saving
      const validation = validateAllSettings(settings);

      if (!validation.isValid) {
        return {
          success: false,
          error: 'Validation failed',
          validation,
        };
      }

      // Transform settings to config format
      const config = this.transformSettingsToConfig(settings);

      const response = await this.sendMessage({
        type: 'UPDATE_CONFIG',
        updates: config,
      });

      if (response.success) {
        return {
          success: true,
          validation,
        };
      } else {
        return {
          success: false,
          error: response.error || 'Failed to save settings',
        };
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Export settings in specified format
  async exportSettings(format: ConfigFormat): Promise<ExportResult> {
    try {
      const response = await this.sendMessage({
        type: 'EXPORT_CONFIG',
        format,
      });

      if (response.success) {
        return {
          success: true,
          data: response.data,
        };
      } else {
        return {
          success: false,
          error: response.error || 'Failed to export settings',
        };
      }
    } catch (error) {
      console.error('Error exporting settings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Import settings from content
  async importSettings(content: string, format: ConfigFormat): Promise<ImportResult> {
    try {
      const response = await this.sendMessage({
        type: 'IMPORT_CONFIG',
        content,
        format,
      });

      if (response.success) {
        // Load the updated settings
        const settings = await this.loadSettings();

        return {
          success: true,
          data: settings,
          validation: response.validation,
        };
      } else {
        return {
          success: false,
          error: response.error || 'Failed to import settings',
          validation: response.validation,
        };
      }
    } catch (error) {
      console.error('Error importing settings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Reset settings to defaults
  async resetSettings(): Promise<SaveResult> {
    try {
      const response = await this.sendMessage({ type: 'RESET_CONFIG' });

      if (response.success) {
        return { success: true };
      } else {
        return {
          success: false,
          error: response.error || 'Failed to reset settings',
        };
      }
    } catch (error) {
      console.error('Error resetting settings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Transform extension config to settings format
  private transformConfigToSettings(config: any): SettingsData {
    return {
      general: {
        signalingServer: config.SIGNALING_SERVER || '',
        signalingWsPath: config.SIGNALING_WS_PATH || '/ws',
        localDevMode: config.LOCAL_DEV_MODE || false,
        roomDefaultPassword: config.ROOM_DEFAULT_PASSWORD || '',
        syncTolerance: config.SYNC_TOLERANCE_MS || 300,
        syncTimeout: config.SYNC_TIMEOUT_MS || 5000,
        heartbeatInterval: config.HEARTBEAT_INTERVAL_MS || 2000,
        reconnectInterval: config.RECONNECT_INTERVAL_MS || 5000,
        roomStateTtl: config.ROOM_STATE_TTL_MS || 300000,
        videoDetectPoll: config.VIDEO_DETECT_POLL_MS,
      },
      accessibility: {
        keyboardNavigationEnabled: config.ACCESSIBILITY_SETTINGS?.keyboardNavigationEnabled || true,
        screenReaderEnabled: config.ACCESSIBILITY_SETTINGS?.screenReaderEnabled || false,
        highContrastMode: config.ACCESSIBILITY_SETTINGS?.highContrastMode || false,
        fontSize: config.ACCESSIBILITY_SETTINGS?.fontSize || 'medium',
        reducedMotion: config.ACCESSIBILITY_SETTINGS?.reducedMotion || false,
        focusIndicatorStyle: config.ACCESSIBILITY_SETTINGS?.focusIndicatorStyle || 'default',
        customColors: config.ACCESSIBILITY_SETTINGS?.customColors || {
          background: '#ffffff',
          foreground: '#000000',
          accent: '#6200EE',
          border: '#cccccc',
        },
        captionStyling: config.ACCESSIBILITY_SETTINGS?.captionStyling || {
          fontSize: 'medium',
          backgroundColor: '#000000',
          textColor: '#ffffff',
          outline: false,
        },
        audioDescriptions: config.ACCESSIBILITY_SETTINGS?.audioDescriptions || false,
      },
      appearance: {
        themeMode: 'auto', // This would come from theme context
        accentColor: '#6200EE',
        customPrimaryColor: '#6200EE',
        customSecondaryColor: '#03DAC6',
        enableCustomColors: false,
        compactMode: false,
        animationsEnabled: true,
      },
      about: {
        version: '1.0.0',
        buildDate: new Date().toLocaleDateString(),
        changelogUrl: '#',
        repositoryUrl: '#',
        supportUrl: '#',
      },
      apiKeys: {
        opensubtitles: config.OPENSUBTITLES_KEY || '',
      },
    };
  }

  // Transform settings to extension config format
  private transformSettingsToConfig(settings: SettingsData): any {
    return {
      SIGNALING_SERVER: settings.general.signalingServer,
      SIGNALING_WS_PATH: settings.general.signalingWsPath,
      LOCAL_DEV_MODE: settings.general.localDevMode,
      ROOM_DEFAULT_PASSWORD: settings.general.roomDefaultPassword,
      SYNC_TOLERANCE_MS: settings.general.syncTolerance,
      SYNC_TIMEOUT_MS: settings.general.syncTimeout,
      HEARTBEAT_INTERVAL_MS: settings.general.heartbeatInterval,
      RECONNECT_INTERVAL_MS: settings.general.reconnectInterval,
      ROOM_STATE_TTL_MS: settings.general.roomStateTtl,
      VIDEO_DETECT_POLL_MS: settings.general.videoDetectPoll,
      ACCESSIBILITY_SETTINGS: settings.accessibility,
      // Note: Appearance settings would be handled by theme context
    };
  }

  // Get default settings
  private getDefaultSettings(): SettingsData {
    return {
      general: {
        signalingServer: 'wss://api.watchparty.example.com',
        signalingWsPath: '/ws',
        localDevMode: false,
        roomDefaultPassword: '',
        syncTolerance: 300,
        syncTimeout: 5000,
        heartbeatInterval: 2000,
        reconnectInterval: 5000,
        roomStateTtl: 300000,
        videoDetectPoll: undefined,
      },
      accessibility: {
        keyboardNavigationEnabled: true,
        screenReaderEnabled: false,
        highContrastMode: false,
        fontSize: 'medium',
        reducedMotion: false,
        focusIndicatorStyle: 'default',
        customColors: {
          background: '#ffffff',
          foreground: '#000000',
          accent: '#6200EE',
          border: '#cccccc',
        },
        captionStyling: {
          fontSize: 'medium',
          backgroundColor: '#000000',
          textColor: '#ffffff',
          outline: false,
        },
        audioDescriptions: false,
      },
      appearance: {
        themeMode: 'auto',
        accentColor: '#6200EE',
        customPrimaryColor: '#6200EE',
        customSecondaryColor: '#03DAC6',
        enableCustomColors: false,
        compactMode: false,
        animationsEnabled: true,
      },
      about: {
        version: '1.0.0',
        buildDate: new Date().toLocaleDateString(),
        changelogUrl: '#',
        repositoryUrl: '#',
        supportUrl: '#',
      },
      apiKeys: {
        opensubtitles: '',
      },
    };
  }

  // Download exported settings as file
  downloadSettings(content: string, format: ConfigFormat): void {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `watch-party-settings.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Read file content
  readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }
}
