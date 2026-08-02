/**
 * Configuration validation and error handling
 * Implements requirements 11.3, 11.4
 */

import { ExtensionConfig, TurnServer } from '../browser-bridge/types';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ValidationWarning {
  field: string;
  message: string;
  value?: any;
}

export class ConfigValidator {
  /**
   * Validates a complete or partial configuration object
   */
  static validate(config: Partial<ExtensionConfig>): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate server configuration
    if (config.SIGNALING_SERVER !== undefined) {
      this.validateSignalingServer(config.SIGNALING_SERVER, errors, warnings);
    }

    if (config.SIGNALING_WS_PATH !== undefined) {
      this.validateSignalingWsPath(config.SIGNALING_WS_PATH, errors, warnings);
    }

    // Validate WebRTC servers
    if (config.STUN_SERVERS !== undefined) {
      this.validateStunServers(config.STUN_SERVERS, errors, warnings);
    }

    if (config.TURN_SERVERS !== undefined) {
      this.validateTurnServers(config.TURN_SERVERS, errors, warnings);
    }

    // Validate API keys
    if (config.OPENSUBTITLES_KEY !== undefined) {
      this.validateOpenSubtitlesKey(config.OPENSUBTITLES_KEY, errors, warnings);
    }

    // Validate language settings
    if (config.DEFAULT_SUBTITLE_LANGS !== undefined) {
      this.validateSubtitleLanguages(config.DEFAULT_SUBTITLE_LANGS, errors, warnings);
    }

    // Validate timing parameters
    if (config.SYNC_TOLERANCE_MS !== undefined) {
      this.validateSyncTolerance(config.SYNC_TOLERANCE_MS, errors, warnings);
    }

    if (config.SYNC_TIMEOUT_MS !== undefined) {
      this.validateSyncTimeout(config.SYNC_TIMEOUT_MS, errors, warnings);
    }

    if (config.HEARTBEAT_INTERVAL_MS !== undefined) {
      this.validateHeartbeatInterval(config.HEARTBEAT_INTERVAL_MS, errors, warnings);
    }

    if (config.ANNOTATION_RENDER_INTERVAL_MS !== undefined) {
      this.validateAnnotationRenderInterval(config.ANNOTATION_RENDER_INTERVAL_MS, errors, warnings);
    }

    if (config.RECONNECT_INTERVAL_MS !== undefined) {
      this.validateReconnectInterval(config.RECONNECT_INTERVAL_MS, errors, warnings);
    }

    if (config.ROOM_STATE_TTL_MS !== undefined) {
      this.validateRoomStateTtl(config.ROOM_STATE_TTL_MS, errors, warnings);
    }

    if (config.VIDEO_DETECT_POLL_MS !== undefined) {
      this.validateVideoDetectPoll(config.VIDEO_DETECT_POLL_MS, errors, warnings);
    }

    // Validate feature flags
    if (config.FEATURE_FLAGS !== undefined) {
      this.validateFeatureFlags(config.FEATURE_FLAGS, errors, warnings);
    }

    // Validate boolean flags
    if (config.TELEMETRY_ENABLED !== undefined) {
      this.validateBoolean('TELEMETRY_ENABLED', config.TELEMETRY_ENABLED, errors);
    }

    if (config.LOCAL_DEV_MODE !== undefined) {
      this.validateBoolean('LOCAL_DEV_MODE', config.LOCAL_DEV_MODE, errors);
    }

    // Validate privacy and security settings
    if (config.OAUTH_ENABLED !== undefined) {
      this.validateBoolean('OAUTH_ENABLED', config.OAUTH_ENABLED, errors);
    }

    if (config.OAUTH_PROVIDERS !== undefined) {
      this.validateOAuthProviders(config.OAUTH_PROVIDERS, errors, warnings);
    }

    if (config.ALLOW_ANONYMOUS_USERS !== undefined) {
      this.validateBoolean('ALLOW_ANONYMOUS_USERS', config.ALLOW_ANONYMOUS_USERS, errors);
    }

    if (config.E2E_ENCRYPTION_ENABLED !== undefined) {
      this.validateBoolean('E2E_ENCRYPTION_ENABLED', config.E2E_ENCRYPTION_ENABLED, errors);
    }

    if (config.ENCRYPTION_KEY_SIZE !== undefined) {
      this.validateEncryptionKeySize(config.ENCRYPTION_KEY_SIZE, errors, warnings);
    }

    if (config.DATA_RETENTION_ENABLED !== undefined) {
      this.validateBoolean('DATA_RETENTION_ENABLED', config.DATA_RETENTION_ENABLED, errors);
    }

    if (config.CHAT_RETENTION_DAYS !== undefined) {
      this.validateRetentionDays(
        'CHAT_RETENTION_DAYS',
        config.CHAT_RETENTION_DAYS,
        errors,
        warnings
      );
    }

    if (config.ROOM_HISTORY_RETENTION_DAYS !== undefined) {
      this.validateRetentionDays(
        'ROOM_HISTORY_RETENTION_DAYS',
        config.ROOM_HISTORY_RETENTION_DAYS,
        errors,
        warnings
      );
    }

    if (config.AUTO_DELETE_EXPIRED_DATA !== undefined) {
      this.validateBoolean('AUTO_DELETE_EXPIRED_DATA', config.AUTO_DELETE_EXPIRED_DATA, errors);
    }

    if (config.RECORDING_CONSENT_REQUIRED !== undefined) {
      this.validateBoolean('RECORDING_CONSENT_REQUIRED', config.RECORDING_CONSENT_REQUIRED, errors);
    }

    if (config.RECORDING_RETENTION_DAYS !== undefined) {
      this.validateRetentionDays(
        'RECORDING_RETENTION_DAYS',
        config.RECORDING_RETENTION_DAYS,
        errors,
        warnings
      );
    }

    if (config.ANONYMIZE_USER_DATA !== undefined) {
      this.validateBoolean('ANONYMIZE_USER_DATA', config.ANONYMIZE_USER_DATA, errors);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validates imported configuration content and format
   */
  static validateImportedConfig(content: string, format: 'json' | 'env' | 'ini'): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!content || content.trim().length === 0) {
      errors.push({
        field: 'content',
        message: 'Configuration content cannot be empty',
      });
      return { isValid: false, errors, warnings };
    }

    let parsedConfig: Partial<ExtensionConfig>;

    try {
      switch (format) {
        case 'json':
          parsedConfig = JSON.parse(content);
          break;
        case 'env':
          parsedConfig = this.parseEnvContent(content);
          break;
        case 'ini':
          parsedConfig = this.parseIniContent(content);
          break;
        default:
          errors.push({
            field: 'format',
            message: `Unsupported format: ${format}`,
          });
          return { isValid: false, errors, warnings };
      }
    } catch (error) {
      errors.push({
        field: 'content',
        message: `Failed to parse ${format.toUpperCase()} content: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
      return { isValid: false, errors, warnings };
    }

    // Validate the parsed configuration
    const configValidation = this.validate(parsedConfig);
    return configValidation;
  }

  /**
   * Provides fallback values for invalid configuration
   */
  static getDefaultsForInvalidConfig(config: Partial<ExtensionConfig>): ExtensionConfig {
    const defaults: ExtensionConfig = {
      SIGNALING_SERVER: 'ws://localhost:8080',
      SIGNALING_WS_PATH: '',
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

    // Merge valid values from config with defaults
    const result = { ...defaults };
    const validation = this.validate(config);

    // Only use values that don't have validation errors
    const errorFields = new Set(validation.errors.map((e) => e.field));

    Object.keys(config).forEach((key) => {
      if (!errorFields.has(key) && config[key as keyof ExtensionConfig] !== undefined) {
        (result as any)[key] = config[key as keyof ExtensionConfig];
      }
    });

    return result;
  }

  private static validateSignalingServer(
    value: string,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (typeof value !== 'string') {
      errors.push({
        field: 'SIGNALING_SERVER',
        message: 'Signaling server must be a string',
        value,
      });
      return;
    }

    if (value.trim().length === 0) {
      errors.push({
        field: 'SIGNALING_SERVER',
        message: 'Signaling server URL cannot be empty',
        value,
      });
      return;
    }

    try {
      const url = new URL(value);
      if (!['ws:', 'wss:', 'http:', 'https:'].includes(url.protocol)) {
        errors.push({
          field: 'SIGNALING_SERVER',
          message: 'Signaling server must use ws://, wss://, http://, or https:// protocol',
          value,
        });
      }

      if (url.protocol === 'ws:' && !value.includes('localhost') && !value.includes('127.0.0.1')) {
        warnings.push({
          field: 'SIGNALING_SERVER',
          message: 'Using unencrypted WebSocket (ws://) for non-local server may be insecure',
          value,
        });
      }
    } catch (error) {
      errors.push({
        field: 'SIGNALING_SERVER',
        message: 'Invalid URL format for signaling server',
        value,
      });
    }
  }

  private static validateSignalingWsPath(
    value: string,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (typeof value !== 'string') {
      errors.push({
        field: 'SIGNALING_WS_PATH',
        message: 'WebSocket path must be a string',
        value,
      });
      return;
    }

    if (value.length > 0 && !value.startsWith('/')) {
      warnings.push({
        field: 'SIGNALING_WS_PATH',
        message: 'WebSocket path should start with "/" if not empty',
        value,
      });
    }
  }

  private static validateStunServers(
    value: string[],
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (!Array.isArray(value)) {
      errors.push({
        field: 'STUN_SERVERS',
        message: 'STUN servers must be an array',
        value,
      });
      return;
    }

    if (value.length === 0) {
      warnings.push({
        field: 'STUN_SERVERS',
        message: 'No STUN servers configured - WebRTC connections may fail behind NAT',
        value,
      });
      return;
    }

    value.forEach((server, index) => {
      if (typeof server !== 'string') {
        errors.push({
          field: `STUN_SERVERS[${index}]`,
          message: 'STUN server URL must be a string',
          value: server,
        });
        return;
      }

      if (!server.startsWith('stun:')) {
        errors.push({
          field: `STUN_SERVERS[${index}]`,
          message: 'STUN server URL must start with "stun:"',
          value: server,
        });
      }
    });
  }

  private static validateTurnServers(
    value: TurnServer[],
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (!Array.isArray(value)) {
      errors.push({
        field: 'TURN_SERVERS',
        message: 'TURN servers must be an array',
        value,
      });
      return;
    }

    value.forEach((server, index) => {
      if (typeof server !== 'object' || server === null) {
        errors.push({
          field: `TURN_SERVERS[${index}]`,
          message: 'TURN server must be an object',
          value: server,
        });
        return;
      }

      if (!server.urls) {
        errors.push({
          field: `TURN_SERVERS[${index}].urls`,
          message: 'TURN server must have urls property',
          value: server,
        });
        return;
      }

      const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
      urls.forEach((url, urlIndex) => {
        if (typeof url !== 'string') {
          errors.push({
            field: `TURN_SERVERS[${index}].urls[${urlIndex}]`,
            message: 'TURN server URL must be a string',
            value: url,
          });
        } else if (!url.startsWith('turn:') && !url.startsWith('turns:')) {
          errors.push({
            field: `TURN_SERVERS[${index}].urls[${urlIndex}]`,
            message: 'TURN server URL must start with "turn:" or "turns:"',
            value: url,
          });
        }
      });

      if (server.username && typeof server.username !== 'string') {
        errors.push({
          field: `TURN_SERVERS[${index}].username`,
          message: 'TURN server username must be a string',
          value: server.username,
        });
      }

      if (server.credential && typeof server.credential !== 'string') {
        errors.push({
          field: `TURN_SERVERS[${index}].credential`,
          message: 'TURN server credential must be a string',
          value: server.credential,
        });
      }

      if (server.urls && !server.username && !server.credential) {
        warnings.push({
          field: `TURN_SERVERS[${index}]`,
          message: 'TURN server configured without credentials - may not work properly',
          value: server,
        });
      }
    });
  }

  private static validateOpenSubtitlesKey(
    value: string,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (typeof value !== 'string') {
      errors.push({
        field: 'OPENSUBTITLES_KEY',
        message: 'OpenSubtitles API key must be a string',
        value,
      });
      return;
    }

    if (value.length > 0 && value.length < 10) {
      warnings.push({
        field: 'OPENSUBTITLES_KEY',
        message: 'OpenSubtitles API key seems too short - verify it is correct',
        value,
      });
    }
  }

  private static validateSubtitleLanguages(
    value: string[],
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (!Array.isArray(value)) {
      errors.push({
        field: 'DEFAULT_SUBTITLE_LANGS',
        message: 'Default subtitle languages must be an array',
        value,
      });
      return;
    }

    if (value.length === 0) {
      warnings.push({
        field: 'DEFAULT_SUBTITLE_LANGS',
        message: 'No default subtitle languages configured',
        value,
      });
      return;
    }

    const validLanguageCodes = /^[a-z]{2}(-[A-Z]{2})?$/;
    value.forEach((lang, index) => {
      if (typeof lang !== 'string') {
        errors.push({
          field: `DEFAULT_SUBTITLE_LANGS[${index}]`,
          message: 'Language code must be a string',
          value: lang,
        });
      } else if (!validLanguageCodes.test(lang)) {
        warnings.push({
          field: `DEFAULT_SUBTITLE_LANGS[${index}]`,
          message: 'Language code should follow ISO 639-1 format (e.g., "en", "es", "en-US")',
          value: lang,
        });
      }
    });
  }

  private static validateSyncTolerance(
    value: number,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (typeof value !== 'number' || isNaN(value)) {
      errors.push({
        field: 'SYNC_TOLERANCE_MS',
        message: 'Sync tolerance must be a number',
        value,
      });
      return;
    }

    if (value < 50) {
      warnings.push({
        field: 'SYNC_TOLERANCE_MS',
        message: 'Very low sync tolerance may cause excessive corrections',
        value,
      });
    } else if (value > 2000) {
      warnings.push({
        field: 'SYNC_TOLERANCE_MS',
        message: 'High sync tolerance may result in noticeable desynchronization',
        value,
      });
    }
  }

  private static validateSyncTimeout(
    value: number,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (typeof value !== 'number' || isNaN(value)) {
      errors.push({
        field: 'SYNC_TIMEOUT_MS',
        message: 'Sync timeout must be a number',
        value,
      });
      return;
    }

    if (value < 1000) {
      warnings.push({
        field: 'SYNC_TIMEOUT_MS',
        message: 'Very short sync timeout may cause premature failures',
        value,
      });
    } else if (value > 30000) {
      warnings.push({
        field: 'SYNC_TIMEOUT_MS',
        message: 'Very long sync timeout may delay error detection',
        value,
      });
    }
  }

  private static validateHeartbeatInterval(
    value: number,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (typeof value !== 'number' || isNaN(value)) {
      errors.push({
        field: 'HEARTBEAT_INTERVAL_MS',
        message: 'Heartbeat interval must be a number',
        value,
      });
      return;
    }

    if (value < 500) {
      warnings.push({
        field: 'HEARTBEAT_INTERVAL_MS',
        message: 'Very frequent heartbeats may impact performance',
        value,
      });
    } else if (value > 10000) {
      warnings.push({
        field: 'HEARTBEAT_INTERVAL_MS',
        message: 'Infrequent heartbeats may delay sync corrections',
        value,
      });
    }
  }

  private static validateAnnotationRenderInterval(
    value: number,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (typeof value !== 'number' || isNaN(value)) {
      errors.push({
        field: 'ANNOTATION_RENDER_INTERVAL_MS',
        message: 'Annotation render interval must be a number',
        value,
      });
      return;
    }

    if (value < 8) {
      warnings.push({
        field: 'ANNOTATION_RENDER_INTERVAL_MS',
        message: 'Very high annotation render rate may impact performance',
        value,
      });
    } else if (value > 100) {
      warnings.push({
        field: 'ANNOTATION_RENDER_INTERVAL_MS',
        message: 'Low annotation render rate may appear choppy',
        value,
      });
    }
  }

  private static validateReconnectInterval(
    value: number,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (typeof value !== 'number' || isNaN(value)) {
      errors.push({
        field: 'RECONNECT_INTERVAL_MS',
        message: 'Reconnect interval must be a number',
        value,
      });
      return;
    }

    if (value < 1000) {
      warnings.push({
        field: 'RECONNECT_INTERVAL_MS',
        message: 'Very frequent reconnect attempts may overwhelm the server',
        value,
      });
    } else if (value > 30000) {
      warnings.push({
        field: 'RECONNECT_INTERVAL_MS',
        message: 'Long reconnect interval may delay recovery from network issues',
        value,
      });
    }
  }

  private static validateRoomStateTtl(
    value: number,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (typeof value !== 'number' || isNaN(value)) {
      errors.push({
        field: 'ROOM_STATE_TTL_MS',
        message: 'Room state TTL must be a number',
        value,
      });
      return;
    }

    if (value < 60000) {
      warnings.push({
        field: 'ROOM_STATE_TTL_MS',
        message: 'Short room state TTL may cause premature cleanup',
        value,
      });
    } else if (value > 3600000) {
      warnings.push({
        field: 'ROOM_STATE_TTL_MS',
        message: 'Long room state TTL may consume excessive server resources',
        value,
      });
    }
  }

  private static validateVideoDetectPoll(
    value: number | null,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (value === null || value === undefined) {
      return; // Optional field
    }

    if (typeof value !== 'number' || isNaN(value)) {
      errors.push({
        field: 'VIDEO_DETECT_POLL_MS',
        message: 'Video detection polling interval must be a number or null',
        value,
      });
      return;
    }

    if (value < 100) {
      warnings.push({
        field: 'VIDEO_DETECT_POLL_MS',
        message: 'Very frequent video detection polling may impact performance',
        value,
      });
    } else if (value > 5000) {
      warnings.push({
        field: 'VIDEO_DETECT_POLL_MS',
        message: 'Infrequent video detection polling may delay detection',
        value,
      });
    }
  }

  private static validateFeatureFlags(
    value: Record<string, boolean>,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (typeof value !== 'object' || value === null) {
      errors.push({
        field: 'FEATURE_FLAGS',
        message: 'Feature flags must be an object',
        value,
      });
      return;
    }

    const knownFlags = [
      'VOICE_CHAT',
      'ANNOTATIONS',
      'SUBTITLES',
      'PLAYLISTS',
      'SCHEDULING',
      'ADVANCED_ANNOTATIONS',
      'E2E_ENCRYPTION',
    ];

    Object.keys(value).forEach((flag) => {
      if (!knownFlags.includes(flag)) {
        warnings.push({
          field: `FEATURE_FLAGS.${flag}`,
          message: 'Unknown feature flag - may be ignored',
          value: value[flag],
        });
      }

      if (typeof value[flag] !== 'boolean') {
        errors.push({
          field: `FEATURE_FLAGS.${flag}`,
          message: 'Feature flag value must be boolean',
          value: value[flag],
        });
      }
    });
  }

  private static validateBoolean(field: string, value: boolean, errors: ValidationError[]): void {
    if (typeof value !== 'boolean') {
      errors.push({
        field,
        message: `${field} must be a boolean`,
        value,
      });
    }
  }

  private static validateOAuthProviders(
    value: Record<string, any>,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (typeof value !== 'object' || value === null) {
      errors.push({
        field: 'OAUTH_PROVIDERS',
        message: 'OAuth providers must be an object',
        value,
      });
      return;
    }

    Object.keys(value).forEach((providerName) => {
      const provider = value[providerName];

      if (typeof provider !== 'object' || provider === null) {
        errors.push({
          field: `OAUTH_PROVIDERS.${providerName}`,
          message: 'OAuth provider configuration must be an object',
          value: provider,
        });
        return;
      }

      // Validate required fields
      const requiredFields = ['name', 'clientId', 'authUrl', 'tokenUrl', 'scope', 'redirectUri'];
      requiredFields.forEach((field) => {
        if (!provider[field]) {
          errors.push({
            field: `OAUTH_PROVIDERS.${providerName}.${field}`,
            message: `OAuth provider ${field} is required`,
            value: provider[field],
          });
        }
      });

      // Validate URLs
      if (provider.authUrl && !this.isValidUrl(provider.authUrl)) {
        errors.push({
          field: `OAUTH_PROVIDERS.${providerName}.authUrl`,
          message: 'OAuth auth URL must be a valid URL',
          value: provider.authUrl,
        });
      }

      if (provider.tokenUrl && !this.isValidUrl(provider.tokenUrl)) {
        errors.push({
          field: `OAUTH_PROVIDERS.${providerName}.tokenUrl`,
          message: 'OAuth token URL must be a valid URL',
          value: provider.tokenUrl,
        });
      }

      // Validate scope array
      if (provider.scope && !Array.isArray(provider.scope)) {
        errors.push({
          field: `OAUTH_PROVIDERS.${providerName}.scope`,
          message: 'OAuth scope must be an array',
          value: provider.scope,
        });
      }
    });
  }

  private static validateEncryptionKeySize(
    value: number,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (typeof value !== 'number' || isNaN(value)) {
      errors.push({
        field: 'ENCRYPTION_KEY_SIZE',
        message: 'Encryption key size must be a number',
        value,
      });
      return;
    }

    if (value < 1024) {
      errors.push({
        field: 'ENCRYPTION_KEY_SIZE',
        message: 'Encryption key size must be at least 1024 bits',
        value,
      });
    } else if (value < 2048) {
      warnings.push({
        field: 'ENCRYPTION_KEY_SIZE',
        message: 'Encryption key size should be at least 2048 bits for security',
        value,
      });
    }

    if (value > 4096) {
      warnings.push({
        field: 'ENCRYPTION_KEY_SIZE',
        message: 'Very large key sizes may impact performance',
        value,
      });
    }
  }

  private static validateRetentionDays(
    field: string,
    value: number,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (typeof value !== 'number' || isNaN(value)) {
      errors.push({
        field,
        message: `${field} must be a number`,
        value,
      });
      return;
    }

    if (value < 1) {
      errors.push({
        field,
        message: `${field} must be at least 1 day`,
        value,
      });
    } else if (value < 7) {
      warnings.push({
        field,
        message: `${field} is very short - consider at least 7 days`,
        value,
      });
    }

    if (value > 365) {
      warnings.push({
        field,
        message: `${field} is very long - consider privacy implications`,
        value,
      });
    }
  }

  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private static parseEnvContent(content: string): Partial<ExtensionConfig> {
    const config: any = {};
    const lines = content.split('\n').filter((line) => line.trim() && !line.startsWith('#'));

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

  private static parseIniContent(content: string): Partial<ExtensionConfig> {
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
