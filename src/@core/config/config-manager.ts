import { BrowserBridge, ExtensionConfig } from '../browser-bridge/types';
import { ConfigValidator, ValidationResult } from './config-validator';

/**
 * Configuration manager with precedence: runtime > local.json > defaults
 * Supports import/export in JSON, ENV, and INI formats
 * Implements requirements 11.2, 11.3, 11.4, 11.5
 */

export interface ConfigManager {
  loadConfig(): Promise<ExtensionConfig>;
  updateConfig(updates: Partial<ExtensionConfig>): Promise<void>;
  exportConfig(format: 'json' | 'env' | 'ini'): string;
  importConfig(content: string, format: 'json' | 'env' | 'ini'): Promise<ValidationResult>;
  validateConfig(config: Partial<ExtensionConfig>): ValidationResult;
  loadLocalDevConfig(): Promise<Partial<ExtensionConfig>>;
  resetToDefaults(): Promise<void>;
}

export class ConfigManagerImpl implements ConfigManager {
  private static readonly STORAGE_KEY = 'watch_party_config';
  private static readonly LOCAL_DEV_CONFIG_PATH = 'extension-config.local.json';

  private cachedConfig: ExtensionConfig | null = null;

  constructor(private browserBridge: BrowserBridge) {}

  async loadConfig(): Promise<ExtensionConfig> {
    if (this.cachedConfig) {
      return this.cachedConfig;
    }

    // Load in precedence order: runtime > local.json > defaults
    const defaultConfig = await this.loadDefaultConfig();
    const localDevConfig = await this.loadLocalDevConfig();
    const runtimeConfig = await this.loadRuntimeConfig();

    // Merge configurations with proper precedence
    this.cachedConfig = {
      ...defaultConfig,
      ...localDevConfig,
      ...runtimeConfig,
      // Merge nested objects properly
      FEATURE_FLAGS: {
        ...defaultConfig.FEATURE_FLAGS,
        ...localDevConfig.FEATURE_FLAGS,
        ...runtimeConfig.FEATURE_FLAGS,
      },
      STUN_SERVERS:
        runtimeConfig.STUN_SERVERS || localDevConfig.STUN_SERVERS || defaultConfig.STUN_SERVERS,
      TURN_SERVERS:
        runtimeConfig.TURN_SERVERS || localDevConfig.TURN_SERVERS || defaultConfig.TURN_SERVERS,
      DEFAULT_SUBTITLE_LANGS:
        runtimeConfig.DEFAULT_SUBTITLE_LANGS ||
        localDevConfig.DEFAULT_SUBTITLE_LANGS ||
        defaultConfig.DEFAULT_SUBTITLE_LANGS,
    };

    return this.cachedConfig;
  }

  async updateConfig(updates: Partial<ExtensionConfig>): Promise<void> {
    // Validate the updates before applying them
    const validation = this.validateConfig(updates);
    if (!validation.isValid) {
      throw new Error(
        `Configuration validation failed: ${validation.errors.map((e) => e.message).join(', ')}`
      );
    }

    const currentConfig = await this.loadConfig();
    const newConfig = {
      ...currentConfig,
      ...updates,
      // Handle nested object updates
      FEATURE_FLAGS: {
        ...currentConfig.FEATURE_FLAGS,
        ...(updates.FEATURE_FLAGS || {}),
      },
    };

    // Store only the runtime overrides, not the full merged config
    const runtimeConfig = await this.loadRuntimeConfig();
    const updatedRuntimeConfig = {
      ...runtimeConfig,
      ...updates,
      FEATURE_FLAGS: {
        ...runtimeConfig.FEATURE_FLAGS,
        ...(updates.FEATURE_FLAGS || {}),
      },
    };

    await this.browserBridge.storage.local.set({
      [ConfigManagerImpl.STORAGE_KEY]: updatedRuntimeConfig,
    });

    this.cachedConfig = newConfig;
  }

  exportConfig(format: 'json' | 'env' | 'ini'): string {
    if (!this.cachedConfig) {
      throw new Error('Config not loaded. Call loadConfig() first.');
    }

    switch (format) {
      case 'json':
        return JSON.stringify(this.cachedConfig, null, 2);
      case 'env':
        return this.configToEnv(this.cachedConfig);
      case 'ini':
        return this.configToIni(this.cachedConfig);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  async importConfig(content: string, format: 'json' | 'env' | 'ini'): Promise<ValidationResult> {
    // Validate the imported content and format
    const validation = ConfigValidator.validateImportedConfig(content, format);

    if (!validation.isValid) {
      return validation;
    }

    let importedConfig: Partial<ExtensionConfig>;

    try {
      switch (format) {
        case 'json':
          importedConfig = JSON.parse(content);
          break;
        case 'env':
          importedConfig = this.envToConfig(content);
          break;
        case 'ini':
          importedConfig = this.iniToConfig(content);
          break;
        default:
          throw new Error(`Unsupported import format: ${format}`);
      }

      // Apply fallback values for any invalid configuration
      const safeConfig = ConfigValidator.getDefaultsForInvalidConfig(importedConfig);

      // Only update with the valid parts
      const validConfig: Partial<ExtensionConfig> = {};
      const errorFields = new Set(validation.errors.map((e) => e.field));

      Object.keys(importedConfig).forEach((key) => {
        if (!errorFields.has(key)) {
          (validConfig as any)[key] = importedConfig[key as keyof ExtensionConfig];
        }
      });

      await this.updateConfig(validConfig);
      return validation;
    } catch (error) {
      return {
        isValid: false,
        errors: [
          {
            field: 'content',
            message: `Failed to import ${format} config: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        warnings: [],
      };
    }
  }

  async loadLocalDevConfig(): Promise<Partial<ExtensionConfig>> {
    try {
      // In development, try to load local config file
      if (process.env.NODE_ENV === 'development') {
        const response = await fetch(
          chrome.runtime.getURL(ConfigManagerImpl.LOCAL_DEV_CONFIG_PATH)
        );
        if (response.ok) {
          return await response.json();
        }
      }
    } catch (error) {
      // Local dev config is optional, ignore errors
      console.debug('Local dev config not found or invalid:', error);
    }
    return {};
  }

  validateConfig(config: Partial<ExtensionConfig>): ValidationResult {
    return ConfigValidator.validate(config);
  }

  async resetToDefaults(): Promise<void> {
    await this.browserBridge.storage.local.remove(ConfigManagerImpl.STORAGE_KEY);
    this.cachedConfig = null;
  }

  private async loadDefaultConfig(): Promise<ExtensionConfig> {
    try {
      const response = await fetch(chrome.runtime.getURL('extension-config.json'));
      if (!response.ok) {
        throw new Error(`Failed to load default config: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to load default config, using hardcoded fallback:', error);
      return this.getHardcodedDefaults();
    }
  }

  private async loadRuntimeConfig(): Promise<Partial<ExtensionConfig>> {
    try {
      const result = await this.browserBridge.storage.local.get(ConfigManagerImpl.STORAGE_KEY);
      return result[ConfigManagerImpl.STORAGE_KEY] || {};
    } catch (error) {
      console.error('Failed to load runtime config:', error);
      return {};
    }
  }

  private getHardcodedDefaults(): ExtensionConfig {
    return {
      SIGNALING_SERVER: 'wss://api.watchparty.example.com',
      SIGNALING_WS_PATH: '/ws',
      STUN_SERVERS: ['stun:stun.l.google.com:19302'],
      TURN_SERVERS: [],
      OPENSUBTITLES_KEY: '',
      DEFAULT_SUBTITLE_LANGS: ['en'],
      ROOM_DEFAULT_PASSWORD: '',
      FEATURE_FLAGS: {
        VOICE_CHAT: true,
        ANNOTATIONS: true,
        SUBTITLES: true,
        PLAYLISTS: false,
        SCHEDULING: false,
        ADVANCED_ANNOTATIONS: false,
        E2E_ENCRYPTION: false,
      },
      TELEMETRY_ENABLED: false,
      SYNC_TOLERANCE_MS: 300,
      SYNC_TIMEOUT_MS: 5000,
      HEARTBEAT_INTERVAL_MS: 2000,
      ANNOTATION_RENDER_INTERVAL_MS: 16,
      RECONNECT_INTERVAL_MS: 5000,
      ROOM_STATE_TTL_MS: 300000,
      LOCAL_DEV_MODE: false,
      // Privacy and Security defaults
      OAUTH_ENABLED: false,
      OAUTH_PROVIDERS: {},
      ALLOW_ANONYMOUS_USERS: true,
      E2E_ENCRYPTION_ENABLED: false,
      ENCRYPTION_KEY_SIZE: 2048,
      DATA_RETENTION_ENABLED: true,
      CHAT_RETENTION_DAYS: 30,
      ROOM_HISTORY_RETENTION_DAYS: 90,
      AUTO_DELETE_EXPIRED_DATA: true,
      RECORDING_CONSENT_REQUIRED: true,
      RECORDING_RETENTION_DAYS: 30,
      ANONYMIZE_USER_DATA: true,
      // Performance Optimization defaults
      PERFORMANCE_MONITORING_ENABLED: true,
      DRIFT_ANALYSIS_ENABLED: true,
      BANDWIDTH_MONITORING_ENABLED: true,
      ADAPTIVE_QUALITY_ENABLED: true,
      RESOURCE_CLEANUP_ENABLED: true,
      PERFORMANCE_DIAGNOSTICS_INTERVAL_MS: 30000,
      MAX_DRIFT_SAMPLES: 100,
      PERFORMANCE_LOG_LEVEL: 'basic',
      AUTO_QUALITY_ADJUSTMENT: true,
      MEMORY_CLEANUP_INTERVAL_MS: 60000,
    };
  }

  private configToEnv(config: ExtensionConfig): string {
    const lines: string[] = [];

    // Simple string/number/boolean values
    Object.entries(config).forEach(([key, value]) => {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        lines.push(`${key}=${value}`);
      } else if (Array.isArray(value)) {
        lines.push(`${key}=${JSON.stringify(value)}`);
      } else if (typeof value === 'object' && value !== null) {
        lines.push(`${key}=${JSON.stringify(value)}`);
      }
    });

    return lines.join('\n');
  }

  private envToConfig(content: string): Partial<ExtensionConfig> {
    const config: any = {};
    const lines = content.split('\n').filter((line) => line.trim() && !line.startsWith('#'));

    for (const line of lines) {
      const [key, ...valueParts] = line.split('=');
      if (!key || valueParts.length === 0) continue;

      const value = valueParts.join('=').trim();

      // Try to parse as JSON for arrays/objects
      try {
        if (value.startsWith('[') || value.startsWith('{')) {
          config[key.trim()] = JSON.parse(value);
        } else if (value === 'true' || value === 'false') {
          config[key.trim()] = value === 'true';
        } else if (!isNaN(Number(value))) {
          config[key.trim()] = Number(value);
        } else {
          config[key.trim()] = value;
        }
      } catch {
        config[key.trim()] = value;
      }
    }

    return config;
  }

  private configToIni(config: ExtensionConfig): string {
    const lines: string[] = ['[watch-party-extension]', ''];

    Object.entries(config).forEach(([key, value]) => {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        lines.push(`${key} = ${value}`);
      } else if (Array.isArray(value) || typeof value === 'object') {
        lines.push(`${key} = ${JSON.stringify(value)}`);
      }
    });

    return lines.join('\n');
  }

  private iniToConfig(content: string): Partial<ExtensionConfig> {
    const config: any = {};
    const lines = content
      .split('\n')
      .filter((line) => line.trim() && !line.startsWith('[') && !line.startsWith(';'));

    for (const line of lines) {
      const [key, ...valueParts] = line.split('=');
      if (!key || valueParts.length === 0) continue;

      const value = valueParts.join('=').trim();

      try {
        if (value.startsWith('[') || value.startsWith('{')) {
          config[key.trim()] = JSON.parse(value);
        } else if (value === 'true' || value === 'false') {
          config[key.trim()] = value === 'true';
        } else if (!isNaN(Number(value))) {
          config[key.trim()] = Number(value);
        } else {
          config[key.trim()] = value;
        }
      } catch {
        config[key.trim()] = value;
      }
    }

    return config;
  }
}
