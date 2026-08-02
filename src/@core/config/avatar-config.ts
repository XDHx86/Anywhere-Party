/**
 * Avatar Configuration Manager
 * Handles loading and managing avatar overlay configuration
 */

export interface AvatarOverlayConfig {
  enabled: boolean;
  updateRate: number;
  lerpFactor: number;
  avatarSize: number;
  chatBubbleDuration: number;
  animationDuration: number;
  collisionAvoidance: boolean;
  voiceActivityGlow: boolean;
  maxAvatars: number;
  defaultAvatars: {
    male: string;
    female: string;
    neutral: string;
  };
  animations: {
    heart: string;
    laugh: string;
    thumbs_up: string;
    clap: string;
    wave: string;
    dance: string;
    surprised: string;
    thinking: string;
  };
  movement: {
    keyboardSpeed: number;
    mouseEnabled: boolean;
    touchEnabled: boolean;
    boundaryPadding: number;
  };
  chatBubbles: {
    maxWidth: number;
    offsetY: number;
    borderRadius: number;
    backgroundColor: string;
    textColor: string;
    fontSize: number;
    fontFamily: string;
  };
  voiceActivity: {
    glowColor: string;
    glowRadius: number;
    glowOpacity: number;
    muteIndicatorColor: string;
    muteIndicatorSize: number;
  };
  collision: {
    enabled: boolean;
    radius: number;
    pushForce: number;
  };
}

export interface ExtensionConfig {
  avatarOverlay: AvatarOverlayConfig;
  features: {
    avatarOverlay: boolean;
    voiceIntegration: boolean;
    chatIntegration: boolean;
    animationEffects: boolean;
    collisionDetection: boolean;
  };
  performance: {
    maxRenderFPS: number;
    enableGPUAcceleration: boolean;
    lowPowerMode: boolean;
    adaptiveQuality: boolean;
  };
  privacy: {
    shareAvatarImages: boolean;
    shareDisplayNames: boolean;
    shareVoiceActivity: boolean;
    allowCustomAvatars: boolean;
  };
  accessibility: {
    highContrastMode: boolean;
    largeAvatars: boolean;
    reducedMotion: boolean;
    screenReaderSupport: boolean;
  };
}

export class AvatarConfigManager {
  private config: ExtensionConfig | null = null;
  private configCache: Map<string, any> = new Map();
  private listeners: Set<(config: ExtensionConfig) => void> = new Set();

  constructor() {
    this.loadConfig();
  }

  /**
   * Load configuration from multiple sources with precedence
   */
  async loadConfig(): Promise<ExtensionConfig> {
    try {
      // 1. Try to load runtime config
      let config = await this.loadRuntimeConfig();

      // 2. Merge with local developer overrides
      const localConfig = await this.loadLocalConfig();
      if (localConfig) {
        config = this.mergeConfigs(config, localConfig);
      }

      // 3. Apply user preferences from storage
      const userPrefs = await this.loadUserPreferences();
      if (userPrefs) {
        config = this.mergeConfigs(config, userPrefs);
      }

      this.config = config;
      this.notifyListeners();

      console.log('Avatar configuration loaded successfully');
      return config;
    } catch (error) {
      console.error('Failed to load avatar configuration:', error);
      return this.getDefaultConfig();
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): ExtensionConfig {
    return this.config || this.getDefaultConfig();
  }

  /**
   * Get avatar overlay specific configuration
   */
  getAvatarConfig(): AvatarOverlayConfig {
    return this.getConfig().avatarOverlay;
  }

  /**
   * Update configuration
   */
  async updateConfig(updates: Partial<ExtensionConfig>): Promise<void> {
    const currentConfig = this.getConfig();
    this.config = this.mergeConfigs(currentConfig, updates);

    // Save to user preferences
    await this.saveUserPreferences(this.config);

    this.notifyListeners();
    console.log('Avatar configuration updated');
  }

  /**
   * Reset to default configuration
   */
  async resetConfig(): Promise<void> {
    this.config = this.getDefaultConfig();
    await this.clearUserPreferences();
    this.notifyListeners();
    console.log('Avatar configuration reset to defaults');
  }

  /**
   * Add configuration change listener
   */
  addListener(listener: (config: ExtensionConfig) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Export configuration
   */
  exportConfig(): string {
    return JSON.stringify(this.getConfig(), null, 2);
  }

  /**
   * Import configuration
   */
  async importConfig(configJson: string): Promise<void> {
    try {
      const importedConfig = JSON.parse(configJson);
      await this.updateConfig(importedConfig);
      console.log('Configuration imported successfully');
    } catch (error) {
      console.error('Failed to import configuration:', error);
      throw new Error('Invalid configuration format');
    }
  }

  private async loadRuntimeConfig(): Promise<ExtensionConfig> {
    try {
      // Try to load from extension-config.json
      const response = await fetch(chrome.runtime.getURL('extension-config.json'));
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn('Runtime config not found, using defaults');
    }

    return this.getDefaultConfig();
  }

  private async loadLocalConfig(): Promise<Partial<ExtensionConfig> | null> {
    try {
      // Try to load local developer overrides
      const response = await fetch(chrome.runtime.getURL('extension-config.local.json'));
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      // Local config is optional
    }

    return null;
  }

  private async loadUserPreferences(): Promise<Partial<ExtensionConfig> | null> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get('avatarConfig');
        return result.avatarConfig || null;
      }
    } catch (error) {
      console.warn('Failed to load user preferences:', error);
    }

    return null;
  }

  private async saveUserPreferences(config: ExtensionConfig): Promise<void> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.set({ avatarConfig: config });
      }
    } catch (error) {
      console.error('Failed to save user preferences:', error);
    }
  }

  private async clearUserPreferences(): Promise<void> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.remove('avatarConfig');
      }
    } catch (error) {
      console.error('Failed to clear user preferences:', error);
    }
  }

  private mergeConfigs(base: ExtensionConfig, override: Partial<ExtensionConfig>): ExtensionConfig {
    return {
      avatarOverlay: { ...base.avatarOverlay, ...override.avatarOverlay },
      features: { ...base.features, ...override.features },
      performance: { ...base.performance, ...override.performance },
      privacy: { ...base.privacy, ...override.privacy },
      accessibility: { ...base.accessibility, ...override.accessibility },
    };
  }

  private notifyListeners(): void {
    if (!this.config) return;

    this.listeners.forEach((listener) => {
      try {
        listener(this.config!);
      } catch (error) {
        console.error('Error in config listener:', error);
      }
    });
  }

  private getDefaultConfig(): ExtensionConfig {
    return {
      avatarOverlay: {
        enabled: true,
        updateRate: 30,
        lerpFactor: 0.15,
        avatarSize: 48,
        chatBubbleDuration: 4000,
        animationDuration: 2000,
        collisionAvoidance: true,
        voiceActivityGlow: true,
        maxAvatars: 20,
        defaultAvatars: {
          male: '/assets/avatars/male-default.png',
          female: '/assets/avatars/female-default.png',
          neutral: '/assets/avatars/neutral-default.png',
        },
        animations: {
          heart: '/assets/animations/heart.gif',
          laugh: '/assets/animations/laugh.gif',
          thumbs_up: '/assets/animations/thumbs-up.gif',
          clap: '/assets/animations/clap.gif',
          wave: '/assets/animations/wave.gif',
          dance: '/assets/animations/dance.gif',
          surprised: '/assets/animations/surprised.gif',
          thinking: '/assets/animations/thinking.gif',
        },
        movement: {
          keyboardSpeed: 0.002,
          mouseEnabled: true,
          touchEnabled: true,
          boundaryPadding: 0.05,
        },
        chatBubbles: {
          maxWidth: 200,
          offsetY: -60,
          borderRadius: 8,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          textColor: '#ffffff',
          fontSize: 14,
          fontFamily: 'Arial, sans-serif',
        },
        voiceActivity: {
          glowColor: '#00ff00',
          glowRadius: 8,
          glowOpacity: 0.6,
          muteIndicatorColor: '#ff0000',
          muteIndicatorSize: 8,
        },
        collision: {
          enabled: true,
          radius: 0.05,
          pushForce: 0.5,
        },
      },
      features: {
        avatarOverlay: true,
        voiceIntegration: true,
        chatIntegration: true,
        animationEffects: true,
        collisionDetection: true,
      },
      performance: {
        maxRenderFPS: 60,
        enableGPUAcceleration: true,
        lowPowerMode: false,
        adaptiveQuality: true,
      },
      privacy: {
        shareAvatarImages: true,
        shareDisplayNames: true,
        shareVoiceActivity: true,
        allowCustomAvatars: true,
      },
      accessibility: {
        highContrastMode: false,
        largeAvatars: false,
        reducedMotion: false,
        screenReaderSupport: true,
      },
    };
  }
}
