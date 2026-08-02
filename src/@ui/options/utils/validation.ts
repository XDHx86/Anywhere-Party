/**
 * Configuration Validation Utilities
 * Validates configuration schema and sanitizes input data
 * Requirements: 36.2, 36.4
 */

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export interface ConfigSchema {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: RegExp;
    enum?: any[];
    default?: any;
    description?: string;
    sanitize?: (value: any) => any;
  };
}

// Configuration schema definition
export const CONFIG_SCHEMA: ConfigSchema = {
  // Server Configuration
  SIGNALING_SERVER: {
    type: 'string',
    required: true,
    pattern: /^wss?:\/\/.+/,
    description: 'WebSocket URL for the signaling server',
    sanitize: (value: string) => value.trim(),
  },
  SIGNALING_WS_PATH: {
    type: 'string',
    default: '/ws',
    pattern: /^\/.*$/,
    description: 'WebSocket path for the signaling server',
    sanitize: (value: string) => value.trim(),
  },
  LOCAL_DEV_MODE: {
    type: 'boolean',
    default: false,
    description: 'Use local development relay server',
  },
  ROOM_DEFAULT_PASSWORD: {
    type: 'string',
    default: '',
    description: 'Default password for new rooms',
    sanitize: (value: string) => value.trim(),
  },

  // Synchronization Settings
  SYNC_TOLERANCE_MS: {
    type: 'number',
    min: 50,
    max: 2000,
    default: 300,
    description: 'Maximum allowed drift before sync correction (ms)',
  },
  SYNC_TIMEOUT_MS: {
    type: 'number',
    min: 1000,
    max: 30000,
    default: 5000,
    description: 'Maximum time to wait for sync convergence (ms)',
  },
  HEARTBEAT_INTERVAL_MS: {
    type: 'number',
    min: 500,
    max: 10000,
    default: 2000,
    description: 'Frequency of sync heartbeat messages (ms)',
  },
  ANNOTATION_RENDER_INTERVAL_MS: {
    type: 'number',
    min: 8,
    max: 100,
    default: 16,
    description: 'Frequency of annotation rendering updates (ms)',
  },
  RECONNECT_INTERVAL_MS: {
    type: 'number',
    min: 1000,
    max: 30000,
    default: 5000,
    description: 'Time between reconnection attempts (ms)',
  },
  ROOM_STATE_TTL_MS: {
    type: 'number',
    min: 60000,
    max: 3600000,
    default: 300000,
    description: 'How long to keep room state after disconnection (ms)',
  },
  VIDEO_DETECT_POLL_MS: {
    type: 'number',
    min: 100,
    max: 5000,
    description: 'Optional fallback polling for video detection (ms)',
  },

  // Feature Flags
  VOICE_CHAT: {
    type: 'boolean',
    default: true,
    description: 'Enable WebRTC voice communication',
  },
  ANNOTATIONS: {
    type: 'boolean',
    default: true,
    description: 'Enable basic drawing and markup tools',
  },
  ADVANCED_ANNOTATIONS: {
    type: 'boolean',
    default: false,
    description: 'Enable advanced annotation features',
  },
  SUBTITLES: {
    type: 'boolean',
    default: true,
    description: 'Enable subtitle loading and OpenSubtitles integration',
  },
  PLAYLISTS: {
    type: 'boolean',
    default: true,
    description: 'Enable shared video queues and playlist management',
  },
  SCHEDULING: {
    type: 'boolean',
    default: false,
    description: 'Enable scheduled watch parties',
  },
  E2E_ENCRYPTION: {
    type: 'boolean',
    default: false,
    description: 'Enable end-to-end encryption for chat messages',
  },
  TELEMETRY_ENABLED: {
    type: 'boolean',
    default: false,
    description: 'Send anonymous usage data',
  },

  // WebRTC Configuration
  STUN_SERVERS: {
    type: 'array',
    default: ['stun:stun.l.google.com:19302'],
    description: 'STUN servers for WebRTC connections',
    sanitize: (value: any[]) =>
      value.filter((url) => typeof url === 'string' && url.startsWith('stun:')),
  },
  TURN_SERVERS: {
    type: 'array',
    default: [],
    description: 'TURN servers for WebRTC connections',
  },

  // Subtitle Configuration
  OPENSUBTITLES_KEY: {
    type: 'string',
    default: '',
    description: 'OpenSubtitles API key',
    sanitize: (value: string) => value.trim(),
  },
  DEFAULT_SUBTITLE_LANGS: {
    type: 'array',
    default: ['en'],
    description: 'Default subtitle languages (ISO 639-1 codes)',
    sanitize: (value: any[]) =>
      value.filter((lang) => typeof lang === 'string' && /^[a-z]{2}$/.test(lang)),
  },

  // Accessibility Settings
  KEYBOARD_NAVIGATION_ENABLED: {
    type: 'boolean',
    default: true,
    description: 'Enable enhanced keyboard navigation',
  },
  SCREEN_READER_ENABLED: {
    type: 'boolean',
    default: false,
    description: 'Enable screen reader support',
  },
  HIGH_CONTRAST_MODE: {
    type: 'boolean',
    default: false,
    description: 'Enable high contrast colors',
  },
  REDUCED_MOTION: {
    type: 'boolean',
    default: false,
    description: 'Minimize animations and transitions',
  },
  FONT_SIZE: {
    type: 'string',
    enum: ['small', 'medium', 'large', 'extra-large'],
    default: 'medium',
    description: 'Interface font size',
  },
  FOCUS_INDICATOR_STYLE: {
    type: 'string',
    enum: ['default', 'high-contrast', 'custom'],
    default: 'default',
    description: 'Focus indicator style',
  },

  // Custom Colors
  CUSTOM_BG_COLOR: {
    type: 'string',
    pattern: /^#[0-9A-Fa-f]{6}$/,
    default: '#ffffff',
    description: 'Custom background color',
  },
  CUSTOM_FG_COLOR: {
    type: 'string',
    pattern: /^#[0-9A-Fa-f]{6}$/,
    default: '#000000',
    description: 'Custom text color',
  },
  CUSTOM_ACCENT_COLOR: {
    type: 'string',
    pattern: /^#[0-9A-Fa-f]{6}$/,
    default: '#007cba',
    description: 'Custom accent color',
  },
  CUSTOM_BORDER_COLOR: {
    type: 'string',
    pattern: /^#[0-9A-Fa-f]{6}$/,
    default: '#cccccc',
    description: 'Custom border color',
  },

  // Caption Styling
  CAPTION_FONT_SIZE: {
    type: 'string',
    enum: ['small', 'medium', 'large', 'extra-large'],
    default: 'medium',
    description: 'Caption font size',
  },
  CAPTION_BG_COLOR: {
    type: 'string',
    pattern: /^#[0-9A-Fa-f]{6}$/,
    default: '#000000',
    description: 'Caption background color',
  },
  CAPTION_TEXT_COLOR: {
    type: 'string',
    pattern: /^#[0-9A-Fa-f]{6}$/,
    default: '#ffffff',
    description: 'Caption text color',
  },
  CAPTION_OUTLINE: {
    type: 'boolean',
    default: true,
    description: 'Add outline to caption text',
  },

  // Audio Descriptions
  AUDIO_DESCRIPTIONS: {
    type: 'boolean',
    default: false,
    description: 'Enable audio descriptions',
  },
};

/**
 * Validate configuration object against schema
 */
export function validateConfig(config: Record<string, any>): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Check for unknown fields
  Object.keys(config).forEach((key) => {
    if (!(key in CONFIG_SCHEMA)) {
      warnings.push({
        field: key,
        message: `Unknown configuration field: ${key}`,
        code: 'UNKNOWN_FIELD',
        severity: 'warning',
      });
    }
  });

  // Validate known fields
  Object.entries(CONFIG_SCHEMA).forEach(([key, schema]) => {
    const value = config[key];

    // Check required fields
    if (schema.required && (value === undefined || value === null || value === '')) {
      errors.push({
        field: key,
        message: `Required field is missing: ${key}`,
        code: 'REQUIRED_FIELD',
        severity: 'error',
      });
      return;
    }

    // Skip validation if value is undefined and not required
    if (value === undefined || value === null) {
      return;
    }

    // Type validation
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    if (actualType !== schema.type) {
      errors.push({
        field: key,
        message: `Expected ${schema.type}, got ${actualType}`,
        code: 'TYPE_MISMATCH',
        severity: 'error',
      });
      return;
    }

    // Number range validation
    if (schema.type === 'number') {
      if (schema.min !== undefined && value < schema.min) {
        errors.push({
          field: key,
          message: `Value ${value} is below minimum ${schema.min}`,
          code: 'MIN_VALUE',
          severity: 'error',
        });
      }
      if (schema.max !== undefined && value > schema.max) {
        errors.push({
          field: key,
          message: `Value ${value} is above maximum ${schema.max}`,
          code: 'MAX_VALUE',
          severity: 'error',
        });
      }
    }

    // String pattern validation
    if (schema.type === 'string' && schema.pattern && !schema.pattern.test(value)) {
      errors.push({
        field: key,
        message: `Value does not match required pattern: ${value}`,
        code: 'PATTERN_MISMATCH',
        severity: 'error',
      });
    }

    // Enum validation
    if (schema.enum && !schema.enum.includes(value)) {
      errors.push({
        field: key,
        message: `Value must be one of: ${schema.enum.join(', ')}`,
        code: 'INVALID_ENUM',
        severity: 'error',
      });
    }

    // Array validation
    if (schema.type === 'array' && !Array.isArray(value)) {
      errors.push({
        field: key,
        message: `Expected array, got ${typeof value}`,
        code: 'TYPE_MISMATCH',
        severity: 'error',
      });
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Sanitize configuration object
 */
export function sanitizeConfig(config: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};

  Object.entries(config).forEach(([key, value]) => {
    const schema = CONFIG_SCHEMA[key];

    if (schema && schema.sanitize && value !== undefined && value !== null) {
      try {
        sanitized[key] = schema.sanitize(value);
      } catch (error) {
        console.warn(`Failed to sanitize ${key}:`, error);
        sanitized[key] = value;
      }
    } else {
      sanitized[key] = value;
    }
  });

  return sanitized;
}

/**
 * Get default configuration
 */
export function getDefaultConfig(): Record<string, any> {
  const defaults: Record<string, any> = {};

  Object.entries(CONFIG_SCHEMA).forEach(([key, schema]) => {
    if (schema.default !== undefined) {
      defaults[key] = schema.default;
    }
  });

  return defaults;
}

/**
 * Create configuration diff
 */
export function createConfigDiff(
  oldConfig: Record<string, any>,
  newConfig: Record<string, any>
): {
  added: Record<string, any>;
  modified: Record<string, { old: any; new: any }>;
  removed: string[];
  summary: {
    totalChanges: number;
    addedCount: number;
    modifiedCount: number;
    removedCount: number;
  };
} {
  const added: Record<string, any> = {};
  const modified: Record<string, { old: any; new: any }> = {};
  const removed: string[] = [];

  // Find added and modified
  Object.entries(newConfig).forEach(([key, newValue]) => {
    if (!(key in oldConfig)) {
      added[key] = newValue;
    } else if (JSON.stringify(oldConfig[key]) !== JSON.stringify(newValue)) {
      modified[key] = { old: oldConfig[key], new: newValue };
    }
  });

  // Find removed
  Object.keys(oldConfig).forEach((key) => {
    if (!(key in newConfig)) {
      removed.push(key);
    }
  });

  const addedCount = Object.keys(added).length;
  const modifiedCount = Object.keys(modified).length;
  const removedCount = removed.length;

  return {
    added,
    modified,
    removed,
    summary: {
      totalChanges: addedCount + modifiedCount + removedCount,
      addedCount,
      modifiedCount,
      removedCount,
    },
  };
}

/**
 * Merge configurations with validation
 */
export function mergeConfigs(
  baseConfig: Record<string, any>,
  newConfig: Record<string, any>
): { merged: Record<string, any>; validation: ValidationResult } {
  const sanitized = sanitizeConfig(newConfig);
  const merged = { ...baseConfig, ...sanitized };
  const validation = validateConfig(merged);

  return { merged, validation };
}

/**
 * Validate all settings data structure
 */
export function validateAllSettings(settings: any): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!settings || typeof settings !== 'object') {
    errors.push({
      field: 'root',
      message: 'Settings must be an object',
      code: 'INVALID_TYPE',
      severity: 'error',
    });
    return { isValid: false, errors, warnings };
  }

  // Validate required sections
  const requiredSections = ['general', 'accessibility', 'appearance', 'about', 'apiKeys'];
  for (const section of requiredSections) {
    if (!settings[section]) {
      errors.push({
        field: section,
        message: `Required section missing: ${section}`,
        code: 'MISSING_SECTION',
        severity: 'error',
      });
    }
  }

  // Validate each section if it exists
  if (settings.general) {
    const generalValidation = validateConfig(settings.general);
    errors.push(...generalValidation.errors.map((e) => ({ ...e, field: `general.${e.field}` })));
    warnings.push(
      ...generalValidation.warnings.map((w) => ({ ...w, field: `general.${w.field}` }))
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
