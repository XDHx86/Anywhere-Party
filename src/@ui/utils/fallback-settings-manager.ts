/**
 * Fallback Settings Manager
 * Manages settings for the HTML-based fallback options interface
 * Requirements: 4.3, 2.1, 2.2
 */

import { browserAPI } from './browser-api';
import { getDiagnosticLogger } from './diagnostic-logger';

export interface FallbackSettings {
  // Server Configuration
  signalingServer: string;
  signalingWsPath: string;
  localDevMode: boolean;
  roomDefaultPassword: string;

  // Synchronization Settings
  syncToleranceMs: number;
  syncTimeoutMs: number;
  heartbeatIntervalMs: number;
  reconnectIntervalMs: number;

  // Feature Flags
  voiceChat: boolean;
  annotations: boolean;
  advancedAnnotations: boolean;
  subtitles: boolean;
  playlists: boolean;
  scheduling: boolean;
  e2eEncryption: boolean;
  telemetryEnabled: boolean;

  // WebRTC Configuration
  stunServers: string[];
  turnServers: Array<{
    urls: string;
    username?: string;
    credential?: string;
  }>;

  // Subtitle Configuration
  opensubtitlesKey: string;
  subtitleLanguages: string[];

  // Accessibility Settings
  keyboardNavigationEnabled: boolean;
  screenReaderEnabled: boolean;
  highContrastMode: boolean;
  reducedMotion: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  customBgColor: string;
  customFgColor: string;
  customAccentColor: string;
  customBorderColor: string;
}

export interface SettingsValidationResult {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
  }>;
  warnings: Array<{
    field: string;
    message: string;
  }>;
}

export class FallbackSettingsManager {
  private static instance: FallbackSettingsManager;
  private diagnosticLogger = getDiagnosticLogger();
  private currentSettings: FallbackSettings | null = null;

  private constructor() {}

  public static getInstance(): FallbackSettingsManager {
    if (!FallbackSettingsManager.instance) {
      FallbackSettingsManager.instance = new FallbackSettingsManager();
    }
    return FallbackSettingsManager.instance;
  }

  /**
   * Get default settings
   */
  public getDefaultSettings(): FallbackSettings {
    return {
      // Server Configuration
      signalingServer: '',
      signalingWsPath: '/ws',
      localDevMode: false,
      roomDefaultPassword: '',

      // Synchronization Settings
      syncToleranceMs: 250,
      syncTimeoutMs: 5000,
      heartbeatIntervalMs: 2000,
      reconnectIntervalMs: 3000,

      // Feature Flags
      voiceChat: false,
      annotations: true,
      advancedAnnotations: false,
      subtitles: true,
      playlists: false,
      scheduling: false,
      e2eEncryption: false,
      telemetryEnabled: true,

      // WebRTC Configuration
      stunServers: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'],
      turnServers: [],

      // Subtitle Configuration
      opensubtitlesKey: '',
      subtitleLanguages: ['en', 'es', 'fr'],

      // Accessibility Settings
      keyboardNavigationEnabled: true,
      screenReaderEnabled: false,
      highContrastMode: false,
      reducedMotion: false,
      fontSize: 'medium',
      customBgColor: '#ffffff',
      customFgColor: '#000000',
      customAccentColor: '#6200EE',
      customBorderColor: '#cccccc',
    };
  }

  /**
   * Load settings from browser storage
   */
  public async loadSettings(): Promise<FallbackSettings> {
    try {
      const stored = await browserAPI.storage.local.get(null);
      const defaults = this.getDefaultSettings();

      // Merge stored settings with defaults
      this.currentSettings = {
        ...defaults,
        ...this.extractSettingsFromStorage(stored),
      };

      this.diagnosticLogger.logComponentError(
        'FallbackSettings',
        new Error('Settings loaded successfully')
      );
      return this.currentSettings;
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.diagnosticLogger.logComponentError(
        'FallbackSettings',
        error instanceof Error ? error : new Error(String(error))
      );

      // Return defaults if loading fails
      this.currentSettings = this.getDefaultSettings();
      return this.currentSettings;
    }
  }

  /**
   * Save settings to browser storage
   */
  public async saveSettings(settings: Partial<FallbackSettings>): Promise<{
    success: boolean;
    error?: string;
    validation?: SettingsValidationResult;
  }> {
    try {
      // Validate settings
      const validation = this.validateSettings(settings);
      if (!validation.isValid) {
        return {
          success: false,
          error: 'Settings validation failed',
          validation,
        };
      }

      // Merge with current settings
      const updatedSettings = {
        ...(this.currentSettings || this.getDefaultSettings()),
        ...settings,
      };

      // Convert to storage format
      const storageData = this.convertSettingsToStorage(updatedSettings);

      // Save to storage
      await browserAPI.storage.local.set(storageData);

      this.currentSettings = updatedSettings;
      this.diagnosticLogger.logComponentError(
        'FallbackSettings',
        new Error('Settings saved successfully')
      );

      return {
        success: true,
        validation,
      };
    } catch (error) {
      console.error('Failed to save settings:', error);
      this.diagnosticLogger.logComponentError(
        'FallbackSettings',
        error instanceof Error ? error : new Error(String(error))
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Reset settings to defaults
   */
  public async resetSettings(): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await browserAPI.storage.local.clear();
      this.currentSettings = this.getDefaultSettings();

      this.diagnosticLogger.logComponentError(
        'FallbackSettings',
        new Error('Settings reset to defaults')
      );

      return { success: true };
    } catch (error) {
      console.error('Failed to reset settings:', error);
      this.diagnosticLogger.logComponentError(
        'FallbackSettings',
        error instanceof Error ? error : new Error(String(error))
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Export settings in various formats
   */
  public exportSettings(format: 'json' | 'env' | 'ini'): string {
    const settings = this.currentSettings || this.getDefaultSettings();

    switch (format) {
      case 'json':
        return JSON.stringify(settings, null, 2);

      case 'env':
        return this.convertToEnvFormat(settings);

      case 'ini':
        return this.convertToIniFormat(settings);

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Import settings from various formats
   */
  public async importSettings(
    content: string,
    format: 'json' | 'env' | 'ini'
  ): Promise<{
    success: boolean;
    error?: string;
    settings?: FallbackSettings;
  }> {
    try {
      let importedSettings: Partial<FallbackSettings>;

      switch (format) {
        case 'json':
          importedSettings = JSON.parse(content);
          break;

        case 'env':
          importedSettings = this.parseEnvFormat(content);
          break;

        case 'ini':
          importedSettings = this.parseIniFormat(content);
          break;

        default:
          throw new Error(`Unsupported import format: ${format}`);
      }

      // Validate imported settings
      const validation = this.validateSettings(importedSettings);
      if (!validation.isValid) {
        return {
          success: false,
          error:
            'Imported settings are invalid: ' + validation.errors.map((e) => e.message).join(', '),
        };
      }

      // Save imported settings
      const saveResult = await this.saveSettings(importedSettings);
      if (!saveResult.success) {
        return {
          success: false,
          error: saveResult.error,
        };
      }

      return {
        success: true,
        settings: this.currentSettings!,
      };
    } catch (error) {
      console.error('Failed to import settings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Validate settings
   */
  private validateSettings(settings: Partial<FallbackSettings>): SettingsValidationResult {
    const errors: Array<{ field: string; message: string }> = [];
    const warnings: Array<{ field: string; message: string }> = [];

    // Validate signaling server URL
    if (settings.signalingServer !== undefined) {
      if (settings.signalingServer && !this.isValidUrl(settings.signalingServer)) {
        errors.push({
          field: 'signalingServer',
          message: 'Invalid signaling server URL format',
        });
      }
    }

    // Validate numeric ranges
    if (settings.syncToleranceMs !== undefined) {
      if (settings.syncToleranceMs < 50 || settings.syncToleranceMs > 2000) {
        errors.push({
          field: 'syncToleranceMs',
          message: 'Sync tolerance must be between 50 and 2000 milliseconds',
        });
      }
    }

    if (settings.syncTimeoutMs !== undefined) {
      if (settings.syncTimeoutMs < 1000 || settings.syncTimeoutMs > 30000) {
        errors.push({
          field: 'syncTimeoutMs',
          message: 'Sync timeout must be between 1000 and 30000 milliseconds',
        });
      }
    }

    // Validate STUN servers
    if (settings.stunServers !== undefined) {
      for (const server of settings.stunServers) {
        if (!server.startsWith('stun:')) {
          errors.push({
            field: 'stunServers',
            message: `Invalid STUN server format: ${server}`,
          });
        }
      }
    }

    // Validate TURN servers
    if (settings.turnServers !== undefined) {
      for (const server of settings.turnServers) {
        if (
          !server.urls ||
          (!server.urls.startsWith('turn:') && !server.urls.startsWith('turns:'))
        ) {
          errors.push({
            field: 'turnServers',
            message: `Invalid TURN server format: ${server.urls}`,
          });
        }
      }
    }

    // Validate color formats
    const colorFields = [
      'customBgColor',
      'customFgColor',
      'customAccentColor',
      'customBorderColor',
    ];
    for (const field of colorFields) {
      const value = (settings as any)[field];
      if (value !== undefined && !this.isValidColor(value)) {
        errors.push({
          field,
          message: `Invalid color format: ${value}`,
        });
      }
    }

    // Add warnings for potentially problematic settings
    if (settings.e2eEncryption) {
      warnings.push({
        field: 'e2eEncryption',
        message: 'End-to-end encryption is experimental and may cause compatibility issues',
      });
    }

    if (settings.syncToleranceMs !== undefined && settings.syncToleranceMs < 100) {
      warnings.push({
        field: 'syncToleranceMs',
        message: 'Very low sync tolerance may cause frequent corrections',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Extract settings from browser storage format
   */
  private extractSettingsFromStorage(stored: any): Partial<FallbackSettings> {
    const settings: Partial<FallbackSettings> = {};

    // Map storage keys to settings
    const keyMapping: Record<string, keyof FallbackSettings> = {
      SIGNALING_SERVER: 'signalingServer',
      SIGNALING_WS_PATH: 'signalingWsPath',
      LOCAL_DEV_MODE: 'localDevMode',
      ROOM_DEFAULT_PASSWORD: 'roomDefaultPassword',
      SYNC_TOLERANCE_MS: 'syncToleranceMs',
      SYNC_TIMEOUT_MS: 'syncTimeoutMs',
      HEARTBEAT_INTERVAL_MS: 'heartbeatIntervalMs',
      RECONNECT_INTERVAL_MS: 'reconnectIntervalMs',
      VOICE_CHAT: 'voiceChat',
      ANNOTATIONS: 'annotations',
      ADVANCED_ANNOTATIONS: 'advancedAnnotations',
      SUBTITLES: 'subtitles',
      PLAYLISTS: 'playlists',
      SCHEDULING: 'scheduling',
      E2E_ENCRYPTION: 'e2eEncryption',
      TELEMETRY_ENABLED: 'telemetryEnabled',
      OPENSUBTITLES_KEY: 'opensubtitlesKey',
      KEYBOARD_NAVIGATION_ENABLED: 'keyboardNavigationEnabled',
      SCREEN_READER_ENABLED: 'screenReaderEnabled',
      HIGH_CONTRAST_MODE: 'highContrastMode',
      REDUCED_MOTION: 'reducedMotion',
      FONT_SIZE: 'fontSize',
      CUSTOM_BG_COLOR: 'customBgColor',
      CUSTOM_FG_COLOR: 'customFgColor',
      CUSTOM_ACCENT_COLOR: 'customAccentColor',
      CUSTOM_BORDER_COLOR: 'customBorderColor',
    };

    for (const [storageKey, settingKey] of Object.entries(keyMapping)) {
      if (stored[storageKey] !== undefined) {
        (settings as any)[settingKey] = stored[storageKey];
      }
    }

    // Handle arrays
    if (stored.STUN_SERVERS) {
      settings.stunServers = stored.STUN_SERVERS;
    }
    if (stored.TURN_SERVERS) {
      settings.turnServers = stored.TURN_SERVERS;
    }
    if (stored.SUBTITLE_LANGUAGES) {
      settings.subtitleLanguages = stored.SUBTITLE_LANGUAGES;
    }

    return settings;
  }

  /**
   * Convert settings to browser storage format
   */
  private convertSettingsToStorage(settings: FallbackSettings): Record<string, any> {
    return {
      SIGNALING_SERVER: settings.signalingServer,
      SIGNALING_WS_PATH: settings.signalingWsPath,
      LOCAL_DEV_MODE: settings.localDevMode,
      ROOM_DEFAULT_PASSWORD: settings.roomDefaultPassword,
      SYNC_TOLERANCE_MS: settings.syncToleranceMs,
      SYNC_TIMEOUT_MS: settings.syncTimeoutMs,
      HEARTBEAT_INTERVAL_MS: settings.heartbeatIntervalMs,
      RECONNECT_INTERVAL_MS: settings.reconnectIntervalMs,
      VOICE_CHAT: settings.voiceChat,
      ANNOTATIONS: settings.annotations,
      ADVANCED_ANNOTATIONS: settings.advancedAnnotations,
      SUBTITLES: settings.subtitles,
      PLAYLISTS: settings.playlists,
      SCHEDULING: settings.scheduling,
      E2E_ENCRYPTION: settings.e2eEncryption,
      TELEMETRY_ENABLED: settings.telemetryEnabled,
      STUN_SERVERS: settings.stunServers,
      TURN_SERVERS: settings.turnServers,
      OPENSUBTITLES_KEY: settings.opensubtitlesKey,
      SUBTITLE_LANGUAGES: settings.subtitleLanguages,
      KEYBOARD_NAVIGATION_ENABLED: settings.keyboardNavigationEnabled,
      SCREEN_READER_ENABLED: settings.screenReaderEnabled,
      HIGH_CONTRAST_MODE: settings.highContrastMode,
      REDUCED_MOTION: settings.reducedMotion,
      FONT_SIZE: settings.fontSize,
      CUSTOM_BG_COLOR: settings.customBgColor,
      CUSTOM_FG_COLOR: settings.customFgColor,
      CUSTOM_ACCENT_COLOR: settings.customAccentColor,
      CUSTOM_BORDER_COLOR: settings.customBorderColor,
    };
  }

  /**
   * Convert settings to environment variable format
   */
  private convertToEnvFormat(settings: FallbackSettings): string {
    const lines: string[] = [];
    const storageFormat = this.convertSettingsToStorage(settings);

    for (const [key, value] of Object.entries(storageFormat)) {
      if (Array.isArray(value)) {
        lines.push(`${key}=${JSON.stringify(value)}`);
      } else if (typeof value === 'string') {
        lines.push(`${key}="${value}"`);
      } else {
        lines.push(`${key}=${value}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Convert settings to INI format
   */
  private convertToIniFormat(settings: FallbackSettings): string {
    const lines: string[] = [];
    lines.push('[WatchPartySettings]');

    const storageFormat = this.convertSettingsToStorage(settings);

    for (const [key, value] of Object.entries(storageFormat)) {
      if (Array.isArray(value)) {
        lines.push(`${key}=${JSON.stringify(value)}`);
      } else {
        lines.push(`${key}=${value}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Parse environment variable format
   */
  private parseEnvFormat(content: string): Partial<FallbackSettings> {
    const settings: any = {};
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const [key, ...valueParts] = trimmed.split('=');
      if (!key || valueParts.length === 0) continue;

      let rawValue = valueParts.join('=');

      // Remove quotes
      if (
        (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
        (rawValue.startsWith("'") && rawValue.endsWith("'"))
      ) {
        rawValue = rawValue.slice(1, -1);
      }

      let parsedValue: any = rawValue;

      // Try to parse as JSON for arrays
      try {
        if (rawValue.startsWith('[') || rawValue.startsWith('{')) {
          parsedValue = JSON.parse(rawValue);
        }
      } catch {
        // Keep as string
      }

      // Convert boolean strings
      if (rawValue === 'true') {
        parsedValue = true;
      } else if (rawValue === 'false') {
        parsedValue = false;
      } else if (typeof parsedValue === 'string' && /^\d+$/.test(parsedValue)) {
        // Convert number strings
        parsedValue = parseInt(parsedValue, 10);
      }

      settings[key] = parsedValue;
    }

    return this.extractSettingsFromStorage(settings);
  }

  /**
   * Parse INI format
   */
  private parseIniFormat(content: string): Partial<FallbackSettings> {
    const settings: any = {};
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('[')) continue;

      const [key, ...valueParts] = trimmed.split('=');
      if (!key || valueParts.length === 0) continue;

      const rawValue = valueParts.join('=');
      let parsedValue: any = rawValue;

      // Try to parse as JSON for arrays
      try {
        if (rawValue.startsWith('[') || rawValue.startsWith('{')) {
          parsedValue = JSON.parse(rawValue);
        }
      } catch {
        // Keep as string
      }

      // Convert boolean strings
      if (rawValue === 'true') {
        parsedValue = true;
      } else if (rawValue === 'false') {
        parsedValue = false;
      } else if (typeof parsedValue === 'string' && /^\d+$/.test(parsedValue)) {
        // Convert number strings
        parsedValue = parseInt(parsedValue, 10);
      }

      settings[key] = parsedValue;
    }

    return this.extractSettingsFromStorage(settings);
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate color format
   */
  private isValidColor(color: string): boolean {
    return /^#[0-9A-Fa-f]{6}$/.test(color);
  }
}

// Export singleton instance
export const fallbackSettingsManager = FallbackSettingsManager.getInstance();
